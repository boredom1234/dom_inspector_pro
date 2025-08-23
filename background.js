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
