/**
 * Validation Utilities - Input validation and sanitization functions
 * Used across extension modules for data validation and security
 */

/**
 * Validate chat ID format
 * @param {string} chatId - Chat ID to validate
 * @returns {Object} - Validation result with isValid and error
 */
export function validateChatId(chatId) {
    if (!chatId || typeof chatId !== 'string') {
        return { isValid: false, error: 'Chat ID is required and must be a string' };
    }

    const trimmed = chatId.trim();
    if (trimmed.length === 0) {
        return { isValid: false, error: 'Chat ID cannot be empty' };
    }

    if (trimmed.length < 3) {
        return { isValid: false, error: 'Chat ID too short (minimum 3 characters)' };
    }

    if (trimmed.length > 100) {
        return { isValid: false, error: 'Chat ID too long (maximum 100 characters)' };
    }

    // Allow alphanumeric, hyphens, underscores, and dots
    const validFormat = /^[a-zA-Z0-9._-]+$/.test(trimmed);
    if (!validFormat) {
        return { isValid: false, error: 'Chat ID contains invalid characters' };
    }

    return { isValid: true, chatId: trimmed };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {Object} - Validation result
 */
export function validateUrl(url) {
    if (!url || typeof url !== 'string') {
        return { isValid: false, error: 'URL is required' };
    }

    try {
        const urlObj = new URL(url);
        const allowedProtocols = ['http:', 'https:'];
        
        if (!allowedProtocols.includes(urlObj.protocol)) {
            return { isValid: false, error: 'Invalid protocol (only HTTP/HTTPS allowed)' };
        }

        return { isValid: true, url: urlObj.href };
    } catch (error) {
        return { isValid: false, error: 'Invalid URL format' };
    }
}

/**
 * Validate analysis configuration
 * @param {Object} config - Configuration object
 * @returns {Object} - Validation result
 */
export function validateAnalysisConfig(config) {
    if (!config || typeof config !== 'object') {
        return { isValid: false, error: 'Configuration must be an object' };
    }

    const errors = [];
    const sanitized = {};

    // Validate boolean fields
    const booleanFields = [
        'includeHidden', 'includeText', 'includeAttributes', 'onlyFormElements',
        'diffEnabled', 'dependencyTracking', 'multiStageEnabled', 
        'templateRecognition', 'semanticAnalysis'
    ];

    booleanFields.forEach(field => {
        if (config[field] !== undefined) {
            if (typeof config[field] === 'boolean') {
                sanitized[field] = config[field];
            } else {
                sanitized[field] = Boolean(config[field]);
            }
        }
    });

    // Validate numeric fields with ranges
    const numericFields = {
        maxDepth: { min: 1, max: 50, default: 15 },
        diffDepth: { min: 1, max: 20, default: 10 },
        maxDependencyDepth: { min: 1, max: 10, default: 5 },
        stageTimeout: { min: 100, max: 10000, default: 2000 }
    };

    Object.entries(numericFields).forEach(([field, { min, max, default: defaultValue }]) => {
        if (config[field] !== undefined) {
            const value = parseInt(config[field], 10);
            if (isNaN(value)) {
                errors.push(`${field} must be a number`);
                sanitized[field] = defaultValue;
            } else if (value < min || value > max) {
                errors.push(`${field} must be between ${min} and ${max}`);
                sanitized[field] = Math.max(min, Math.min(max, value));
            } else {
                sanitized[field] = value;
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        config: sanitized
    };
}

/**
 * Sanitize text input
 * @param {string} text - Text to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized text
 */
export function sanitizeText(text, options = {}) {
    if (typeof text !== 'string') {
        return '';
    }

    const {
        maxLength = 1000,
        allowHtml = false,
        trimWhitespace = true,
        removeControlChars = true
    } = options;

    let sanitized = text;

    // Trim whitespace
    if (trimWhitespace) {
        sanitized = sanitized.trim();
    }

    // Remove control characters
    if (removeControlChars) {
        sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    }

    // Remove HTML if not allowed
    if (!allowHtml) {
        sanitized = sanitized.replace(/<[^>]*>/g, '');
    }

    // Truncate to max length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
}

/**
 * Validate file name
 * @param {string} filename - File name to validate
 * @returns {Object} - Validation result
 */
export function validateFileName(filename) {
    if (!filename || typeof filename !== 'string') {
        return { isValid: false, error: 'File name is required' };
    }

    const sanitized = filename.trim();
    
    // Check length
    if (sanitized.length === 0) {
        return { isValid: false, error: 'File name cannot be empty' };
    }

    if (sanitized.length > 255) {
        return { isValid: false, error: 'File name too long' };
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
    if (invalidChars.test(sanitized)) {
        return { isValid: false, error: 'File name contains invalid characters' };
    }

    // Check for reserved names
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    const nameWithoutExt = sanitized.split('.')[0].toUpperCase();
    if (reservedNames.includes(nameWithoutExt)) {
        return { isValid: false, error: 'File name is reserved' };
    }

    return { isValid: true, filename: sanitized };
}

/**
 * Validate JSON data
 * @param {string} jsonString - JSON string to validate
 * @returns {Object} - Validation result
 */
export function validateJson(jsonString) {
    if (typeof jsonString !== 'string') {
        return { isValid: false, error: 'Input must be a string' };
    }

    try {
        const parsed = JSON.parse(jsonString);
        return { isValid: true, data: parsed };
    } catch (error) {
        return { isValid: false, error: `Invalid JSON: ${error.message}` };
    }
}

/**
 * Validate selector string (CSS or XPath)
 * @param {string} selector - Selector to validate
 * @param {string} type - Selector type ('css' or 'xpath')
 * @returns {Object} - Validation result
 */
export function validateSelector(selector, type = 'css') {
    if (!selector || typeof selector !== 'string') {
        return { isValid: false, error: 'Selector is required' };
    }

    const trimmed = selector.trim();
    if (trimmed.length === 0) {
        return { isValid: false, error: 'Selector cannot be empty' };
    }

    try {
        if (type === 'css') {
            // Test CSS selector validity
            document.querySelector(trimmed);
        } else if (type === 'xpath') {
            // Test XPath validity
            document.evaluate(trimmed, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        }
        
        return { isValid: true, selector: trimmed };
    } catch (error) {
        return { isValid: false, error: `Invalid ${type} selector: ${error.message}` };
    }
}

/**
 * Validate extension configuration
 * @param {Object} config - Extension configuration
 * @returns {Object} - Validation result
 */
export function validateExtensionConfig(config) {
    if (!config || typeof config !== 'object') {
        return { isValid: false, error: 'Configuration must be an object' };
    }

    const errors = [];
    const warnings = [];
    const sanitized = {};

    // Validate API endpoints
    if (config.apiBaseUrl) {
        const urlValidation = validateUrl(config.apiBaseUrl);
        if (urlValidation.isValid) {
            sanitized.apiBaseUrl = urlValidation.url;
        } else {
            errors.push(`Invalid API base URL: ${urlValidation.error}`);
        }
    }

    // Validate timeouts
    const timeouts = ['requestTimeout', 'retryDelay', 'analysisInterval'];
    timeouts.forEach(timeout => {
        if (config[timeout] !== undefined) {
            const value = parseInt(config[timeout], 10);
            if (isNaN(value) || value < 100 || value > 60000) {
                errors.push(`${timeout} must be between 100 and 60000 milliseconds`);
            } else {
                sanitized[timeout] = value;
            }
        }
    });

    // Validate retry attempts
    if (config.retryAttempts !== undefined) {
        const value = parseInt(config.retryAttempts, 10);
        if (isNaN(value) || value < 0 || value > 10) {
            errors.push('retryAttempts must be between 0 and 10');
        } else {
            sanitized.retryAttempts = value;
        }
    }

    // Validate boolean flags
    const booleanFlags = ['debugMode', 'enableLogging', 'autoSave', 'showNotifications'];
    booleanFlags.forEach(flag => {
        if (config[flag] !== undefined) {
            sanitized[flag] = Boolean(config[flag]);
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config: sanitized
    };
}

/**
 * Sanitize HTML content
 * @param {string} html - HTML content to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} - Sanitized HTML
 */
export function sanitizeHtml(html, options = {}) {
    if (typeof html !== 'string') {
        return '';
    }

    const {
        allowedTags = ['p', 'br', 'strong', 'em', 'span', 'div'],
        allowedAttributes = ['class', 'id'],
        removeScripts = true,
        removeOnEvents = true
    } = options;

    let sanitized = html;

    // Remove script tags and content
    if (removeScripts) {
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    // Remove on* event attributes
    if (removeOnEvents) {
        sanitized = sanitized.replace(/\s*on\w+\s*=\s*"[^"]*"/gi, '');
        sanitized = sanitized.replace(/\s*on\w+\s*=\s*'[^']*'/gi, '');
    }

    // Simple tag filtering (basic implementation)
    if (allowedTags.length > 0) {
        const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
        sanitized = sanitized.replace(tagPattern, (match, tagName) => {
            if (allowedTags.includes(tagName.toLowerCase())) {
                return match;
            }
            return '';
        });
    }

    return sanitized;
}

/**
 * Validate interaction data for knowledge chain
 * @param {Object} interaction - Interaction data
 * @returns {Object} - Validation result
 */
export function validateInteraction(interaction) {
    if (!interaction || typeof interaction !== 'object') {
        return { isValid: false, error: 'Interaction data must be an object' };
    }

    const required = ['type', 'timestamp', 'url'];
    const errors = [];

    required.forEach(field => {
        if (!interaction[field]) {
            errors.push(`${field} is required`);
        }
    });

    // Validate timestamp
    if (interaction.timestamp && !Date.parse(interaction.timestamp)) {
        errors.push('Invalid timestamp format');
    }

    // Validate URL
    if (interaction.url) {
        const urlValidation = validateUrl(interaction.url);
        if (!urlValidation.isValid) {
            errors.push(`Invalid URL: ${urlValidation.error}`);
        }
    }

    // Validate interaction type
    const validTypes = ['page_load', 'user_input', 'form_submit', 'click', 'navigation', 'dom_change'];
    if (interaction.type && !validTypes.includes(interaction.type)) {
        errors.push(`Invalid interaction type. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Security: Check for potentially malicious content
 * @param {string} content - Content to check
 * @returns {Object} - Security assessment
 */
export function checkSecurity(content) {
    if (typeof content !== 'string') {
        return { isSafe: true, risks: [] };
    }

    const risks = [];
    
    // Check for script injection attempts
    if (/<script/i.test(content) || /javascript:/i.test(content)) {
        risks.push('Potential script injection');
    }

    // Check for SQL injection patterns
    if (/(union|select|insert|delete|update|drop|exec)\s+/i.test(content)) {
        risks.push('Potential SQL injection pattern');
    }

    // Check for XSS patterns
    if (/(<|&lt;)\s*\/?\s*(script|iframe|object|embed|form)/i.test(content)) {
        risks.push('Potential XSS pattern');
    }

    // Check for suspicious protocols
    if (/(javascript|vbscript|data|file):\s*/i.test(content)) {
        risks.push('Suspicious protocol detected');
    }

    return {
        isSafe: risks.length === 0,
        risks
    };
}

export default {
    validateChatId,
    validateUrl,
    validateAnalysisConfig,
    sanitizeText,
    validateFileName,
    validateJson,
    validateSelector,
    validateExtensionConfig,
    sanitizeHtml,
    validateInteraction,
    checkSecurity
};
