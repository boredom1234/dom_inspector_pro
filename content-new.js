/**
 * Enhanced Content Script - Modularized DOM Inspector Pro
 * Main content script that coordinates all content modules
 */

console.log('XPath & Selector Extractor with Advanced Analysis loaded (Modular)');

// DOMAnalyzer will be loaded as part of the module sequence

// Load core and content modules dynamically
const coreModules = [
  'core/base-dom-analyzer.js',
  'core/advanced-analyzer.js', 
  'core/comprehensive-extractor.js',
  'core/dom-utilities.js'
];

const contentModules = [
  'content/chat-bridge.js',
  'content/element-highlighter.js',
  'content/continuous-analysis.js',
  'content/knowledge-chain-tracker.js',
  'content/element-inspector.js',
  'content/message-handler.js'
];

// Load dom-analyzer.js after core modules but before content modules
const domAnalyzerModule = ['dom-analyzer.js'];
const allModules = [...coreModules, ...domAnalyzerModule, ...contentModules];

// Load modules and initialize
let modulesLoaded = 0;
const totalModules = allModules.length;
let loadedModules = [];
let failedModules = [];

// Load modules sequentially to ensure proper order
async function loadModulesSequentially() {
  for (const src of allModules) {
    try {
      await loadModule(src);
      loadedModules.push(src);
      modulesLoaded++;
      console.log(`✅ Module loaded: ${src} (${loadedModules.length}/${totalModules})`);
    } catch (error) {
      failedModules.push(src);
      console.error(`❌ Failed to load module ${src}:`, error);
    }
  }
  
  console.log(`🚀 Module loading complete (${loadedModules.length}/${totalModules} loaded)`);
  initializeContentScript();
}

function loadModule(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Start sequential module loading
loadModulesSequentially();

// Global module instances
let messageHandler = null;
let elementHighlighter = null;
let continuousAnalysis = null;
let knowledgeChainTracker = null;
let chatBridge = null;
let elementInspector = null;

function initializeContentScript() {
  try {
    console.log('🔧 Initializing content script modules...');
    
    // Initialize modules only if they're available
    if (typeof ChatBridge !== 'undefined') {
      chatBridge = new ChatBridge();
      window.chatBridge = chatBridge;
      console.log('✅ ChatBridge initialized');
    } else {
      console.warn('⚠️ ChatBridge not available');
    }
    
    if (typeof ElementHighlighter !== 'undefined') {
      elementHighlighter = new ElementHighlighter();
      window.elementHighlighter = elementHighlighter;
      console.log('✅ ElementHighlighter initialized');
    } else {
      console.warn('⚠️ ElementHighlighter not available');
    }
    
    if (typeof ContinuousAnalysis !== 'undefined') {
      continuousAnalysis = new ContinuousAnalysis();
      window.continuousAnalysis = continuousAnalysis;
      console.log('✅ ContinuousAnalysis initialized');
    } else {
      console.warn('⚠️ ContinuousAnalysis not available');
    }
    
    if (typeof KnowledgeChainTracker !== 'undefined') {
      knowledgeChainTracker = new KnowledgeChainTracker();
      window.knowledgeChainTracker = knowledgeChainTracker;
      console.log('✅ KnowledgeChainTracker initialized');
    } else {
      console.warn('⚠️ KnowledgeChainTracker not available');
    }
    
    if (typeof ElementInspector !== 'undefined') {
      elementInspector = new ElementInspector();
      window.elementInspector = elementInspector;
      console.log('✅ ElementInspector initialized');
    } else {
      console.warn('⚠️ ElementInspector not available');
    }
    
    // Initialize message handler last (it depends on other modules)
    if (typeof ContentMessageHandler !== 'undefined') {
      messageHandler = new ContentMessageHandler();
      window.messageHandler = messageHandler;
      
      // Connect dependencies if available
      if (continuousAnalysis) messageHandler.continuousAnalysis = continuousAnalysis;
      if (elementHighlighter) messageHandler.elementHighlighter = elementHighlighter;
      if (chatBridge) messageHandler.chatBridge = chatBridge;
      
      console.log('✅ ContentMessageHandler initialized');
    } else {
      console.warn('⚠️ ContentMessageHandler not available');
    }
    
    console.log(`🎉 Content script initialization complete (${loadedModules.length}/${totalModules} modules loaded)`);
    
  } catch (error) {
    console.error('❌ Error during content script initialization:', error);
  }
}

// Fallback initialization if modules don't load properly
setTimeout(() => {
  if (modulesLoaded < totalModules) {
    console.warn(`Only ${modulesLoaded}/${totalModules} modules loaded. Initializing with available modules.`);
    // Don't call initializeContentScript again if it was already called
    if (loadedModules.length === 0) {
      initializeContentScript();
    }
  }
}, 5000);

// Ensure we have a basic message handler even if modules fail
if (!window.messageHandler) {
  // Create a minimal message handler for DOM analysis
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ success: true, loaded: true });
      return true;
    }
    
    if (request.action === 'analyzeDOM') {
      (async () => {
        try {
          // Try to load dom-analyzer.js if not available
          if (typeof DOMAnalyzer === 'undefined') {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL('dom-analyzer.js');
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
          }
          
          const analyzer = new DOMAnalyzer(request.config || {});
          const results = await analyzer.analyzeDOM(request.options || {});
          sendResponse({ success: true, data: results });
        } catch (error) {
          console.error('DOM analysis error:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }
  });
}
