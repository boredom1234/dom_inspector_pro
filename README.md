# DOM Inspector Pro - Modular Architecture

## Overview

DOM Inspector Pro is an advanced Chrome extension for comprehensive DOM analysis and element extraction, designed for test automation and web development. The extension has been completely refactored with a modular architecture for improved maintainability, scalability, and code organization.

## 🏗️ Architecture

### Modular Structure

The extension is organized into three main module categories:

#### **Core Modules** (`core/`)
- **`base-dom-analyzer.js`** - Foundation analyzer with core DOM extraction capabilities
- **`advanced-analyzer.js`** - Advanced analysis features (DOM diff, dependency mapping, multi-stage)
- **`comprehensive-extractor.js`** - Semantic analysis and template pattern recognition
- **`dom-utilities.js`** - Shared utility functions for DOM manipulation and traversal

#### **Popup Modules** (`popup/`)
- **`configuration-manager.js`** - Handles all configuration settings and persistence
- **`chat-manager.js`** - Manages chat integration and communication
- **`mcp-manager.js`** - Handles MCP Tool integration and API communication
- **`analysis-manager.js`** - Coordinates DOM analysis operations
- **`file-manager.js`** - Manages file operations (import/export)
- **`ui-event-handlers.js`** - Handles all UI interactions and event management

#### **Content Script Modules** (`content/`)
- **`message-handler.js`** - Handles communication between content script and popup
- **`element-highlighter.js`** - Provides visual element highlighting for inspection
- **`continuous-analysis.js`** - Manages continuous DOM monitoring
- **`knowledge-chain-tracker.js`** - Tracks user interactions for knowledge chain building
- **`chat-bridge.js`** - Manages chat session integration and ID detection
- **`element-inspector.js`** - Provides detailed element inspection with pattern recognition

## 🚀 Features

### Core Analysis Features
- **Hierarchical DOM Extraction** - Complete DOM tree with parent-child relationships
- **XPath & CSS Selector Generation** - Robust selectors for element targeting
- **Comprehensive Attribute Analysis** - All element attributes with semantic understanding
- **Form Element Detection** - Specialized handling for interactive elements

### Advanced Analysis
- **DOM Diff Tracking** - Monitors changes between DOM snapshots
- **Dependency Graph Mapping** - Maps relationships between conditional elements
- **Multi-Stage Processing** - Handles complex progressive disclosure flows
- **Template Pattern Recognition** - Identifies common UI patterns (login forms, navigation, etc.)
- **Semantic Analysis** - Extracts semantic meaning from DOM structure

### Integration Features
- **MCP Tool Integration** - Direct integration with localhost:3000 chat interface
- **Knowledge Chain Tracking** - Automatic interaction tracking for AI assistance
- **Continuous Monitoring** - Real-time DOM change detection
- **Visual Element Highlighting** - Interactive element inspection

## 📁 File Structure

```
xpath-parser/
├── core/                          # Core analysis modules
│   ├── base-dom-analyzer.js       # Foundation DOM analysis
│   ├── advanced-analyzer.js       # Advanced features
│   ├── comprehensive-extractor.js # Semantic analysis
│   └── dom-utilities.js           # Shared utilities
├── popup/                         # Popup UI modules  
│   ├── configuration-manager.js   # Settings management
│   ├── chat-manager.js            # Chat integration
│   ├── mcp-manager.js             # MCP Tool integration
│   ├── analysis-manager.js        # Analysis coordination
│   ├── file-manager.js            # File operations
│   └── ui-event-handlers.js       # UI event handling
├── content/                       # Content script modules
│   ├── message-handler.js         # Extension communication
│   ├── element-highlighter.js     # Visual highlighting
│   ├── continuous-analysis.js     # Real-time monitoring
│   ├── knowledge-chain-tracker.js # Interaction tracking
│   ├── chat-bridge.js             # Chat session bridge
│   └── element-inspector.js       # Element inspection
├── icons/                         # Extension icons
├── manifest.json                  # Extension manifest
├── popup.html                     # Popup UI structure
├── popup.js                       # Main popup coordinator
├── content-new.js                 # Modular content script
├── content.js                     # Legacy content script
├── dom-analyzer.js                # Legacy analyzer
└── background.js                  # Service worker
```

## 🔧 Configuration

### Analysis Settings
- **Include Hidden Elements** - Extract hidden/invisible elements
- **Include Text Content** - Capture element text content
- **Include All Attributes** - Extract comprehensive attribute data
- **Form Elements Only** - Focus on interactive form elements

### Advanced Features
- **DOM Diff** - Enable change tracking (configurable depth)
- **Dependency Tracking** - Map element relationships (configurable depth)
- **Multi-Stage Analysis** - Handle progressive disclosure (configurable timeout)
- **Template Recognition** - Identify UI patterns
- **Semantic Analysis** - Extract semantic structure (configurable depth)

## 🔌 API Integration

### MCP Tool Integration
The extension integrates with MCP Tool running on `localhost:3000`:

```javascript
POST /api/extension-dom
Content-Type: application/json

{
  "chatId": "chat-session-id",
  "url": "https://example.com",
  "title": "Page Title",
  "elements": [...],
  "domTree": {...},
  "detectedPatterns": [...]
}
```

### Chat Session Detection
Multiple strategies for chat ID detection:
1. Direct window messaging from chat tool
2. localStorage persistence
3. URL pattern matching (`/chat/[id]`)
4. Cross-window communication

## 🧪 Testing

### Manual Testing
1. Load extension in Chrome Developer Mode
2. Navigate to any webpage
3. Open extension side panel
4. Test basic extraction
5. Test advanced features
6. Test MCP Tool integration (with localhost:3000 running)

### Feature Testing Checklist
- [ ] Basic DOM extraction
- [ ] Advanced analysis features
- [ ] Configuration persistence
- [ ] Continuous monitoring
- [ ] Visual highlighting
- [ ] MCP Tool integration
- [ ] Chat session detection
- [ ] File export/import

## 🔄 Migration from Legacy

The extension maintains backward compatibility while transitioning to the modular architecture:

- `content.js` (legacy) → `content-new.js` (modular)
- `dom-analyzer.js` (legacy) → `core/*` modules
- Single popup file → `popup/*` modules

## 🐛 Troubleshooting

### Common Issues
1. **Module Loading Errors** - Check console for script loading failures
2. **MCP Tool Connection** - Ensure localhost:3000 is accessible
3. **Chat ID Detection** - Verify chat session is active
4. **Permission Errors** - Check extension permissions in Chrome

### Debug Mode
Enable debug logging by opening browser console and checking for:
- Module loading confirmation messages
- Analysis operation logs
- MCP Tool communication logs
- Chat session detection logs

## 📝 Development

### Adding New Modules
1. Create module file in appropriate directory (`core/`, `popup/`, or `content/`)
2. Follow existing module pattern with constructor and methods
3. Add to `web_accessible_resources` in `manifest.json`
4. Update main coordinator file to load and initialize module

### Module Communication
- Use global window object for cross-module communication
- Follow dependency injection pattern in coordinators
- Maintain loose coupling between modules

## 🤝 Contributing

When contributing to the modular architecture:
1. Maintain single responsibility principle for each module
2. Use consistent naming conventions
3. Add comprehensive JSDoc comments
4. Test all module interactions
5. Update documentation for new features

## 📊 Performance

The modular architecture provides:
- **Faster Loading** - Modules load asynchronously
- **Better Memory Usage** - Only active features consume memory
- **Improved Debugging** - Isolated functionality for easier troubleshooting
- **Enhanced Maintainability** - Clear separation of concerns
