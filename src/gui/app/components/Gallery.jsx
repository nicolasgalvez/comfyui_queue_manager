"use client";

import React, {useContext, useEffect, useState, useRef, useLayoutEffect } from "react";

import IconButton from "@mui/material/IconButton";
import DisabledByDefaultIcon from '@mui/icons-material/DisabledByDefault';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardDoubleArrowRightSharpIcon from '@mui/icons-material/KeyboardDoubleArrowRightSharp';
import KeyboardDoubleArrowLeftSharpIcon from '@mui/icons-material/KeyboardDoubleArrowLeftSharp';
import InputSharpIcon from '@mui/icons-material/InputSharp';
import PhotoSizeSelectActualSharpIcon from '@mui/icons-material/PhotoSizeSelectActualSharp';
import DriveFileMoveSharpIcon from '@mui/icons-material/DriveFileMoveSharp';
import MoreVertSharpIcon from '@mui/icons-material/MoreVertSharp';
import WebAssetOffSharpIcon from '@mui/icons-material/WebAssetOffSharp';
import BurstModeSharpIcon from '@mui/icons-material/BurstModeSharp';

import {baseURL} from "../internals/config";
import useEvent from "react-use-event-hook";
import Button from "@mui/material/Button";
import DeleteOutlineSharpIcon from "@mui/icons-material/DeleteOutlineSharp";
import {apiCall, msgLoadWorkflow} from "../internals/functions";
import GalleryProgressBar from "../components/GalleryProgressBar";
import {MediaItem} from "../components/MediaItem";
import {OrderedMap} from "../models/OrderedMap";
import {useAppStore} from "../stores/appStore";
import {useOptionsStore} from "../stores/optionsStore";

export default function Gallery({items, activeItem}) {
  /**
   * Gallery state
   * @type {OrderedMap} - custom array of gallery items
   */
  const [ galleryItems, setGalleryItems ] = useState(null);
  const [ mediaItem, setMediaItem ] = useState(null);
  const [ uiState, setUiState ] = useState({
    actionsMenuOpen: false,
  });

  const mode = useAppStore((state) => state.mode);
  const galleryOptions = useOptionsStore((state) => state.Gallery);
  const showUI = useOptionsStore((state) => state.show_gallery_ui);

  const setMode = useAppStore((state) => state.setMode);
  const setDirectOption = useOptionsStore((state) => state.setDirectOption);

  const thumbsContainerRef = useRef(null);

  function closeGallery() {
    // Post message to parent window to close gallery
    window.parent.postMessage({ type: "QM_Gallery_Close" }, "*");

    // remove class from body
    document.body.classList.remove('gallery-open');

    setMode("queue");
  }

  function toggleUI() {
    apiCall('queue_manager/options', {key:"show_gallery_ui", value: !showUI}, 'POST')
    setDirectOption("show_gallery_ui", !showUI);
  }

  function updateMediaItem(items) {
    const itemIndex = items.indexOf(activeItem.dbID);
    if (itemIndex === -1) {
      console.error('Item with dbID not found in gallery data:', activeItem);
      return;
    }

    const queueItem = items.get(activeItem.dbID);

    setMediaItem({
      itemIndex: itemIndex,
      queueItem: queueItem,
      fileIndex: activeItem.fileIndex,
      file: queueItem.outputs.files[activeItem.fileIndex],
      totalFiles: queueItem.outputs.total
    });
  }

  function previousImage() {

    // is there previous file in the current node?
    if (mediaItem.fileIndex > 0) {
      setMediaItem(prev => ({
        ...prev,
        fileIndex: mediaItem.fileIndex - 1,
        file: mediaItem.queueItem.outputs.files[mediaItem.fileIndex - 1]
      }));

      return;
    }

    // no more files in the item, show previous item with last file
    previousItem(true);
  }

  function previousItem(showLastFile = false) {
    // is there previous item in the gallery?
    if (mediaItem.itemIndex > 0) {
      const prevItemIndex = mediaItem.itemIndex - 1;
      const prevQueueItem = galleryItems.at(prevItemIndex);

      // if showLastFile is true, then show last file in the previous node
      const prevFileIndex = showLastFile ? prevQueueItem.outputs.files.length - 1 : 0;

      setMediaItem(prev => ({
        ...prev,
        itemIndex: prevItemIndex,
        queueItem: prevQueueItem,
        fileIndex: prevFileIndex,
        file: prevQueueItem.outputs.files[prevFileIndex],
        totalFiles: prevQueueItem.outputs.total
      }));
    }
  }

  function nextImage() {
    let newData = null;

    // us there next file in the current node?
    if (mediaItem.fileIndex < mediaItem.queueItem.outputs.files.length - 1) {
      setMediaItem(prev => ({
        ...prev,
        fileIndex: mediaItem.fileIndex + 1,
        file: mediaItem.queueItem.outputs.files[mediaItem.fileIndex + 1]
      }));

      return;
    }

    // no more image, show next node
    nextItem();
  }

  function nextItem() {
    // is there next item in the gallery?
    if (mediaItem.itemIndex < galleryItems.length - 1) {
      const nextItemIndex = mediaItem.itemIndex + 1;
      const nextQueueItem = galleryItems.at(nextItemIndex);


      setMediaItem(prev => ({
        ...prev,
        itemIndex: nextItemIndex,
        queueItem: nextQueueItem,
        fileIndex: 0,
        file: nextQueueItem.outputs.files[0],
        totalFiles: nextQueueItem.outputs.total
      }));
    }
  }

  function isFirstItem() {
    return mediaItem.itemIndex === 0;
  }
  function isLastItem() {
    return mediaItem.itemIndex === galleryItems.length - 1;
  }
  function isFirstImage() {
    return mediaItem.fileIndex === 0 && isFirstItem();
  }
  function isLastImage() {
    return mediaItem.fileIndex === mediaItem.queueItem.outputs.files.length - 1 && isLastItem();
  }

  function toggleActionsMenu() {
    setUiState((prev) => ({
      ...prev,
      actionsMenuOpen: !prev.actionsMenuOpen
    }));
  }

  const onOutsideClickActionsMenu = useEvent((event) => {
    if (uiState.actionsMenuOpen && !event.target.closest('.media-actions')) {
      setUiState((prev) => ({
        ...prev,
        actionsMenuOpen: false
      }));
    }
  });

  const loadWorkflow = useEvent((event) => {
    msgLoadWorkflow(mediaItem.queueItem.workflow, mediaItem.queueItem.number);
  });

  const loadImage = useEvent(async (event) => {
    const fileURL = baseURL + `api/view?filename=${mediaItem.file.filename}&type=output&subfolder=${mediaItem.file.subfolder}`;

    // post message to parent window to load image
    window.parent.postMessage({
      type: "QM_LoadWorkflowFromImage",
      fileURL: fileURL,
      filename: mediaItem.file.filename,
    }, "*");
  });

  const deleteWorkflow = useEvent(async (event) => {
    try {
      await apiCall(`api/queue`, {
        delete: [mediaItem.queueItem.promptID],
      })

      // if there are no more items, close gallery
      if (galleryItems.length <= 1) {
        closeGallery();
        return;
      }

      // reset media item to a new image
      // if we are deleting the last item, new image will be from previous item, otherwise it will be from the next item
      const nextItemIndex = mediaItem.itemIndex < galleryItems.length - 1 ? mediaItem.itemIndex + 1 : mediaItem.itemIndex - 1;
      const nextQueueItem = galleryItems.at(nextItemIndex);

      setMediaItem({
        itemIndex: (mediaItem.itemIndex === galleryItems.length - 1) ? nextItemIndex : mediaItem.itemIndex, // actual index changes only if we deleted the last item
        queueItem: nextQueueItem,
        fileIndex: 0,
        file: nextQueueItem.outputs.files[0],
        totalFiles: nextQueueItem.outputs.total
      });

      // delete workflow from gallery items
      setGalleryItems(prevItems => {
        if (!prevItems || prevItems.length === 0) {
          return new OrderedMap();
        }
        prevItems.delete(mediaItem.queueItem.dbID);
        return new OrderedMap(prevItems.entries());
      });

    } catch (error) {
      console.error("Error deleting workflow:", error);
    }
  })

  const openImageLocation = useEvent(async (event) => {
    const file = mediaItem.queueItem.outputs.files[mediaItem.fileIndex];
    if (!file) {
      console.error("No file found to open location:", mediaItem);
      return;
    }
    const queryArgs = `?id=${mediaItem.queueItem.dbID}&filename=${file.filename}&subfolder=${file.subfolder}`;

    await apiCall(`queue_manager/open_location` + queryArgs, null, "GET");
  });

  const keyboardNavigation = useEvent((event) => {
    // SIML: make it configurable in options

    // files
    if (event.key === 'ArrowLeft') {
      if (!isFirstImage()) {
        previousImage();
      }
    } else if (event.key === 'ArrowRight') {
      if (!isLastImage()) {
        nextImage();
      }

      // Items
    } else if (event.key === 'ArrowUp') {
      if (!isFirstItem()) {
        previousItem();
      }
    } else if (event.key === 'ArrowDown') {
      if (!isLastItem()) {
        nextItem();
      }
      // Close gallery
    } else if (event.key === 'Escape') {
      closeGallery();

      // Home
    } else if (event.key === 'Home') {
      // Go to first item
      if (galleryItems && galleryItems.length > 0) {
        const firstItem = galleryItems.first;
        setMediaItem({
          itemIndex: 0,
          queueItem: firstItem,
          fileIndex: 0,
          file: firstItem.outputs.files[0],
          totalFiles: firstItem.outputs.total
        });
      }

      // End
    } else if (event.key === 'End') {
      // Go to last item
      if (galleryItems && galleryItems.length > 0) {
        const lastItem = galleryItems.last;
        const lastFileIndex = lastItem.outputs.files.length - 1;
        setMediaItem({
          itemIndex: galleryItems.length - 1,
          queueItem: lastItem,
          fileIndex: lastFileIndex,
          file: lastItem.outputs.files[lastFileIndex],
          totalFiles: lastItem.outputs.total
        });
      }

      //   t toggle thumbnails
    } else if (event.key.toLowerCase() === 't') {
      toggleUI();
    }


  });

  function onItemClick(itemIndex) {
    // go to item in gallery
    if (galleryItems && galleryItems.length > 0 && itemIndex >= 0 && itemIndex < galleryItems.length) {
      const queueItem = galleryItems.at(itemIndex);
      setMediaItem({
        itemIndex: itemIndex,
        queueItem: queueItem,
        fileIndex: 0,
        file: queueItem.outputs.files[0],
        totalFiles: queueItem.outputs.total
      });
    }
  }


  useEffect(() => {

    if (!items || items.length === 0) {
      return;
    }

    setGalleryItems(items);

    // in items find one that has dbID equal to activeItem.dbID
    updateMediaItem(items);

  }, [items]);

  useEffect(() => {
    updateMediaItem(items);
  }, [activeItem]);

  useLayoutEffect(() => {
    const el = thumbsContainerRef.current;
    if (!el) return;

    let pointerId = null;
    let isPointerDown = false;
    let isDragging = false;

    let startX = 0;
    let startY = 0;
    let startScrollLeft = 0;

    // Suppress click only right after an actual drag
    let suppressClickUntil = 0;

    const DRAG_THRESHOLD_PX = 8;
    const SUPPRESS_CLICK_MS = 250;

    const canScrollX = () => el.scrollWidth > el.clientWidth + 1;

    const onPointerDown = (e) => {

      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (!canScrollX()) return;

      pointerId = e.pointerId;
      isPointerDown = true;
      isDragging = false;

      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = el.scrollLeft;

      el.classList.add("is-dragging");

      // IMPORTANT: do NOT setPointerCapture here.
      // Only capture after we decide it is an actual drag.
    };

    const onPointerMove = (e) => {
      if (!isPointerDown || e.pointerId !== pointerId) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!isDragging) {
        const movedEnough =
          Math.abs(dx) >= DRAG_THRESHOLD_PX || Math.abs(dy) >= DRAG_THRESHOLD_PX;
        const horizontalIntent = Math.abs(dx) > Math.abs(dy);

        if (!movedEnough) return;

        if (!horizontalIntent) {
          // Not a horizontal drag: stop treating as drag and let normal click happen.
          isPointerDown = false;
          pointerId = null;
          el.classList.remove("is-dragging");
          return;
        }

        isDragging = true;
        suppressClickUntil = Date.now() + SUPPRESS_CLICK_MS;

        // Capture only once dragging is confirmed
        try {
          el.setPointerCapture(pointerId);
        } catch {}
      }

      e.preventDefault();
      el.scrollLeft = startScrollLeft - dx;
    };

    const endDrag = (e) => {
      // If we never captured, pointerup may come from child; allow ending anyway.
      if (pointerId == null) return;

      if (e.pointerId !== pointerId) return;

      isPointerDown = false;
      isDragging = false;

      try {
        el.releasePointerCapture(pointerId);
      } catch {}

      pointerId = null;
      el.classList.remove("is-dragging");
    };

    const onClickCapture = (e) => {
      if (Date.now() < suppressClickUntil) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    // Use window so we always end even if pointerup happens outside the container
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);

    el.addEventListener("click", onClickCapture, true);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
      el.removeEventListener("click", onClickCapture, true);
    };
  }, [galleryItems]);

  useEffect(() => {
    /**
     * When clicked outside actions menu, close it
     */
    window.addEventListener("click", onOutsideClickActionsMenu);

    /**
     * Keyboard navigation
     */
    window.addEventListener("keydown", keyboardNavigation);

    return () => {
      window.removeEventListener("click", onOutsideClickActionsMenu);
      window.removeEventListener("keydown", keyboardNavigation);
    }
  }, [keyboardNavigation, onOutsideClickActionsMenu]);


  return (
    <div className={"gallery-page"}>
      <div className={"head-nav"}>
          <IconButton size='large' variant="contained" className={"hide-ui"} onClick={toggleUI} title={(showUI ? "Hide" : "Show") + " thumbnails (T)"} >
            {showUI
              ?
              <WebAssetOffSharpIcon fontSize="large" />
              :
              <BurstModeSharpIcon fontSize="large" />
            }
          </IconButton>

        <IconButton size="large" variant="contained" className={"close-button"} onClick={closeGallery} title={"Close (Esc)"}>
          <DisabledByDefaultIcon fontSize="large" />
        </IconButton>
      </div>


      {galleryItems &&
      <div className="image-box">
        <header>{mediaItem.queueItem.workflow.workflow_name} <span>({mediaItem.fileIndex+1} / {mediaItem.totalFiles})</span></header>

        <figure>
          <MediaItem
            file={mediaItem.file}
            autoplay={galleryOptions.AutoPlayVideos}
            toggleable={true}
            className={(showUI ? "" : "no-ui")}
          />
          {showUI &&
            <div className={'node-thumbs'}>
              <div className={"node-thumbs-container"} ref={thumbsContainerRef}>
                {/*  Display all files from the job */}
                {mediaItem.queueItem.outputs.files.map((file, index) => (
                  <MediaItem
                    key={index}
                    file={file}
                    className={`node-thumb play-button large-play-button ${index === mediaItem.fileIndex ? 'active' : ''}`}
                    controls={false}
                    autoplay={false}
                    onClick={() => setMediaItem(prev => ({
                      ...prev,
                      fileIndex: index,
                      file: file
                    }))}
                  />
                ))}
              </div>
            </div>
          }
        </figure>
        {showUI &&
          <>
            <nav className={"gallery-nav"}>
              {!isFirstImage() &&
                <IconButton color="primary" size="large" onClick={() => previousImage()}
                  // disabled={mediaItem.fileIndex === 0}
                            className={"previous-button"} title={'Previous Image (←)'}>
                  <ArrowForwardIosIcon fontSize="inherit"/>
                </IconButton>
              }

              {!isLastImage() &&
                <IconButton color="primary" size="large" onClick={() => nextImage()}
                  // disabled={mediaItem.fileIndex === mediaItem.totalFiles - 1}
                            className={"next-button"} title={'Next Image (→)'}>
                  <ArrowForwardIosIcon fontSize="inherit" />
                </IconButton>
              }
            </nav>


            <nav className={"footer-nav"}>
            {/*  Nav to go to next / previous item.*/}
              {mediaItem.itemIndex > 0 && (
                <button type={"button"} className={"prev-item"} onClick={() => previousItem()} title={'Previous Prompt (ArrowUp)'}>
                  <KeyboardDoubleArrowLeftSharpIcon fontSize="inherit" />

                  <MediaItem
                    file={galleryItems.at(mediaItem.itemIndex - 1).outputs.files[0]}
                    className={"cover-media-thumb play-button large-play-button"}
                    controls={false}
                    autoplay={false}
                    title={'Previous Prompt (ArrowUp)'}
                  />

                </button>
              )}

              {mediaItem.itemIndex < galleryItems.length - 1 && (
                <button type={"button"} className={"next-item"} onClick={() => nextItem()} title={'Next Prompt (ArrowDown)'}>
                  <KeyboardDoubleArrowRightSharpIcon fontSize="inherit" />
                  <MediaItem
                    file={galleryItems.at(mediaItem.itemIndex + 1).outputs.files[0]}
                    className={"cover-media-thumb play-button large-play-button"}
                    controls={false}
                    autoplay={false}
                    title={'Next Prompt (ArrowDown)'}
                  />
                </button>
              )}
            </nav>
          </>
        }
        <nav className={"media-actions"}>
          <IconButton size="large" variant="contained" className={"trigger"} onClick={toggleActionsMenu}>
            <MoreVertSharpIcon fontSize="medium" />
          </IconButton>


          {uiState.actionsMenuOpen &&
            <div className={"action-buttons"}>
              <Button type={"button"} variant="contained" color="secondary" size="small" className={"load-workflow"} onClick={loadWorkflow}>
                <InputSharpIcon />&nbsp;
                Load queued workflow
              </Button>

              <Button type={"button"} variant="contained" color="secondary" size="small" className={"load-image"} onClick={loadImage}>
                <PhotoSizeSelectActualSharpIcon  />&nbsp;
                Load saved file
              </Button>

              <Button type={"button"} variant="contained" color="secondary" size="small" className={"open-image-location"} onClick={openImageLocation}>
                <DriveFileMoveSharpIcon />&nbsp;
                Open image location
              </Button>

              <Button type={"button"} variant="contained" color="secondary" size="small" className={"delete-workflow"} onClick={deleteWorkflow}>
                <DeleteOutlineSharpIcon />&nbsp;
                Delete workflow
              </Button>
            </div>
          }

        </nav>

        {galleryItems && galleryItems.length > 0 &&
          <GalleryProgressBar galleryItems={Array.from(galleryItems.values())} mediaItem={mediaItem} onItemClick={onItemClick} />
        }
      </div>
      }
    </div>
  );
}
