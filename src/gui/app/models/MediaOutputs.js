import { hasVideos, mediaType } from "../internals/functions";

export class MediaOutputs {
  files = null;
  cover = null;
  total = 0;

  hasVideos = false;
  ShowImages = false;
  ShowVideos = false;

  constructor(item, settings) {
    const nodes = item?.outputs;

    this.hasVideos = hasVideos(nodes);

    const showImages = Boolean(settings?.ShowImages);
    const showVideos = Boolean(settings?.ShowVideos);
    const hideImagesWhenVideoExists = Boolean(settings?.HideImagesWhenVideoExists);

    this.ShowImages = showImages && (!this.hasVideos || !hideImagesWhenVideoExists);
    this.ShowVideos = showVideos;

    if (!nodes) return;

    let images = null;
    let videos = null;

    Object.keys(nodes).forEach((nodeID) => {
      const outputs = nodes[nodeID];
      const files = outputs.images || outputs.gifs || outputs.files || [];
      if (!files.length) return;

      const { isImage, isVideo } = mediaType(outputs);

      if (isImage && this.ShowImages) {
        if (images === null) images = [];
        images.push(...files);
      } else if (isVideo && this.ShowVideos) {
        if (videos === null) videos = [];
        videos.push(...files);
      }
    });

    // merge images and videos into files
    this.files = [];
    if (images?.length) {
      this.files.push(...images);
    }
    if (videos?.length) {
      this.files.push(...videos);
    }

    if (this.files?.length) {
      this.cover = this.files[0];
      this.total = this.files.length;
    }
  }
}
