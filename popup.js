// Auto Linkify Popup Script
document.addEventListener('DOMContentLoaded', function() {
    const toggleSwitch = document.getElementById('toggleSwitch');
    const statusElement = document.getElementById('status');
    const refreshNotice = document.getElementById('refreshNotice');
    
    // Load current state
    chrome.storage.sync.get(['linkifyEnabled'], function(result) {
        const isEnabled = result.linkifyEnabled !== false; // Default to true
        updateToggleState(isEnabled);
        updateStatus(isEnabled);
    });
    
    // Toggle switch event listener
    toggleSwitch.addEventListener('click', function() {
        const currentState = toggleSwitch.classList.contains('active');
        const newState = !currentState;
        
        // Update storage
        chrome.storage.sync.set({ linkifyEnabled: newState }, function() {
            updateToggleState(newState);
            updateStatus(newState);
            
            // Send message to content script
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'toggle',
                    enabled: newState
                });
            });
            
            // Show refresh notice
            refreshNotice.style.display = 'block';
            setTimeout(() => {
                refreshNotice.style.display = 'none';
            }, 3000);
        });
    });
    
    function updateToggleState(isEnabled) {
        if (isEnabled) {
            toggleSwitch.classList.add('active');
        } else {
            toggleSwitch.classList.remove('active');
        }
    }
    
    function updateStatus(isEnabled) {
        if (isEnabled) {
            statusElement.textContent = 'Auto Linkify is enabled';
            statusElement.style.color = '#4CAF50';
        } else {
            statusElement.textContent = 'Auto Linkify is disabled';
            statusElement.style.color = '#f44336';
        }
    }
    
    // Add keyboard shortcut info
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            toggleSwitch.click();
        }
    });
    
    // Make toggle switch focusable
    toggleSwitch.setAttribute('tabindex', '0');
    
    // Add focus styles
    toggleSwitch.addEventListener('focus', function() {
        this.style.outline = '2px solid #4CAF50';
        this.style.outlineOffset = '2px';
    });
    
    toggleSwitch.addEventListener('blur', function() {
        this.style.outline = 'none';
    });
});