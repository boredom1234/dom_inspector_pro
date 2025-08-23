/**
 * DOM Inspector Pro - Popup Script (Modular Version)
 * Main popup script that dynamically loads and initializes all modular components
 * 
 * This file serves as the entry point for the popup interface and coordinates
 * all the modular components for DOM analysis, configuration management,
 * chat integration, and file operations.
 */

// Dynamic module loading configuration for popup-specific modules only
const popupModuleScripts = [
  'popup/configuration-manager.js',
  'popup/chat-manager.js',
  'popup/mcp-manager.js',
  'popup/analysis-manager.js',
  'popup/file-manager.js',
  'popup/ui-event-handlers.js'
];

// Load popup modules using proper Chrome extension API
let modulesLoaded = 0;
const totalModules = popupModuleScripts.length;

popupModuleScripts.forEach(src => {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(src);
  script.onload = () => {
    modulesLoaded++;
    console.log(`✅ Loaded module: ${src} (${modulesLoaded}/${totalModules})`);
    if (modulesLoaded === totalModules) {
      initializePopupModules();
    }
  };
  script.onerror = (error) => {
    console.error(`❌ Failed to load module: ${src}`, error);
    modulesLoaded++;
    if (modulesLoaded === totalModules) {
      initializePopupModules();
    }
  };
  document.head.appendChild(script);
});

function initializePopupModules() {
  try {
    console.log('🚀 Initializing popup modules...');
    
    // Initialize all the modular components
    if (typeof ConfigurationManager !== 'undefined') {
      window.configManager = new ConfigurationManager();
      console.log('✅ ConfigurationManager initialized');
    } else {
      console.warn('⚠️ ConfigurationManager not loaded');
    }
    
    if (typeof ChatManager !== 'undefined') {
      window.chatManager = new ChatManager();
      console.log('✅ ChatManager initialized');
    } else {
      console.warn('⚠️ ChatManager not loaded');
    }
    
    if (typeof MCPManager !== 'undefined') {
      window.mcpManager = new MCPManager();
      console.log('✅ MCPManager initialized');
    } else {
      console.warn('⚠️ MCPManager not loaded');
    }
    
    if (typeof AnalysisManager !== 'undefined') {
      window.analysisManager = new AnalysisManager();
      console.log('✅ AnalysisManager initialized');
    } else {
      console.warn('⚠️ AnalysisManager not loaded');
    }
    
    if (typeof FileManager !== 'undefined') {
      window.fileManager = new FileManager();
      console.log('✅ FileManager initialized');
    } else {
      console.warn('⚠️ FileManager not loaded');
    }
    
    if (typeof UIEventHandlers !== 'undefined') {
      window.uiEventHandlers = new UIEventHandlers();
      // Initialize UI event handlers
      window.uiEventHandlers.init();
      console.log('✅ UIEventHandlers initialized');
    } else {
      console.warn('⚠️ UIEventHandlers not loaded');
    }
    
    // Update module loading status
    window.moduleLoadingStatus.initialized = true;
    console.log('🎉 DOM Inspector Pro - All available modules initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize modular components:', error);
    window.moduleLoadingStatus.error = error.message;
    
    // Fallback to show error message to user
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = 'Error initializing extension modules. Please refresh.';
      statusElement.className = 'status error';
      statusElement.style.display = 'block';
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // If modules are already loaded, initialize immediately
  if (modulesLoaded === totalModules) {
    initializePopupModules();
  }
  // Otherwise, modules will initialize when they finish loading
});

// Export module loading status for debugging
window.moduleLoadingStatus = {
  scriptsLoaded: popupModuleScripts,
  initialized: false,
  error: null
};
