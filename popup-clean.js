/**
 * DOM Inspector Pro - Popup Script (Modular Version)
 * Main popup script that dynamically loads and initializes all modular components
 * 
 * This file serves as the entry point for the popup interface and coordinates
 * all the modular components for DOM analysis, configuration management,
 * chat integration, and file operations.
 */

// Dynamic module loading configuration
const moduleScripts = [
  // Core modules (loaded first as they provide base functionality)
  './core/dom-utilities.js',
  './core/base-dom-analyzer.js',
  './core/advanced-analyzer.js',
  './core/comprehensive-extractor.js',
  
  // Popup modules (loaded after core modules)
  './popup/configuration-manager.js',
  './popup/chat-manager.js',
  './popup/mcp-manager.js',
  './popup/analysis-manager.js',
  './popup/file-manager.js',
  './popup/ui-event-handlers.js'
];

// Load all module scripts dynamically
moduleScripts.forEach(src => {
  const script = document.createElement('script');
  script.src = src;
  script.onerror = () => console.warn(`Failed to load module: ${src}`);
  document.head.appendChild(script);
});

// Initialize the modular components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait a brief moment for all scripts to load
  setTimeout(() => {
    try {
      // Initialize all the modular components
      if (typeof ConfigurationManager !== 'undefined') {
        window.configManager = new ConfigurationManager();
      } else {
        console.warn('ConfigurationManager not loaded');
      }
      
      if (typeof ChatManager !== 'undefined') {
        window.chatManager = new ChatManager();
      } else {
        console.warn('ChatManager not loaded');
      }
      
      if (typeof MCPManager !== 'undefined') {
        window.mcpManager = new MCPManager();
      } else {
        console.warn('MCPManager not loaded');
      }
      
      if (typeof AnalysisManager !== 'undefined') {
        window.analysisManager = new AnalysisManager();
      } else {
        console.warn('AnalysisManager not loaded');
      }
      
      if (typeof FileManager !== 'undefined') {
        window.fileManager = new FileManager();
      } else {
        console.warn('FileManager not loaded');
      }
      
      if (typeof UIEventHandlers !== 'undefined') {
        window.uiEventHandlers = new UIEventHandlers();
        // Initialize UI event handlers
        window.uiEventHandlers.init();
      } else {
        console.warn('UIEventHandlers not loaded');
      }
      
      console.log('DOM Inspector Pro - All modules initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize modular components:', error);
      
      // Fallback to show error message to user
      const statusElement = document.getElementById('status');
      if (statusElement) {
        statusElement.textContent = 'Error initializing extension modules. Please refresh.';
        statusElement.className = 'status error';
        statusElement.style.display = 'block';
      }
    }
  }, 100); // Small delay to ensure all scripts are loaded
});

// Export module loading status for debugging
window.moduleLoadingStatus = {
  scriptsLoaded: moduleScripts,
  initialized: false,
  error: null
};

// Mark as initialized when all components are ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.moduleLoadingStatus.initialized = true;
  }, 150);
});
