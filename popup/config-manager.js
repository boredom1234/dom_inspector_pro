/**
 * Configuration Manager - Handles configuration management and auto-save
 * Manages analysis settings, user preferences, and configuration persistence
 */

import { STORAGE_KEYS, UI_CONSTANTS, DEFAULT_CONFIG, ERROR_MESSAGES } from '../shared/constants.js';
import { globalEvents, EVENTS } from '../shared/event-emitter.js';
import { ConfigStorage } from '../shared/utils/storage-utils.js';
import { ValidationUtils } from '../shared/utils/validation-utils.js';

export class ConfigManager {
    constructor() {
        this.currentConfig = { ...DEFAULT_CONFIG };
        this.configHistory = [];
        this.isInitialized = false;
        this.autoSaveEnabled = true;
        this.autoSaveTimeout = null;
        this.configElements = new Map();
        this.configChangeListeners = new Set();
    }

    /**
     * Initialize configuration manager
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            await this.loadConfiguration();
            this.setupEventListeners();
            this.cacheConfigElements();
            this.isInitialized = true;
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Configuration Manager initialized', UI_CONSTANTS.STATUS_TYPES.INFO);
        } catch (error) {
            console.error('Failed to initialize ConfigManager:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Config initialization failed: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Load configuration from storage
     */
    async loadConfiguration() {
        try {
            const storedConfig = await ConfigStorage.getConfiguration();
            this.currentConfig = { ...DEFAULT_CONFIG, ...storedConfig };
            
            // Load configuration history
            this.configHistory = await ConfigStorage.getConfigHistory() || [];
            
            // Apply configuration to UI
            this.applyConfigurationToUI();
            
            globalEvents.emit(EVENTS.CONFIG_LOADED, this.currentConfig);
            
        } catch (error) {
            console.error('Failed to load configuration:', error);
            // Use default configuration if loading fails
            this.currentConfig = { ...DEFAULT_CONFIG };
        }
    }

    /**
     * Save configuration to storage
     */
    async saveConfiguration(config = null) {
        try {
            const configToSave = config || this.currentConfig;
            
            // Validate configuration before saving
            const validation = ValidationUtils.validateConfiguration(configToSave);
            if (!validation.isValid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }

            await ConfigStorage.saveConfiguration(configToSave);
            
            // Add to history
            this.addToConfigHistory(configToSave);
            
            this.currentConfig = { ...configToSave };
            globalEvents.emit(EVENTS.CONFIG_SAVED, this.currentConfig);
            globalEvents.emit(EVENTS.CONFIG_CHANGED, this.currentConfig);
            
        } catch (error) {
            console.error('Failed to save configuration:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Failed to save configuration: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for configuration changes from UI
        globalEvents.on(EVENTS.UI_CONFIG_CHANGE, (configData) => {
            this.handleConfigChange(configData);
        });

        // Listen for auto-save toggle
        globalEvents.on('config:autoSave:toggle', (enabled) => {
            this.setAutoSave(enabled);
        });
    }

    /**
     * Cache configuration UI elements
     */
    cacheConfigElements() {
        const elements = {
            // Analysis options
            includeHiddenElements: document.getElementById('includeHiddenElements'),
            includeComputedStyles: document.getElementById('includeComputedStyles'),
            includeMeta: document.getElementById('includeMeta'),
            
            // Advanced features
            enableDomDiff: document.getElementById('enableDomDiff'),
            enableDependencyGraph: document.getElementById('enableDependencyGraph'),
            enableMultiStage: document.getElementById('enableMultiStage'),
            enableTemplateRecognition: document.getElementById('enableTemplateRecognition'),
            enableComprehensiveExtraction: document.getElementById('enableComprehensiveExtraction'),
            
            // Performance settings
            maxDepth: document.getElementById('maxDepth'),
            maxElements: document.getElementById('maxElements'),
            analysisTimeout: document.getElementById('analysisTimeout'),
            analysisInterval: document.getElementById('analysisInterval'),
            
            // Filtering
            cssSelectorsFilter: document.getElementById('cssSelectorsFilter'),
            excludeSelectors: document.getElementById('excludeSelectors'),
            includeOnlySelectors: document.getElementById('includeOnlySelectors'),
            
            // Auto-save
            autoSaveConfig: document.getElementById('autoSaveConfig')
        };

        // Cache existing elements
        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                this.configElements.set(key, element);
                this.setupElementListener(key, element);
            }
        });
    }

    /**
     * Setup individual element listeners
     */
    setupElementListener(key, element) {
        const eventType = element.type === 'checkbox' ? 'change' : 
                         element.type === 'number' || element.type === 'range' ? 'input' : 
                         element.tagName === 'TEXTAREA' ? 'input' : 'change';

        element.addEventListener(eventType, () => {
            this.handleElementChange(key, element);
        });
    }

    /**
     * Handle individual element changes
     */
    handleElementChange(key, element) {
        let value;
        
        if (element.type === 'checkbox') {
            value = element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
            value = parseInt(element.value) || 0;
        } else {
            value = element.value;
        }

        // Update current configuration
        this.updateConfigValue(key, value);
        
        // Auto-save if enabled
        if (this.autoSaveEnabled) {
            this.scheduleAutoSave();
        }

        // Emit change event
        globalEvents.emit(EVENTS.CONFIG_CHANGED, this.currentConfig);
    }

    /**
     * Update configuration value with nested key support
     */
    updateConfigValue(key, value) {
        // Handle nested configuration keys (e.g., 'performance.maxDepth')
        const keys = key.split('.');
        let target = this.currentConfig;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!target[keys[i]]) {
                target[keys[i]] = {};
            }
            target = target[keys[i]];
        }
        
        target[keys[keys.length - 1]] = value;
    }

    /**
     * Apply configuration to UI elements
     */
    applyConfigurationToUI() {
        this.configElements.forEach((element, key) => {
            const value = this.getConfigValue(key);
            
            if (element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else if (element.type === 'number' || element.type === 'range') {
                element.value = value || 0;
            } else {
                element.value = value || '';
            }
        });
    }

    /**
     * Get configuration value with nested key support
     */
    getConfigValue(key) {
        const keys = key.split('.');
        let value = this.currentConfig;
        
        for (const k of keys) {
            value = value?.[k];
            if (value === undefined) break;
        }
        
        return value;
    }

    /**
     * Handle configuration change events
     */
    handleConfigChange(configData) {
        try {
            // Merge with current configuration
            this.currentConfig = { ...this.currentConfig, ...configData };
            
            // Apply to UI
            this.applyConfigurationToUI();
            
            // Auto-save if enabled
            if (this.autoSaveEnabled) {
                this.scheduleAutoSave();
            }
            
        } catch (error) {
            console.error('Failed to handle config change:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Config update failed: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Schedule auto-save with debouncing
     */
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(async () => {
            try {
                await this.saveConfiguration();
                globalEvents.emit(EVENTS.UI_STATUS_UPDATE, '💾 Configuration auto-saved', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, 1000); // 1 second debounce
    }

    /**
     * Enable/disable auto-save
     */
    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
        
        if (!enabled && this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        }
        
        globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 
            `Auto-save ${enabled ? 'enabled' : 'disabled'}`, 
            UI_CONSTANTS.STATUS_TYPES.INFO
        );
    }

    /**
     * Reset configuration to defaults
     */
    async resetToDefaults() {
        try {
            this.currentConfig = { ...DEFAULT_CONFIG };
            await this.saveConfiguration();
            this.applyConfigurationToUI();
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Configuration reset to defaults', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            console.error('Failed to reset configuration:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Reset failed: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Load configuration preset
     */
    async loadPreset(presetName) {
        try {
            const presets = await ConfigStorage.getConfigPresets();
            const preset = presets[presetName];
            
            if (!preset) {
                throw new Error(`Preset '${presetName}' not found`);
            }
            
            this.currentConfig = { ...DEFAULT_CONFIG, ...preset };
            await this.saveConfiguration();
            this.applyConfigurationToUI();
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Preset '${presetName}' loaded`, UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            console.error('Failed to load preset:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Failed to load preset: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Save current configuration as preset
     */
    async saveAsPreset(presetName) {
        try {
            if (!presetName || presetName.trim() === '') {
                throw new Error('Preset name is required');
            }
            
            const presets = await ConfigStorage.getConfigPresets() || {};
            presets[presetName] = { ...this.currentConfig };
            
            await ConfigStorage.saveConfigPresets(presets);
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Preset '${presetName}' saved`, UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            console.error('Failed to save preset:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Failed to save preset: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Export configuration
     */
    exportConfiguration() {
        try {
            const exportData = {
                configuration: this.currentConfig,
                metadata: {
                    exportedAt: new Date().toISOString(),
                    version: '2.0',
                    type: 'DOM Inspector Configuration'
                }
            };

            const jsonData = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `dom-inspector-config-${new Date().toISOString().slice(0, 10)}.json`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Configuration exported', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            console.error('Export failed:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Export failed: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Import configuration
     */
    async importConfiguration(file) {
        try {
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // Validate imported configuration
            const config = importData.configuration || importData;
            const validation = ValidationUtils.validateConfiguration(config);
            
            if (!validation.isValid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }

            this.currentConfig = { ...DEFAULT_CONFIG, ...config };
            await this.saveConfiguration();
            this.applyConfigurationToUI();

            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Configuration imported successfully', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            console.error('Import failed:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Import failed: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Add configuration to history
     */
    addToConfigHistory(config) {
        const historyEntry = {
            config: { ...config },
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
        };

        this.configHistory.unshift(historyEntry);
        
        // Keep only last 50 entries
        if (this.configHistory.length > 50) {
            this.configHistory = this.configHistory.slice(0, 50);
        }

        // Save history to storage
        ConfigStorage.saveConfigHistory(this.configHistory).catch(console.error);
    }

    /**
     * Get configuration history
     */
    getConfigHistory() {
        return [...this.configHistory];
    }

    /**
     * Load configuration from history
     */
    async loadFromHistory(historyId) {
        try {
            const historyEntry = this.configHistory.find(entry => entry.id === historyId);
            
            if (!historyEntry) {
                throw new Error('History entry not found');
            }
            
            this.currentConfig = { ...historyEntry.config };
            await this.saveConfiguration();
            this.applyConfigurationToUI();
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Configuration loaded from history', UI_CONSTANTS.STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            console.error('Failed to load from history:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Failed to load from history: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Clear configuration history
     */
    async clearConfigHistory() {
        try {
            this.configHistory = [];
            await ConfigStorage.clearConfigHistory();
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Configuration history cleared', UI_CONSTANTS.STATUS_TYPES.INFO);
            
        } catch (error) {
            console.error('Failed to clear history:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `Failed to clear history: ${error.message}`, UI_CONSTANTS.STATUS_TYPES.ERROR);
        }
    }

    /**
     * Get current configuration
     */
    getCurrentConfiguration() {
        return { ...this.currentConfig };
    }

    /**
     * Update configuration programmatically
     */
    async updateConfiguration(updates) {
        try {
            this.currentConfig = { ...this.currentConfig, ...updates };
            
            if (this.autoSaveEnabled) {
                await this.saveConfiguration();
            }
            
            this.applyConfigurationToUI();
            globalEvents.emit(EVENTS.CONFIG_CHANGED, this.currentConfig);
            
        } catch (error) {
            console.error('Failed to update configuration:', error);
            throw error;
        }
    }

    /**
     * Validate current configuration
     */
    validateCurrentConfiguration() {
        return ValidationUtils.validateConfiguration(this.currentConfig);
    }

    /**
     * Get manager state for debugging
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            currentConfig: this.currentConfig,
            autoSaveEnabled: this.autoSaveEnabled,
            configElementsCount: this.configElements.size,
            historyCount: this.configHistory.length
        };
    }

    /**
     * Add configuration change listener
     */
    addChangeListener(callback) {
        this.configChangeListeners.add(callback);
        
        // Return unsubscribe function
        return () => {
            this.configChangeListeners.delete(callback);
        };
    }

    /**
     * Remove all change listeners
     */
    clearChangeListeners() {
        this.configChangeListeners.clear();
    }
}

export default ConfigManager;
