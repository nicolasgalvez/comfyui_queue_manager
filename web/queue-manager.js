import {
  uiSetup,
  handleAPIEvents,
  handleKeyboardEvents,
  handleIframeMessages,
  registerSidebar,
  injectWorkflowName,
  extensionSettings
} from './js/functions.js';

import { app } from '../../scripts/app.js';

/**
 * Main function wrapping plugin's core functionality
 */
app.registerExtension({
	name: "ComfyUIQueueManager",

  async setup() {
    setTimeout(uiSetup);

    handleAPIEvents();

    handleKeyboardEvents();

    handleIframeMessages();

    registerSidebar();

    injectWorkflowName();
  },

  settings:extensionSettings()
})
