/**
 * Chat Manager Module
 * Handles chat ID detection, knowledge chain status, and chat-related functionality
 */

class ChatManager {
  constructor() {
    this.statusUpdateTimer = null;
    this.lastStatusUpdate = 0;
    this.STATUS_UPDATE_DEBOUNCE = 3000; // 3 seconds
  }

  /**
   * Initialize chat ID detection system
   */
  async initializeChatIdDetection() {
    const chatIdInput = document.getElementById('chatIdInput');
    const chatIdStatus = document.getElementById('chatIdStatus');
    const knowledgeChainStatus = document.getElementById('knowledgeChainStatus');
    
    if (!chatIdInput || !chatIdStatus || !knowledgeChainStatus) {
      console.warn('Chat ID elements not found in DOM');
      return;
    }
    
    // Try to detect chat ID from various sources
    let detectedChatId = null;
    
    try {
      // Method 1: Check if stored in extension storage
      const stored = await this.getFromStorage(['activeChatId']);
      if (stored.activeChatId) {
        detectedChatId = stored.activeChatId;
      }
      
      // Method 2: Try to get from content script
      if (!detectedChatId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
          try {
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'getCurrentChatId' });
            if (response && response.chatId) {
              detectedChatId = response.chatId;
            }
          } catch (e) {
            console.log('Could not get chat ID from content script:', e);
          }
        }
      }
      
      if (detectedChatId) {
        this.setChatIdSuccess(chatIdInput, chatIdStatus, detectedChatId);
        await this.updateKnowledgeChainStatus(detectedChatId);
        this.enableSendButton();
      } else {
        this.setChatIdError(chatIdInput, chatIdStatus, knowledgeChainStatus);
      }
    } catch (error) {
      console.error('Error detecting chat ID:', error);
      this.setChatIdWarning(chatIdStatus);
    }
    
    // Set up manual input listener
    this.setupManualInputListener(chatIdInput, knowledgeChainStatus);
  }

  /**
   * Set chat ID success state
   */
  setChatIdSuccess(chatIdInput, chatIdStatus, chatId) {
    chatIdInput.value = chatId;
    chatIdInput.style.borderColor = '#4CAF50';
    chatIdStatus.textContent = '✅';
    chatIdStatus.title = 'Chat ID detected successfully';
  }

  /**
   * Set chat ID error state
   */
  setChatIdError(chatIdInput, chatIdStatus, knowledgeChainStatus) {
    chatIdInput.placeholder = 'Chat ID not detected - enter manually';
    chatIdStatus.textContent = '❌';
    chatIdStatus.title = 'Could not detect chat ID automatically';
    knowledgeChainStatus.textContent = 'Knowledge Chain: No chat ID detected';
  }

  /**
   * Set chat ID warning state
   */
  setChatIdWarning(chatIdStatus) {
    chatIdStatus.textContent = '⚠️';
    chatIdStatus.title = 'Error detecting chat ID';
  }

  /**
   * Set up listener for manual chat ID input
   */
  setupManualInputListener(chatIdInput, knowledgeChainStatus) {
    chatIdInput.addEventListener('input', async (e) => {
      const chatId = e.target.value.trim();
      if (chatId) {
        await this.updateKnowledgeChainStatus(chatId);
        this.enableSendButton();
        // Store for future use
        this.saveToStorage({ activeChatId: chatId });
      } else {
        this.disableSendButton();
        knowledgeChainStatus.textContent = 'Knowledge Chain: No chat ID';
      }
    });
  }

  /**
   * Update knowledge chain status with debouncing
   */
  async updateKnowledgeChainStatus(chatId) {
    const knowledgeChainStatus = document.getElementById('knowledgeChainStatus');
    if (!knowledgeChainStatus) return;
    
    // Debounce to prevent excessive API calls
    const now = Date.now();
    if (now - this.lastStatusUpdate < this.STATUS_UPDATE_DEBOUNCE) {
      if (this.statusUpdateTimer) clearTimeout(this.statusUpdateTimer);
      this.statusUpdateTimer = setTimeout(() => this.updateKnowledgeChainStatus(chatId), this.STATUS_UPDATE_DEBOUNCE);
      return;
    }
    
    this.lastStatusUpdate = now;
    
    try {
      const response = await fetch(`http://localhost:3000/api/extension-dom?chatId=${chatId}`);
      if (response.ok) {
        const data = await response.json();
        this.processKnowledgeChainResponse(data, knowledgeChainStatus);
      } else {
        this.setKnowledgeChainError(knowledgeChainStatus, 'Connection error');
      }
    } catch (error) {
      this.setKnowledgeChainError(knowledgeChainStatus, 'Offline');
    }
  }

  /**
   * Process knowledge chain API response
   */
  processKnowledgeChainResponse(data, statusElement) {
    if (data.success) {
      if (data.context && data.context.knowledgeChain) {
        const stateCount = data.context.stateCount || data.context.knowledgeChain.states?.length || 0;
        statusElement.textContent = `Knowledge Chain: ${stateCount} states recorded`;
        statusElement.style.color = '#4CAF50';
      } else if (data.context) {
        statusElement.textContent = 'Knowledge Chain: DOM context available';
        statusElement.style.color = '#2196F3';
      } else {
        statusElement.textContent = 'Knowledge Chain: Ready to start';
        statusElement.style.color = '#666';
      }
    } else {
      this.setKnowledgeChainError(statusElement, 'Connection error');
    }
  }

  /**
   * Set knowledge chain error state
   */
  setKnowledgeChainError(statusElement, errorType) {
    statusElement.textContent = `Knowledge Chain: ${errorType}`;
    statusElement.style.color = '#f44336';
  }

  /**
   * Enable send to MCP button
   */
  enableSendButton() {
    const sendToMCPBtn = document.getElementById('sendToMCPBtn');
    if (sendToMCPBtn) {
      sendToMCPBtn.disabled = false;
    }
  }

  /**
   * Disable send to MCP button
   */
  disableSendButton() {
    const sendToMCPBtn = document.getElementById('sendToMCPBtn');
    if (sendToMCPBtn) {
      sendToMCPBtn.disabled = true;
    }
  }

  /**
   * Get current chat ID from input field
   */
  getCurrentChatId() {
    const chatIdInput = document.getElementById('chatIdInput');
    return chatIdInput ? chatIdInput.value.trim() : null;
  }

  /**
   * Save chat ID to storage
   */
  saveChatId(chatId) {
    this.saveToStorage({ savedChatId: chatId });
  }

  /**
   * Load saved chat ID
   */
  async loadSavedChatId() {
    try {
      const result = await this.getFromStorage(['savedChatId']);
      if (result.savedChatId) {
        const chatIdInput = document.getElementById('chatIdInput');
        if (chatIdInput) {
          chatIdInput.value = result.savedChatId;
        }
      }
    } catch (error) {
      console.warn('Failed to load saved chat ID:', error);
    }
  }

  /**
   * Detect chat ID from browser tabs
   */
  async detectChatIdFromTabs() {
    try {
      const allTabs = await chrome.tabs.query({});
      console.log('Chat Manager - scanning tabs:', allTabs.length);

      // Look for localhost:3000 tabs
      for (const tab of allTabs) {
        if (tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("127.0.0.1:3000"))) {
          // Check for specific chat URL
          const urlMatch = tab.url.match(/\/chat\/([^\/\?#]+)/);
          if (urlMatch) {
            console.log('Chat Manager - found specific chat:', { chatId: urlMatch[1], url: tab.url });
            return { chatId: urlMatch[1], tab: tab };
          }

          // Check for homepage (new chat)
          if (tab.url.match(/^https?:\/\/(localhost|127\.0\.0\.1):3000\/?$/)) {
            const newChatId = "new-chat-" + Date.now();
            console.log('Chat Manager - found homepage, using new chat ID:', { chatId: newChatId, url: tab.url });
            return { chatId: newChatId, tab: tab };
          }
        }
      }

      return { chatId: null, tab: null };
    } catch (error) {
      console.error('Error detecting chat ID from tabs:', error);
      return { chatId: null, tab: null };
    }
  }

  /**
   * Validate chat ID format
   */
  validateChatId(chatId) {
    if (!chatId || typeof chatId !== 'string') {
      return { valid: false, error: 'Chat ID is required' };
    }
    
    if (chatId.trim().length < 3) {
      return { valid: false, error: 'Chat ID too short' };
    }
    
    // Allow alphanumeric, hyphens, and underscores
    if (!/^[a-zA-Z0-9_-]+$/.test(chatId.trim())) {
      return { valid: false, error: 'Chat ID contains invalid characters' };
    }
    
    return { valid: true };
  }

  /**
   * Storage abstraction with fallback
   */
  async saveToStorage(data) {
    try {
      if (chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set(data);
      } else {
        // Fallback to localStorage
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
      }
    } catch (error) {
      console.warn('Failed to save to storage:', error);
      // Final fallback to localStorage
      Object.entries(data).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          console.error('All storage methods failed:', e);
        }
      });
    }
  }

  /**
   * Storage retrieval with fallback
   */
  async getFromStorage(keys) {
    try {
      if (chrome.storage && chrome.storage.local) {
        return await chrome.storage.local.get(keys);
      } else {
        // Fallback to localStorage
        const result = {};
        keys.forEach(key => {
          const item = localStorage.getItem(key);
          if (item) {
            try {
              result[key] = JSON.parse(item);
            } catch (e) {
              result[key] = item;
            }
          }
        });
        return result;
      }
    } catch (error) {
      console.warn('Failed to get from storage:', error);
      // Final fallback to localStorage
      const result = {};
      keys.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            result[key] = JSON.parse(item);
          }
        } catch (e) {
          // Return as string if JSON parse fails
          result[key] = item;
        }
      });
      return result;
    }
  }
}

// Export for use in popup context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatManager;
} else {
  window.ChatManager = ChatManager;
}
