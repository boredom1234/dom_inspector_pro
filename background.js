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
    
    // Forward highlighting messages to the active tab's content script
    // Don't use currentWindow since JSON editor is in popup window
    chrome.tabs.query({ active: true }, (tabs) => {
      // Find the actual webpage tab (not extension pages)
      const webTab = tabs.find(tab => 
        tab.url && 
        !tab.url.startsWith('chrome://') && 
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.includes('json-editor.html')
      );
      
      if (webTab) {
        console.log('Found web tab to highlight in:', webTab.url);
        
        chrome.tabs.sendMessage(webTab.id, message).then(response => {
          console.log('Content script responded:', response);
          sendResponse({ success: true });
        }).catch(err => {
          console.log('Content script not available, injecting directly:', err.message);
          // Content script might not be loaded, inject highlight script directly
          if (message.action === 'highlightElement') {
            console.log('Injecting highlight script for xpath:', message.xpath);
            chrome.scripting.executeScript({
              target: { tabId: webTab.id },
              func: (xpath) => {
                console.log('Highlight script executing on page for xpath:', xpath);
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
                }
                
                // Remove any existing highlights first
                document.querySelectorAll('.json-editor-highlight').forEach(el => {
                  el.classList.remove('json-editor-highlight');
                });
                
                // Find element by xpath and highlight it
                try {
                  console.log('Looking for element with xpath:', xpath);
                  const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                  
                  if (element) {
                    console.log('Found element to highlight:', element);
                    element.classList.add('json-editor-highlight');
                    console.log('Added highlight class, element should now be glowing');
                    
                    // Smooth scroll to element if it's not in view
                    const rect = element.getBoundingClientRect();
                    const isInView = rect.top >= 0 && rect.left >= 0 && 
                                   rect.bottom <= window.innerHeight && 
                                   rect.right <= window.innerWidth;
                    
                    if (!isInView) {
                      element.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center',
                        inline: 'center'
                      });
                    }
                  } else {
                    console.warn('No element found with xpath:', xpath);
                  }
                } catch (error) {
                  console.error('Error finding element with xpath:', xpath, error);
                }
              },
              args: [message.xpath]
            });
          } else if (message.action === 'removeHighlight') {
            console.log('Injecting remove highlight script');
            chrome.scripting.executeScript({
              target: { tabId: webTab.id },
              func: () => {
                console.log('Remove highlight script executing on page');
                // Remove highlight from all elements
                document.querySelectorAll('.json-editor-highlight').forEach(el => {
                  el.classList.remove('json-editor-highlight');
                });
              }
            });
          }
        });
      }
    });
    sendResponse({ success: true });
    return true;
  }
});
