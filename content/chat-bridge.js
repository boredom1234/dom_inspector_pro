/**
 * Chat Session Bridge
 * Manages communication and chat ID detection for knowledge chain integration
 */

class ChatBridge {
  constructor() {
    this.currentChatId = null;
    this.setupMessageListener();
  }

  setupMessageListener() {
    // Listen for chat ID updates from the tool
    window.addEventListener('message', (event) => {
      if (event.origin === 'http://localhost:3000' && event.data.type === 'SET_CHAT_ID') {
        window.__CURRENT_CHAT_ID__ = event.data.chatId;
        this.currentChatId = event.data.chatId;
        console.log('✅ Received chat ID from tool:', event.data.chatId);
        
        // Store in localStorage for persistence
        try {
          localStorage.setItem('scira_active_chat_id', event.data.chatId);
          sessionStorage.setItem('scira_active_chat_id', event.data.chatId);
        } catch (e) {
          console.warn('Could not store chat ID:', e);
        }
      }
    });
  }

  // Get current chat ID with multiple fallback strategies
  async getCurrentChatId() {
    // Strategy 1: Check if set by chat tool
    if (window.__CURRENT_CHAT_ID__) {
      return window.__CURRENT_CHAT_ID__;
    }
    
    // Strategy 2: Check localStorage for active chat session
    try {
      const storedChatId = localStorage.getItem('scira_active_chat_id');
      if (storedChatId && storedChatId !== 'null') {
        return storedChatId;
      }
    } catch (e) {
      console.warn('Could not access localStorage:', e);
    }
    
    // Strategy 3: Try to get from sessionStorage
    try {
      const sessionChatId = sessionStorage.getItem('scira_active_chat_id');
      if (sessionChatId && sessionChatId !== 'null') {
        return sessionChatId;
      }
    } catch (e) {
      console.warn('Could not access sessionStorage:', e);
    }
    
    // Strategy 4: Check if we're on a chat URL and extract ID
    const urlMatch = window.location.href.match(/\/chat\/([^\/\?#]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Strategy 5: Try to communicate with chat tool window
    try {
      const chatId = await this.requestChatIdFromTool();
      if (chatId) {
        return chatId;
      }
    } catch (e) {
      console.warn('Could not communicate with chat tool:', e);
    }
    
    return null;
  }

  // Request chat ID from the chat tool window
  requestChatIdFromTool() {
    return new Promise((resolve) => {
      // Try to find chat tool window
      const chatToolOrigin = 'http://localhost:3000';
      
      // Send message to all windows
      const messageHandler = (event) => {
        if (event.origin === chatToolOrigin && event.data.type === 'CHAT_ID_RESPONSE') {
          window.removeEventListener('message', messageHandler);
          resolve(event.data.chatId);
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Broadcast request
      try {
        window.parent.postMessage({
          type: 'REQUEST_CHAT_ID',
          source: 'scira-extension',
          url: window.location.href
        }, chatToolOrigin);
      } catch (e) {
        // Ignore cross-origin errors
      }
      
      // Timeout after 2 seconds
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        resolve(null);
      }, 2000);
    });
  }

  // Set current chat ID (for manual setting)
  setChatId(chatId) {
    this.currentChatId = chatId;
    window.__CURRENT_CHAT_ID__ = chatId;
    
    try {
      localStorage.setItem('scira_active_chat_id', chatId);
      sessionStorage.setItem('scira_active_chat_id', chatId);
    } catch (e) {
      console.warn('Could not store chat ID:', e);
    }
  }

  // Clear current chat ID
  clearChatId() {
    this.currentChatId = null;
    window.__CURRENT_CHAT_ID__ = null;
    
    try {
      localStorage.removeItem('scira_active_chat_id');
      sessionStorage.removeItem('scira_active_chat_id');
    } catch (e) {
      console.warn('Could not clear chat ID:', e);
    }
  }
}

// Export for global use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChatBridge;
} else {
  window.ChatBridge = ChatBridge;
}
