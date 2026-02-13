export default defineBackground(() => {
  console.log('Aegis Shield: Background service worker initialized');

  // Intercept fetch requests to OpenAI and Anthropic
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      console.log('Aegis Shield: Intercepted request to', details.url);
      
      // TODO: Add logic to inspect and modify requests
      // For now, just log the interception
      
      return { cancel: false };
    },
    {
      urls: [
        '*://api.openai.com/*',
        '*://*.openai.com/*',
        '*://*.anthropic.com/*',
        '*://api.anthropic.com/*'
      ]
    },
    ['blocking']
  );

  // Listen for messages from content scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Aegis Shield: Received message from content script:', message);
    
    if (message.type === 'PII_DETECTED') {
      console.warn('Aegis Shield: PII detected in message:', message.details);
      // TODO: Handle PII detection (e.g., show notification, log, etc.)
    }
    
    sendResponse({ acknowledged: true });
    return true;
  });
});
