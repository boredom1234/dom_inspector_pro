/**
 * Event Emitter - Simple event system for module communication
 * Allows modules to communicate without tight coupling
 */

class EventEmitter {
    constructor() {
        this.events = new Map();
        this.maxListeners = 10;
        this.debugMode = false;
    }

    /**
     * Add an event listener
     * @param {string} eventName - Event name
     * @param {Function} listener - Event listener function
     * @param {Object} options - Listener options
     */
    on(eventName, listener, options = {}) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listeners = this.events.get(eventName);
        
        // Check max listeners
        if (listeners.length >= this.maxListeners) {
            console.warn(`MaxListenersExceededWarning: ${listeners.length + 1} listeners added for event "${eventName}". Use setMaxListeners() to increase limit.`);
        }

        const listenerData = {
            listener,
            once: options.once || false,
            priority: options.priority || 0,
            context: options.context || null,
            id: options.id || null
        };

        listeners.push(listenerData);
        
        // Sort by priority (higher priority first)
        listeners.sort((a, b) => b.priority - a.priority);

        if (this.debugMode) {
            console.log(`Event listener added for "${eventName}". Total listeners: ${listeners.length}`);
        }

        return this;
    }

    /**
     * Add a one-time event listener
     * @param {string} eventName - Event name
     * @param {Function} listener - Event listener function
     * @param {Object} options - Listener options
     */
    once(eventName, listener, options = {}) {
        return this.on(eventName, listener, { ...options, once: true });
    }

    /**
     * Remove an event listener
     * @param {string} eventName - Event name
     * @param {Function|string} listener - Event listener function or ID
     */
    off(eventName, listener) {
        if (!this.events.has(eventName)) {
            return this;
        }

        const listeners = this.events.get(eventName);
        
        let indexToRemove = -1;
        if (typeof listener === 'string') {
            // Remove by ID
            indexToRemove = listeners.findIndex(l => l.id === listener);
        } else {
            // Remove by function reference
            indexToRemove = listeners.findIndex(l => l.listener === listener);
        }

        if (indexToRemove >= 0) {
            listeners.splice(indexToRemove, 1);
            
            if (listeners.length === 0) {
                this.events.delete(eventName);
            }
            
            if (this.debugMode) {
                console.log(`Event listener removed from "${eventName}". Remaining listeners: ${listeners.length}`);
            }
        }

        return this;
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - Event name
     */
    removeAllListeners(eventName) {
        if (eventName) {
            this.events.delete(eventName);
        } else {
            this.events.clear();
        }
        return this;
    }

    /**
     * Emit an event
     * @param {string} eventName - Event name
     * @param {...any} args - Arguments to pass to listeners
     */
    emit(eventName, ...args) {
        if (!this.events.has(eventName)) {
            if (this.debugMode) {
                console.log(`No listeners for event "${eventName}"`);
            }
            return false;
        }

        const listeners = this.events.get(eventName);
        const listenersToRemove = [];

        if (this.debugMode) {
            console.log(`Emitting event "${eventName}" to ${listeners.length} listeners`);
        }

        for (let i = 0; i < listeners.length; i++) {
            const listenerData = listeners[i];
            
            try {
                if (listenerData.context) {
                    listenerData.listener.call(listenerData.context, ...args);
                } else {
                    listenerData.listener(...args);
                }

                // Mark for removal if it's a once listener
                if (listenerData.once) {
                    listenersToRemove.push(i);
                }
            } catch (error) {
                console.error(`Error in event listener for "${eventName}":`, error);
                
                // Emit error event
                this.emit('error', {
                    eventName,
                    error,
                    listener: listenerData.listener
                });
            }
        }

        // Remove once listeners (in reverse order to maintain indices)
        for (let i = listenersToRemove.length - 1; i >= 0; i--) {
            listeners.splice(listenersToRemove[i], 1);
        }

        // Clean up empty event arrays
        if (listeners.length === 0) {
            this.events.delete(eventName);
        }

        return true;
    }

    /**
     * Emit an event asynchronously
     * @param {string} eventName - Event name
     * @param {...any} args - Arguments to pass to listeners
     */
    async emitAsync(eventName, ...args) {
        if (!this.events.has(eventName)) {
            return false;
        }

        const listeners = this.events.get(eventName);
        const listenersToRemove = [];
        const promises = [];

        for (let i = 0; i < listeners.length; i++) {
            const listenerData = listeners[i];
            
            try {
                const result = listenerData.context 
                    ? listenerData.listener.call(listenerData.context, ...args)
                    : listenerData.listener(...args);
                
                if (result && typeof result.then === 'function') {
                    promises.push(result);
                }

                if (listenerData.once) {
                    listenersToRemove.push(i);
                }
            } catch (error) {
                console.error(`Error in async event listener for "${eventName}":`, error);
                this.emit('error', { eventName, error, listener: listenerData.listener });
            }
        }

        // Wait for all async listeners to complete
        if (promises.length > 0) {
            await Promise.allSettled(promises);
        }

        // Remove once listeners
        for (let i = listenersToRemove.length - 1; i >= 0; i--) {
            listeners.splice(listenersToRemove[i], 1);
        }

        if (listeners.length === 0) {
            this.events.delete(eventName);
        }

        return true;
    }

    /**
     * Get listener count for an event
     * @param {string} eventName - Event name
     * @returns {number} - Number of listeners
     */
    listenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Get all event names
     * @returns {string[]} - Array of event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }

    /**
     * Get listeners for an event
     * @param {string} eventName - Event name
     * @returns {Function[]} - Array of listener functions
     */
    listeners(eventName) {
        if (!this.events.has(eventName)) {
            return [];
        }
        return this.events.get(eventName).map(l => l.listener);
    }

    /**
     * Set maximum number of listeners per event
     * @param {number} max - Maximum number of listeners
     */
    setMaxListeners(max) {
        this.maxListeners = max;
        return this;
    }

    /**
     * Enable or disable debug mode
     * @param {boolean} enabled - Whether to enable debug mode
     */
    setDebugMode(enabled) {
        this.debugMode = enabled;
        return this;
    }

    /**
     * Create a namespaced event emitter
     * @param {string} namespace - Namespace prefix
     * @returns {Object} - Namespaced emitter methods
     */
    namespace(namespace) {
        const prefix = `${namespace}:`;
        
        return {
            on: (eventName, listener, options) => this.on(prefix + eventName, listener, options),
            once: (eventName, listener, options) => this.once(prefix + eventName, listener, options),
            off: (eventName, listener) => this.off(prefix + eventName, listener),
            emit: (eventName, ...args) => this.emit(prefix + eventName, ...args),
            emitAsync: (eventName, ...args) => this.emitAsync(prefix + eventName, ...args),
            listenerCount: (eventName) => this.listenerCount(prefix + eventName),
            removeAllListeners: (eventName) => this.removeAllListeners(eventName ? prefix + eventName : undefined)
        };
    }

    /**
     * Create a promise that resolves when an event is emitted
     * @param {string} eventName - Event name to wait for
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} - Promise that resolves with event data
     */
    waitFor(eventName, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.off(eventName, listener);
                reject(new Error(`Timeout waiting for event "${eventName}"`));
            }, timeout);

            const listener = (...args) => {
                clearTimeout(timeoutId);
                resolve(args);
            };

            this.once(eventName, listener);
        });
    }
}

// Create global event emitter instance for extension modules
export const globalEvents = new EventEmitter();

// Pre-defined event constants for extension modules
export const EVENTS = {
    // UI Events
    UI_STATUS_UPDATE: 'ui:status:update',
    UI_PROGRESS_UPDATE: 'ui:progress:update',
    UI_BUTTON_STATE: 'ui:button:state',
    
    // Analysis Events
    ANALYSIS_START: 'analysis:start',
    ANALYSIS_COMPLETE: 'analysis:complete',
    ANALYSIS_ERROR: 'analysis:error',
    ANALYSIS_PROGRESS: 'analysis:progress',
    
    // Configuration Events
    CONFIG_CHANGED: 'config:changed',
    CONFIG_SAVED: 'config:saved',
    CONFIG_LOADED: 'config:loaded',
    
    // Chat Events
    CHAT_ID_DETECTED: 'chat:id:detected',
    CHAT_ID_CHANGED: 'chat:id:changed',
    CHAT_CONNECTION_STATUS: 'chat:connection:status',
    
    // MCP Events
    MCP_SEND_START: 'mcp:send:start',
    MCP_SEND_SUCCESS: 'mcp:send:success',
    MCP_SEND_ERROR: 'mcp:send:error',
    
    // DOM Events
    DOM_CHANGED: 'dom:changed',
    DOM_ANALYSIS_READY: 'dom:analysis:ready',
    
    // Content Script Events
    CONTENT_SCRIPT_READY: 'content:ready',
    INTERACTION_DETECTED: 'interaction:detected',
    HIGHLIGHT_MODE_CHANGED: 'highlight:mode:changed',
    
    // Storage Events
    STORAGE_CHANGED: 'storage:changed',
    STORAGE_ERROR: 'storage:error',
    
    // Extension Lifecycle Events
    EXTENSION_INITIALIZED: 'extension:initialized',
    EXTENSION_ERROR: 'extension:error'
};

// Utility functions for common event patterns
export const EventUtils = {
    /**
     * Create a debounced event emitter
     * @param {EventEmitter} emitter - Event emitter instance
     * @param {string} eventName - Event name
     * @param {number} delay - Debounce delay in milliseconds
     * @returns {Function} - Debounced emit function
     */
    debounce(emitter, eventName, delay = 300) {
        let timeoutId = null;
        
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                emitter.emit(eventName, ...args);
            }, delay);
        };
    },

    /**
     * Create a throttled event emitter
     * @param {EventEmitter} emitter - Event emitter instance
     * @param {string} eventName - Event name
     * @param {number} interval - Throttle interval in milliseconds
     * @returns {Function} - Throttled emit function
     */
    throttle(emitter, eventName, interval = 300) {
        let lastEmit = 0;
        
        return (...args) => {
            const now = Date.now();
            if (now - lastEmit >= interval) {
                lastEmit = now;
                emitter.emit(eventName, ...args);
            }
        };
    },

    /**
     * Create an event chain that forwards events
     * @param {EventEmitter} source - Source emitter
     * @param {EventEmitter} target - Target emitter
     * @param {Object} eventMap - Map of source events to target events
     */
    chain(source, target, eventMap) {
        Object.entries(eventMap).forEach(([sourceEvent, targetEvent]) => {
            source.on(sourceEvent, (...args) => {
                target.emit(targetEvent, ...args);
            });
        });
    }
};

export { EventEmitter };
export default globalEvents;
