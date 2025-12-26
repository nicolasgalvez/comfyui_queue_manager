"use client";

import PhotoOutlinedIcon from "@mui/icons-material/PhotoOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import PlayArrowOutlinedIcon from "@mui/icons-material/PlayArrowOutlined";
import DeleteOutlineSharpIcon from "@mui/icons-material/DeleteOutlineSharp";
import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import ImageNotSupportedSharpIcon from '@mui/icons-material/ImageNotSupportedSharp';
import WallpaperSharpIcon from '@mui/icons-material/WallpaperSharp';
import ViewModuleSharpIcon from '@mui/icons-material/ViewModuleSharp';
import { styled } from '@mui/material/styles';

import TopMenu from "@/components/TopMenu";
import {Queue} from "@/components/Queue";
import Stack from "@mui/material/Stack";
import {Slider} from "@mui/material";
import Button from "@mui/material/Button";
import {baseURL} from "@/internals/config";
import {useContext, useEffect, useState, useCallback, useMemo, useRef} from "react";
import {apiCall, hasVideos, mediaType} from "@/internals/functions";
import useEvent from "react-use-event-hook";
import {AppContext} from "@/internals/app-context";
import ThumbSlider from "@/components/ThumbSlider";
import Gallery from "@/components/Gallery";

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function Home() {
  const [appStatus, setAppStatus] = useState({
    loading: true,
    error: null,
    queue: null,
    route: 'queue', // queue, archive, completed, bin
    clientId: null,
    filters: null,
    options: {
      Basic:{},
      Completed:{},
      Gallery:{}
    },
    mode: 'queue', // queue, gallery
  });

  const [keysStatus, setKeysStatus] = useState({
    shiftDown: false,
  });

  const [currentJob, setProgress] = useState({
    id: null,
    nodes: {
      // [node_id]: string|boolean - true executed, node id - not executed
    },
    integrity: true, // false if events about workflow execution are received before the workflow data is loaded
    progress: 0.0,
  });

  const [galleryData, setGallery] = useState(null);

  const latestThumbSizePxRef = useRef(150);

  const applyGridVars = useCallback((thumbSizePx) => {
    const root = document.documentElement;

    const gapPx = 0;
    const minCols = 1;

    // Choose basis: viewport width
    const width = window.innerWidth;

    const denom = thumbSizePx + gapPx;
    const cols =
      Number.isFinite(denom) && denom > 0
        ? Math.max(minCols, Math.floor((width + gapPx) / denom))
        : minCols;

    root.style.setProperty("--thumb-size", `${thumbSizePx}px`);
    root.style.setProperty("--gap", `${gapPx}px`);
    root.style.setProperty("--cols", String(cols));
  }, []);
  const fetchQueueItems = async (page) => {
    setAppStatus(prev => ({...prev, loading: true, error: null}));
    try {
      // console.log("Fetching queue items from", baseURL);
      let queryArgs = '';
      if (page) {
        queryArgs = "?page=" + page;
      }

      queryArgs = appendFilters(queryArgs);
      queryArgs = appendRoute(queryArgs);


      const response = await fetch(`${baseURL}queue_manager/queue` + queryArgs);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const queue = await response.json();
      setAppStatus(prev => ({...prev, loading: false, error: null, queue}));

    } catch (error) {
      setAppStatus(prev => ({...prev, loading: false, error: error.message, queue: null}));
      console.error("Error fetching " + appStatus.route + " items:", error);
    }
  };

  async function fetchOptions() {
    const options = await apiCall(`queue_manager/options`, null, "GET");
      if (options) {
        setAppStatus(prev => ({...prev, options: {...prev.options, ...options}}));
        updateThumbnailSize(null, options.thumb_size ? options.thumb_size : 150);
        updateCoverSize(null, options.cover_size ? options.cover_size : 50);
      } else {
        console.error("Failed to fetch options");
    }
  }

  function getNodeIDs(nodes) {
    const nodeIDs = {};
    for (const node of nodes) {
      if (node.id) {
        nodeIDs[node.id] = node.id;
      }
    }

    // console.log("Node IDs", nodeIDs);
    return nodeIDs;
  }

  function getTheJob(jobID, queue) {
    if (!queue) {
      // console.log("No queue data yet, skipping");
      return null;
    }

    // check if the job is running
    for (const item of queue.running) {
      if (item[1] === jobID) {
        return item;
      }
    }

    // check if the job is in the queue
    for (const item of queue.pending) {
      if (item[1] === jobID) {
        return item;
      }
    }

    return null;
  }

  function appendFilters(queryArgs) {
    if (isFilterOn()) {
      queryArgs += (queryArgs ? '&filters=' : '?filters=') + encodeURIComponent(JSON.stringify(appStatus.filters));
    }
    return queryArgs;
  }

  function appendRoute(queryArgs) {
    if (appStatus.route) {
      queryArgs += (queryArgs ? '&route=' : '?route=') + appStatus.route;
    }
    return queryArgs;
  }

  async function archiveAll() {
    try {
      let queryArgs = appendFilters("");

      const response = await fetch(`${baseURL}queue_manager/archive-queue${queryArgs}`);
    } catch (error) {
      console.error("Error fetching queue items:", error);
    }
  }

  async function playAllArchive() {
    await apiCall('queue_manager/play-archive', {
      client_id: appStatus.clientId,
      filters: isFilterOn() ? appStatus.filters : null,
    })
  }

  async function deleteFromQueue() {
    let queryArgs = appendFilters("?route=" + appStatus.route);

    try {
      const response = await fetch(`${baseURL}queue_manager/queue${queryArgs}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error(`Error deleting items from ${appStatus.route}:`, error);
    }
  }

  async function clearPending() {
    try {
        // POST {"clear":true} to /api/queue
        const response = await fetch(`${baseURL}api/queue`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({clear: true})
        });
      } catch (error) {
        console.error("Error fetching queue items:", error);
      }
  }

  function isFilterOn() {
    return appStatus.filters && Object.keys(appStatus.filters).length > 0;
  }

  const onQueueStatusUpdated = (event) => {

    switch (event.data.message.name) {
      case "status":
        if (appStatus.route === 'queue' || appStatus.route === 'completed') {
          fetchQueueItems((appStatus.queue && appStatus.queue.info) ? appStatus.queue.info.page : 0);
        }
        break;
      case "execution_start":
        const {prompt_id} = event.data.message.detail;
        // console.log("Execution started: ", status.queue, prompt_id);

        const theJob = getTheJob(prompt_id, appStatus.queue);

        if (theJob) {
          // console.log("Job found: ", theJob);
          const nodeIDs = getNodeIDs(theJob[3].extra_pnginfo.workflow.nodes);
          // set the current job
          setProgress(prev => ({
            ...prev,
            id: prompt_id,
            nodes: nodeIDs,
            integrity: true
          }));

          break;
        }

        // set the current job with the prompt id and false integrity flag
        // we don't have the workflow data yet, so set integrity to false so we can pick up progress later when we get the workflow data
        setProgress(prev => ({...prev, id: prompt_id, integrity: false, nodes: {}}));

        break;

      case 'execution_cached':
        // console.log("Execution cached: ", event.data.message);
        // set cached node ids as executed
        const {nodes} = event.data.message.detail; // array of node id strings

        if (!nodes || nodes.length === 0) {
          return;
        }

        const newNodes = {};
        for (const node of nodes) {
          newNodes[node] = true;
        }

        // console.log("newNodes: ", newNodes);

        setProgress(prev => ({
          ...prev,
          nodes: {
            ...prev.nodes,
            ...newNodes
          }
        }));
        break;

      case "executing":
        // set executed node id as executed
        const node_id = event.data.message.detail;
        if (!node_id) {
          return;
        }

        setProgress(prev => ({
          ...prev,
          nodes: {
            ...prev.nodes,
            [node_id]: true
          }
        }));
        break;

      case "queue-manager-queue-updated":
        // console.log("Queue Manager: queue updated: ", event.data.message);
        fetchQueueItems()
        break;
    }
  }

  const onParentKeypress = (keypress) => {
    if (!keypress) {
      return;
    }

    if (keypress.key === "Shift") {
      setKeysStatus(prev => ({...prev, shiftDown: keypress.isDown}));
    }
  }

  const handleMessage = useEvent((event) => {
    // console.log("Received message from parent", event,event.data.type, event.data.message);
    // In production must be same origin, in development as set in config.js
    if (event.origin !== (baseURL === '/' ? window.location.protocol + "//" + window.location.host : baseURL.replace(/\/+$/, ""))) {
      return;
    }

    switch (event.data.type) {
      case "QM_queueStatusUpdated":
        onQueueStatusUpdated(event);
        break;
      case "QM_ParentKeypress":
        onParentKeypress(event.data.message);
        break;
      case "QM_QueueManager_Hello":
        // console.log("QM_QueueManager_Hello", event.data);
        setAppStatus(prev => ({ ...prev, clientId: event.data.clientId, options: {...appStatus.options, ...event.data.settings} }));
        break;
      case "QM_Setting_Changed":
        // console.log("QM_Setting_Changed", event.data.message);
        // check if path like "Gallery.ShowImages" in event.data.message.setting represent an existing object path in appStatus.options
        const settingPath = event.data.message.setting.split('.');
        let current = appStatus.options;
        let exists = true;
        for (const segment of settingPath) {
          if (current.hasOwnProperty(segment)) {
            current = current[segment];
          } else {
            exists = false;
          }
        }

        if (exists) {
          setAppStatus(prev => ({ ...prev, options: {...prev.options, [settingPath[0]]: {...prev.options[settingPath[0]], [settingPath[1]]: event.data.message.newValue} }}));
        }

        break;
    }
  });

  const uploadQueue = useEvent( async (e) => {
    // if empty value then bounce
    if (!e.target.files || !e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];


    const formData = new FormData();
    formData.append("queue_json", file);
    formData.append("client_id", appStatus.clientId);

    const comfyApiKey = localStorage.getItem("comfy_api_key");
    if (comfyApiKey) {
      formData.append("api_key_comfy_org", comfyApiKey);
    }

    if (appStatus.route === 'archive') {
      formData.append("archive", true);
    }


    try {
      const response = await fetch(`${baseURL}queue_manager/import`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      console.log("Queue imported successfully", data);

      e.target.value = "";

    } catch (error) {
      console.error("Error importing queue:", error);
    }
  });

  /**
   * Pack outputs and sent to gallery iframe
   */
  const onMediaItemClick = useCallback((mediaItem) => {
    let items = [];

    const {
      ShowImages,
      ShowVideos
    } = appStatus.options.Gallery;

    appStatus.queue.pending.map((item, index) => {
      // are there outputs for this item?
      if (item[3] && item[3].outputs) {
        const hasVideo = hasVideos(item[3].outputs);

        let outputs = [];
        if (item[3].outputs) {
          Object.keys(item[3].outputs).map((nodeKey) => {
            // isVideo or isImage
            const { isImage, isVideo } = mediaType(item[3].outputs[nodeKey]);
            if ((isImage && ShowImages && (!hasVideo || !appStatus.options.Gallery.HideImagesWhenVideoExists)) || (isVideo && ShowVideos)) {
              outputs.push({
                nodeKey: nodeKey,
                files: item[3].outputs[nodeKey].images || item[3].outputs[nodeKey].gifs,
              })
            }
          })
        }

        // if there are outputs, add to items
        if (outputs.length > 0) {
          items.push({
            dbID: item[3].db_id,
            promptID: item[1],
            number: item[0],
            workflow: item[3].extra_pnginfo.workflow,
            outputs: outputs
          });
        }
      }
    });

    if (items.length === 0) {
      setGallery((prev) => ({
        ...prev, items: null
      }));
      return;
    }

    // in items find one that has dbID equal to data.dbID
    if (!items || items.length === 0) {
      console.error('No items found in gallery data:', galleryData);
      return;
    }

    setGallery({
      items: items,
      activeItem: mediaItem
    })

    openGallery(mediaItem);
  }, [appStatus.queue, galleryData]);

  function openGallery(galleryData = null) {
    if (galleryData) {
      window.parent.postMessage({
        type: "QM_Gallery_Show",
      }, "*");
      setAppStatus((prev) => ({ ...prev, mode: 'gallery' }));

      // add class to body
      document.body.classList.add('gallery-open');
    }
  }

  function updateThumbnailSize(event, newValue) {
    const n = Number(newValue);
    const thumbSizePx = Number.isFinite(n) && n > 0 ? n : 150;

    latestThumbSizePxRef.current = thumbSizePx;
    applyGridVars(thumbSizePx);
  }

  function onThumbSizeCommited(event, newValue) {
    // update options on the server
    setTimeout(() =>{
      setAppStatus(prev => ({ ...prev, options: {...prev.options, thumb_size: newValue} }));
      apiCall('queue_manager/options', {key:"thumb_size", value: newValue}, 'POST')
    })
  }

  function updateCoverSize(event, newValue) {
    document.documentElement.style.setProperty('--cover-size', newValue + 'px');
  }

  function onCoverSizeCommited(event, newValue) {
    // update options on the server
    setTimeout(() =>{
      setAppStatus(prev => ({ ...prev, options: {...prev.options, cover_size: newValue} }));
      apiCall('queue_manager/options', {key:"cover_size", value: newValue}, 'POST')
    })
  }

  const setThumbMode = useEvent((mode) => {
    // update options on the server
    setAppStatus(prev => ({...prev, options: {...prev.options, thumb_mode: mode}}));
    apiCall('queue_manager/options', {key:"thumb_mode", value: mode}, 'POST');
  });

  const appContextValue = useMemo(() => {
    return { appStatus, setAppStatus, onMediaItemClick };
  }, [appStatus, onMediaItemClick]);

  useEffect(() => {
    fetchQueueItems()
  }, [appStatus.filters]);

  // when progress data is updated
  useEffect(() => {
    const progress =
      Object.values(currentJob.nodes).length > 0 ?
        Math.round(
          Math.max(
            (Object.values(currentJob.nodes).filter(v => typeof v === 'boolean').length - 1),
            0
          ) / Object.values(currentJob.nodes).length * 100,
          2
        )
        :
        0;

    setProgress(prev => ({
      ...prev,
      progress: progress
    }));

  }, [currentJob.nodes]);

  // when new queue items are added to the queue
  useEffect(() => {
    // Are we already tracking a job but have not saved the workflow data yet?
    if (currentJob.id && currentJob.integrity === false) {
      // console.log("New Queue loaded. Already tracking a job. Checking for workflow data...");
      const theJob = getTheJob(currentJob.id, appStatus.queue);
      if (theJob) {
        // console.log("Job found: ", theJob);
        const nodeIDs = getNodeIDs(theJob[3].extra_pnginfo.workflow.nodes);

        // if we already marked some nodes as executed do not overwrite them
        for (const nodeID in currentJob.nodes) {
          if (currentJob.nodes[nodeID] === true) {
            nodeIDs[nodeID] = true;
          }
        }

        // set the current job
        setProgress(prev => ({
          ...prev,
          nodes: nodeIDs,
          integrity: true
        }));
      }
    }
  }, [appStatus.queue]);

  useEffect(() => {
    setAppStatus(prev => ({ ...prev, queue: null }));

    // When loading completed route, clear outputs if any (lightbox request will need to recalculate them) and pull options (since they can be changed in another tab
    if (appStatus.route === 'completed') {
      fetchOptions();
    }

    fetchQueueItems();
  }, [appStatus.route]);

  useEffect(() => {
    const onResize = () => applyGridVars(latestThumbSizePxRef.current);

    window.addEventListener("resize", onResize, { passive: true });

    const ro = new ResizeObserver(() => onResize());
    ro.observe(document.documentElement);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
    };
  }, [applyGridVars]);

  // on mount get the queue items from the server
  useEffect(() => {
    fetchQueueItems();
    fetchOptions();

    window.addEventListener("message", handleMessage);

    window.addEventListener('keydown', e => {
      setKeysStatus(prev => ({...prev, shiftDown: true}));
    });
    window.addEventListener('keyup', e => {
      setKeysStatus(prev => ({...prev, shiftDown: false}));
    });

    window.parent.postMessage(
      { type: "QM_QueueManager_Hello" },
      "*"
    );

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div className={`route-${appStatus.route} qm-container mode-${appStatus.mode}`}>
      <AppContext.Provider value={appContextValue}>
      <TopMenu />

      {/*
        *
        *  Tabs Nav
        *
        */}
      <div className="tabs">
        {/* Queue */}
        <button
          className={"tab" + (appStatus.route === 'queue' ? ' dark:bg-neutral-800 bg-neutral-200 active' : '')}
          onClick={() => {
            setAppStatus(prev => ({...prev, route: 'queue'}));
          }}
        >Queue
        </button>

        {/* Archive */}
        <button
          className={"tab archive" + (appStatus.route === 'archive' ? ' active' : '')}
          onClick={() => {
            setAppStatus(prev => ({...prev, route: 'archive'}));
          }}
        >Archive
        </button>

        {/* Completed */}
        <button className={"tab completed" + (appStatus.route === 'completed' ? ' active' : '')}
                onClick={() => {
                  setAppStatus(prev => ({...prev, route: 'completed'}));
                }}
        >Completed
        </button>

      </div>

      {/*
        *
        * Filters
        *
        */}
      {isFilterOn() &&
        <div className="filters flex items-center p-2">
          <span className="text-neutral-500">Filters:</span>
          {Object.values(appStatus.filters).map(filter =>
            <div className="filter flex items-center" key={filter.type}>
                <span
                  className="inline-flex text-neutral-800 dark:text-neutral-200 close label"><span
                  className={'type'}>{filter.type + ": "}&nbsp;</span>{filter.valueLabel}</span>
              <button
                className="dark:bg-neutral-700 bg-neutral-400 text-neutral-200 light:text-neutral-800 close hover:bg-neutral-500"
                onClick={() => {
                  // remove the filter from the filters object
                  setAppStatus(prev => ({...prev, filters: (({[filter.type]: _, ...f}) => f)(prev.filters)}));
                }}
              >
                <svg viewBox="0 0 24 24" width="1.2em" height="1.2em">
                  <path fill="currentColor"
                        d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"></path>
                </svg>
              </button>
            </div>
          )}

          {/*  Clear all  */}
          <button
            className="dark:bg-neutral-700 bg-neutral-400 text-neutral-200 light:text-neutral-800 close close-all hover:bg-neutral-500 ml-auto"
            onClick={() => {
              setAppStatus(prev => ({...prev, filters: null}));
            }}
          >
            <svg viewBox="0 0 24 24" width="1.2em" height="1.2em">
              <path fill="currentColor"
                    d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z"></path>
            </svg>
            Clear filters
          </button>
        </div>
      }

      {/*
        *
        * Queue items table
        *
        */}
      <div className={'queue-table' + (appStatus.shiftDown ? ' shift-down' : '')}>
        <Queue data={appStatus.queue}
               error={appStatus.error}
               isLoading={appStatus.loading}
               progress={currentJob.progress}
               route={appStatus.route}
               shiftDown={keysStatus.shiftDown}
        />
      </div>

      {/*
        *
        * Footer with paging and actions
        *
        */}
      <footer className={"footer"}>
        {/* On Complete route show thumbnail mode and size controls */}
        {appStatus.route === 'completed' && (appStatus.options.Gallery.ShowImages || appStatus.options.Gallery.ShowVideos) &&
          <Stack spacing={1} direction="row" sx={{ alignItems: 'center' }}>
            <Stack spacing={1} className={"thumb-mode"} direction="row" sx={{ alignItems: 'center', justifyContent: 'start', flex:1 }} p={1}>
              <div title="No thumbnails">
                <ImageNotSupportedSharpIcon className={appStatus.options.thumb_mode === "none" ? 'active' : ''} onClick={() => setThumbMode("none")} />
              </div>
              <div title="Cover image only" >
                <WallpaperSharpIcon className={appStatus.options.thumb_mode === "cover" ? 'active' : ''} onClick={() => setThumbMode("cover")} />
              </div>
              <div title="Show all outputs">
                <ViewModuleSharpIcon className={appStatus.options.thumb_mode === "grid" ? 'active' : ''} onClick={() => setThumbMode("grid")} />
              </div>
            </Stack>
            {appStatus.options.thumb_mode === "grid" &&
              <ThumbSlider min={50} max={500} value={appStatus.options.thumb_size ? appStatus.options.thumb_size : 150}
                           onChange={updateThumbnailSize}
                           onChangeCommitted={onThumbSizeCommited}
              />
            }
            {appStatus.options.thumb_mode === "cover" &&
              <ThumbSlider min={25} max={200} value={appStatus.options.cover_size ? appStatus.options.cover_size : 50}
                           onChange={updateCoverSize}
                           onChangeCommitted={onCoverSizeCommited}
              />
            }
          </Stack>

        }

        {/* Paging */}
        <div className={"paging flex"}>
          {appStatus.queue && appStatus.queue.info && (appStatus.queue.info.last_page > 0) &&
            <>
              {/* Previous page if needed */}
              <button
                className={"page" + (appStatus.queue.info.page === 0 ? ' disabled' : '')}
                onClick={() => {
                  // setAppStatus(prev => ({...prev, queue: null}));
                  fetchQueueItems(appStatus.queue.info.page - 1);
                }}
                disabled={appStatus.queue.info.page === 0}
              > &lt;&lt; </button>
              <div className={'pages flex justify-center flex-1'}>
                {Array.from({length: (appStatus.queue.info.last_page + 1)}, (_, i) => (
                  <button
                    key={i}
                    className={"page" + (appStatus.queue.info.page === i ? ' active' : '')}
                    onClick={() => {
                      // setAppStatus(prev => ({...prev, queue: null}));
                      fetchQueueItems(i);
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              {/* Next page if needed */}
              <button
                className={"page" + (appStatus.queue.info.page === appStatus.queue.info.last_page ? ' disabled' : '')}
                onClick={() => {
                  // setAppStatus(prev => ({...prev, queue: null}));
                  fetchQueueItems(appStatus.queue.info.page + 1);
                }}
                disabled={appStatus.queue.info.page === appStatus.queue.info.last_page}
              > &gt;&gt; </button>
            </>
          }
        </div>

        {/* Footer Actions */}
        <div className="p-2 flex actions">
          <Stack direction="row" spacing={1} className={'min-w-full'} useFlexGap>
          {appStatus.queue && (appStatus.queue.running.length > 0 || appStatus.queue.pending.length > 0) &&
            <>


              {/* Queue Actions  */}
              {appStatus.route === 'queue' &&
                <>
                  <Button onClick={archiveAll} variant="contained" color="warning" size="small">Archive
                    All {isFilterOn() ? "*" : "Pending"}
                  </Button>
                  <Button variant="contained" color="secondary" size="small"  href={baseURL + "queue_manager/export" + appendFilters("")}>
                    <FileDownloadOutlinedIcon />&nbsp;&nbsp;Export {isFilterOn() ? "*" : "Queue"}
                  </Button>
                  {isFilterOn()
                    ?
                    <Button variant="contained" color="error" size="small" onClick={deleteFromQueue} className={"order-last"} sx={{ ml: 'auto' }}>
                      <DeleteOutlineSharpIcon />&nbsp;&nbsp;Delete All *
                    </Button>
                    :
                    <Button variant="contained" color="error" size="small" onClick={clearPending} className={"order-last"} sx={{ ml: 'auto' }}>
                      <DeleteOutlineSharpIcon />&nbsp;&nbsp;Delete All Pending
                    </Button>
                  }
                </>
              }

              {/* Archive Actions */}
              {appStatus.route === 'archive' &&
                <>
                  <Button variant="contained" size="small" onClick={playAllArchive}
                          className="hover:bg-neutral-700 text-neutral-200 dark:text-neutral-900 py-1 px-2 rounded mr-1 border-0 run run-all">
                  <PlayArrowOutlinedIcon />&nbsp;&nbsp;Run All {isFilterOn() ? "*" : ""}
                  </Button>
                  <Button variant="contained" color="secondary" size="small" href={baseURL + "queue_manager/export" + appendFilters("?route=archive")}>
                    <FileDownloadOutlinedIcon />&nbsp;&nbsp;Export {isFilterOn() ? "*" : "Archive"}
                  </Button>
                  <Button onClick={deleteFromQueue} variant="contained" color="error" size="small" className={"order-last"} sx={{ ml: 'auto' }}>
                    <DeleteOutlineSharpIcon />&nbsp;&nbsp;Delete {isFilterOn() ? "All *" : "All Archive"}
                  </Button>
                </>
              }

              {/* Completed Actions */}
              {appStatus.route === 'completed' &&
                <>
                  <Button variant="contained" color="secondary" size="small"  href={baseURL + "queue_manager/export" + appendFilters("?route=completed")}>
                    <FileDownloadOutlinedIcon />&nbsp;&nbsp;Export {isFilterOn() ? "*" : "Completed Jobs"}
                  </Button>
                  <Button variant="contained" color="error" size="small"  onClick={deleteFromQueue} className={"order-last"} sx={{ ml: 'auto' }}>
                    <DeleteOutlineSharpIcon />&nbsp;&nbsp;Delete {isFilterOn() ? "All *" : "All Completed Jobs"}
                  </Button>
                </>
              }
            </>
          }

          {['queue', 'archive'].includes(appStatus.route) &&
            <form
              method="post"
              encType="multipart/form-data"
              className={"import-form"}
            >
              <Button variant="contained" color="secondary" size="small" component="label">
                <DriveFolderUploadOutlinedIcon />&nbsp;&nbsp;Import {appStatus.route === 'queue' ? 'Queue' : 'Archive'}
                <VisuallyHiddenInput
                  type="file"
                  onChange={uploadQueue}
                  multiple
                  name="queue_json"
                  accept=".json"
                  required
                />
              </Button>
            </form>
          }

          </Stack>
        </div>
      </footer>
      {appStatus.mode === 'gallery' && galleryData &&
        <Gallery items={galleryData.items} activeItem={galleryData.activeItem} />
      }
      </AppContext.Provider>
    </div>
  );
}
