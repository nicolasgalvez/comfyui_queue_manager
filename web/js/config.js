// export const QM_ENVIRONMENT = "development"; // Any other value will be treated as production
export const QM_ENVIRONMENT = "production";


export const QM_DEV_URL = "http://localhost:3000"; // The URL of the development server for nextjs project. Check front end README for Cross-Origin issues
export const QM_PROD_URL = window.location.protocol + "//" + window.location.host +
  "/extensions/comfyui_queue_manager/.gui/index.html"; // The path where the build sits in the comfyui frontend

// Gallery URLs
export const QM_GALLERY_DEV_URL = QM_DEV_URL + "/gallery";
export const QM_GALLERY_PROD_URL = window.location.protocol + "//" + window.location.host +
  "/extensions/comfyui_queue_manager/.gui/gallery.html";

// Envo dependant manager URLs
export const QueueManagerURL = QM_ENVIRONMENT === "development" ? QM_DEV_URL : QM_PROD_URL;
export const QueueManagerGalleryURL = QM_ENVIRONMENT === "development" ? QM_GALLERY_DEV_URL : QM_GALLERY_PROD_URL;
export const QueueManagerOrigin = QM_ENVIRONMENT === "development" ? QM_DEV_URL : window.location.origin;
