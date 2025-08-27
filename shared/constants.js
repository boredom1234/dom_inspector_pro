/**
 * Shared Constants for DOM Inspector Pro Extension
 * Centralized configuration and constants used across all modules
 */

// API Configuration - Global declarations for content script compatibility
window.API_CONFIG = {
    MCP_BASE_URL: 'http://localhost:3000',
    MCP_EXTENSION_ENDPOINT: '/api/extension-dom',
    CHAT_TOOL_ORIGIN: 'http://localhost:3000',
    REQUEST_TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3
};

// Extension Configuration
window.EXTENSION_CONFIG = {
    NAME: 'DOM Inspector Pro',
    VERSION: '2.0',
    MIN_DEBOUNCE_TIME: 1000, // 1 second
    STATUS_UPDATE_DEBOUNCE: 3000, // 3 seconds
    MAX_TEXT_LENGTH: 200,
    MAX_ANALYSIS_DEPTH: 20,
    MAX_STAGES: 15
};

// DOM Analysis Configuration
window.DOM_ANALYSIS_CONFIG = {
    DEFAULT_CONFIG: {
        includeHidden: false,
        includeText: true,
        includeAttributes: true,
        onlyFormElements: false,
        maxDepth: 20
    },
    ADVANCED_FEATURES: {
        diffEnabled: false,
        diffDepth: 15,
        dependencyTracking: false,
        maxDependencyDepth: 10,
        multiStageEnabled: false,
        stageTimeout: 2000,
        templateRecognition: false,
        semanticAnalysis: false
    },
    DIFF_IGNORE_ATTRIBUTES: ['style', 'data-timestamp'],
    ANALYSIS_INTERVAL: 5000 // 5 seconds for continuous analysis
};

// UI Constants
window.UI_CONSTANTS = {
    STATUS_TYPES: {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    },
    BUTTON_STATES: {
        ENABLED: false,
        DISABLED: true
    },
    PROGRESS_STEPS: {
        INITIALIZING: 10,
        CONFIG_LOADED: 20,
        ANALYSIS_START: 30,
        SCRIPT_INJECTION: 40,
        PROCESSING: 70,
        FINALIZING: 90,
        COMPLETE: 100
    }
};

// Storage Keys
export const STORAGE_KEYS = {
    DOM_INSPECTOR_CONFIG: 'domInspectorConfig',
    CONFIG_TIMESTAMP: 'configTimestamp',
    ACTIVE_CHAT_ID: 'activeChatId',
    SAVED_CHAT_ID: 'savedChatId',
    LAST_MCP_SNAPSHOT: 'lastMCPSnapshot'
};

// Session Storage Keys
export const SESSION_KEYS = {
    ACTIVE_CHAT_ID: 'scira_active_chat_id',
    INTERACTION_SEQUENCE: 'interaction_sequence'
};

// Common Selectors
window.SELECTORS = {
    FORM_ELEMENTS: 'input, select, textarea, button, form, label, fieldset, legend, optgroup, option, datalist',
    INTERACTIVE_ELEMENTS: 'a, button, input, select, textarea, details, [tabindex], [onclick], [role="button"], [role="link"]',
    CLICKABLE_ELEMENTS: 'button, input[type="button"], input[type="submit"], a[href]',
    SEMANTIC_ELEMENTS: 'main, nav, header, footer, aside, section, article, form, button, input, select, textarea'
};

// Priority Attributes for Element Identification
export const PRIORITY_ATTRIBUTES = [
    'data-testid',
    'data-test', 
    'data-cy',
    'data-selenium',
    'id',
    'name',
    'aria-label',
    'role',
    'type',
    'class'
];

// Interactive Tags
export const INTERACTIVE_TAGS = [
    'input', 'button', 'select', 'textarea', 'a', 'form'
];

// Form Element Tags
export const FORM_TAGS = [
    'input', 'select', 'textarea', 'button', 'form', 'label', 'fieldset', 'legend'
];

// Message Types for Extension Communication
export const MESSAGE_TYPES = {
    // Content Script Messages
    PING: 'ping',
    ANALYZE_DOM: 'analyzeDOM',
    TOGGLE_HIGHLIGHT: 'toggleHighlight',
    GET_ELEMENT_INFO: 'getElementInfo',
    GET_CURRENT_CHAT_ID: 'getCurrentChatId',
    CONTINUOUS_ANALYSIS: 'continuousAnalysis',
    STOP_CONTINUOUS_ANALYSIS: 'stopContinuousAnalysis',
    
    // Enhanced tracking messages
    INTERACTION_DATA: 'interactionData',
    VALIDATION_DATA: 'validationData',
    CONDITIONAL_RENDER_DATA: 'conditionalRenderData',
    CONTEXT_DATA: 'contextData',
    START_ENHANCED_TRACKING: 'startEnhancedTracking',
    STOP_ENHANCED_TRACKING: 'stopEnhancedTracking',
    
    // Background Messages
    DOM_CHANGED: 'domChanged',
    
    // Cross-window Messages
    REQUEST_CHAT_ID: 'REQUEST_CHAT_ID',
    CHAT_ID_RESPONSE: 'CHAT_ID_RESPONSE',
    SET_CHAT_ID: 'SET_CHAT_ID'
};

// Interaction Types for Knowledge Chain
window.INTERACTION_TYPES = {
    PAGE_LOAD: 'page_load',
    USER_INPUT: 'user_input',
    FORM_SUBMIT: 'form_submit',
    CLICK: 'click',
    NAVIGATION: 'navigation',
    DOM_CHANGE: 'dom_change',
    
    // Enhanced interaction types
    FOCUS: 'focus',
    BLUR: 'blur',
    SCROLL: 'scroll',
    KEYDOWN: 'keydown',
    KEYUP: 'keyup',
    INPUT: 'input',
    CHANGE: 'change',
    SUBMIT: 'submit',
    MOUSE_ENTER: 'mouse_enter',
    MOUSE_LEAVE: 'mouse_leave',
    VISIBILITY_CHANGE: 'visibility_change',
    RESIZE: 'resize'
};

// Analysis Features
export const ANALYSIS_FEATURES = {
    DOM_DIFF: 'domDiff',
    DEPENDENCY_GRAPH: 'dependencyGraph',
    MULTI_STAGE: 'multiStageFlow',
    TEMPLATE_RECOGNITION: 'detectedPatterns',
    COMPREHENSIVE_EXTRACTION: 'comprehensiveExtraction'
};

// Pattern Types
export const PATTERN_TYPES = {
    FORM: 'form',
    NAVIGATION: 'navigation',
    DATA_DISPLAY: 'data_display',
    OVERLAY: 'overlay',
    PROGRESSIVE_DISCLOSURE: 'progressive_disclosure'
};

// Testing Strategies
export const TESTING_STRATEGIES = {
    FORM_SUBMISSION: 'form_submission',
    NAVIGATION_FLOW: 'navigation_flow',
    DATA_VALIDATION: 'data_validation',
    MODAL_INTERACTION: 'modal_interaction',
    PROGRESSIVE_DISCLOSURE: 'progressive_disclosure'
};

// Error Messages
export const ERROR_MESSAGES = {
    CHAT_ID_NOT_FOUND: 'No localhost:3000 tabs found. Please open your chat first or enter Chat ID manually.',
    CHAT_ID_NO_URL: 'Found localhost tabs but no /chat/ URLs. Please enter Chat ID manually.',
    DOM_ANALYSIS_FAILED: 'Error in advanced analysis',
    MCP_INTEGRATION_FAILED: 'Failed to send to Tool',
    STORAGE_FAILED: 'Failed to save configuration',
    CONTENT_SCRIPT_NOT_LOADED: 'Content script not responding, using legacy extraction method'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    ANALYSIS_COMPLETE: 'Analysis complete!',
    DATA_COPIED: 'Copied to clipboard!',
    CONFIG_EXPORTED: 'Configuration exported!',
    SETTINGS_SAVED: 'Settings auto-saved',
    MCP_DATA_SENT: 'DOM data sent to MCP Tool successfully'
};

// CSS Classes
export const CSS_CLASSES = {
    SIDE_PANEL_MODE: 'side-panel-mode',
    VISIBLE: 'visible',
    ACTIVE: 'active',
    BTN_PRIMARY: 'btn-primary',
    BTN_SECONDARY: 'btn-secondary',
    STATUS_SUCCESS: 'success',
    STATUS_ERROR: 'error',
    STATUS_WARNING: 'warning',
    STATUS_INFO: 'info'
};

// Mutation Observer Configuration
export const MUTATION_CONFIG = {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'value', 'disabled', 'checked']
};

// Default Timeouts
export const TIMEOUTS = {
    AUTO_HIDE_PROGRESS: 2000,
    STATUS_FADE: 1500,
    CROSS_ORIGIN_REQUEST: 2000,
    STAGE_TIMEOUT: 2000,
    INTERACTION_DEBOUNCE: 100,
    VALIDATION_DEBOUNCE: 300,
    CONDITIONAL_DEBOUNCE: 200,
    CONTEXT_AGGREGATION: 2000
};

// File Extensions and MIME Types
export const FILE_CONFIG = {
    JSON_MIME_TYPE: 'application/json',
    CONFIG_FILE_PREFIX: 'dom-inspector-config-',
    ANALYSIS_FILE_PREFIX: 'dom_inspector_analysis_'
};

// Optimized extraction configuration for test generation
window.OPTIMIZED_EXTRACTION_CONFIG = {
  // Focus only on interactive and form elements
  includeOnlySelectors: [
    'input', 'button', 'select', 'textarea', 'a[href]', 
    '[onclick]', '[role="button"]', '[tabindex]',
    'form', 'fieldset' // Keep form containers for context
  ],
  
  // Exclude non-essential elements
  excludeSelectors: [
    'script', 'style', 'meta', 'link', 'title',
    'head', 'html:not(:has(input,button,select,textarea,a))'
  ],
  
  // Minimal required fields for test generation
  extractionFields: {
    // Essential identifiers
    tagName: true,
    xpath: true,
    cssSelector: false, // Use xpath as primary selector
    
    // Form-specific data
    name: true,
    type: true,
    value: true,
    
    // Interaction data
    attributes: {
      whitelist: ['id', 'name', 'type', 'value', 'href', 'role', 'aria-label']
    },
    
    // Context for test readability
    text: true, // Only for elements with meaningful text
    
    // Omit these fields
    index: false,
    className: false, // Use id/name for identification instead
    domTree: false,
    timestamp: false,
    options: false
  },
  
  // Performance optimizations
  maxDepth: 10,
  includeHidden: false,
  onlyFormElements: true // New flag to focus extraction
};

// Performance Limits
window.PERFORMANCE_LIMITS = {
  MAX_INTERACTIONS: 1000,
  MAX_TRACKED_ELEMENTS: 1000,
  MAX_CONTEXT_SIZE: 50000,
  MAX_VALIDATION_STATES: 500,
  MAX_CONDITIONAL_ELEMENTS: 300
};

// Enhanced Tracking Configuration
window.ENHANCED_TRACKING_CONFIG = {
  interactions: {
    trackClicks: true,
    trackFocus: true,
    trackFormInteractions: true,
    trackScroll: true,
    trackKeyboard: false, // Reduce noise
    trackMouse: false,    // Performance intensive
    debounceDelay: 100
  },
  validation: {
    trackValidationStates: true,
    trackErrorMessages: true,
    trackConditionalFields: true,
    trackFormSteps: true,
    debounceDelay: 300
  },
  conditionalRendering: {
    trackVisibilityChanges: true,
    trackDynamicContent: true,
    trackStateChanges: true,
    trackAsyncLoading: true,
    debounceDelay: 200
  },
  contextAggregation: {
    enableInteractionTracking: true,
    enableValidationTracking: true,
    enableConditionalTracking: true,
    enableDOMExtraction: true,
    aggregationInterval: 2000,
    optimizeForTestGeneration: true
  }
};
