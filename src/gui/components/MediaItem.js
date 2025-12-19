import {memo, useContext} from "react";
import {baseURL} from "@/internals/config";
import {AppContext} from "@/internals/app-context";


export const MediaItem = memo(function MediaItem({filename, subfolder, galleryData, galleryMode}) {
  const {onMediaItemClick, appStatus} = useContext(AppContext)

  const ext = filename.split('.').pop().toLowerCase();

  const src = `${baseURL}api/view?filename=${filename}` +
              `&type=output&subfolder=${subfolder}`;

  function onClickHandler(e) {
    if (galleryMode) return;

    e.stopPropagation();
    e.preventDefault();

    onMediaItemClick(galleryData);
  }

  return (
    <div className={"media-item"} title={"Open gallery"}>
      {(ext === 'mp4' || ext === 'webm')
        ? (
          <>
            {appStatus.options.ShowVideos &&
              <video
                className="comfy-video-main galleria-image"
                controls
                onClick={onClickHandler}
              >
                <source src={src} type={`video/${ext}`} />
              </video>
            }
          </>
        )
        : (
          <>
            {appStatus.options.ShowImages &&
              <img
                src={src}
                className="comfy-image-main galleria-image"
                alt={filename}
                onClick={onClickHandler}
              />
            }
          </>

        )
      }
    </div>
  );
});
