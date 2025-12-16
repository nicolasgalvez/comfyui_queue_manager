import {QueueManagerGalleryURL, QueueManagerOrigin, QueueManagerURL} from './config.js';

import { app } from '../../../scripts/app.js';

function theIframe() {
  return document.querySelector(".comfyui-queue-manager iframe");
}

export function postStatusMessageToIframe(event) {
  postMessageToIframe({
      name: event.type,
      detail: event.detail
  }, 'QM_queueStatusUpdated');
}

function postMessageToIframe(message, type) {
  if (!type) {
    type = 'QM_ParentMessage';
  }

  const iframe = theIframe();
  if (iframe && iframe.contentWindow) {
    // console.log("Posting message to iframe", event, QueueManagerURL);
    iframe.contentWindow.postMessage({
      type: type,
      message: message
    }, QueueManagerOrigin);
  }
}

export function compareVersions(a, b) {
  const pa = String(a).split('.').map(x => parseInt(x, 10) || 0);
  const pb = String(b).split('.').map(x => parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}


export async function AddPlayPauseButton(actionsContainer) {
  const pauseButtonHTML = `
    <button class="pause-button p-button p-component p-button-icon-only p-button-danger p-button-text outline-hidden rounded-lg cursor-pointer p-0 size-8 text-xs !rounded-md border-none relative ml-2 mr-2 transition-colors duration-200 ease-in-out bg-secondary-background hover:bg-secondary-background-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-background" type="button" aria-label="Pause queue" title="Pause queue" data-pc-name="button" data-pd-tooltip="true">
      <span class="p-button-icon pi pi-pause" data-pc-section="icon"></span>
      <span class="p-button-label" data-pc-section="label">&nbsp;</span>
    </button>`;

  let pauseButton = null;
  let buttonIcon = null;
  // Add pause button if not already present
  if (!actionsContainer.querySelector('.pause-button')) {
    actionsContainer.insertAdjacentHTML('beforeend', pauseButtonHTML);
    pauseButton = actionsContainer.querySelector('.pause-button');
    buttonIcon = actionsContainer.querySelector('.pause-button .p-button-icon');
    pauseButton.addEventListener('click', async function () {
      try {
        // POST item[1] as json
        const response = await fetch(`/queue_manager/toggle`);
      } catch (error) {
        console.error("Error fetching queue items:", error);
      }
    });
  }

  app.api.addEventListener("queue-manager-toggle-queue", function (event) {
    if (!pauseButton || !buttonIcon) return;

    const paused = !!event.detail.paused;

    if (paused) {
      // show "play" icon and set labels to "Resume"
      buttonIcon.classList.remove('pi-pause');
      buttonIcon.classList.add('pi-caret-right');
      pauseButton.title = 'Resume queue';
      pauseButton.setAttribute('aria-label', 'Resume queue');
    } else {
      // show "pause" icon and set labels to "Pause"
      buttonIcon.classList.remove('pi-caret-right');
      buttonIcon.classList.add('pi-pause');
      pauseButton.title = 'Pause queue';
      pauseButton.setAttribute('aria-label', 'Pause queue');
    }
  });

    // Check if queue is paused (will trigger the event to update the button icon)
    try {
      const response = await fetch(`/queue_manager/playback`);
    } catch (error) {
      console.error("Error fetching playback status:", error);
    }
}

export async function uiSetup () {
  let nodeSelector = null;

  const current = typeof __COMFYUI_FRONTEND_VERSION__ !== 'undefined' ? __COMFYUI_FRONTEND_VERSION__  : '0.0.0';

  if (compareVersions(current, '1.33.1') >= 0) {
    nodeSelector = '.actionbar > .p-panel-content-container > .p-panel-content > div';
  } else {
    nodeSelector = '.execution-actions';
  }

  const actionsContainer = document.querySelector(nodeSelector);

  if (actionsContainer) {
    console.log("Actions container found", actionsContainer);
    await AddPlayPauseButton(actionsContainer);
    return;
  }

  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          if (node.matches(nodeSelector)) {
            observer.disconnect();
            AddPlayPauseButton(node);
            return;
          }

          const foundActionbar = node.querySelector(nodeSelector);
          if (foundActionbar) {
            observer.disconnect();
            AddPlayPauseButton(foundActionbar);
            return;
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * When the queue status or workflow progress is updated then tell the iframe
 */
export function handleAPIEvents() {


    app.api.addEventListener("status", function (e) {
      postStatusMessageToIframe(e)
    });

    app.api.addEventListener("reconnected", async function (e) {
      // On reconnect fetch current playback status since it might have changed
      try {
        await fetch(`/queue_manager/playback`);
      } catch (error) {
        console.error("Error fetching playback status:", error);
      }
    });

    app.api.addEventListener("execution_start", function (e) {
      postStatusMessageToIframe(e)
    });

    app.api.addEventListener("execution_cached", function (e) {
      postStatusMessageToIframe(e)
    });

    app.api.addEventListener("executing", function (e) {
      postStatusMessageToIframe(e)
    })

    app.api.addEventListener("queue-manager-queue-updated", function (e) {
      postStatusMessageToIframe(e)
    })
}

/**
 *  Pass parent's key events to iframe
 */
export function handleKeyboardEvents() {

    window.addEventListener('keydown', e => {
      postMessageToIframe({key: e.key, isDown: true}, 'QM_ParentKeypress')
    });
    window.addEventListener('keyup', e => {
      postMessageToIframe({key: e.key, isDown: false}, 'QM_ParentKeypress')
    });
}


export function handleIframeMessages() {
  /**
     * Messages from iframe
     */
    window.addEventListener("message", async (event) => {
      if (event.origin !== QueueManagerOrigin) return;
      const { type, workflow, number } = event.data;

      // When workflow is received from iframe then load it into ComfyUI
      if (type === "QM_LoadWorkflow" && workflow) {
        // e.g. forward into ComfyUI’s API
        app.loadGraphData(workflow, true, true, workflow.workflow_name + ' ' + number);
      }

      // Handshake message from iframe
      if (type === "QM_QueueManager_Hello") {
        const settings = extensionSettings('values');
        // send back clientId to iframe
        event.source.postMessage(
          { type: "QM_QueueManager_Hello",
            clientId: app.api.clientId,
            settings
          },
          event.origin
        );
      }

      // Show gallery modal
      if (type === "QM_Gallery_Show") {
        const galleryOverlay = document.querySelector('.comfyui-gallery-overlay');
        if (galleryOverlay) {
          galleryOverlay.classList.add('open');

          // Give focus to the gallery iframe
          const galleryIframe = document.querySelector('.gallery-iframe');
          console.log("QM Gallery iframe", galleryIframe);
          if (galleryIframe) {
            galleryIframe.focus();
          }
        } else {
          console.error("Gallery overlay not found");
        }
      }

      // Close gallery modal
      if (type === "QM_Gallery_Close") {
        const galleryOverlay = document.querySelector('.comfyui-gallery-overlay');
        if (galleryOverlay) {
          galleryOverlay.classList.remove('open');
        }
      }

      // Load workflow from image file
      if (type === "QM_LoadWorkflowFromImage") {
        const filename = event.data.filename;
        const res = await fetch(event.data.fileURL, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        const type =  res.headers.get('Content-Type');
        const theFile = new File([blob], filename, {type: type});

        app.handleFile(theFile);
      }
    }, false);
}

export function registerSidebar() {
  app.extensionManager.registerSidebarTab({
    id: "comfyui-queue-manager",
    icon: "pi pi-list-check",
    title: "Q Manager",
    tooltip: "Queue Manager",
    type: "custom",
    render: (el) => {
      el.innerHTML = `
        <style>
          .p-splitter[data-p-resizing="true"] .comfyui-queue-manager {pointer-events: none;}
          .comfyui-queue-manager { height: 100% }
        </style>
        <div class='comfyui-queue-manager flex flex-col'>
          <header class="px-2 py-1 text-sm header">
            QUEUE MANAGER
          </header>
          <section class='app-iframe flex-1'>
            <iframe name="qm_queue_iframe" src="${QueueManagerURL}" class="w-full h-full border-0"></iframe>
          </section>
          <footer>
          </footer>
        </div>
      `;

      // append stylesheet to this document
      if (!document.getElementById("comfyui-queue-manager-stylesheet")) {
        const style = document.createElement("link");
        style.rel = "stylesheet";
        style.href = `/extensions/comfyui_queue_manager/styles/manager.css`;
        style.type = "text/css";
        style.id = "comfyui-queue-manager-stylesheet";
        style.onload = function() {
          // console.log("Queue Manager stylesheet loaded");
        };
        document.head.appendChild(style);
      }

      // resize container
      el.style.height = '100%';
      el.parentElement.style.overflow = 'hidden';

      // if gallery overlay does not exist then create it
      if (!document.querySelector('.comfyui-gallery-overlay')) {
        const galleryOverlay = document.createElement('div');
        galleryOverlay.className = 'comfyui-gallery-overlay';


        galleryOverlay.innerHTML = `
          <div class="qm-gallery-modal">
            <section class="qm-gallery-content">
              <iframe name="qm_gallery_iframe" src="${QueueManagerGalleryURL}" class="gallery-iframe"></iframe>
            </section>
          </div>
        `;
        document.body.appendChild(galleryOverlay);

        // Close modal on click outside
        galleryOverlay.addEventListener('click', (e) => {
          if (e.target === galleryOverlay) {
            // remove open class from overlay
            galleryOverlay.classList.remove('open');
          }
        });
      }
    },
  });
}

export function injectWorkflowName() {
  const _apiQueuePrompt = app.api.queuePrompt;

  app.api.queuePrompt = async function(n, data, ...args) {
    // Inject workflow name
    // SIML: Perhaps add a setting to enable/disable this behaviour (privacy concern? the workflow name will travel all the way to the generated PNG)
    data.workflow.workflow_name = app.extensionManager.workflow.activeWorkflow.filename;


    return await _apiQueuePrompt.call(app.api, n, data, ...args);
  };
}

function postSettingToIframe(setting, newVal, oldVal) {
  postMessageToIframe({
    setting: setting,
    newValue: newVal,
    oldValue: oldVal
  }, 'QM_Setting_Changed');
}

export function extensionSettings(mode = 'default') {
  const settings =  [
    // General settings
    {
      id: 'QueueManager.Basic.PageSize',
      name: 'Jobs per page',
      category: ['Queue Manager', 'Basic', 'Jobs per page'],
      tooltip: 'Number of jobs to display per page in the Queue Manager.',
      type: 'number',
      defaultValue: 100,
      attrs: {
        min: 1,
        step: 1,
        max: 200,
      },
    },
    {
      id: 'QueueManager.Basic.StartMode',
      name: 'Run mode on start',
      category: ['Queue Manager', 'Basic', 'Run mode on start'],
      tooltip: 'Whether the queue should automatically play or be paused when ComfyUI starts.',
      type: 'combo',
      options: [
        'Play',
        'Pause',
        'Last state',
      ],
      defaultValue: 'Last state',
    },

    // Gallery settings
    {
      id: 'QueueManager.Gallery.GridThumbMode',
      name: 'Grid thumbnail mode',
      category: ['Queue Manager', 'Gallery', 'Grid thumbnail mode'],
      tooltip: 'How thumbnails are displayed in Grid mode.',
      type: 'combo',
      options: [
        'Square Cropped',
        'Square Fit',
        'As is',
      ],
      defaultValue: 'Square Fit',
    },
    {
      id: 'QueueManager.Gallery.CoverThumbMode',
      name: 'Cover thumbnail mode',
      category: ['Queue Manager', 'Gallery', 'Cover thumbnail mode'],
      tooltip: 'How thumbnails are displayed in Cover mode.',
      type: 'combo',
      options: [
        'Cropped',
        'Fit',
      ],
      defaultValue: 'Cropped',
    },
    {
      id: 'QueueManager.Gallery.AutoPlayVideos',
      name: 'Auto-play videos',
      category: ['Queue Manager', 'Gallery', 'Auto-play videos'],
      tooltip: 'Automatically play videos in the Completed tab.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'QueueManager.Gallery.HideImagesWhenVideoExists',
      name: 'Hide images when video exists',
      category: ['Queue Manager', 'Gallery', 'Hide images when video exists'],
      tooltip: 'If a video was generated in the workflow then hide images in the Completed tab.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'QueueManager.Gallery.ShowVideos',
      name: 'Show videos',
      category: ['Queue Manager', 'Gallery', 'Show videos'],
      tooltip: 'Show generated videos in the Completed tab.',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'QueueManager.Gallery.ShowImages',
      name: 'Show images',
      category: ['Queue Manager', 'Gallery', 'Show images'],
      tooltip: 'Show generated images in the Completed tab.',
      type: 'boolean',
      defaultValue: true,
    },
  ];

  if (mode === 'default') {
    // append onChange handler to every setting
    for (const setting of settings) {
      setting.onChange = function(newVal, oldVal) {
        const id = setting.id.split('.').pop();
        postSettingToIframe(id, newVal, oldVal);
      }
    }
    return settings;
  }

  if (mode === 'values') {
    // pull values for all settings
    const values = {};
    for (const setting of settings) {
      const id = setting.id.split('.').pop();
      values[id] = app.extensionManager.setting.get(setting.id);
    }
    return values;
  }

}


