/**
 * DOM Inspector Pro - Main Popup Script
 * Extension-compatible version without ES6 imports
 */

// Application state
const applicationState = {
  isInitialized: false,
  continuousAnalysisActive: false,
  enhancedTrackingActive: false,
  currentAnalysis: null,
  extractedData: null
};

// DOM elements
let extractBtn, downloadBtn, copyBtn, continuousBtn, exportConfigBtn, toggleAdvancedBtn;
let loadingSpinner, status, progressFill, analysisDetails, advancedOptions;
let enhancedTrackingBtn, trackingStatus, contextCaptureBtn, openJsonEditorBtn;

/**
 * Main initialization function
 */
document.addEventListener("DOMContentLoaded", async function () {
  try {
    console.log('Initializing DOM Inspector Pro popup...');
    
    // Initialize DOM elements
    initializeDOMElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize sliders
    initializeSliders();
    
    // Load saved configuration
    loadSavedConfiguration();
    
    // Set up auto-save
    setupAutoSave();
    
    // Add side panel indicator
    document.body.classList.add('side-panel-mode');
    
    // Check enhanced tracking status
    checkEnhancedTrackingStatus();
    
    // Mark application as initialized
    applicationState.isInitialized = true;
    
    console.log('DOM Inspector Pro initialized successfully');
    
  } catch (error) {
    console.error('Failed to initialize DOM Inspector Pro:', error);
    showStatus('Failed to initialize application', 'error');
  }
});

/**
 * Initialize DOM element references
 */
function initializeDOMElements() {
  extractBtn = document.getElementById('extractBtn');
  downloadBtn = document.getElementById('downloadBtn');
  copyBtn = document.getElementById('copyBtn');
  continuousBtn = document.getElementById('continuousBtn');
  exportConfigBtn = document.getElementById('exportConfigBtn');
  enhancedTrackingBtn = document.getElementById('enhancedTrackingBtn');
  contextCaptureBtn = document.getElementById('contextCaptureBtn');
  trackingStatus = document.getElementById('trackingStatus');
  openJsonEditorBtn = document.getElementById('openJsonEditorBtn');
  toggleAdvancedBtn = document.getElementById('toggleAdvanced');
  
  loadingSpinner = document.getElementById('loadingSpinner');
  status = document.getElementById('status');
  progressFill = document.getElementById('progressFill');
  analysisDetails = document.getElementById('analysisDetails');
  advancedOptions = document.getElementById('advancedOptions');
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  if (extractBtn) extractBtn.addEventListener('click', extractElements);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadResults);
  if (copyBtn) copyBtn.addEventListener('click', copyResults);
  if (continuousBtn) continuousBtn.addEventListener('click', toggleContinuousAnalysis);
  if (exportConfigBtn) exportConfigBtn.addEventListener('click', exportConfiguration);
  if (enhancedTrackingBtn) enhancedTrackingBtn.addEventListener('click', toggleEnhancedTracking);
  if (contextCaptureBtn) contextCaptureBtn.addEventListener('click', captureContext);
  if (openJsonEditorBtn) openJsonEditorBtn.addEventListener('click', openJsonEditor);
  if (toggleAdvancedBtn) toggleAdvancedBtn.addEventListener('click', toggleAdvancedOptions);
  
  // Set up Element Attributes toggle functionality
  const extractElementAttributesCheckbox = document.getElementById('extractElementAttributes');
  if (extractElementAttributesCheckbox) {
    extractElementAttributesCheckbox.addEventListener('change', toggleIndividualAttributes);
    // Initialize state on load
    toggleIndividualAttributes();
  }
  
  // Set up DOM Elements dependency functionality
  const extractDOMElementsCheckbox = document.getElementById('extractDOMElements');
  if (extractDOMElementsCheckbox) {
    extractDOMElementsCheckbox.addEventListener('change', toggleDOMElementsDependencies);
    // Initialize state on load
    toggleDOMElementsDependencies();
  }
}

/**
 * Extract elements from the current page
 */
async function extractElements() {
  try {
    if (extractBtn) extractBtn.disabled = true;
    if (loadingSpinner) loadingSpinner.style.display = 'inline-block';
    showStatus('🔍 Extracting elements...', 'info');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get extraction options from checkboxes (same as captureContext)
    const extractionOptions = {
      domElements: document.getElementById('extractDOMElements').checked,
      interactions: document.getElementById('extractInteractions').checked,
      validations: document.getElementById('extractValidations').checked,
      conditionalRendering: document.getElementById('extractConditionalRendering').checked,
      pageMetadata: document.getElementById('extractPageMetadata').checked,
      xpaths: document.getElementById('extractXPaths').checked,
      elementText: document.getElementById('extractElementText').checked,
      elementAttributes: document.getElementById('extractElementAttributes').checked,
      // Individual attribute options
      className: document.getElementById('extractClassName').checked,
      disabled: document.getElementById('extractDisabled').checked,
      name: document.getElementById('extractName').checked,
      placeholder: document.getElementById('extractPlaceholder').checked,
      required: document.getElementById('extractRequired').checked,
      type: document.getElementById('extractType').checked,
      value: document.getElementById('extractValue').checked,
      visible: document.getElementById('extractVisible').checked
    };
    
    // Inject and execute extraction script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (options) => {
        try {
          // Extract elements based on checkbox options
          const extractedData = {
            elements: [],
            metadata: {}
          };
          
          // Page metadata
          if (options.pageMetadata) {
            extractedData.metadata = {
              timestamp: Date.now(),
              url: window.location.href,
              title: document.title,
              userAgent: navigator.userAgent
            };
          }
          
          // DOM Elements extraction
          if (options.domElements) {
            const interactiveSelectors = [
              'input', 'button', 'select', 'textarea', 'a[href]', 
              '[onclick]', '[role="button"]', '[tabindex]', 'form'
            ];
            
            interactiveSelectors.forEach(selector => {
              const elements = document.querySelectorAll(selector);
              elements.forEach((el, index) => {
                if (index < 500) { // Higher limit for Extract All Elements
                  const elementData = {
                    tagName: el.tagName.toLowerCase()
                  };
                  
                  // Add basic identifiers (always include tagName, id if present)
                  if (el.id) elementData.id = el.id;
                  if (el.href) elementData.href = el.href;
                  
                  // Add individual attributes based on checkboxes
                  if (options.elementAttributes) {
                    if (options.name && el.name) elementData.name = el.name;
                    if (options.type && el.type) elementData.type = el.type;
                    if (options.value && el.value) elementData.value = el.value;
                    if (options.className && el.className) elementData.className = el.className;
                    if (options.disabled) elementData.disabled = el.disabled || false;
                    if (options.required) elementData.required = el.required || false;
                    if (options.placeholder && el.placeholder) elementData.placeholder = el.placeholder;
                    if (options.visible) elementData.visible = el.offsetParent !== null;
                    
                    // Additional attributes
                    if (el.getAttribute('aria-label')) {
                      elementData.ariaLabel = el.getAttribute('aria-label');
                    }
                  }
                  
                  // Add text content if requested
                  if (options.elementText && el.textContent) {
                    elementData.text = el.textContent.trim().substring(0, 200);
                  }
                  
                  // Add XPath if requested
                  if (options.xpaths) {
                    elementData.xpath = getXPath(el);
                  }
                  
                  extractedData.elements.push(elementData);
                }
              });
            });
          }
          
          // Helper function to get XPath
          function getXPath(element) {
            if (element.id) return `//*[@id="${element.id}"]`;
            if (element === document.body) return '/html/body';
            
            let ix = 0;
            const siblings = element.parentNode?.childNodes || [];
            for (let i = 0; i < siblings.length; i++) {
              const sibling = siblings[i];
              if (sibling === element) {
                const tagName = element.tagName.toLowerCase();
                return `${getXPath(element.parentNode)}/${tagName}[${ix + 1}]`;
              }
              if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
              }
            }
            return '';
          }
          
          // Add extraction summary
          extractedData.summary = {
            totalElements: extractedData.elements.length,
            forms: extractedData.elements.filter(el => el.tagName === 'form').length,
            inputs: extractedData.elements.filter(el => el.tagName === 'input').length,
            buttons: extractedData.elements.filter(el => el.tagName === 'button' || el.type === 'submit').length,
            links: extractedData.elements.filter(el => el.tagName === 'a').length,
            extractionOptions: options
          };
          
          return extractedData;
        } catch (error) {
          console.error('Error extracting elements:', error);
          return { error: error.message };
        }
      },
      args: [extractionOptions]
    });
    
    if (results && results[0] && results[0].result) {
      if (results[0].result.error) {
        throw new Error(results[0].result.error);
      }
      
      applicationState.extractedData = results[0].result;
      
      // Enable action buttons
      if (downloadBtn) downloadBtn.disabled = false;
      if (copyBtn) copyBtn.disabled = false;
      if (continuousBtn) continuousBtn.disabled = false;
      if (openJsonEditorBtn) openJsonEditorBtn.disabled = false;
      
      const elementCount = applicationState.extractedData.elements?.length || 0;
      const summary = applicationState.extractedData.summary;
      
      // Show detailed status based on extraction options
      let statusParts = [`✅ Found ${elementCount} elements`];
      if (summary) {
        if (summary.forms > 0) statusParts.push(`${summary.forms} forms`);
        if (summary.inputs > 0) statusParts.push(`${summary.inputs} inputs`);
        if (summary.buttons > 0) statusParts.push(`${summary.buttons} buttons`);
        if (summary.links > 0) statusParts.push(`${summary.links} links`);
      }
      
      showStatus(statusParts.join(', '), 'success');
      console.log('Extraction completed:', applicationState.extractedData);
    } else {
      throw new Error('No data returned from extraction');
    }
    
  } catch (error) {
    console.error('Extraction error:', error);
    showStatus('❌ Failed to extract elements: ' + error.message, 'error');
  } finally {
    if (extractBtn) extractBtn.disabled = false;
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

/**
 * Open JSON Editor window
 */
async function openJsonEditor() {
  try {
    if (!applicationState.extractedData || !applicationState.extractedData.elements) {
      showStatus('No data to edit. Extract elements first.', 'error');
      return;
    }

    // Save data to storage for the editor
    await chrome.storage.local.set({ 
      extractedData: applicationState.extractedData 
    });

    // Open JSON editor in new window
    const editorWindow = await chrome.windows.create({
      url: chrome.runtime.getURL('json-editor.html'),
      type: 'popup',
      width: 1200,
      height: 800,
      focused: true
    });

    showStatus('JSON Editor opened', 'success');
  } catch (error) {
    console.error('Failed to open JSON editor:', error);
    showStatus('Failed to open JSON editor', 'error');
  }
}

/**
 * Download extracted results as JSON
 */
function downloadResults() {
  if (!applicationState.extractedData) return;
  
  const downloadData = {
    ...applicationState.extractedData,
    metadata: {
      generatedBy: 'DOM Inspector Pro',
      version: '2.0',
      downloadTimestamp: new Date().toISOString(),
      configuration: getAnalysisConfiguration()
    }
  };
  
  const jsonData = JSON.stringify(downloadData, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `dom_inspector_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus('📥 Results downloaded!', 'success');
}

/**
 * Copy results to clipboard
 */
async function copyResults() {
  if (!applicationState.extractedData) return;
  
  try {
    const jsonData = JSON.stringify(applicationState.extractedData, null, 2);
    await navigator.clipboard.writeText(jsonData);
    showStatus('📋 Copied to clipboard!', 'success');
  } catch (error) {
    showStatus('❌ Failed to copy to clipboard', 'error');
  }
}

/**
 * Toggle continuous analysis
 */
async function toggleContinuousAnalysis() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!applicationState.continuousAnalysisActive) {
    const config = getAnalysisConfiguration();
    config.analysisInterval = 5000;
    
    await chrome.tabs.sendMessage(tab.id, {
      action: 'continuousAnalysis',
      config: config
    });
    
    applicationState.continuousAnalysisActive = true;
    continuousBtn.textContent = '⏹️ Stop Continuous';
    continuousBtn.classList.add('btn-primary');
    continuousBtn.classList.remove('btn-secondary');
    
    showStatus('🔄 Continuous analysis started', 'success');
  } else {
    await chrome.tabs.sendMessage(tab.id, {
      action: 'stopContinuousAnalysis'
    });
    
    applicationState.continuousAnalysisActive = false;
    continuousBtn.textContent = '🔄 Start Continuous Analysis';
    continuousBtn.classList.remove('btn-primary');
    continuousBtn.classList.add('btn-secondary');
    
    showStatus('⏹️ Continuous analysis stopped', 'success');
  }
}

/**
 * Toggle advanced options visibility
 */
function toggleAdvancedOptions() {
  const isVisible = advancedOptions.classList.contains('visible');
  
  if (isVisible) {
    advancedOptions.classList.remove('visible');
    toggleAdvancedBtn.textContent = '🔧 Advanced Features';
  } else {
    advancedOptions.classList.add('visible');
    toggleAdvancedBtn.textContent = '🔧 Hide Advanced';
  }
}

/**
 * Toggle individual attribute checkboxes based on Element Attributes checkbox state
 */
function toggleIndividualAttributes() {
  const extractElementAttributesCheckbox = document.getElementById('extractElementAttributes');
  const isAttributesEnabled = extractElementAttributesCheckbox && extractElementAttributesCheckbox.checked;
  
  // List of individual attribute checkbox IDs
  const individualAttributeIds = [
    'extractClassName',
    'extractDisabled', 
    'extractName',
    'extractPlaceholder',
    'extractRequired',
    'extractType',
    'extractValue',
    'extractVisible'
  ];
  
  // Toggle each individual attribute checkbox
  individualAttributeIds.forEach(id => {
    const checkbox = document.getElementById(id);
    const checkboxItem = checkbox?.closest('.checkbox-item');
    
    if (checkbox && checkboxItem) {
      if (isAttributesEnabled) {
        // Enable the checkbox
        checkbox.disabled = false;
        checkboxItem.classList.remove('disabled');
      } else {
        // Disable the checkbox
        checkbox.disabled = true;
        checkboxItem.classList.add('disabled');
      }
    }
  });
}

/**
 * Toggle dependent checkboxes based on DOM Elements checkbox state
 */
function toggleDOMElementsDependencies() {
  const extractDOMElementsCheckbox = document.getElementById('extractDOMElements');
  const isDOMElementsEnabled = extractDOMElementsCheckbox && extractDOMElementsCheckbox.checked;
  
  // List of dependent checkbox IDs
  const dependentCheckboxIds = [
    'extractXPaths',
    'extractElementText',
    'extractElementAttributes',
    'extractPageMetadata',
    'includeHidden',
    'onlyFormElements'
  ];
  
  // Toggle each dependent checkbox
  dependentCheckboxIds.forEach(id => {
    const checkbox = document.getElementById(id);
    const checkboxItem = checkbox?.closest('.checkbox-item');
    
    if (checkbox && checkboxItem) {
      if (isDOMElementsEnabled) {
        // Enable the checkbox
        checkbox.disabled = false;
        checkboxItem.classList.remove('disabled');
      } else {
        // Disable the checkbox
        checkbox.disabled = true;
        checkboxItem.classList.add('disabled');
      }
    }
  });
  
  // Also handle the Individual Attributes section
  const individualAttributesDetails = document.querySelector('details.ml-8');
  if (individualAttributesDetails) {
    if (isDOMElementsEnabled) {
      individualAttributesDetails.style.opacity = '1';
      individualAttributesDetails.style.pointerEvents = 'auto';
    } else {
      individualAttributesDetails.style.opacity = '0.5';
      individualAttributesDetails.style.pointerEvents = 'none';
    }
  }
  
  // If DOM Elements is disabled, also trigger the individual attributes toggle
  // to ensure they are properly disabled
  if (!isDOMElementsEnabled) {
    toggleIndividualAttributes();
  }
}

/**
 * Enhanced tracking functions - Simplified approach
 */
async function toggleEnhancedTracking() {
  if (!applicationState.enhancedTrackingActive) {
    // Start enhanced tracking
    try {
      if (enhancedTrackingBtn) {
        enhancedTrackingBtn.disabled = true;
        enhancedTrackingBtn.textContent = '⏳ Starting...';
      }
      
      // Inject enhanced tracking directly into the page
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['shared/constants.js', 'dom-analyzer/core/element-extractor.js', 'content/interaction-tracker.js', 'content/validation-tracker.js', 'content/conditional-renderer-tracker.js', 'content/context-aggregator.js']
      });
      
      // Start tracking and store results globally
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          window.enhancedTrackingData = {
            interactions: [],
            validations: [],
            conditionalRendering: [],
            domSnapshot: null,
            startTime: Date.now()
          };
          
          // Initialize trackers
          if (window.ENHANCED_TRACKING_CONFIG) {
            window.contextAggregator = new window.ContextAggregator(window.ENHANCED_TRACKING_CONFIG.contextAggregation);
            window.contextAggregator.startAggregation();
          }
          
          console.log('✅ Enhanced tracking started - capturing comprehensive context');
          return true;
        }
      });
      
      applicationState.enhancedTrackingActive = true;
      if (enhancedTrackingBtn) {
        enhancedTrackingBtn.textContent = '🛑 Stop Enhanced Tracking';
        enhancedTrackingBtn.classList.remove('btn-secondary');
        enhancedTrackingBtn.classList.add('btn-primary');
      }
      
      showStatus('🚀 Enhanced tracking started - interact with the page, then capture context', 'success');
      
    } catch (error) {
      console.error('Error starting enhanced tracking:', error);
      showStatus('❌ Failed to start enhanced tracking: ' + error.message, 'error');
    } finally {
      if (enhancedTrackingBtn) enhancedTrackingBtn.disabled = false;
    }
  } else {
    // Stop enhanced tracking
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.contextAggregator) {
            window.contextAggregator.stopAggregation();
          }
          console.log('Enhanced tracking stopped');
          return true;
        }
      });
      
      applicationState.enhancedTrackingActive = false;
      if (enhancedTrackingBtn) {
        enhancedTrackingBtn.textContent = '🚀 Start Enhanced Tracking';
        enhancedTrackingBtn.classList.remove('btn-primary');
        enhancedTrackingBtn.classList.add('btn-secondary');
      }
      
      showStatus('⏹️ Enhanced tracking stopped', 'success');
    } catch (error) {
      console.error('Error stopping enhanced tracking:', error);
      showStatus('❌ Failed to stop enhanced tracking', 'error');
    }
  }
}

async function captureContext() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  try {
    if (contextCaptureBtn) {
      contextCaptureBtn.disabled = true;
      contextCaptureBtn.textContent = '📸 Capturing...';
    }
    
    // Get extraction options from checkboxes
    const extractionOptions = {
      domElements: document.getElementById('extractDOMElements').checked,
      interactions: document.getElementById('extractInteractions').checked,
      validations: document.getElementById('extractValidations').checked,
      conditionalRendering: document.getElementById('extractConditionalRendering').checked,
      pageMetadata: document.getElementById('extractPageMetadata').checked,
      xpaths: document.getElementById('extractXPaths').checked,
      elementText: document.getElementById('extractElementText').checked,
      elementAttributes: document.getElementById('extractElementAttributes').checked,
      // Individual attribute options
      className: document.getElementById('extractClassName').checked,
      disabled: document.getElementById('extractDisabled').checked,
      name: document.getElementById('extractName').checked,
      placeholder: document.getElementById('extractPlaceholder').checked,
      required: document.getElementById('extractRequired').checked,
      type: document.getElementById('extractType').checked,
      value: document.getElementById('extractValue').checked,
      visible: document.getElementById('extractVisible').checked
    };

    // Capture context directly from the page
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (options) => {
        try {
          // Capture comprehensive context based on options
          const context = {};
          
          // Page metadata
          if (options.pageMetadata) {
            context.timestamp = Date.now();
            context.url = window.location.href;
            context.title = document.title;
          }
          
          // Enhanced tracking data if available
          if (options.interactions && window.enhancedTrackingData) {
            context.enhancedData = window.enhancedTrackingData;
          }
          
          // Context aggregator data if available
          if ((options.validations || options.conditionalRendering) && window.contextAggregator) {
            context.aggregatedContext = window.contextAggregator.getCurrentContext();
          }
          
          // DOM Elements
          if (options.domElements) {
            context.domElements = [];
          }
          
          // Extract interactive elements for test generation
          if (options.domElements) {
            const interactiveSelectors = [
              'input', 'button', 'select', 'textarea', 'a[href]', 
              '[onclick]', '[role="button"]', '[tabindex]', 'form'
            ];
            
            interactiveSelectors.forEach(selector => {
              const elements = document.querySelectorAll(selector);
              elements.forEach((el, index) => {
                if (index < 100) { // Limit to prevent overflow
                  const elementData = {
                    tagName: el.tagName.toLowerCase()
                  };
                  
                  // Add basic identifiers (always include tagName, id if present)
                  if (el.id) elementData.id = el.id;
                  if (el.href) elementData.href = el.href;
                  
                  // Add individual attributes based on checkboxes
                  if (options.elementAttributes) {
                    if (options.name && el.name) elementData.name = el.name;
                    if (options.type && el.type) elementData.type = el.type;
                    if (options.value && el.value) elementData.value = el.value;
                    if (options.className && el.className) elementData.className = el.className;
                    if (options.disabled) elementData.disabled = el.disabled || false;
                    if (options.required) elementData.required = el.required || false;
                    if (options.placeholder && el.placeholder) elementData.placeholder = el.placeholder;
                    if (options.visible) elementData.visible = el.offsetParent !== null;
                  }
                  
                  // Add text content if requested
                  if (options.elementText && el.textContent) {
                    elementData.text = el.textContent.trim().substring(0, 100);
                  }
                  
                  // Add XPath if requested
                  if (options.xpaths) {
                    elementData.xpath = getXPath(el);
                  }
                  
                  context.domElements.push(elementData);
                }
              });
            });
          }
          
          // Helper function to get XPath
          function getXPath(element) {
            if (element.id) return `//*[@id="${element.id}"]`;
            if (element === document.body) return '/html/body';
            
            let ix = 0;
            const siblings = element.parentNode?.childNodes || [];
            for (let i = 0; i < siblings.length; i++) {
              const sibling = siblings[i];
              if (sibling === element) {
                const tagName = element.tagName.toLowerCase();
                return `${getXPath(element.parentNode)}/${tagName}[${ix + 1}]`;
              }
              if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
              }
            }
            return '';
          }
          
          // Summary for display
          const summary = {
            totalElements: context.domElements ? context.domElements.length : 0,
            forms: context.domElements ? context.domElements.filter(el => el.tagName === 'form').length : 0,
            inputs: context.domElements ? context.domElements.filter(el => el.tagName === 'input').length : 0,
            buttons: context.domElements ? context.domElements.filter(el => el.tagName === 'button' || el.type === 'submit').length : 0,
            links: context.domElements ? context.domElements.filter(el => el.tagName === 'a').length : 0,
            hasEnhancedData: !!context.enhancedData,
            trackingDuration: context.enhancedData ? Date.now() - context.enhancedData.startTime : 0,
            extractionOptions: options
          };
          
          return { context, summary };
        } catch (error) {
          console.error('Error capturing context:', error);
          return { error: error.message };
        }
      },
      args: [extractionOptions]
    });
    
    if (results[0].result.error) {
      throw new Error(results[0].result.error);
    }
    
    const { context, summary } = results[0].result;
    
    // Store context for copying
    applicationState.lastCapturedContext = context;
    
    // Copy to clipboard automatically
    await navigator.clipboard.writeText(JSON.stringify(context, null, 2));
    
    showStatus('📸 Context captured and copied to clipboard!', 'success');
    
    // Show summary
    const summaryText = `
Context Summary:
• Total interactive elements: ${summary.totalElements}
• Forms: ${summary.forms}
• Input fields: ${summary.inputs}  
• Buttons: ${summary.buttons}
• Links: ${summary.links}
• Enhanced tracking: ${summary.hasEnhancedData ? '✅' : '❌'}
${summary.hasEnhancedData ? `• Tracking duration: ${Math.round(summary.trackingDuration/1000)}s` : ''}

✅ Full context copied to clipboard!
    `.trim();
    
    console.log(summaryText);
    console.log('Full Context Data:', context);
    
  } catch (error) {
    console.error('Error capturing context:', error);
    showStatus('❌ Failed to capture context: ' + error.message, 'error');
  } finally {
    if (contextCaptureBtn) {
      contextCaptureBtn.disabled = false;
      contextCaptureBtn.textContent = '📸 Capture Context';
    }
  }
}

function updateTrackingStatus(status) {
  if (!trackingStatus) return;
  
  if (status) {
    const statusText = `
Tracking Status:
• Interactions: ${status.trackersActive?.interactions ? '✅' : '❌'}
• Validations: ${status.trackersActive?.validations ? '✅' : '❌'}
• Conditional Rendering: ${status.trackersActive?.conditionalRendering ? '✅' : '❌'}
• Context History: ${status.contextHistorySize || 0} entries
    `.trim();
    
    trackingStatus.textContent = statusText;
    trackingStatus.style.display = 'block';
  } else {
    trackingStatus.style.display = 'none';
  }
}

async function checkEnhancedTrackingStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'getEnhancedTrackingStatus'
    });
    
    if (response.success) {
      applicationState.enhancedTrackingActive = response.enabled;
      
      if (response.enabled) {
        if (enhancedTrackingBtn) {
          enhancedTrackingBtn.textContent = '🛑 Stop Enhanced Tracking';
          enhancedTrackingBtn.classList.remove('btn-secondary');
          enhancedTrackingBtn.classList.add('btn-primary');
        }
        updateTrackingStatus(response.status);
      } else {
        if (enhancedTrackingBtn) {
          enhancedTrackingBtn.textContent = '🚀 Start Enhanced Tracking';
          enhancedTrackingBtn.classList.remove('btn-primary');
          enhancedTrackingBtn.classList.add('btn-secondary');
        }
        updateTrackingStatus(null);
      }
    }
  } catch (error) {
    // Content script might not be loaded yet
    console.debug('Could not check enhanced tracking status:', error.message);
  }
}

/**
 * Initialize slider value displays
 */
function initializeSliders() {
  const sliders = ['diffDepth', 'maxDependencyDepth', 'stageTimeout', 'maxDepth'];
  
  sliders.forEach(sliderId => {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(sliderId + 'Value');
    
    if (slider && valueDisplay) {
      slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value;
      });
    }
  });
}

/**
 * Get current analysis configuration
 */
function getAnalysisConfiguration() {
  return {
    includeHidden: document.getElementById('includeHidden').checked,
    includeText: document.getElementById('includeText').checked,
    includeAttributes: document.getElementById('includeAttributes').checked,
    onlyFormElements: document.getElementById('onlyFormElements').checked,
    diffEnabled: document.getElementById('diffEnabled')?.checked || false,
    diffDepth: parseInt(document.getElementById('diffDepth')?.value || 10),
    dependencyTracking: document.getElementById('dependencyTracking')?.checked || false,
    maxDependencyDepth: parseInt(document.getElementById('maxDependencyDepth')?.value || 5),
    multiStageEnabled: document.getElementById('multiStageEnabled')?.checked || false,
    stageTimeout: parseInt(document.getElementById('stageTimeout')?.value || 2000),
    templateRecognition: document.getElementById('templateRecognition')?.checked || false,
    semanticAnalysis: document.getElementById('semanticAnalysis')?.checked || false,
    maxDepth: parseInt(document.getElementById('maxDepth')?.value || 15)
  };
}

/**
 * Export configuration to file
 */
function exportConfiguration() {
  const config = getAnalysisConfiguration();
  const configData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    configuration: config,
    description: 'DOM Inspector Pro Configuration'
  };
  
  const jsonData = JSON.stringify(configData, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `dom-inspector-config-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showStatus('⚙️ Configuration exported!', 'success');
}

/**
 * Save configuration to storage
 */
function saveConfiguration(config) {
  try {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        'domInspectorConfig': config,
        'configTimestamp': Date.now()
      });
    } else {
      localStorage.setItem('domInspectorConfig', JSON.stringify(config));
      localStorage.setItem('configTimestamp', Date.now().toString());
    }
  } catch (error) {
    console.warn('Failed to save configuration:', error);
  }
}

/**
 * Load saved configuration
 */
function loadSavedConfiguration() {
  try {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['domInspectorConfig'], (result) => {
        if (result.domInspectorConfig) {
          applyConfiguration(result.domInspectorConfig);
        }
      });
    } else {
      const savedConfig = localStorage.getItem('domInspectorConfig');
      if (savedConfig) {
        try {
          const config = JSON.parse(savedConfig);
          applyConfiguration(config);
        } catch (e) {
          console.warn('Failed to parse saved configuration:', e);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load configuration:', error);
  }
}

/**
 * Apply configuration to UI elements
 */
function applyConfiguration(config) {
  if (config.includeHidden !== undefined) 
    document.getElementById('includeHidden').checked = config.includeHidden;
  if (config.includeText !== undefined) 
    document.getElementById('includeText').checked = config.includeText;
  if (config.includeAttributes !== undefined) 
    document.getElementById('includeAttributes').checked = config.includeAttributes;
  if (config.onlyFormElements !== undefined) 
    document.getElementById('onlyFormElements').checked = config.onlyFormElements;
  
  if (config.diffEnabled !== undefined && document.getElementById('diffEnabled')) 
    document.getElementById('diffEnabled').checked = config.diffEnabled;
  if (config.diffDepth !== undefined && document.getElementById('diffDepth')) {
    document.getElementById('diffDepth').value = config.diffDepth;
    document.getElementById('diffDepthValue').textContent = config.diffDepth;
  }
  if (config.dependencyTracking !== undefined && document.getElementById('dependencyTracking')) 
    document.getElementById('dependencyTracking').checked = config.dependencyTracking;
  if (config.maxDependencyDepth !== undefined && document.getElementById('maxDependencyDepth')) {
    document.getElementById('maxDependencyDepth').value = config.maxDependencyDepth;
    document.getElementById('maxDependencyDepthValue').textContent = config.maxDependencyDepth;
  }
  if (config.multiStageEnabled !== undefined && document.getElementById('multiStageEnabled')) 
    document.getElementById('multiStageEnabled').checked = config.multiStageEnabled;
  if (config.stageTimeout !== undefined && document.getElementById('stageTimeout')) {
    document.getElementById('stageTimeout').value = config.stageTimeout;
    document.getElementById('stageTimeoutValue').textContent = config.stageTimeout;
  }
  if (config.templateRecognition !== undefined && document.getElementById('templateRecognition')) 
    document.getElementById('templateRecognition').checked = config.templateRecognition;
  if (config.semanticAnalysis !== undefined && document.getElementById('semanticAnalysis')) 
    document.getElementById('semanticAnalysis').checked = config.semanticAnalysis;
  if (config.maxDepth !== undefined && document.getElementById('maxDepth')) {
    document.getElementById('maxDepth').value = config.maxDepth;
    document.getElementById('maxDepthValue').textContent = config.maxDepth;
  }
}

/**
 * Set up auto-save for configuration changes
 */
function setupAutoSave() {
  const configInputs = [
    'includeHidden', 'includeText', 'includeAttributes', 'onlyFormElements',
    'diffEnabled', 'diffDepth', 'dependencyTracking', 'maxDependencyDepth',
    'multiStageEnabled', 'stageTimeout', 'templateRecognition', 'semanticAnalysis', 'maxDepth'
  ];
  
  configInputs.forEach(inputId => {
    const element = document.getElementById(inputId);
    if (element) {
      if (element.type === 'checkbox') {
        element.addEventListener('change', saveConfigurationAutomatically);
      } else if (element.type === 'range') {
        element.addEventListener('input', saveConfigurationAutomatically);
      } else {
        element.addEventListener('input', saveConfigurationAutomatically);
      }
    }
  });
}

/**
 * Auto-save configuration changes
 */
function saveConfigurationAutomatically() {
  const config = getAnalysisConfiguration();
  saveConfiguration(config);
}

/**
 * Show status message
 */
function showStatus(message, type) {
  if (!status) return;
  
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    if (status) status.style.display = 'none';
  }, 3000);
}

/**
 * Function to be injected into the page for DOM extraction
 * Optimized for test generation - reduces data by 60-70%
 */
function extractElementData(options) {
  // Helper function to generate XPath
  function getXPath(element) {
    if (element === document.body) return '/html/body';
    
    let path = [];
    for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
      let index = 0;
      let hasFollowingSiblings = false;
      for (let sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
        if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
        if (sibling.nodeName === element.nodeName) ++index;
      }
      for (let sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
        if (sibling.nodeName === element.nodeName) hasFollowingSiblings = true;
      }
      
      const tagName = element.nodeName.toLowerCase();
      const pathIndex = index || hasFollowingSiblings ? `[${index + 1}]` : '';
      path.unshift(`${tagName}${pathIndex}`);
    }
    
    return path.length ? `/${path.join('/')}` : null;
  }
  
  // Filter attributes to only essential ones for testing
  function filterEssentialAttributes(element) {
    const essential = ['id', 'name', 'type', 'value', 'href', 'role', 'aria-label', 'placeholder'];
    const filtered = {};
    
    essential.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        filtered[attr] = value;
      }
    });
    
    return Object.keys(filtered).length > 0 ? filtered : null;
  }
  
  // Check if element is interactive/testable
  function isTestableElement(element) {
    const interactiveTags = ['input', 'button', 'select', 'textarea', 'a', 'form', 'fieldset'];
    const tag = element.tagName.toLowerCase();
    
    return interactiveTags.includes(tag) || 
           element.hasAttribute('onclick') || 
           element.hasAttribute('role') ||
           element.hasAttribute('tabindex') ||
           (tag === 'a' && element.hasAttribute('href'));
  }
  
  // Get only interactive/testable elements
  const interactiveSelectors = [
    'input', 'button', 'select', 'textarea', 'a[href]',
    '[onclick]', '[role="button"]', '[tabindex]',
    'form', 'fieldset'
  ];
  
  let elements = [];
  interactiveSelectors.forEach(selector => {
    try {
      elements.push(...document.querySelectorAll(selector));
    } catch (e) {
      console.warn('Invalid selector:', selector);
    }
  });
  
  // Remove duplicates
  elements = [...new Set(elements)];
  
  // Extract optimized element data
  const extractedElements = [];
  elements.forEach((element) => {
    // Skip hidden elements unless explicitly included
    if (!options.includeHidden) {
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return;
      }
    }
    
    // Only include elements that are useful for testing
    if (!isTestableElement(element)) {
      return;
    }
    
    const elementData = {
      tagName: element.tagName.toLowerCase(),
      xpath: getXPath(element),
      name: element.name || null,
      type: element.type || null,
      value: element.value || null,
      text: element.textContent?.trim() || null,
      attributes: filterEssentialAttributes(element),
      
      // Element state (compact)
      state: {
        visible: !element.hidden && element.offsetParent !== null,
        enabled: !element.disabled,
        selected: element.checked || element.selected || false
      },
      
      // Form context (minimal)
      form: element.form ? element.form.name || element.form.id || 'form' : null,
      
      // Validation (only if present)
      validation: element.required || element.pattern || element.min || element.max ? {
        required: element.required || false,
        pattern: element.pattern || null,
        min: element.min || null,
        max: element.max || null
      } : null
    };
    
    // Only keep elements with meaningful data
    if (elementData.name || 
        elementData.type || 
        elementData.text || 
        elementData.attributes?.id ||
        ['button', 'a', 'form'].includes(elementData.tagName)) {
      extractedElements.push(elementData);
    }
  });
  
  // Return optimized results
  return {
    elements: extractedElements,
    url: window.location.href,
    title: document.title,
    extractedAt: new Date().toISOString()
  };
}

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  showStatus('An unexpected error occurred', 'error');
});

// Handle uncaught exceptions
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  showStatus('An unexpected error occurred', 'error');
});

// Export for debugging
window.DOMInspectorPro = {
  getApplicationState: () => applicationState,
  extractElements,
  getAnalysisConfiguration
};
