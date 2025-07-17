// Auto Linkify Content Script
(function() {
    'use strict';
    
    // Improved URL regex pattern to match complete URLs as single entities
    const urlRegex =   /(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?\/[a-zA-Z0-9]{2,}|((https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z]{2,}(\.[a-zA-Z]{2,})(\.[a-zA-Z]{2,})?)|(https:\/\/www\.|http:\/\/www\.|https:\/\/|http:\/\/)?[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}\.[a-zA-Z0-9]{2,}(\.[a-zA-Z0-9]{2,})?/gi;

    // Elements to exclude from processing
    const excludedElements = new Set(['SCRIPT', 'STYLE', 'A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'NOSCRIPT']);
    
    // Check if extension is enabled
    let isEnabled = true;
    
    // Get settings from storage
    chrome.storage.sync.get(['linkifyEnabled'], function(result) {
        isEnabled = result.linkifyEnabled !== false; // Default to true
        if (isEnabled) {
            processPage();
        }
    });
    
    function processPage() {
        // Get all text nodes in the document
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip if parent is an excluded element
                    if (excludedElements.has(node.parentNode.nodeName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip if already inside a link
                    if (node.parentNode.closest('a')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Skip if already processed
                    if (node.parentNode.hasAttribute('data-linkify-processed')) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    
                    // Only process nodes that contain URLs
                    if (urlRegex.test(node.textContent)) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        const textNodes = [];
        let node;
        
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }
        
        // Process each text node
        textNodes.forEach(processTextNode);
    }
    
    function processTextNode(textNode) {
        const text = textNode.textContent;
        
        // Skip if this node has already been processed
        if (textNode.parentNode.hasAttribute('data-linkify-processed')) {
            return;
        }
        
        const matches = text.match(urlRegex);
        if (!matches) return;
        
        // Mark parent as processed to prevent double processing
        textNode.parentNode.setAttribute('data-linkify-processed', 'true');
        
        // Create a document fragment to hold the new elements
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        
        // Find all URLs and their positions
        const urlPositions = [];
        let match;
        const regex = new RegExp(urlRegex.source, urlRegex.flags);
        
        while ((match = regex.exec(text)) !== null) {
            urlPositions.push({
                url: match[0],
                start: match.index,
                end: match.index + match[0].length
            });
        }
        
        // Process each URL position
        urlPositions.forEach(urlMatch => {
            const { url, start, end } = urlMatch;
            
            // Add text before the URL
            if (start > lastIndex) {
                fragment.appendChild(document.createTextNode(text.slice(lastIndex, start)));
            }
            
            // Create clickable link
            const link = createClickableLink(url);
            fragment.appendChild(link);
            
            lastIndex = end;
        });
        
        // Add remaining text after the last URL
        if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        
        // Replace the original text node with the fragment
        textNode.parentNode.replaceChild(fragment, textNode);
    }
    
    function createClickableLink(url) {
        const link = document.createElement('a');
        
        // Clean up URL - remove trailing punctuation that shouldn't be part of the URL
        let cleanUrl = url.replace(/[.,;:!?)\]}>]*$/, '');
        let href = cleanUrl;
        
        // Add protocol if missing
        if (!cleanUrl.match(/^https?:\/\//)) {
            href = 'https://' + cleanUrl;
        }
        
        link.href = href;
        link.textContent = cleanUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Add visual styling
        link.style.color = '#0066cc';
        link.style.textDecoration = 'underline';
        link.style.cursor = 'pointer';
        
        // Add hover effects
        link.addEventListener('mouseenter', function() {
            this.style.color = '#0052a3';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.color = '#0066cc';
        });
        
        return link;
    }
    
    // Listen for dynamic content changes
    const observer = new MutationObserver(function(mutations) {
        if (!isEnabled) return;
        
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Process text nodes in the added element
                        const walker = document.createTreeWalker(
                            node,
                            NodeFilter.SHOW_TEXT,
                            {
                                acceptNode: function(textNode) {
                                    if (excludedElements.has(textNode.parentNode.nodeName)) {
                                        return NodeFilter.FILTER_REJECT;
                                    }
                                    if (textNode.parentNode.closest('a')) {
                                        return NodeFilter.FILTER_REJECT;
                                    }
                                    if (textNode.parentNode.hasAttribute('data-linkify-processed')) {
                                        return NodeFilter.FILTER_REJECT;
                                    }
                                    if (urlRegex.test(textNode.textContent)) {
                                        return NodeFilter.FILTER_ACCEPT;
                                    }
                                    return NodeFilter.FILTER_REJECT;
                                }
                            }
                        );
                        
                        let textNode;
                        while (textNode = walker.nextNode()) {
                            processTextNode(textNode);
                        }
                    }
                });
            }
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'toggle') {
            isEnabled = request.enabled;
            if (isEnabled) {
                processPage();
            }
        }
    });
    
})();