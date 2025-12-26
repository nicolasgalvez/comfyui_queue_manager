import React, {memo, useContext, useState, useEffect } from "react";
import {baseURL} from "@/internals/config";
import {AppContext} from "@/internals/app-context";
import {MediaItem} from "@/components/MediaItem";
import {mediaType} from "@/internals/functions";



export const CoverMedia = memo(function CoverMedia({item, force, mode = "completed"}) {
  const { appStatus } = useContext(AppContext)

  /**
   * Cycle through outputs to find first media file that can be used as a cover
   * Get first image if images enabled, else get first video if videos enabled else null
   * @param item
   */
  function getCoverFile(item) {
    let video = null;
    let image = null;
    let _nodeID = null;
    let settings = appStatus.options.Gallery;



    Object.keys(item.outputs).find(nodeID => {
      const outputs = item.outputs[nodeID];

      const files = outputs.images || outputs.gifs || outputs.files;
      if (!files || files.length === 0) {
        return false;
      }

      const { isImage, isVideo } = mediaType(outputs);

      // console.log("Outputs", outputs, "isImage:", isImage, "isVideo:", isVideo);

      if (isImage) {
        if (settings.ShowImages || force) {

          image = files[0];
          _nodeID = nodeID;
          return true;
        }
      } else if (isVideo && video === null) {
        if (settings.ShowVideos || force) {
          video = (outputs.gifs && outputs.gifs.length > 0) ? outputs.gifs[0] : files[0];
          _nodeID = nodeID;

          // if no show images, return video immediately
          if (!settings.ShowImages && !force) {
            return true;
          }
        }
      }
    })

    let file = image !== null ? image : video;
    if (file) {
      file.nodeID = _nodeID;
    }

    return file;
  }

  const [coverFile, setCoverFile] = useState(() => getCoverFile(item));

  useEffect(() => {
    setCoverFile(getCoverFile(item));
  }, [appStatus.options, getCoverFile, item]);


  return (
    <>
      {coverFile &&
      <MediaItem
        filename={coverFile.filename}
        subfolder={coverFile.subfolder}
        galleryData={{dbID: item.db_id, nodeKey: coverFile.nodeID, fileIndex: 0}}
        mode={mode}
        controls={false}
        autoplay={false}
      />
      }
    </>
  );
});
