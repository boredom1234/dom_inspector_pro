/**
 * DOM Inspector Pro - Main Popup Script
 * Extension-compatible version without ES6 imports
 */

// Application state
const applicationState = {
  isInitialized: false,
  extractedData: null
};

// DOM elements
let extractBtn, downloadBtn, copyBtn, openJsonEditorBtn;
let loadingSpinner, status;

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
  openJsonEditorBtn = document.getElementById('openJsonEditorBtn');
  
  loadingSpinner = document.getElementById('loadingSpinner');
  status = document.getElementById('status');
}

/**
 * Set up event listeners for UI elements
 */
function setupEventListeners() {
  if (extractBtn) extractBtn.addEventListener('click', extractElements);
  if (downloadBtn) downloadBtn.addEventListener('click', downloadResults);
  if (copyBtn) copyBtn.addEventListener('click', copyResults);
  if (openJsonEditorBtn) openJsonEditorBtn.addEventListener('click', openJsonEditor);
  
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
    
    // Get extraction options from checkboxes
    const extractionOptions = {
      domElements: document.getElementById('extractDOMElements').checked,
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

    // Get the active tab URL (the target page, not the extension)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Create enhanced data with URL information
    const dataWithUrl = {
      ...applicationState.extractedData,
      pageUrl: applicationState.extractedData.url || tab?.url || 'Unknown',
      pageTitle: applicationState.extractedData.title || tab?.title || 'Unknown',
      timestamp: applicationState.extractedData.timestamp || new Date().toISOString()
    };

    // Save enhanced data to storage for the editor
    await chrome.storage.local.set({ 
      extractedData: dataWithUrl 
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
    // Get the active tab URL (the target page, not the extension)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Create a copy with URL information at the top
    const dataWithUrl = {
      dom_insp_extr_data_json: true,
      pageUrl: applicationState.extractedData.url || tab?.url || 'Unknown',
      pageTitle: applicationState.extractedData.title || tab?.title || 'Unknown',
      timestamp: applicationState.extractedData.timestamp || new Date().toISOString(),
      ...applicationState.extractedData
    };
    
    const jsonData = JSON.stringify(dataWithUrl, null, 2);
    await navigator.clipboard.writeText(jsonData);
    showStatus('📋 Copied to clipboard!', 'success');
  } catch (error) {
    showStatus('❌ Failed to copy to clipboard', 'error');
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
 * Initialize slider value displays
 */
function initializeSliders() {
  // No sliders needed for basic functionality
}

/**
 * Get current analysis configuration
 */
function getAnalysisConfiguration() {
  return {
    includeHidden: document.getElementById('includeHidden')?.checked || false,
    onlyFormElements: document.getElementById('onlyFormElements')?.checked || false
  };
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
  if (config.includeHidden !== undefined && document.getElementById('includeHidden')) 
    document.getElementById('includeHidden').checked = config.includeHidden;
  if (config.onlyFormElements !== undefined && document.getElementById('onlyFormElements')) 
    document.getElementById('onlyFormElements').checked = config.onlyFormElements;
}

/**
 * Set up auto-save for configuration changes
 */
function setupAutoSave() {
  const configInputs = [
    'includeHidden', 'onlyFormElements'
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
  extractElements
};
