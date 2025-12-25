"use client";

import React, {useContext, useEffect, useState} from "react";

import IconButton from "@mui/material/IconButton";
import DisabledByDefaultIcon from '@mui/icons-material/DisabledByDefault';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import KeyboardDoubleArrowRightSharpIcon from '@mui/icons-material/KeyboardDoubleArrowRightSharp';
import KeyboardDoubleArrowLeftSharpIcon from '@mui/icons-material/KeyboardDoubleArrowLeftSharp';
import InputSharpIcon from '@mui/icons-material/InputSharp';
import PhotoSizeSelectActualSharpIcon from '@mui/icons-material/PhotoSizeSelectActualSharp';
import DriveFileMoveSharpIcon from '@mui/icons-material/DriveFileMoveSharp';
import MoreVertSharpIcon from '@mui/icons-material/MoreVertSharp';

import {baseURL} from "@/internals/config";
import useEvent from "react-use-event-hook";
import Button from "@mui/material/Button";
import DeleteOutlineSharpIcon from "@mui/icons-material/DeleteOutlineSharp";
import {apiCall, msgLoadWorkflow} from "@/internals/functions";
import GalleryProgressBar from "@/components/GalleryProgressBar";
import {CoverMedia} from "@/components/CoverMedia";
import {AppContext} from "@/internals/app-context";
import {MediaItem} from "@/components/MediaItem";

export default function Gallery({items, activeItem}) {
  /**
   * Gallery state
   * @type {Array} - array of gallery items
   */
  const [ galleryItems, setGalleryItems ] = useState(null);
  const [ mediaItem, setMediaItem ] = useState(null);
  const [ uiState, setUiState ] = useState({
    actionsMenuOpen: false,
  });

  const { appStatus, setAppStatus } = useContext(AppContext);

  function closeGallery() {
    // Post message to parent window to close gallery
    window.parent.postMessage({ type: "QM_Gallery_Close" }, "*");

    // remove class from body
    document.body.classList.remove('gallery-open');

    // set app status galleryOpen to false
    setAppStatus((prev) => ({
      ...prev,
      mode: 'queue',
    }));
  }

  function totalItemFiles(item) {
    // Calculate total of all files in all nodes of the queue item, queueItem.outputs is an array with nodes
    return item.outputs.reduce((acc, node) => {
      if (node.files && Array.isArray(node.files)) {
        return acc + node.files.length;
      }
      return acc;
    }, 0);
  }

  function previousImage() {

    // is there previous file in the current node?
    if (mediaItem.fileIndex > 0) {
      setMediaItem(prev => ({
        ...prev,
        fileIndex: mediaItem.fileIndex - 1,
        file: mediaItem.node.files[mediaItem.fileIndex - 1]
      }));

      return;
    }

    // no more image, show previous node with last file
    previousNode(true);
  }

  function previousNode(showLastFile = false) {
    // is there previous node in the current queue item?
    if (mediaItem.nodeIndex > 0) {
      const prevNodeIndex = mediaItem.nodeIndex - 1;
      const prevNode = mediaItem.queueItem.outputs[prevNodeIndex];
      // if showLastFile is true, then show last file in the previous node
      const prevFileIndex = showLastFile ? prevNode.files.length - 1 : 0;

      setMediaItem(prev => ({
        ...prev,
        nodeIndex: prevNodeIndex,
        node: prevNode,
        fileIndex: prevFileIndex,
        file: prevNode.files[prevFileIndex]
      }));

      return;
    }

    // no more nodes, show previous item with last file
    previousItem(showLastFile);
  }

  function previousItem(showLastFile = false) {
    // is there previous item in the gallery?
    if (mediaItem.itemIndex > 0) {
      const prevItemIndex = mediaItem.itemIndex - 1;
      const prevQueueItem = galleryItems[prevItemIndex];
      // if showLastFile is true, then show last file in the previous node
      const prevNodeIndex = showLastFile ? prevQueueItem.outputs.length - 1 : 0;
      const prevNode = prevQueueItem.outputs[prevNodeIndex];
      const prevFileIndex = showLastFile ? prevNode.files.length - 1 : 0;

      setMediaItem(prev => ({
        ...prev,
        itemIndex: prevItemIndex,
        queueItem: prevQueueItem,
        nodeIndex: prevNodeIndex,
        node: prevNode,
        fileIndex: prevFileIndex,
        file: prevNode.files[prevFileIndex],
        totalFiles: totalItemFiles(prevQueueItem)
      }));
    }
  }

  function nextImage() {
    let newData = null;

    // us there next file in the current node?
    if (mediaItem.fileIndex < mediaItem.node.files.length - 1) {
      setMediaItem(prev => ({
        ...prev,
        fileIndex: mediaItem.fileIndex + 1,
        file: mediaItem.node.files[mediaItem.fileIndex + 1]
      }));

      return;
    }

    // no more image, show next node
    nextNode();
  }

  function nextNode() {
    // is there next node in the current queue item?
    if (mediaItem.nodeIndex < mediaItem.queueItem.outputs.length - 1) {
      const nextNodeIndex = mediaItem.nodeIndex + 1;
      const nextNode = mediaItem.queueItem.outputs[nextNodeIndex];

      setMediaItem(prev => ({
        ...prev,
        nodeIndex: nextNodeIndex,
        node: nextNode,
        fileIndex: 0,
        file: nextNode.files[0]
      }));

      return;
    }

    // no more nodes, show next item
    nextItem();
  }

  function nextItem() {
    // is there next item in the gallery?
    if (mediaItem.itemIndex < galleryItems.length - 1) {
      const nextItemIndex = mediaItem.itemIndex + 1;
      const nextQueueItem = galleryItems[nextItemIndex];
      const nextNode = nextQueueItem.outputs[0];

      setMediaItem(prev => ({
        ...prev,
        itemIndex: nextItemIndex,
        queueItem: nextQueueItem,
        nodeIndex: 0,
        node: nextNode,
        fileIndex: 0,
        file: nextNode.files[0],
        totalFiles: totalItemFiles(nextQueueItem)
      }));
    }
  }

  function isFirstItem() {
    return mediaItem.itemIndex === 0;
  }
  function isLastItem() {
    return mediaItem.itemIndex === galleryItems.length - 1;
  }
  function isFirstNode() {
    return mediaItem.nodeIndex === 0 && isFirstItem();
  }
  function isLastNode() {
    return mediaItem.nodeIndex === mediaItem.queueItem.outputs.length - 1 &&
           isLastItem();
  }
  function isFirstImage() {
    return mediaItem.fileIndex === 0 && isFirstNode();
  }
  function isLastImage() {
    return mediaItem.fileIndex === mediaItem.node.files.length - 1 && isLastNode();
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
      }

      // reset media item to a new image
      // if we are deleting the last item, new image will be from previous item, otherwise it will be from the next item
      const nextItemIndex = mediaItem.itemIndex < galleryItems.length - 1 ? mediaItem.itemIndex + 1 : mediaItem.itemIndex - 1;
      const nextQueueItem = galleryItems[nextItemIndex];
      const nextNode = nextQueueItem.outputs[0];

      // console.log("Deleting workflow:", {
      //   itemIndex: mediaItem.itemIndex,
      //   nextItemIndex,
      // })

      setMediaItem({
        itemIndex: (mediaItem.itemIndex === galleryItems.length - 1) ? nextItemIndex : mediaItem.itemIndex, // actual index changes only if we deleted the last item
        queueItem: nextQueueItem,
        nodeIndex: 0,
        node: nextNode,
        fileIndex: 0,
        file: nextNode.files[0],
        totalFiles: totalItemFiles(nextQueueItem)
      });

      // delete workflow from gallery items
      setGalleryItems(prevItems => {
        if (!prevItems || prevItems.length === 0) {
          return [];
        }
        return prevItems.filter(item => item.dbID !== mediaItem.queueItem.dbID);
      });

    } catch (error) {
      console.error("Error deleting workflow:", error);
    }
  })

  const openImageLocation = useEvent(async (event) => {
    const queryArgs = `?id=${mediaItem.queueItem.dbID}&nodeKey=${mediaItem.node.nodeKey}&fileIndex=${mediaItem.fileIndex}`;

    await apiCall(`${baseURL}queue_manager/open_location` + queryArgs, null, "GET");
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

      // Nodes
    } else if (event.key === 'ArrowUp') {
      if (!isFirstNode()) {
        previousNode();
      }
    } else if (event.key === 'ArrowDown') {
      if (!isLastNode()) {
        nextNode();
      }

      // Items
    } else if (event.key === 'PageUp') {
      if (!isFirstItem()) {
        previousItem();
      }
    } else if (event.key === 'PageDown') {
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
        const firstItem = galleryItems[0];
        const firstNode = firstItem.outputs[0];
        setMediaItem({
          itemIndex: 0,
          queueItem: firstItem,
          nodeIndex: 0,
          node: firstNode,
          fileIndex: 0,
          file: firstNode.files[0],
          totalFiles: totalItemFiles(firstItem)
        });
      }

      // End
    } else if (event.key === 'End') {
      // Go to last item
      if (galleryItems && galleryItems.length > 0) {
        const lastItem = galleryItems[galleryItems.length - 1];
        const lastNode = lastItem.outputs[lastItem.outputs.length - 1];
        const lastFileIndex = lastNode.files.length - 1;
        setMediaItem({
          itemIndex: galleryItems.length - 1,
          queueItem: lastItem,
          nodeIndex: lastItem.outputs.length - 1,
          node: lastNode,
          fileIndex: lastFileIndex,
          file: lastNode.files[lastFileIndex],
          totalFiles: totalItemFiles(lastItem)
        });
      }
    }
  });

  function onItemClick(itemIndex) {
    // go to item in gallery
    if (galleryItems && galleryItems.length > 0 && itemIndex >= 0 && itemIndex < galleryItems.length) {
      const queueItem = galleryItems[itemIndex];
      const firstNode = queueItem.outputs[0];
      setMediaItem({
        itemIndex: itemIndex,
        queueItem: queueItem,
        nodeIndex: 0,
        node: firstNode,
        fileIndex: 0,
        file: firstNode.files[0],
        totalFiles: totalItemFiles(queueItem)
      });
    }
  }

  function updateMediaItem(items) {
    const itemIndex = items.findIndex(item => item.dbID === activeItem.dbID);
    if (itemIndex === -1) {
      console.error('Item with dbID not found in gallery data:', activeItem);
      return;
    }

    const queueItem = items[itemIndex];

    const nodeIndex = queueItem.outputs.findIndex(item => item.nodeKey === activeItem.nodeKey);

    if (nodeIndex === -1) {
      console.error('Node not found in queue item outputs:', activeItem.nodeKey);
      return;
    }
    const node = queueItem.outputs[nodeIndex];
    const file = node.files[activeItem.fileIndex];

    // calculate total of all files in all nodes of the queue item, queueItem.outputs is an array with nodes
    const totalFiles = totalItemFiles(queueItem);

    setMediaItem({
      itemIndex: itemIndex,
      queueItem: queueItem,
      nodeIndex: nodeIndex,
      node: node,
      fileIndex: activeItem.fileIndex,
      file: file,
      totalFiles: totalFiles
    });
  }

  useEffect(() => {

    // in items find one that has dbID equal to data.dbID
    if (!items || items.length === 0) {
      return;
    }

    setGalleryItems(items);

    updateMediaItem(items);

  }, [items]);

  useEffect(() => {
    updateMediaItem(items);
  }, [activeItem]);

  useEffect(() => {
    /**
     * When clicked outside actions menu, close it
     */
    window.addEventListener("click", onOutsideClickActionsMenu);

    /**
     * Keyboard navigation
     */
    window.addEventListener("keydown", keyboardNavigation);
  }, []);


  return (
    <div className={"gallery-page"}>

      <IconButton size="large" variant="contained" className={"close-button"} onClick={closeGallery} title={"Close (Esc)"}>
        <DisabledByDefaultIcon fontSize="large" />
      </IconButton>

      {galleryItems &&
      <div className="image-box">
        <header>{mediaItem.queueItem.workflow.workflow_name} <span>({mediaItem.fileIndex+1} / {mediaItem.totalFiles})</span></header>

        <figure>
          <MediaItem
            filename={mediaItem.file.filename}
            subfolder={mediaItem.file.subfolder}
            autoplay={appStatus.options.Gallery.AutoPlayVideos}
            toggleable={true}
          />
          <div className={'node-thumbs'}>
            <button type={"button"} className={"prev-node" + (isFirstNode() ? ' inactive':'')} onClick={() => previousNode()} title={'Previous Node (↑)'}>
              <KeyboardDoubleArrowLeftSharpIcon fontSize="inherit" />
            </button>

            {/*  Display all files from the node */}
            {mediaItem.node.files.map((image, index) => (
              <MediaItem
                key={index}
                filename={image.filename}
                subfolder={image.subfolder}
                className={`node-thumb ${index === mediaItem.fileIndex ? 'active' : ''}`}
                controls={false}
                autoplay={false}
                onClick={() => setMediaItem(prev => ({
                  ...prev,
                  fileIndex: index,
                  file: image
                }))}
              />
            ))}

            <button type={"button"} className={"next-node" + (isLastNode() ? ' inactive':'')} onClick={() => nextNode()} title={'Next Node (↓)'}>
              <KeyboardDoubleArrowRightSharpIcon fontSize="inherit" />
            </button>
          </div>
        </figure>
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
            <button type={"button"} className={"prev-item"} onClick={() => previousItem()} title={'Previous Prompt (PgUp)'}>
              <KeyboardDoubleArrowLeftSharpIcon fontSize="inherit" />
              <CoverMedia item={galleryItems[mediaItem.itemIndex - 1]} force={true} />
            </button>
          )}

          {mediaItem.itemIndex < galleryItems.length - 1 && (
            <button type={"button"} className={"next-item"} onClick={() => nextItem()} title={'Next Prompt (PgDown)'}>
              <KeyboardDoubleArrowRightSharpIcon fontSize="inherit" />
              <CoverMedia item={galleryItems[mediaItem.itemIndex + 1]} force={true} />
            </button>
          )}
        </nav>

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
          <GalleryProgressBar galleryItems={galleryItems} mediaItem={mediaItem} onItemClick={onItemClick} />
        }
      </div>
      }
    </div>
  );
}
