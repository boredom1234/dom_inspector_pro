/**
 * Storage Utilities - Centralized storage management for extension
 * Handles Chrome storage API and localStorage with fallbacks
 */

import { STORAGE_KEYS, SESSION_KEYS } from '../constants.js';

/**
 * Storage wrapper with Chrome extension storage and localStorage fallbacks
 */
export class StorageUtils {
    static async set(key, value) {
        try {
            if (chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set({ [key]: value });
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (error) {
            console.warn('Failed to save to chrome storage, trying localStorage:', error);
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('All storage methods failed:', e);
                throw new Error('Storage not available');
            }
        }
    }

    static async get(key, defaultValue = null) {
        try {
            if (chrome.storage && chrome.storage.local) {
                const result = await chrome.storage.local.get([key]);
                return result[key] !== undefined ? result[key] : defaultValue;
            } else {
                const value = localStorage.getItem(key);
                return value !== null ? JSON.parse(value) : defaultValue;
            }
        } catch (error) {
            console.warn('Failed to read from chrome storage, trying localStorage:', error);
            try {
                const value = localStorage.getItem(key);
                return value !== null ? JSON.parse(value) : defaultValue;
            } catch (e) {
                console.error('All storage read methods failed:', e);
                return defaultValue;
            }
        }
    }

    static async remove(key) {
        try {
            if (chrome.storage && chrome.storage.local) {
                await chrome.storage.local.remove([key]);
            } else {
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.warn('Failed to remove from chrome storage, trying localStorage:', error);
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.error('All storage remove methods failed:', e);
            }
        }
    }

    static async clear() {
        try {
            if (chrome.storage && chrome.storage.local) {
                await chrome.storage.local.clear();
            } else {
                localStorage.clear();
            }
        } catch (error) {
            console.warn('Failed to clear chrome storage, trying localStorage:', error);
            try {
                localStorage.clear();
            } catch (e) {
                console.error('All storage clear methods failed:', e);
            }
        }
    }

    static async getMultiple(keys) {
        const results = {};
        for (const key of keys) {
            results[key] = await this.get(key);
        }
        return results;
    }

    static async setMultiple(keyValuePairs) {
        try {
            if (chrome.storage && chrome.storage.local) {
                await chrome.storage.local.set(keyValuePairs);
            } else {
                for (const [key, value] of Object.entries(keyValuePairs)) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            }
        } catch (error) {
            console.warn('Failed batch save to chrome storage, trying localStorage:', error);
            try {
                for (const [key, value] of Object.entries(keyValuePairs)) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            } catch (e) {
                console.error('All batch storage methods failed:', e);
                throw new Error('Batch storage not available');
            }
        }
    }
}

/**
 * Session storage utilities
 */
export class SessionStorageUtils {
    static set(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Failed to save to session storage:', error);
        }
    }

    static get(key, defaultValue = null) {
        try {
            const value = sessionStorage.getItem(key);
            return value !== null ? JSON.parse(value) : defaultValue;
        } catch (error) {
            console.error('Failed to read from session storage:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            sessionStorage.removeItem(key);
        } catch (error) {
            console.error('Failed to remove from session storage:', error);
        }
    }

    static clear() {
        try {
            sessionStorage.clear();
        } catch (error) {
            console.error('Failed to clear session storage:', error);
        }
    }
}

/**
 * Configuration management utilities
 */
export class ConfigStorage {
    static async saveConfiguration(config) {
        const configData = {
            ...config,
            timestamp: Date.now(),
            version: '2.0'
        };
        
        await StorageUtils.setMultiple({
            [STORAGE_KEYS.DOM_INSPECTOR_CONFIG]: configData,
            [STORAGE_KEYS.CONFIG_TIMESTAMP]: Date.now()
        });
    }

    static async loadConfiguration() {
        return await StorageUtils.get(STORAGE_KEYS.DOM_INSPECTOR_CONFIG, null);
    }

    static async exportConfiguration() {
        const config = await this.loadConfiguration();
        if (!config) return null;

        return {
            version: '1.0',
            timestamp: new Date().toISOString(),
            configuration: config,
            description: 'DOM Inspector Pro Configuration'
        };
    }

    static async importConfiguration(configData) {
        if (!configData || !configData.configuration) {
            throw new Error('Invalid configuration data');
        }

        await this.saveConfiguration(configData.configuration);
        return configData.configuration;
    }
}

/**
 * Chat ID management utilities
 */
export class ChatIdStorage {
    static async saveChatId(chatId) {
        await StorageUtils.setMultiple({
            [STORAGE_KEYS.ACTIVE_CHAT_ID]: chatId,
            [STORAGE_KEYS.SAVED_CHAT_ID]: chatId
        });
        
        // Also save to session storage
        SessionStorageUtils.set(SESSION_KEYS.ACTIVE_CHAT_ID, chatId);
    }

    static async getChatId() {
        // Try multiple sources in order of preference
        let chatId = await StorageUtils.get(STORAGE_KEYS.ACTIVE_CHAT_ID);
        
        if (!chatId) {
            chatId = await StorageUtils.get(STORAGE_KEYS.SAVED_CHAT_ID);
        }
        
        if (!chatId) {
            chatId = SessionStorageUtils.get(SESSION_KEYS.ACTIVE_CHAT_ID);
        }
        
        return chatId;
    }

    static async clearChatId() {
        await StorageUtils.remove(STORAGE_KEYS.ACTIVE_CHAT_ID);
        SessionStorageUtils.remove(SESSION_KEYS.ACTIVE_CHAT_ID);
    }
}

/**
 * Analysis data storage utilities
 */
export class AnalysisStorage {
    static async saveLastSnapshot(snapshot) {
        await StorageUtils.set(STORAGE_KEYS.LAST_MCP_SNAPSHOT, {
            snapshot,
            timestamp: new Date().toISOString()
        });
    }

    static async getLastSnapshot() {
        const data = await StorageUtils.get(STORAGE_KEYS.LAST_MCP_SNAPSHOT);
        return data?.snapshot || null;
    }

    static async clearLastSnapshot() {
        await StorageUtils.remove(STORAGE_KEYS.LAST_MCP_SNAPSHOT);
    }

    static async saveAnalysisHistory(analysisData, maxHistory = 10) {
        const history = await StorageUtils.get('analysisHistory', []);
        
        // Add new analysis to beginning of array
        history.unshift({
            ...analysisData,
            id: Date.now(),
            timestamp: new Date().toISOString()
        });
        
        // Keep only the most recent entries
        if (history.length > maxHistory) {
            history.splice(maxHistory);
        }
        
        await StorageUtils.set('analysisHistory', history);
    }

    static async getAnalysisHistory(limit = 10) {
        const history = await StorageUtils.get('analysisHistory', []);
        return history.slice(0, limit);
    }

    static async clearAnalysisHistory() {
        await StorageUtils.remove('analysisHistory');
    }
}

/**
 * User preferences storage
 */
export class PreferencesStorage {
    static async savePreference(key, value) {
        const preferences = await StorageUtils.get('userPreferences', {});
        preferences[key] = value;
        await StorageUtils.set('userPreferences', preferences);
    }

    static async getPreference(key, defaultValue = null) {
        const preferences = await StorageUtils.get('userPreferences', {});
        return preferences[key] !== undefined ? preferences[key] : defaultValue;
    }

    static async getAllPreferences() {
        return await StorageUtils.get('userPreferences', {});
    }

    static async removePreference(key) {
        const preferences = await StorageUtils.get('userPreferences', {});
        delete preferences[key];
        await StorageUtils.set('userPreferences', preferences);
    }

    static async clearAllPreferences() {
        await StorageUtils.remove('userPreferences');
    }
}

/**
 * Storage event listeners and synchronization
 */
export class StorageSync {
    static listeners = new Map();

    static addListener(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Add Chrome storage listener if available
        if (chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes[key]) {
                    callback(changes[key].newValue, changes[key].oldValue);
                }
            });
        }
    }

    static removeListener(key, callback) {
        if (this.listeners.has(key)) {
            this.listeners.get(key).delete(callback);
        }
    }

    static notifyListeners(key, newValue, oldValue) {
        if (this.listeners.has(key)) {
            for (const callback of this.listeners.get(key)) {
                try {
                    callback(newValue, oldValue);
                } catch (error) {
                    console.error('Error in storage listener:', error);
                }
            }
        }
    }

    static async syncAcrossStorage(key, value) {
        // Sync between Chrome storage and localStorage
        await StorageUtils.set(key, value);
        
        // Notify all listeners
        this.notifyListeners(key, value);
    }
}

/**
 * Storage migration utilities for version upgrades
 */
export class StorageMigration {
    static async migrateToVersion(targetVersion) {
        const currentVersion = await StorageUtils.get('storageVersion', '1.0');
        
        if (currentVersion === targetVersion) return;
        
        // Perform migration based on versions
        if (currentVersion === '1.0' && targetVersion === '2.0') {
            await this.migrateV1ToV2();
        }
        
        await StorageUtils.set('storageVersion', targetVersion);
    }

    static async migrateV1ToV2() {
        // Example migration: rename old keys to new ones
        const oldConfig = await StorageUtils.get('domInspectorOldConfig');
        if (oldConfig) {
            await StorageUtils.set(STORAGE_KEYS.DOM_INSPECTOR_CONFIG, oldConfig);
            await StorageUtils.remove('domInspectorOldConfig');
        }
    }

    static async backup() {
        const allData = {};
        
        // Backup all known keys
        const keysToBackup = Object.values(STORAGE_KEYS);
        for (const key of keysToBackup) {
            const value = await StorageUtils.get(key);
            if (value !== null) {
                allData[key] = value;
            }
        }
        
        return {
            version: '2.0',
            timestamp: new Date().toISOString(),
            data: allData
        };
    }

    static async restore(backupData) {
        if (!backupData || !backupData.data) {
            throw new Error('Invalid backup data');
        }
        
        // Clear existing data
        await StorageUtils.clear();
        
        // Restore from backup
        await StorageUtils.setMultiple(backupData.data);
    }
}

// Export default utilities for common operations
export default {
    storage: StorageUtils,
    session: SessionStorageUtils,
    config: ConfigStorage,
    chatId: ChatIdStorage,
    analysis: AnalysisStorage,
    preferences: PreferencesStorage,
    sync: StorageSync,
    migration: StorageMigration
};
