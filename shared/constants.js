/**
 * Shared Constants for DOM Inspector Pro Extension
 * Centralized configuration and constants used across all modules
 */


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
};

// Storage Keys
export const STORAGE_KEYS = {
    DOM_INSPECTOR_CONFIG: 'domInspectorConfig',
    CONFIG_TIMESTAMP: 'configTimestamp'
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
    
};



// Error Messages
export const ERROR_MESSAGES = {
    DOM_ANALYSIS_FAILED: 'Error in analysis',
    STORAGE_FAILED: 'Failed to save configuration',
    CONTENT_SCRIPT_NOT_LOADED: 'Content script not responding, using legacy extraction method'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    ANALYSIS_COMPLETE: 'Analysis complete!',
    DATA_COPIED: 'Copied to clipboard!',
    SETTINGS_SAVED: 'Settings auto-saved'
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
    STATUS_FADE: 1500
};

// File Extensions and MIME Types
export const FILE_CONFIG = {
    JSON_MIME_TYPE: 'application/json',
    CONFIG_FILE_PREFIX: 'dom-inspector-config-',
    ANALYSIS_FILE_PREFIX: 'dom_inspector_analysis_'
};

