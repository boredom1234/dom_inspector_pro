// Background script for DOM Inspector Pro
// Handles side panel opening and closing

chrome.action.onClicked.addListener((tab) => {
  // Open the side panel when extension icon is clicked
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Optional: Set up side panel for specific tabs
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!tab.url) return;
  
  // Enable side panel for all tabs except extension pages
  if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'popup.html',
      enabled: true
    });
  }
});

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('DOM Inspector Pro installed with side panel support');
});

// Handle messages from JSON editor popup for highlighting
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'highlightElement' || message.action === 'removeHighlight') {
    console.log('Background script received message:', message);
    
    // Get all tabs and find the most recently active non-extension tab
    chrome.tabs.query({}, (tabs) => {
      // Filter out extension pages and find web tabs
      const webTabs = tabs.filter(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.includes('json-editor.html') &&
        !tab.url.includes('popup.html')
      );
      
      // Sort by last accessed time to get the most recent
      webTabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
      
      const webTab = webTabs[0]; // Get the most recently accessed web tab
      
      if (webTab) {
        console.log('Found web tab to highlight in:', webTab.url);
        
        // Try to send message to content script first
        chrome.tabs.sendMessage(webTab.id, message).then(response => {
          console.log('Content script responded:', response);
          sendResponse({ success: true, response });
        }).catch(err => {
          console.log('Content script not available, injecting directly:', err.message);
          
          // Content script might not be loaded, inject highlight script directly
          if (message.action === 'highlightElement') {
            console.log('Injecting highlight script for xpath:', message.xpath);
            chrome.scripting.executeScript({
              target: { tabId: webTab.id },
              func: (xpath) => {
                console.log('Direct highlight script executing for xpath:', xpath);
                
                // Add highlight styles if not already present
                if (!document.getElementById('json-editor-highlight-styles')) {
                  const styles = document.createElement('style');
                  styles.id = 'json-editor-highlight-styles';
                  styles.textContent = `
                    .json-editor-highlight {
                      outline: 3px solid #ff6b35 !important;
                      outline-offset: 2px !important;
                      box-shadow: 0 0 15px rgba(255, 107, 53, 0.6) !important;
                      background-color: rgba(255, 107, 53, 0.15) !important;
                      transition: all 0.3s ease !important;
                      z-index: 9999 !important;
                      position: relative !important;
                    }
                  `;
                  document.head.appendChild(styles);
                  console.log('Highlight styles injected');
                }
                
                // Remove any existing highlights first
                const existingHighlights = document.querySelectorAll('.json-editor-highlight');
                console.log('Removing', existingHighlights.length, 'existing highlights');
                existingHighlights.forEach(el => {
                  el.classList.remove('json-editor-highlight');
                });
                
                // Find element by xpath and highlight it
                try {
                  console.log('Evaluating xpath:', xpath);
                  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  const element = result.singleNodeValue;
                  
                  if (element) {
                    console.log('Found element to highlight:', element.tagName, element);
                    element.classList.add('json-editor-highlight');
                    console.log('Highlight class added successfully');
                    
                    // Scroll to element if not in view
                    const rect = element.getBoundingClientRect();
                    const isInView = rect.top >= 0 && rect.left >= 0 && 
                                   rect.bottom <= window.innerHeight && 
                                   rect.right <= window.innerWidth;
                    
                    if (!isInView) {
                      console.log('Scrolling to element');
                      element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'center'
                      });
                    }
                    
                    return { success: true, found: true };
                  } else {
                    console.warn('No element found with xpath:', xpath);
                    return { success: false, found: false, error: 'Element not found' };
                  }
                } catch (error) {
                  console.error('Error evaluating xpath:', xpath, error);
                  return { success: false, found: false, error: error.message };
                }
              },
              args: [message.xpath]
            }).then(results => {
              console.log('Script injection results:', results);
              sendResponse({ success: true, injected: true, results });
            }).catch(injectErr => {
              console.error('Script injection failed:', injectErr);
              sendResponse({ success: false, error: injectErr.message });
            });
            
          } else if (message.action === 'removeHighlight') {
            console.log('Injecting remove highlight script');
            chrome.scripting.executeScript({
              target: { tabId: webTab.id },
              func: () => {
                console.log('Remove highlight script executing');
                const highlights = document.querySelectorAll('.json-editor-highlight');
                console.log('Removing', highlights.length, 'highlights');
                highlights.forEach(el => {
                  el.classList.remove('json-editor-highlight');
                });
                return { success: true, removed: highlights.length };
              }
            }).then(results => {
              console.log('Remove highlight results:', results);
              sendResponse({ success: true, results });
            }).catch(removeErr => {
              console.error('Remove highlight failed:', removeErr);
              sendResponse({ success: false, error: removeErr.message });
            });
          }
        });
      } else {
        console.warn('No suitable web tab found for highlighting');
        sendResponse({ success: false, error: 'No web tab found' });
      }
    });
    
    return true; // Keep message channel open for async response
  }
});
