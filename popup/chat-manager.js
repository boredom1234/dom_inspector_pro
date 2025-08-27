/**
 * Chat Manager - Handles Chat ID detection and MCP integration
 * Focused on chat session management and API communication
 */

import { API_CONFIG, EXTENSION_CONFIG, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../shared/constants.js';
import { validateChatId, validateUrl } from '../shared/utils/validation-utils.js';
import { ChatIdStorage } from '../shared/utils/storage-utils.js';
import { globalEvents, EVENTS } from '../shared/event-emitter.js';

export class ChatManager {
    constructor() {
        this.chatId = null;
        this.connectionStatus = 'disconnected';
        this.lastStatusUpdate = 0;
        this.statusUpdateTimer = null;
        this.isInitialized = false;
    }

    /**
     * Initialize chat manager
     */
    async initialize() {
        if (this.isInitialized) return;
        
        await this.detectChatId();
        this.setupEventListeners();
        
        this.isInitialized = true;
        globalEvents.emit(EVENTS.CHAT_CONNECTION_STATUS, this.connectionStatus);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for chat ID input changes
        const chatIdInput = document.getElementById('chatIdInput');
        if (chatIdInput) {
            chatIdInput.addEventListener('input', async (e) => {
                const inputChatId = e.target.value.trim();
                await this.handleChatIdInput(inputChatId);
            });
        }
    }

    /**
     * Detect chat ID from multiple sources
     */
    async detectChatId() {
        let detectedChatId = null;

        try {
            // Strategy 1: Check stored chat ID
            detectedChatId = await ChatIdStorage.getChatId();
            
            // Strategy 2: Try to get from active tab
            if (!detectedChatId) {
                detectedChatId = await this.getChatIdFromActiveTab();
            }
            
            // Strategy 3: Auto-detect from localhost:3000 tabs
            if (!detectedChatId) {
                detectedChatId = await this.getChatIdFromLocalhost();
            }

            if (detectedChatId) {
                const validation = validateChatId(detectedChatId);
                if (validation.isValid) {
                    await this.setChatId(validation.chatId);
                    globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Chat ID detected successfully', 'success');
                } else {
                    console.warn('Invalid detected chat ID:', validation.error);
                    globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Detected invalid chat ID', 'warning');
                }
            } else {
                globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Chat ID not detected - enter manually', 'info');
            }

        } catch (error) {
            console.error('Error detecting chat ID:', error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Error detecting chat ID', 'error');
        }
    }

    /**
     * Get chat ID from active tab content script
     */
    async getChatIdFromActiveTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return null;

            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'getCurrentChatId' 
            });
            
            return response?.chatId || null;
        } catch (error) {
            console.log('Could not get chat ID from content script:', error);
            return null;
        }
    }

    /**
     * Get chat ID from localhost:3000 tabs
     */
    async getChatIdFromLocalhost() {
        try {
            const allTabs = await chrome.tabs.query({});
            
            // Look for localhost:3000 tabs
            for (const tab of allTabs) {
                if (!tab.url) continue;
                
                const isLocalhost = tab.url.includes('localhost:3000') || tab.url.includes('127.0.0.1:3000');
                if (!isLocalhost) continue;

                // Check for specific chat URL
                const urlMatch = tab.url.match(/\/chat\/([^\/\?#]+)/);
                if (urlMatch) {
                    return urlMatch[1];
                }

                // Check for homepage (new chat)
                if (tab.url.match(/^https?:\/\/(localhost|127\.0\.0\.1):3000\/?$/)) {
                    return 'new-chat-' + Date.now();
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting chat ID from localhost tabs:', error);
            return null;
        }
    }

    /**
     * Handle manual chat ID input
     */
    async handleChatIdInput(inputChatId) {
        if (!inputChatId) {
            this.chatId = null;
            globalEvents.emit(EVENTS.CHAT_ID_CHANGED, null);
            globalEvents.emit(EVENTS.UI_BUTTON_STATE, 'sendToMCPBtn', false);
            this.updateKnowledgeChainStatus('Knowledge Chain: No chat ID', 'info');
            return;
        }

        const validation = validateChatId(inputChatId);
        if (!validation.isValid) {
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, validation.error, 'warning');
            return;
        }

        await this.setChatId(validation.chatId);
        globalEvents.emit(EVENTS.UI_BUTTON_STATE, 'sendToMCPBtn', true);
        
        // Store for future use
        await ChatIdStorage.saveChatId(validation.chatId);
        
        // Update knowledge chain status
        await this.updateKnowledgeChainStatus();
    }

    /**
     * Set current chat ID
     */
    async setChatId(chatId) {
        this.chatId = chatId;
        globalEvents.emit(EVENTS.CHAT_ID_DETECTED, chatId);
        globalEvents.emit(EVENTS.CHAT_ID_CHANGED, chatId);
        
        // Update UI
        const chatIdInput = document.getElementById('chatIdInput');
        if (chatIdInput) {
            chatIdInput.value = chatId;
        }
        
        // Update status indicators
        globalEvents.emit('ui:chatIdStatus:update', 'detected', 'Chat ID detected successfully');
        
        await this.updateKnowledgeChainStatus();
    }

    /**
     * Update knowledge chain connection status with debouncing
     */
    async updateKnowledgeChainStatus(customMessage = null, customType = null) {
        if (customMessage) {
            globalEvents.emit('ui:knowledgeChain:update', customMessage, customType);
            return;
        }

        if (!this.chatId) {
            globalEvents.emit('ui:knowledgeChain:update', 'Knowledge Chain: No chat ID', 'info');
            return;
        }

        // Debounce to prevent excessive API calls
        const now = Date.now();
        if (now - this.lastStatusUpdate < EXTENSION_CONFIG.STATUS_UPDATE_DEBOUNCE) {
            if (this.statusUpdateTimer) clearTimeout(this.statusUpdateTimer);
            this.statusUpdateTimer = setTimeout(() => 
                this.updateKnowledgeChainStatus(), EXTENSION_CONFIG.STATUS_UPDATE_DEBOUNCE
            );
            return;
        }

        this.lastStatusUpdate = now;

        try {
            const url = `${API_CONFIG.MCP_BASE_URL}${API_CONFIG.MCP_EXTENSION_ENDPOINT}?chatId=${this.chatId}`;
            const response = await fetch(url, { 
                method: 'GET',
                timeout: API_CONFIG.REQUEST_TIMEOUT 
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    if (data.context?.knowledgeChain) {
                        const stateCount = data.context.stateCount || data.context.knowledgeChain.states?.length || 0;
                        globalEvents.emit('ui:knowledgeChain:update', `Knowledge Chain: ${stateCount} states recorded`, 'success');
                        this.connectionStatus = 'connected';
                    } else if (data.context) {
                        globalEvents.emit('ui:knowledgeChain:update', 'Knowledge Chain: DOM context available', 'info');
                        this.connectionStatus = 'partial';
                    } else {
                        globalEvents.emit('ui:knowledgeChain:update', 'Knowledge Chain: Ready to start', 'info');
                        this.connectionStatus = 'ready';
                    }
                } else {
                    globalEvents.emit('ui:knowledgeChain:update', 'Knowledge Chain: Connection error', 'error');
                    this.connectionStatus = 'error';
                }
            } else {
                globalEvents.emit('ui:knowledgeChain:update', 'Knowledge Chain: Connection error', 'error');
                this.connectionStatus = 'error';
            }
        } catch (error) {
            globalEvents.emit('ui:knowledgeChain:update', 'Knowledge Chain: Offline', 'error');
            this.connectionStatus = 'offline';
        }

        globalEvents.emit(EVENTS.CHAT_CONNECTION_STATUS, this.connectionStatus);
    }

    /**
     * Send DOM data to MCP tool
     */
    async sendToMCPTool(extractedData) {
        if (!extractedData) {
            throw new Error('No extracted data to send');
        }

        if (!this.chatId) {
            throw new Error('No chat ID available. Please detect or enter chat ID first.');
        }

        try {
            globalEvents.emit(EVENTS.MCP_SEND_START, this.chatId);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, '📡 Sending DOM data to MCP Tool...', 'success');

            // Get current tab information
            const [currentTab] = await chrome.tabs.query({
                active: true,
                currentWindow: true,
            });

            // Prepare payload with chat ID
            const payload = {
                ...extractedData,
                chatId: this.chatId,
                sourceUrl: currentTab?.url || '',
                timestamp: new Date().toISOString()
            };

            console.log('Sending to MCP:', {
                chatId: this.chatId,
                hasData: !!extractedData,
                sourceUrl: currentTab?.url
            });

            const startTime = Date.now();
            const response = await fetch(API_CONFIG.MCP_BASE_URL + API_CONFIG.MCP_EXTENSION_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Source-URL': currentTab?.url || '',
                },
                body: JSON.stringify(payload),
            });

            const duration = Date.now() - startTime;

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            // Show success message with details
            const nodeCount = result.enhancedSnapshot?.nodes?.length || 0;
            const interactiveCount = result.enhancedSnapshot?.nodes?.filter(n => n.interactive)?.length || 0;

            const displayChatId = this.getDisplayChatId();
            const successMessage = `✅ POST ${API_CONFIG.MCP_EXTENSION_ENDPOINT} 200 in ${duration}ms - Context attached to ${displayChatId}!`;
            
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, successMessage, 'success');
            globalEvents.emit(EVENTS.MCP_SEND_SUCCESS, { result, duration, nodeCount, interactiveCount });

            // Show detailed context info after delay
            setTimeout(() => {
                globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 
                    `🎯 ${nodeCount} elements (${interactiveCount} interactive) ready for ${displayChatId}`, 
                    'success'
                );
            }, 2000);

            // Store enhanced snapshot for debugging
            if (result.enhancedSnapshot) {
                localStorage.setItem('lastMCPSnapshot', JSON.stringify(result.enhancedSnapshot));
            }

            return result;

        } catch (error) {
            console.error('MCP Tool integration error:', error);
            globalEvents.emit(EVENTS.MCP_SEND_ERROR, error);
            globalEvents.emit(EVENTS.UI_STATUS_UPDATE, `❌ Failed to send to Tool: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Get display-friendly chat ID
     */
    getDisplayChatId() {
        if (!this.chatId) return 'Unknown';
        
        if (this.chatId.startsWith('temp_') || 
            this.chatId.startsWith('homepage_') || 
            this.chatId.startsWith('fallback_') ||
            this.chatId.startsWith('new-chat-')) {
            return 'Current Session';
        }
        
        return this.chatId.length > 8 ? this.chatId.slice(0, 8) + '...' : this.chatId;
    }

    /**
     * Check if MCP tool is available
     */
    async checkMCPAvailability() {
        try {
            const response = await fetch(API_CONFIG.MCP_BASE_URL + '/api/health', {
                method: 'GET',
                timeout: 5000
            });
            
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current chat ID
     */
    getCurrentChatId() {
        return this.chatId;
    }

    /**
     * Get connection status
     */
    getConnectionStatus() {
        return this.connectionStatus;
    }

    /**
     * Clear current chat session
     */
    async clearChatSession() {
        this.chatId = null;
        this.connectionStatus = 'disconnected';
        
        await ChatIdStorage.clearChatId();
        
        globalEvents.emit(EVENTS.CHAT_ID_CHANGED, null);
        globalEvents.emit(EVENTS.CHAT_CONNECTION_STATUS, 'disconnected');
        globalEvents.emit(EVENTS.UI_BUTTON_STATE, 'sendToMCPBtn', false);
        
        // Clear UI
        const chatIdInput = document.getElementById('chatIdInput');
        if (chatIdInput) {
            chatIdInput.value = '';
        }
        
        globalEvents.emit('ui:chatIdStatus:update', 'detecting', 'No chat ID');
        globalEvents.emit('ui:knowledgeChain:update', 'Knowledge Chain: Not connected', 'info');
    }

    /**
     * Refresh chat ID detection
     */
    async refreshChatId() {
        globalEvents.emit(EVENTS.UI_STATUS_UPDATE, 'Refreshing chat ID detection...', 'info');
        globalEvents.emit('ui:chatIdStatus:update', 'detecting', 'Detecting chat ID...');
        
        await this.detectChatId();
    }

    /**
     * Validate current connection
     */
    async validateConnection() {
        if (!this.chatId) {
            return { isValid: false, error: 'No chat ID available' };
        }

        const chatIdValidation = validateChatId(this.chatId);
        if (!chatIdValidation.isValid) {
            return { isValid: false, error: chatIdValidation.error };
        }

        const mcpAvailable = await this.checkMCPAvailability();
        if (!mcpAvailable) {
            return { isValid: false, error: 'MCP tool is not available' };
        }

        return { isValid: true };
    }

    /**
     * Get chat manager state for debugging
     */
    getState() {
        return {
            chatId: this.chatId,
            connectionStatus: this.connectionStatus,
            isInitialized: this.isInitialized,
            lastStatusUpdate: this.lastStatusUpdate
        };
    }
}

export default ChatManager;
