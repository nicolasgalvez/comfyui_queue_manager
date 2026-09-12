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
import { api } from '../../scripts/api.js';
import { installPersistentErrors } from './js/persistent-errors.js';

/**
 * Main function wrapping plugin's core functionality
 */
app.registerExtension({
	name: "ComfyUIQueueManager",

  async setup() {
    installPersistentErrors(api);
    setTimeout(uiSetup);

    handleAPIEvents();

    handleKeyboardEvents();

    handleIframeMessages();

    registerSidebar();

    injectWorkflowName();
  },

  settings:extensionSettings()
})
