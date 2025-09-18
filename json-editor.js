// JSON Editor for DOM Inspector Pro
let extractedData = [];
let selectedElements = new Set();

// DOM elements
const tableContainer = document.getElementById('tableContainer');
const emptyState = document.getElementById('emptyState');
const selectionCount = document.getElementById('selectionCount');
const totalCount = document.getElementById('totalCount');
const filterInput = document.getElementById('filterInput');
const tagFilter = document.getElementById('tagFilter');
const status = document.getElementById('status');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromStorage();
    setupEventListeners();
});

function setupEventListeners() {
    // Toolbar buttons
    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
    document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelected);
    document.getElementById('copySelectedBtn').addEventListener('click', copySelected);
    document.getElementById('copyAllBtn').addEventListener('click', copyAll);
    
    // Filters
    filterInput.addEventListener('input', applyFilters);
    tagFilter.addEventListener('change', applyFilters);
    
    // Listen for data updates from main popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'JSON_EDITOR_DATA') {
            extractedData = message.data || [];
            // Initialize manual_field for all elements
            extractedData.forEach(element => {
                if (!element.hasOwnProperty('manual_field')) {
                    element.manual_field = '';
                }
            });
            renderTable();
            sendResponse({ success: true });
        }
    });
}

function loadDataFromStorage() {
    chrome.storage.local.get(['extractedData'], (result) => {
        if (result.extractedData) {
            extractedData = result.extractedData.elements || [];
            console.log('Loaded extracted data:', extractedData);
            
            // Initialize manual_field for all elements
            extractedData.forEach(element => {
                if (!element.hasOwnProperty('manual_field')) {
                    element.manual_field = '';
                }
            });
            renderTable();
        }
    });
}

function renderTable() {
    if (!extractedData || extractedData.length === 0) {
        tableContainer.innerHTML = '<div id="emptyState" class="empty-state"><h3>No Data Available</h3><p>Extract elements from the main popup to start editing</p></div>';
        updateCounts();
        return;
    }

    const columns = getUniqueColumns(extractedData);
    
    // Create array of elements with their original indices for sorting
    const elementsWithIndices = extractedData.map((element, index) => ({
        element,
        originalIndex: index,
        isSelected: selectedElements.has(index)
    }));
    
    // Sort so selected items come first
    elementsWithIndices.sort((a, b) => {
        if (a.isSelected && !b.isSelected) return -1;
        if (!a.isSelected && b.isSelected) return 1;
        return a.originalIndex - b.originalIndex;
    });
    
    let html = `
        <table>
            <thead>
                <tr>
                    <th>
                        <input type="checkbox" id="masterCheckbox"> Select
                    </th>
                    <th>#</th>
                    ${columns.map(col => `<th>${col}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${elementsWithIndices.map(({ element, originalIndex }, displayIndex) => 
                    renderTableRow(element, originalIndex, columns, displayIndex)).join('')}
            </tbody>
        </table>
    `;
    
    tableContainer.innerHTML = html;
    console.log('Table rendered, setting up event listeners...');
    setupTableEventListeners();
    updateTagFilter();
    updateCounts();
    applyFilters();
}

function getUniqueColumns(data) {
    const columns = new Set();
    data.forEach(element => {
        Object.keys(element).forEach(key => columns.add(key));
    });
    // Always add manual_field column
    columns.add('manual_field');
    
    const sortedColumns = Array.from(columns).sort((a, b) => {
        // Prioritize common columns, put manual_field at the end
        const priority = ['tagName', 'id', 'name', 'type', 'value', 'text', 'className', 'xpath'];
        if (a === 'manual_field') return 1;
        if (b === 'manual_field') return -1;
        const aIndex = priority.indexOf(a);
        const bIndex = priority.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
    });
    
    console.log('Sorted columns:', sortedColumns);
    console.log('Sample data element:', data[0]);
    return sortedColumns;
}

function renderTableRow(element, index, columns, displayIndex = null) {
    const isSelected = selectedElements.has(index);
    const rowNumber = displayIndex !== null ? displayIndex + 1 : index + 1;
    return `
        <tr class="${isSelected ? 'selected' : ''}" data-index="${index}">
            <td>
                <input type="checkbox" class="row-checkbox checkbox" data-index="${index}" ${isSelected ? 'checked' : ''}>
            </td>
            <td>${rowNumber}</td>
            ${columns.map(col => renderTableCell(element, col, index)).join('')}
        </tr>
    `;
}

function renderTableCell(element, column, rowIndex) {
    const value = element[column];
    console.log(`Rendering cell for column '${column}' with value:`, value);
    
    if (column === 'tagName') {
        return `<td><span class="tag-name">${value || ''}</span></td>`;
    }
    
    if (column === 'xpath') {
        return `<td><div class="xpath">${value || ''}</div></td>`;
    }
    
    if (column === 'manual_field') {
        // Always render manual_field as editable input with special styling
        return `<td><input type="text" class="editable manual-field" value="${escapeHtml(String(value || ''))}" 
                     data-row="${rowIndex}" data-column="${column}"
                     placeholder="Enter custom data..."></td>`;
    }
    
    if (typeof value === 'boolean') {
        return `<td><span class="boolean-toggle ${value ? 'boolean-true' : 'boolean-false'}" 
                     data-row="${rowIndex}" data-column="${column}">${value}</span></td>`;
    }
    
    if (value === null || value === undefined) {
        return `<td><input type="text" class="editable" value="" 
                     data-row="${rowIndex}" data-column="${column}"
                     placeholder="null"></td>`;
    }
    
    return `<td><input type="text" class="editable" value="${escapeHtml(String(value))}" 
                 data-row="${rowIndex}" data-column="${column}"></td>`;
}

function setupTableEventListeners() {
    // Master checkbox
    const masterCheckbox = document.getElementById('masterCheckbox');
    if (masterCheckbox) {
        masterCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectAll();
            } else {
                deselectAll();
            }
        });
    }
    
    // Row checkboxes
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = parseInt(e.target.dataset.index);
            
            if (e.target.checked) {
                selectedElements.add(index);
            } else {
                selectedElements.delete(index);
            }
            
            // Re-render table to move selected items to top
            renderTable();
        });
    });
    
    // Add hover highlighting for webpage elements
    const rows = document.querySelectorAll('tbody tr');
    console.log(`Setting up hover listeners for ${rows.length} rows`);
    
    rows.forEach(row => {
        const index = parseInt(row.dataset.index);
        const element = extractedData[index];
        
        console.log(`Row ${index}:`, element);
        
        if (element && element.xpath) {
            console.log(`Adding hover listeners for element with xpath: ${element.xpath}`);
            
            row.addEventListener('mouseenter', () => {
                console.log('Mouse entered row, highlighting xpath:', element.xpath);
                highlightElementOnPage(element.xpath);
            });
            
            row.addEventListener('mouseleave', () => {
                console.log('Mouse left row, removing highlight');
                removeHighlightFromPage();
            });
            
            // Visual indicator that hover is available
            row.style.cursor = 'pointer';
            row.title = `Hover to highlight: ${element.xpath}`;
            
            // Add visual indicator for hoverable rows
            row.style.borderLeft = '3px solid transparent';
            row.addEventListener('mouseenter', () => {
                row.style.borderLeft = '3px solid #4865f9';
            });
            row.addEventListener('mouseleave', () => {
                row.style.borderLeft = '3px solid transparent';
            });
        } else {
            console.log(`Row ${index} has no xpath:`, element);
            // Visual indicator for non-hoverable rows
            row.style.opacity = '0.7';
            row.title = 'No XPath available for highlighting';
        }
    });
}

function updateValue(rowIndex, column, newValue) {
    if (extractedData[rowIndex]) {
        // Manual field should always be treated as string
        if (column === 'manual_field') {
            extractedData[rowIndex][column] = newValue;
        } else {
            // Convert to appropriate type for other fields
            if (newValue === '' || newValue === 'null') {
                extractedData[rowIndex][column] = null;
            } else if (newValue === 'true') {
                extractedData[rowIndex][column] = true;
            } else if (newValue === 'false') {
                extractedData[rowIndex][column] = false;
            } else if (!isNaN(newValue) && newValue !== '') {
                extractedData[rowIndex][column] = Number(newValue);
            } else {
                extractedData[rowIndex][column] = newValue;
            }
        }
        
        // Save to storage
        saveDataToStorage();
        showStatus('Value updated', 'success');
    }
}

function toggleBoolean(rowIndex, column) {
    if (extractedData[rowIndex]) {
        extractedData[rowIndex][column] = !extractedData[rowIndex][column];
        renderTable();
        saveDataToStorage();
        showStatus('Boolean toggled', 'success');
    }
}

function selectAll() {
    const visibleRows = document.querySelectorAll('tbody tr:not([style*="display: none"])');
    selectedElements.clear();
    
    visibleRows.forEach(row => {
        const index = parseInt(row.dataset.index);
        selectedElements.add(index);
    });
    
    // Re-render table to move selected items to top
    renderTable();
}

function deselectAll() {
    selectedElements.clear();
    
    // Re-render table to move deselected items back to original positions
    renderTable();
}

function deleteSelected() {
    if (selectedElements.size === 0) {
        showStatus('No elements selected', 'error');
        return;
    }
    
    const sortedIndices = Array.from(selectedElements).sort((a, b) => b - a);
    sortedIndices.forEach(index => {
        extractedData.splice(index, 1);
    });
    
    selectedElements.clear();
    renderTable();
    saveDataToStorage();
    showStatus(`Deleted ${sortedIndices.length} elements`, 'success');
}

function copySelected() {
    if (selectedElements.size === 0) {
        showStatus('No elements selected', 'error');
        return;
    }
    
    // Force save any pending changes before copying
    const inputs = document.querySelectorAll('.editable');
    inputs.forEach(input => {
        const rowIndex = parseInt(input.closest('tr').dataset.index);
        const column = input.getAttribute('data-column') || getColumnFromInput(input);
        if (column && extractedData[rowIndex] && input.value !== String(extractedData[rowIndex][column] || '')) {
            updateValue(rowIndex, column, input.value);
        }
    });
    
    const selectedData = Array.from(selectedElements).map(index => extractedData[index]);
    copyToClipboard(selectedData);
    showStatus(`Copied ${selectedElements.size} selected elements`, 'success');
}

function copyAll() {
    if (extractedData.length === 0) {
        showStatus('No data to copy', 'error');
        return;
    }
    
    // Force save any pending changes before copying
    const inputs = document.querySelectorAll('.editable');
    inputs.forEach(input => {
        const rowIndex = parseInt(input.closest('tr').dataset.index);
        const column = getColumnFromInput(input);
        if (column && extractedData[rowIndex] && input.value !== String(extractedData[rowIndex][column] || '')) {
            updateValue(rowIndex, column, input.value);
        }
    });
    
    copyToClipboard(extractedData);
    showStatus(`Copied all ${extractedData.length} elements`, 'success');
}

function getColumnFromInput(input) {
    const cellIndex = Array.from(input.closest('tr').cells).indexOf(input.closest('td'));
    const headerCells = document.querySelectorAll('thead th');
    // Account for checkbox and # columns (offset by 2)
    if (headerCells[cellIndex]) {
        return headerCells[cellIndex].textContent.trim();
    }
    return null;
}

async function copyToClipboard(data) {
    try {
        // Get URL information from the stored extracted data (passed from popup)
        const result = await new Promise(resolve => {
            chrome.storage.local.get(['extractedData'], resolve);
        });
        
        let pageUrl = 'Unknown';
        let pageTitle = 'Unknown';
        let timestamp = new Date().toISOString();
        
        if (result.extractedData) {
            pageUrl = result.extractedData.pageUrl || result.extractedData.url || pageUrl;
            pageTitle = result.extractedData.pageTitle || result.extractedData.title || pageTitle;
            timestamp = result.extractedData.timestamp || timestamp;
        }
        
        // Create data with URL information at the top
        const dataWithUrl = {
            dom_insp_extr_data_json: true,
            pageUrl: pageUrl,
            pageTitle: pageTitle,
            timestamp: timestamp,
            elements: Array.isArray(data) ? data : [data]
        };
        
        const jsonString = JSON.stringify(dataWithUrl, null, 2);
        await navigator.clipboard.writeText(jsonString);
    } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        showStatus('Failed to copy to clipboard', 'error');
    }
}

function applyFilters() {
    const filterText = filterInput.value.toLowerCase();
    const tagFilterValue = tagFilter.value;
    
    document.querySelectorAll('tbody tr').forEach(row => {
        const index = parseInt(row.dataset.index);
        const element = extractedData[index];
        
        let visible = true;
        
        // Text filter
        if (filterText) {
            const searchText = JSON.stringify(element).toLowerCase();
            visible = visible && searchText.includes(filterText);
        }
        
        // Tag filter
        if (tagFilterValue) {
            visible = visible && element.tagName === tagFilterValue;
        }
        
        row.style.display = visible ? '' : 'none';
    });
    
    updateCounts();
}

function updateTagFilter() {
    const tags = [...new Set(extractedData.map(el => el.tagName).filter(Boolean))].sort();
    tagFilter.innerHTML = '<option value="">All Tags</option>' + 
        tags.map(tag => `<option value="${tag}">${tag}</option>`).join('');
}

function updateCounts() {
    const visibleRows = document.querySelectorAll('tbody tr:not([style*="display: none"])').length;
    const selectedVisible = Array.from(selectedElements).filter(index => {
        const row = document.querySelector(`tr[data-index="${index}"]`);
        return row && !row.style.display.includes('none');
    }).length;
    
    selectionCount.textContent = `${selectedVisible} selected`;
    totalCount.textContent = `${visibleRows} visible of ${extractedData.length} total`;
}

function updateMasterCheckbox() {
    const masterCheckbox = document.getElementById('masterCheckbox');
    if (!masterCheckbox) return;
    
    const visibleRows = document.querySelectorAll('tbody tr:not([style*="display: none"])');
    const visibleSelected = Array.from(selectedElements).filter(index => {
        const row = document.querySelector(`tr[data-index="${index}"]`);
        return row && !row.style.display.includes('none');
    });
    
    if (visibleSelected.length === 0) {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = false;
    } else if (visibleSelected.length === visibleRows.length) {
        masterCheckbox.checked = true;
        masterCheckbox.indeterminate = false;
    } else {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = true;
    }
}

function saveDataToStorage() {
    chrome.storage.local.set({ 
        extractedData: { elements: extractedData }
    });
}

function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    setTimeout(() => {
        status.style.display = 'none';
    }, 3000);
}

function highlightElementOnPage(xpath) {
    console.log('highlightElementOnPage called with xpath:', xpath);
    
    if (!xpath) {
        console.warn('No xpath provided for highlighting');
        return;
    }
    
    // Send message to background script to handle highlighting
    chrome.runtime.sendMessage({
        action: 'highlightElement',
        xpath: xpath
    }).then(response => {
        console.log('Highlight message sent successfully:', response);
        if (response && !response.success) {
            console.warn('Highlighting failed:', response.error);
        }
    }).catch(err => {
        console.error('Failed to send highlight message:', err);
    });
}

function removeHighlightFromPage() {
    console.log('removeHighlightFromPage called');
    
    // Send message to background script to handle highlight removal
    chrome.runtime.sendMessage({
        action: 'removeHighlight'
    }).then(response => {
        console.log('Remove highlight message sent successfully:', response);
    }).catch(err => {
        console.error('Failed to send remove highlight message:', err);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
