/**
 * MCP Manager Module
 * Handles integration with MCP Tool API and sending extracted data
 */

class MCPManager {
  constructor() {
    this.mcpApiUrl = "http://localhost:3000/api/extension-dom";
  }

  /**
   * Send extracted data to MCP Tool
   */
  async sendToMCPTool(extractedData) {
    if (!extractedData) {
      console.warn('No extracted data to send');
      return;
    }

    const sendToMCPBtn = document.getElementById('sendToMCPBtn');
    const loadingSpinner = document.getElementById('loadingSpinner');

    try {
      if (sendToMCPBtn) sendToMCPBtn.disabled = true;

      // Step 1: Show sending status
      this.showStatus("📡 Sending DOM data to MCP Tool...", "success");
      if (loadingSpinner) loadingSpinner.style.display = "inline-block";

      // Get chat ID
      let chatId = await this.getChatId();
      
      if (!chatId) {
        this.showStatus("❌ No valid chat ID found. Please enter Chat ID manually or open a chat first.", "error");
        return;
      }

      // Get current tab (the page we're extracting from)
      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      console.log("MCP Manager - extracting from:", currentTab.url);
      console.log("MCP Manager - sending to chat:", chatId);

      // Prepare payload with chat ID
      const payload = {
        ...extractedData,
        chatId: chatId,
      };

      console.log("MCP Manager - sending payload:", {
        chatId,
        hasExtractedData: !!extractedData,
        sourceUrl: currentTab.url,
      });

      // Send to MCP API
      const startTime = Date.now();
      const response = await fetch(this.mcpApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Source-URL": currentTab.url || "",
        },
        body: JSON.stringify(payload),
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        await this.handleSuccessResponse(response, duration, chatId);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("MCP Tool integration error:", error);
      this.showStatus("❌ Failed to send to Tool: " + error.message, "error");
    } finally {
      if (sendToMCPBtn) sendToMCPBtn.disabled = false;
      if (loadingSpinner) loadingSpinner.style.display = "none";
    }
  }

  /**
   * Get chat ID from manual input or auto-detect
   */
  async getChatId() {
    // First try manual input
    const chatIdInput = document.getElementById("chatIdInput");
    let chatId = chatIdInput ? chatIdInput.value.trim() : null;

    if (chatId) {
      console.log("MCP Manager - using manual chat ID:", chatId);
      this.showStatus(`📝 Using manual Chat ID: ${chatId.slice(0, 8)}...`, "success");
      return chatId;
    }

    // Auto-detect from localhost:3000 tabs
    console.log("MCP Manager - auto-detecting chat ID");
    const detectionResult = await this.detectChatIdFromTabs();
    
    if (detectionResult.chatId) {
      return detectionResult.chatId;
    }

    // Show appropriate error message
    if (detectionResult.localhost3000Tabs.length === 0) {
      this.showStatus(
        "❌ No localhost:3000 tabs found. Please open your chat first or enter Chat ID manually.",
        "error"
      );
    } else {
      this.showStatus(
        `❌ Found ${detectionResult.localhost3000Tabs.length} localhost tabs but no /chat/ URLs. Please enter Chat ID manually.`,
        "error"
      );
    }

    return null;
  }

  /**
   * Auto-detect chat ID from browser tabs
   */
  async detectChatIdFromTabs() {
    const allTabs = await chrome.tabs.query({});
    let chatId = null;
    const localhost3000Tabs = [];

    console.log("MCP Manager - scanning tabs:", allTabs.length);

    // Look for localhost:3000 tabs (both chat URLs and homepage)
    for (const tab of allTabs) {
      if (tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("127.0.0.1:3000"))) {
        localhost3000Tabs.push({
          id: tab.id,
          url: tab.url,
          title: tab.title,
        });

        // Check for specific chat URL
        const urlMatch = tab.url.match(/\/chat\/([^\/\?#]+)/);
        if (urlMatch) {
          chatId = urlMatch[1];
          console.log("MCP Manager - found specific chat:", {
            chatId,
            url: tab.url,
          });
          break;
        }

        // Check for homepage (new chat)
        if (tab.url.match(/^https?:\/\/(localhost|127\.0\.0\.1):3000\/?$/)) {
          chatId = "new-chat-" + Date.now();
          console.log("MCP Manager - found homepage, using new chat ID:", {
            chatId,
            url: tab.url
          });
          break;
        }
      }
    }

    console.log("MCP Manager - localhost:3000 tabs found:", localhost3000Tabs);
    console.log("MCP Manager - final chat ID:", chatId);

    return {
      chatId,
      localhost3000Tabs
    };
  }

  /**
   * Handle successful API response
   */
  async handleSuccessResponse(response, duration, chatId) {
    const result = await response.json();

    // Step 2: Show processing success with details
    const nodeCount = result.enhancedSnapshot?.nodes?.length || 0;
    const interactiveCount = result.enhancedSnapshot?.nodes?.filter((n) => n.interactive)?.length || 0;

    if (chatId) {
      const displayChatId = this.getDisplayChatId(chatId);

      this.showStatus(
        `✅ POST /api/extension-dom 200 in ${duration}ms - Context attached to ${displayChatId}!`,
        "success"
      );

      // Step 3: Show detailed context info
      setTimeout(() => {
        this.showStatus(
          `🎯 ${nodeCount} elements (${interactiveCount} interactive) ready for ${displayChatId}`,
          "success"
        );
      }, 2000);
    } else {
      this.showStatus(
        `⚠️ Context sent but no active chat detected. Open a chat first.`,
        "warning"
      );
    }

    console.log("MCP Tool response:", result);

    // Optionally store the enhanced snapshot for debugging
    try {
      localStorage.setItem("lastMCPSnapshot", JSON.stringify(result.enhancedSnapshot));
    } catch (error) {
      console.warn('Failed to store MCP snapshot in localStorage:', error);
    }
  }

  /**
   * Get display-friendly chat ID
   */
  getDisplayChatId(chatId) {
    return chatId.startsWith("temp_") ||
           chatId.startsWith("homepage_") ||
           chatId.startsWith("fallback_") ||
           chatId.startsWith("new-chat-")
      ? "Current Session"
      : chatId.slice(0, 8) + "...";
  }

  /**
   * Test MCP Tool connection
   */
  async testConnection() {
    try {
      const response = await fetch(this.mcpApiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        this.showStatus("✅ MCP Tool connection successful", "success");
        return true;
      } else {
        this.showStatus(`❌ MCP Tool connection failed: ${response.status}`, "error");
        return false;
      }
    } catch (error) {
      console.error("MCP Tool connection test failed:", error);
      this.showStatus("❌ MCP Tool connection failed: " + error.message, "error");
      return false;
    }
  }

  /**
   * Get MCP Tool status
   */
  async getToolStatus() {
    try {
      const response = await fetch(`${this.mcpApiUrl}/status`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const status = await response.json();
        return status;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to get MCP Tool status:", error);
      return null;
    }
  }

  /**
   * Send test data to MCP Tool
   */
  async sendTestData(chatId) {
    const testData = {
      url: window.location?.href || 'test://example.com',
      title: 'MCP Integration Test',
      timestamp: new Date().toISOString(),
      chatId: chatId,
      elements: [
        {
          tagName: 'div',
          xpath: '/html/body/div[1]',
          cssSelector: 'div.test',
          attributes: { class: 'test', 'data-testid': 'mcp-test' },
          text: 'Test element for MCP integration'
        }
      ],
      metadata: {
        testMode: true,
        generatedBy: 'MCP Manager Test'
      }
    };

    try {
      const response = await fetch(this.mcpApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        const result = await response.json();
        this.showStatus("✅ Test data sent successfully", "success");
        return result;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Test data send failed:", error);
      this.showStatus("❌ Test data send failed: " + error.message, "error");
      return null;
    }
  }

  /**
   * Show status message (delegates to UI event handlers if available)
   */
  showStatus(message, type) {
    if (window.uiEventHandlers && window.uiEventHandlers.showStatus) {
      window.uiEventHandlers.showStatus(message, type);
    } else {
      // Fallback status display
      const status = document.getElementById('status');
      if (status) {
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = "block";

        setTimeout(() => {
          status.style.display = "none";
        }, 3000);
      } else {
        console.log(`Status (${type}): ${message}`);
      }
    }
  }

  /**
   * Validate payload before sending
   */
  validatePayload(payload) {
    const errors = [];
    
    if (!payload.chatId) {
      errors.push('Chat ID is required');
    }
    
    if (!payload.elements || !Array.isArray(payload.elements)) {
      errors.push('Elements array is required');
    }
    
    if (!payload.url) {
      errors.push('Source URL is required');
    }
    
    if (!payload.timestamp) {
      errors.push('Timestamp is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get sending statistics
   */
  getSendingStats() {
    const stats = JSON.parse(localStorage.getItem('mcpSendingStats') || '{}');
    return {
      totalSent: stats.totalSent || 0,
      lastSentTimestamp: stats.lastSentTimestamp || null,
      successCount: stats.successCount || 0,
      errorCount: stats.errorCount || 0
    };
  }

  /**
   * Update sending statistics
   */
  updateSendingStats(success = true) {
    const stats = this.getSendingStats();
    stats.totalSent += 1;
    stats.lastSentTimestamp = new Date().toISOString();
    
    if (success) {
      stats.successCount += 1;
    } else {
      stats.errorCount += 1;
    }
    
    try {
      localStorage.setItem('mcpSendingStats', JSON.stringify(stats));
    } catch (error) {
      console.warn('Failed to update sending stats:', error);
    }
  }
}

// Export for use in popup context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MCPManager;
} else {
  window.MCPManager = MCPManager;
}
