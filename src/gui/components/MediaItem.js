import {memo, useContext} from "react";
import {baseURL} from "@/internals/config";
import {AppContext} from "@/internals/app-context";


export const MediaItem = memo(function MediaItem({filename, subfolder, onClick, autoplay}) {

  const ext = filename.split('.').pop().toLowerCase();

  const src = `${baseURL}api/view?filename=${filename}` +
              `&type=output&subfolder=${subfolder}`;

  return (
    <div className={"media-item"} title={"Open gallery"} onClick={onClick}>
      {(ext === 'mp4' || ext === 'webm')
        ? (
          <>
            <video
              className="comfy-video-main galleria-image"
              controls
              autoPlay={autoplay}
              muted={autoplay}
              loop={autoplay}
            >
              <source src={src} type={`video/${ext}`} />
            </video>
          </>
        )
        : (
          <>
            <img
              src={src}
              className="comfy-image-main galleria-image"
              alt={filename}
            />
          </>

        )
      }
    </div>
  );
});
