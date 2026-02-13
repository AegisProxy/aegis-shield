import { detectPII, hasPII, getPIISummary } from '../src/utils/pii-detector';

export default defineContentScript({
  matches: ['*://chatgpt.com/*', '*://*.openai.com/*'],
  
  main() {
    console.log('Aegis Shield: Content script loaded for ChatGPT');
    
    // Function to find and monitor the message input box
    function findAndMonitorInput() {
      // ChatGPT uses a contenteditable div for input
      // Common selectors for ChatGPT input areas
      const inputSelectors = [
        '#prompt-textarea',
        '[contenteditable="true"]',
        'textarea[placeholder*="Message"]',
        'div[contenteditable="true"][role="textbox"]',
      ];
      
      for (const selector of inputSelectors) {
        const inputElement = document.querySelector(selector);
        
        if (inputElement) {
          console.log('Aegis Shield: Found input element:', selector);
          attachInputMonitor(inputElement as HTMLElement);
          return true;
        }
      }
      
      return false;
    }
    
    // Attach event listeners to monitor input
    function attachInputMonitor(element: HTMLElement) {
      let lastCheckedValue = '';
      
      const checkForPII = () => {
        const currentValue = element.textContent || '';
        
        // Only check if the value has changed
        if (currentValue !== lastCheckedValue) {
          lastCheckedValue = currentValue;
          
          if (currentValue.trim().length > 0) {
            const piiDetected = hasPII(currentValue);
            
            if (piiDetected) {
              const summary = getPIISummary(currentValue);
              const piiMatches = detectPII(currentValue);
              
              console.warn('Aegis Shield: PII detected in input!', summary);
              
              // Send message to background script
              chrome.runtime.sendMessage({
                type: 'PII_DETECTED',
                details: {
                  summary,
                  matches: piiMatches,
                  location: 'ChatGPT input box',
                },
              }).catch(err => {
                console.error('Aegis Shield: Error sending message to background:', err);
              });
              
              // Visual feedback: Add a warning indicator
              addWarningIndicator(element, summary);
            } else {
              // Remove warning if no PII detected
              removeWarningIndicator(element);
            }
          }
        }
      };
      
      // Monitor input changes
      element.addEventListener('input', checkForPII);
      element.addEventListener('paste', () => {
        // Delay check to allow paste to complete
        setTimeout(checkForPII, 100);
      });
      
      // Also use MutationObserver for contenteditable divs
      const observer = new MutationObserver(checkForPII);
      observer.observe(element, {
        characterData: true,
        childList: true,
        subtree: true,
      });
      
      console.log('Aegis Shield: Input monitoring active');
    }
    
    // Add visual warning indicator
    function addWarningIndicator(element: HTMLElement, summary: Record<string, number>) {
      // Check if indicator already exists
      let indicator = document.getElementById('aegis-shield-warning');
      
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'aegis-shield-warning';
        indicator.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background-color: #ff6b6b;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          max-width: 300px;
        `;
        document.body.appendChild(indicator);
      }
      
      const piiTypes = Object.entries(summary)
        .map(([type, count]) => `${type} (${count})`)
        .join(', ');
      
      indicator.innerHTML = `
        <strong>⚠️ PII Detected</strong><br>
        <small>${piiTypes}</small>
      `;
    }
    
    // Remove warning indicator
    function removeWarningIndicator(element: HTMLElement) {
      const indicator = document.getElementById('aegis-shield-warning');
      if (indicator) {
        indicator.remove();
      }
    }
    
    // Initialize: Try to find input immediately
    if (!findAndMonitorInput()) {
      // If not found, wait for DOM to be ready and try again
      const observer = new MutationObserver(() => {
        if (findAndMonitorInput()) {
          observer.disconnect();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      
      // Also try again after a short delay
      setTimeout(() => {
        if (findAndMonitorInput()) {
          observer.disconnect();
        }
      }, 2000);
    }
  },
});
