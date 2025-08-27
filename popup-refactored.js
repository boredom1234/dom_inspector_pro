/**
 * DOM Inspector Pro - Main Popup Script
 * Refactored modular version using specialized managers
 */

// Import modular components
import { UIManager } from './popup/ui-manager.js';
import { ChatManager } from './popup/chat-manager.js';
import { AnalysisManager } from './popup/analysis-manager.js';
import { ConfigManager } from './popup/config-manager.js';
import { MESSAGE_TYPES } from './shared/constants.js';
import { EventEmitter } from './shared/event-emitter.js';

// Global managers
let uiManager = null;
let chatManager = null;
let analysisManager = null;
let configManager = null;
let eventEmitter = null;

// Side panel lifecycle management
let isInitialized = false;

function initializeSidePanel() {
  if (isInitialized) return;
  isInitialized = true;
  
  console.log('DOM Inspector Pro Side Panel initialized');
  
  // Add visual indicator that this is a side panel
  document.body.classList.add('side-panel-mode');
}

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidePanel);
} else {
  initializeSidePanel();
}

/**
 * Main initialization function
 */
document.addEventListener("DOMContentLoaded", async function () {
  try {
    console.log('Initializing DOM Inspector Pro popup...');
    
    // Initialize event emitter for inter-module communication
    eventEmitter = new EventEmitter();
    
    // Initialize managers in order
    await initializeManagers();
    
    // Setup inter-module event handling
    setupModuleCommunication();
    
    // Setup DOM change notifications
    setupDOMChangeListener();
    
    console.log('DOM Inspector Pro popup initialization complete');
    
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showStatus('Failed to initialize popup: ' + error.message, 'error');
  }
});

/**
 * Initialize all managers
 */
async function initializeManagers() {
  // Initialize UI Manager first
  uiManager = new UIManager({
    eventEmitter: eventEmitter
  });
  await uiManager.initialize();
  
  // Initialize Configuration Manager
  configManager = new ConfigManager({
    eventEmitter: eventEmitter,
    uiManager: uiManager
  });
  await configManager.initialize();
  
  // Initialize Chat Manager
  chatManager = new ChatManager({
    eventEmitter: eventEmitter,
    uiManager: uiManager
  });
  await chatManager.initialize();
  
  // Initialize Analysis Manager
  analysisManager = new AnalysisManager({
    eventEmitter: eventEmitter,
    uiManager: uiManager,
    configManager: configManager,
    chatManager: chatManager
  });
  await analysisManager.initialize();
  
  console.log('All managers initialized successfully');
}

/**
 * Setup communication between modules
 */
function setupModuleCommunication() {
  // Analysis events
  eventEmitter.on('analysis:started', (data) => {
    uiManager.showAnalysisProgress();
  });
  
  eventEmitter.on('analysis:progress', (data) => {
    uiManager.updateProgress(data.percentage, data.message);
  });
  
  eventEmitter.on('analysis:completed', (data) => {
    uiManager.hideAnalysisProgress();
    uiManager.enableActionButtons();
    showStatus('Analysis completed successfully', 'success');
  });
  
  eventEmitter.on('analysis:error', (data) => {
    uiManager.hideAnalysisProgress();
    showStatus('Analysis failed: ' + data.error, 'error');
  });
  
  // Configuration events
  eventEmitter.on('config:changed', (data) => {
    uiManager.showAutoSaveIndicator();
  });
  
  // Chat events
  eventEmitter.on('chat:id:detected', (data) => {
    uiManager.setChatIdStatus(data.chatId, true);
    uiManager.enableSendButton();
  });
  
  eventEmitter.on('chat:id:failed', (data) => {
    uiManager.setChatIdStatus(null, false);
    uiManager.disableSendButton();
  });
  
  // MCP events
  eventEmitter.on('mcp:send:started', () => {
    uiManager.showSendingProgress();
  });
  
  eventEmitter.on('mcp:send:completed', (data) => {
    uiManager.hideSendingProgress();
    showStatus(`✅ Data sent to chat successfully`, 'success');
  });
  
  eventEmitter.on('mcp:send:error', (data) => {
    uiManager.hideSendingProgress();
    showStatus('Failed to send to MCP: ' + data.error, 'error');
  });
}

/**
 * Setup DOM change listener
 */
function setupDOMChangeListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'domChanged') {
      analysisManager.handleDOMChange(message.data);
    }
  });
}

/**
 * Utility function to show status messages
 * @param {string} message - Status message to display
 * @param {string} type - Type of status (success, error, warning)
 */
function showStatus(message, type = 'info') {
  if (uiManager) {
    uiManager.showStatus(message, type);
  } else {
    // Fallback for early initialization
    console.log(`${type.toUpperCase()}: ${message}`);
  }
}

/**
 * Get current application state for debugging
 */
function getApplicationState() {
  return {
    initialized: isInitialized,
    managers: {
      ui: !!uiManager,
      chat: !!chatManager,
      analysis: !!analysisManager,
      config: !!configManager
    },
    eventEmitter: !!eventEmitter
  };
}

// Export for debugging
window.DOMInspectorPro = {
  getApplicationState,
  uiManager: () => uiManager,
  chatManager: () => chatManager,
  analysisManager: () => analysisManager,
  configManager: () => configManager,
  eventEmitter: () => eventEmitter
};
