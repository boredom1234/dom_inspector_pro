let extractedData = null;

document.addEventListener("DOMContentLoaded", function () {
  const extractBtn = document.getElementById("extractBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const status = document.getElementById("status");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const extractText = document.getElementById("extractText");

  // Add chat ID input
  const chatIdContainer = document.createElement("div");
  chatIdContainer.style.marginTop = "10px";
  chatIdContainer.innerHTML = `
        <label for="chatIdInput" style="display: block; margin-bottom: 5px; font-size: 12px; color: #666;">
            Chat ID (optional - leave blank for auto-detect):
        </label>
        <input type="text" id="chatIdInput" placeholder="e.g., 9xR-SgbZcIaUCtP34uI9_" 
               style="width: 100%; padding: 5px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px;">
    `;

  // Add new button for sending to MCP tool
  const sendToMCPBtn = document.createElement("button");
  sendToMCPBtn.id = "sendToMCPBtn";
  sendToMCPBtn.className = "btn btn-primary";
  sendToMCPBtn.innerHTML = "🚀 Send to Tool";
  sendToMCPBtn.disabled = true;
  sendToMCPBtn.style.marginTop = "5px";

  // Insert after copy button
  copyBtn.parentNode.insertBefore(chatIdContainer, copyBtn.nextSibling);
  chatIdContainer.appendChild(sendToMCPBtn);

  extractBtn.addEventListener("click", extractElements);
  downloadBtn.addEventListener("click", downloadResults);
  copyBtn.addEventListener("click", copyResults);
  sendToMCPBtn.addEventListener("click", sendToMCPTool);

  async function extractElements() {
    try {
      // Show loading state
      extractBtn.disabled = true;
      loadingSpinner.style.display = "inline-block";
      extractText.textContent = "Extracting...";
      showStatus("Scanning webpage...", "success");

      // Get current tab
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      // Get options
      const options = {
        includeHidden: document.getElementById("includeHidden").checked,
        includeText: document.getElementById("includeText").checked,
        includeAttributes: document.getElementById("includeAttributes").checked,
        onlyFormElements: document.getElementById("onlyFormElements").checked,
      };

      // Execute content script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: extractElementData,
        args: [options],
      });

      if (results && results[0] && results[0].result) {
        extractedData = results[0].result;
        showStatus(
          `Found ${extractedData.elements.length} elements`,
          "success"
        );
        downloadBtn.disabled = false;
        copyBtn.disabled = false;
        sendToMCPBtn.disabled = false;
      } else {
        throw new Error("No data extracted");
      }
    } catch (error) {
      console.error("Extraction error:", error);
      showStatus("Error extracting elements: " + error.message, "error");
    } finally {
      // Reset button state
      extractBtn.disabled = false;
      loadingSpinner.style.display = "none";
      extractText.textContent = "Extract All Elements";
    }
  }

  async function sendToMCPTool() {
    if (!extractedData) return;

    try {
      sendToMCPBtn.disabled = true;

      // Step 1: Show sending status
      showStatus("📡 Sending DOM data to MCP Tool...", "success");
      loadingSpinner.style.display = "inline-block";

      // Get chat ID from manual input or auto-detect
      const chatIdInput = document.getElementById("chatIdInput");
      let chatId = chatIdInput ? chatIdInput.value.trim() : null;

      if (chatId) {
        console.log("Extension popup - using manual chat ID:", chatId);
        showStatus(
          `📝 Using manual Chat ID: ${chatId.slice(0, 8)}...`,
          "success"
        );
      } else {
        // Auto-detect from localhost:3000 tabs
        const allTabs = await chrome.tabs.query({});
        let chatTab = null;

        console.log(
          "Extension popup - auto-detecting, scanning tabs:",
          allTabs.length
        );

        // Look for localhost:3000 tabs (both chat URLs and homepage)
        const localhost3000Tabs = [];
        for (const tab of allTabs) {
          if (
            tab.url &&
            (tab.url.includes("localhost:3000") ||
              tab.url.includes("127.0.0.1:3000"))
          ) {
            localhost3000Tabs.push({
              id: tab.id,
              url: tab.url,
              title: tab.title,
            });

            // Check for specific chat URL
            const urlMatch = tab.url.match(/\/chat\/([^\/\?#]+)/);
            if (urlMatch) {
              chatId = urlMatch[1];
              chatTab = tab;
              console.log("Extension popup - found specific chat:", {
                chatId,
                url: tab.url,
              });
              break;
            }

            // Check for homepage (new chat)
            if (
              tab.url.match(/^https?:\/\/(localhost|127\.0\.0\.1):3000\/?$/)
            ) {
              chatId = "new-chat-" + Date.now();
              chatTab = tab;
              console.log(
                "Extension popup - found homepage, using new chat ID:",
                { chatId, url: tab.url }
              );
              break;
            }
          }
        }

        console.log(
          "Extension popup - localhost:3000 tabs found:",
          localhost3000Tabs
        );
        console.log("Extension popup - final chat ID:", chatId);

        // Require chat ID - no global storage allowed
        if (!chatId) {
          if (localhost3000Tabs.length === 0) {
            showStatus(
              "❌ No localhost:3000 tabs found. Please open your chat first or enter Chat ID manually.",
              "error"
            );
          } else {
            showStatus(
              `❌ Found ${localhost3000Tabs.length} localhost tabs but no /chat/ URLs. Please enter Chat ID manually.`,
              "error"
            );
          }
          return;
        }
      }

      // Get current tab (the page we're extracting from)
      const [currentTab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      console.log("Extension popup - extracting from:", currentTab.url);
      console.log(
        "Extension popup - sending to chat:",
        chatId || "No chat detected"
      );

      // Get the current MCP session URL (you may need to adjust this)
      const mcpApiUrl = "http://localhost:3000/api/extension-dom";

      // Prepare payload with chat ID
      const payload = {
        ...extractedData,
        chatId: chatId,
      };

      console.log("Extension popup - sending payload:", {
        chatId,
        hasExtractedData: !!extractedData,
        sourceUrl: currentTab.url,
      });

      const startTime = Date.now();
      const response = await fetch(mcpApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Add the page URL so server can log what page the extension was used on
          "X-Source-URL": currentTab.url || "",
        },
        body: JSON.stringify(payload),
      });

      const duration = Date.now() - startTime;

      if (response.ok) {
        const result = await response.json();

        // Step 2: Show processing success with details
        const nodeCount = result.enhancedSnapshot?.nodes?.length || 0;
        const interactiveCount =
          result.enhancedSnapshot?.nodes?.filter((n) => n.interactive)
            ?.length || 0;

        if (chatId) {
          const displayChatId =
            chatId.startsWith("temp_") ||
            chatId.startsWith("homepage_") ||
            chatId.startsWith("fallback_")
              ? "Current Session"
              : chatId.slice(0, 8) + "...";

          showStatus(
            `✅ POST /api/extension-dom 200 in ${duration}ms - Context attached to ${displayChatId}!`,
            "success"
          );

          // Step 3: Show detailed context info
          setTimeout(() => {
            showStatus(
              `🎯 ${nodeCount} elements (${interactiveCount} interactive) ready for ${displayChatId}`,
              "success"
            );
          }, 2000);
        } else {
          showStatus(
            `⚠️ Context sent but no active chat detected. Open a chat first.`,
            "warning"
          );
        }

        console.log("MCP Tool response:", result);

        // Optionally store the enhanced snapshot for debugging
        localStorage.setItem(
          "lastMCPSnapshot",
          JSON.stringify(result.enhancedSnapshot)
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("MCP Tool integration error:", error);
      showStatus("❌ Failed to send to Tool: " + error.message, "error");
    } finally {
      sendToMCPBtn.disabled = false;
      loadingSpinner.style.display = "none";
    }
  }

  function downloadResults() {
    if (!extractedData) return;

    const jsonData = JSON.stringify(extractedData, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `xpath_selectors_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/:/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showStatus("Downloaded successfully!", "success");
  }

  async function copyResults() {
    if (!extractedData) return;

    try {
      const jsonData = JSON.stringify(extractedData, null, 2);
      await navigator.clipboard.writeText(jsonData);
      showStatus("Copied to clipboard!", "success");
    } catch (error) {
      showStatus("Failed to copy to clipboard", "error");
    }
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";

    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  }
});

// Function to be injected into the page
function extractElementData(options) {
  const results = {
    url: window.location.href,
    title: document.title,
    timestamp: new Date().toISOString(),
    options: options,
    elements: [],
    domTree: null, // New hierarchical structure
  };

  // Helper function to generate XPath
  function getXPath(element) {
    if (element === document.body) return "/html/body";

    let path = [];
    for (
      ;
      element && element.nodeType === Node.ELEMENT_NODE;
      element = element.parentNode
    ) {
      let index = 0;
      let hasFollowingSiblings = false;
      for (
        let sibling = element.previousSibling;
        sibling;
        sibling = sibling.previousSibling
      ) {
        if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
        if (sibling.nodeName === element.nodeName) ++index;
      }
      for (
        let sibling = element.nextSibling;
        sibling && !hasFollowingSiblings;
        sibling = sibling.nextSibling
      ) {
        if (sibling.nodeName === element.nodeName) hasFollowingSiblings = true;
      }

      const tagName = element.nodeName.toLowerCase();
      const pathIndex = index || hasFollowingSiblings ? `[${index + 1}]` : "";
      path.unshift(`${tagName}${pathIndex}`);
    }

    return path.length ? `/${path.join("/")}` : null;
  }

  // Helper function to generate CSS selector with modern test automation best practices
  function getCSSSelector(element) {
    const tag = element.tagName.toLowerCase();

    // Check for dynamic ID patterns
    const isDynamicId = (id) => {
      return (
        /\d+$/.test(id) ||
        /-\d+$/.test(id) ||
        /_\d+$/.test(id) ||
        /dynamic|temp|generated/i.test(id)
      );
    };

    // Get stable CSS classes (semantic, not layout-based)
    const getStableClasses = (className) => {
      if (!className) return [];
      // Convert to string to handle SVGAnimatedString and other non-string types
      const classStr =
        typeof className === "string" ? className : String(className);
      const classes = classStr.trim().split(/\s+/);
      return classes.filter(
        (cls) =>
          // Keep semantic classes, avoid layout/framework classes
          !/^(col-|row-|m[tblrxy]?-|p[tblrxy]?-|text-|bg-|border-|flex-|grid-|w-|h-|absolute|relative|fixed|top-|left-|right-|bottom-)/.test(
            cls
          ) &&
          !/^(btn-primary|btn-secondary|form-control|input-group)$/.test(cls) &&
          cls.length > 2
      );
    };

    // PRIORITY 1: data-testid (most stable for testing)
    const testId = element.getAttribute("data-testid");
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    // PRIORITY 2: Stable ID (non-dynamic)
    if (element.id && !isDynamicId(element.id)) {
      return `#${CSS.escape(element.id)}`;
    }

    // PRIORITY 3: Accessible attributes
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      return `${tag}[aria-label="${ariaLabel}"]`;
    }

    // PRIORITY 4: Stable CSS classes
    const stableClasses = getStableClasses(element.className);
    if (stableClasses.length > 0) {
      const classSelector = stableClasses
        .slice(0, 2)
        .map((cls) => `.${CSS.escape(cls)}`)
        .join("");
      return `${tag}${classSelector}`;
    }

    // PRIORITY 5: Form elements with semantic attributes - USE SIMPLE SELECTORS
    if (
      element.name &&
      (tag === "input" || tag === "select" || tag === "textarea")
    ) {
      // Prefer simple name attribute selector (works for any element type)
      return `[name="${element.name}"]`;
    }

    // PRIORITY 6: Radio/checkbox with value
    if (
      element.type &&
      (element.type === "radio" || element.type === "checkbox") &&
      element.value
    ) {
      return `input[type="${element.type}"][value="${element.value}"]`;
    }

    // PRIORITY 7: Input with type + placeholder
    if (tag === "input" && element.type && element.placeholder) {
      return `input[type="${element.type}"][placeholder="${element.placeholder}"]`;
    }

    // PRIORITY 8: Submit buttons with value
    if (element.type === "submit" && element.value) {
      return `input[type="submit"][value="${element.value}"]`;
    }

    // PRIORITY 9: Buttons with text
    if (tag === "button" && element.textContent && element.textContent.trim()) {
      return `button:has-text("${element.textContent.trim()}")`;
    }

    // PRIORITY 10: Links with href or text
    if (tag === "a") {
      const href = element.getAttribute("href");
      if (href && !href.startsWith("javascript:")) {
        return `a[href="${href}"]`;
      }
      if (element.textContent && element.textContent.trim()) {
        return `a:has-text("${element.textContent.trim()}")`;
      }
    }

    // PRIORITY 11: Semantic attributes
    const title = element.getAttribute("title");
    if (title) {
      return `${tag}[title="${title}"]`;
    }

    const alt = element.getAttribute("alt");
    if (alt) {
      return `${tag}[alt="${alt}"]`;
    }

    // PRIORITY 12: Container-relative positioning for inputs
    if (tag === "input" && element.type) {
      const form = element.closest("form, fieldset");
      if (form) {
        const sameTypeInputs = form.querySelectorAll(
          `input[type="${element.type}"]`
        );
        if (sameTypeInputs.length === 1) {
          return `form input[type="${element.type}"], fieldset input[type="${element.type}"]`;
        }
      }
    }

    // FALLBACK: Minimal positioning (limited to avoid brittle selectors)
    const sameTagElements = document.querySelectorAll(tag);
    const position = Array.from(sameTagElements).indexOf(element) + 1;
    if (position > 1 && position <= 5) {
      return `${tag}:nth-of-type(${position})`;
    }

    // Final fallback
    return tag;
  }

  // Get all elements or only form elements based on options
  let elements;
  if (options.onlyFormElements) {
    elements = document.querySelectorAll(
      "input, select, textarea, button, form, label"
    );
  } else {
    elements = document.querySelectorAll("*");
  }

  // Helper function to build hierarchical DOM tree
  function buildDOMTree(rootElement, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) return null;
    
    const element = rootElement;
    const style = window.getComputedStyle(element);
    
    // Skip if element is hidden and we don't want hidden elements
    if (!options.includeHidden) {
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return null;
      }
    }

    // Determine element role and interactivity
    const isInteractive = ['input', 'button', 'select', 'textarea', 'a', 'form'].includes(element.tagName.toLowerCase()) ||
                          element.onclick !== null ||
                          element.getAttribute('role') === 'button' ||
                          element.tabIndex >= 0;

    const isFormElement = ['input', 'select', 'textarea', 'button', 'form', 'label'].includes(element.tagName.toLowerCase());

    // Skip non-form elements if onlyFormElements is true
    if (options.onlyFormElements && !isFormElement) {
      return null;
    }

    // Get current live values for form elements
    let currentValue = null;
    let currentChecked = null;
    let currentSelected = null;
    
    if (element.tagName.toLowerCase() === 'input') {
      if (element.type === 'checkbox' || element.type === 'radio') {
        currentChecked = element.checked;
        currentValue = element.value;
      } else {
        currentValue = element.value;
      }
    } else if (element.tagName.toLowerCase() === 'select') {
      currentValue = element.value;
      currentSelected = element.selectedIndex;
    } else if (element.tagName.toLowerCase() === 'textarea') {
      currentValue = element.value;
    }

    const nodeData = {
      tagName: element.tagName.toLowerCase(),
      xpath: getXPath(element),
      cssSelector: getCSSSelector(element),
      attributes: {
        id: element.id || null,
        className: element.className || null,
        name: element.name || null,
        type: element.type || null,
        value: element.value || null,
        placeholder: element.placeholder || null,
        'aria-label': element.getAttribute('aria-label'),
        'data-testid': element.getAttribute('data-testid'),
        role: element.getAttribute('role'),
        title: element.getAttribute('title'),
        alt: element.getAttribute('alt'),
        href: element.getAttribute('href'),
      },
      currentState: {
        value: currentValue,
        checked: currentChecked,
        selectedIndex: currentSelected,
        textContent: options.includeText ? (element.textContent || '').trim().substring(0, 100) : null,
      },
      text: options.includeText ? (element.textContent || '').trim().substring(0, 100) : null,
      position: {
        depth: depth,
        index: Array.from(element.parentNode?.children || []).indexOf(element),
      },
      metadata: {
        isInteractive: isInteractive,
        isFormElement: isFormElement,
        isVisible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
        boundingBox: element.getBoundingClientRect ? {
          x: Math.round(element.getBoundingClientRect().x),
          y: Math.round(element.getBoundingClientRect().y),
          width: Math.round(element.getBoundingClientRect().width),
          height: Math.round(element.getBoundingClientRect().height),
        } : null,
      },
      children: []
    };

    // Clean up null attributes
    Object.keys(nodeData.attributes).forEach(key => {
      if (nodeData.attributes[key] === null || nodeData.attributes[key] === '') {
        delete nodeData.attributes[key];
      }
    });

    // Clean up null currentState values
    Object.keys(nodeData.currentState).forEach(key => {
      if (nodeData.currentState[key] === null || nodeData.currentState[key] === '') {
        delete nodeData.currentState[key];
      }
    });

    // Recursively build children
    for (const child of element.children) {
      const childNode = buildDOMTree(child, depth + 1, maxDepth);
      if (childNode) {
        nodeData.children.push(childNode);
      }
    }

    return nodeData;
  }

  // Build the hierarchical DOM tree starting from body
  const rootElement = options.onlyFormElements ? 
    document.querySelector('form') || document.body : 
    document.body;
  
  results.domTree = buildDOMTree(rootElement);

  // Also maintain backward compatibility with flat elements array
  elements.forEach((element, index) => {
    // Skip if element is hidden and we don't want hidden elements
    if (!options.includeHidden) {
      const style = window.getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.opacity === "0"
      ) {
        return;
      }
    }

    const elementData = {
      index: index,
      tagName: element.tagName.toLowerCase(),
      xpath: getXPath(element),
      cssSelector: getCSSSelector(element),
      id: element.id || null,
      className: element.className || null,
      name: element.name || null,
      type: element.type || null,
      value: element.value || null,
    };

    results.elements.push(elementData);
  });

  // Helper function to create a visual tree representation
  function formatDOMTreeAsText(node, prefix = '', isLast = true) {
    if (!node) return '';
    
    let result = '';
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    
    // Format node info
    let nodeInfo = `${node.tagName}`;
    
    // Add key attributes
    if (node.attributes.id) nodeInfo += `#${node.attributes.id}`;
    if (node.attributes.className) {
      const classes = node.attributes.className.split(' ').slice(0, 2);
      nodeInfo += `.${classes.join('.')}`;
    }
    if (node.attributes.name) nodeInfo += `[name="${node.attributes.name}"]`;
    if (node.attributes.type) nodeInfo += `[type="${node.attributes.type}"]`;
    
    // Add metadata indicators
    const indicators = [];
    if (node.metadata.isInteractive) indicators.push('🔗');
    if (node.metadata.isFormElement) indicators.push('📝');
    if (!node.metadata.isVisible) indicators.push('👻');
    
    result += `${prefix}${connector}${nodeInfo}`;
    if (indicators.length > 0) result += ` ${indicators.join('')}`;
    if (node.text && node.text.length > 0) result += ` "${node.text.substring(0, 30)}${node.text.length > 30 ? '...' : ''}"`;
    
    // Show current form values if available
    if (node.currentState && Object.keys(node.currentState).length > 0) {
      if (node.currentState.value !== undefined) {
        result += ` [value: "${node.currentState.value}"]`;
      }
      if (node.currentState.checked !== undefined) {
        result += ` [checked: ${node.currentState.checked}]`;
      }
    }
    
    result += '\n';
    
    // Add XPath and CSS selector as sub-items
    if (node.xpath) {
      result += `${childPrefix}├── xpath: ${node.xpath}\n`;
    }
    if (node.cssSelector) {
      result += `${childPrefix}├── css: ${node.cssSelector}\n`;
    }
    
    // Process children
    node.children.forEach((child, index) => {
      const isLastChild = index === node.children.length - 1;
      result += formatDOMTreeAsText(child, childPrefix, isLastChild);
    });
    
    return result;
  }

  // Add formatted tree representation
  if (results.domTree) {
    results.formattedTree = formatDOMTreeAsText(results.domTree);
  }

  return results;
}
