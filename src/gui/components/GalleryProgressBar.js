import {useEffect, useState} from "react";

export default function GalleryProgressBar({galleryItems, mediaItem, onItemClick}) {
  if (galleryItems.length === 0 || !mediaItem) {
    return null; // No items to display
  }

  let currentImageIndex = 1; // Current image index in the gallery

  // total files in all nodes in the current item
  const totalFiles = mediaItem.queueItem.outputs.reduce((total, node, nodeIndex) => {
      const filesCount = (node.files?.length || 0) + (node.gifs?.length || 0);

      if (nodeIndex < mediaItem.nodeIndex) {
        currentImageIndex += filesCount;
      } else if (nodeIndex === mediaItem.nodeIndex) {
        currentImageIndex += mediaItem.fileIndex;
      }

      return total + (node.files?.length || 0) + (node.gifs?.length || 0);
  }, 0);

  const itemProgress = currentImageIndex / totalFiles * 100;

  return (
    <div className="gallery-progress-bar" style={{'--item-progress': itemProgress+'%'}}>
      {galleryItems.map((item, index) => (
        <div
          key={item.dbID}
          className={`progress-item${index < mediaItem.itemIndex ? ' active' : ''}${index === mediaItem.itemIndex ? ' current' : ''}`}
          onClick={() => onItemClick(index)}
        >
        </div>
      ))}
    </div>
  );

}
