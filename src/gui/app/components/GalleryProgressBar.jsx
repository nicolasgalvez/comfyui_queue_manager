export default function GalleryProgressBar({galleryItems, mediaItem, onItemClick}) {
  if (galleryItems.length === 0 || !mediaItem) {
    return null; // No items to display
  }

  const itemProgress = (mediaItem.fileIndex + 1) / mediaItem.queueItem.outputs.total * 100;

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
