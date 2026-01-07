import {memo, useEffect, useRef} from "react";
import {baseURL} from "../internals/config";


export const MediaItem = memo(function MediaItem({file, onClick, autoplay, className="", controls=true, toggleable=false, title=""}) {
  const {filename, subfolder} = file;
  const videoRef = useRef(null);
  const ext = filename.split('.').pop().toLowerCase();
  const isVideo = ext === "mp4" || ext === "webm";

  const src = `${baseURL}api/view?filename=${filename}` +
              `&type=output&subfolder=${subfolder}`;

  function toggle() {
    if (!toggleable || !isVideo) return;
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }
  useEffect(() => {
    if (!isVideo) return;
    const el = videoRef.current;
    if (!el) return;

    el.load();

    if (autoplay) {
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }, [src, isVideo, autoplay]);

  return (
    <div className={className + " media-item " + (isVideo ? "video" : "image")} title={title} onClick={onClick}>
      {(ext === 'mp4' || ext === 'webm')
        ? (
          <>
            <video
              ref={videoRef}
              className="comfy-video-main galleria-image"
              controls={controls}
              autoPlay={autoplay}
              muted={autoplay}
              loop={autoplay}
              onClick={toggle}
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
