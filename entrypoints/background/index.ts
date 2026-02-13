export default defineBackground(() => {
  console.log('Aegis Shield: Background service worker initialized');

  // Monitor fetch requests to OpenAI and Anthropic
  // Note: In Manifest V3, webRequest blocking is limited. For full request interception,
  // consider migrating to chrome.declarativeNetRequest API in the future.
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      console.log('Aegis Shield: Detected request to', details.url);
      
      // TODO: For request modification, migrate to declarativeNetRequest API
      // This currently only logs the requests for monitoring purposes
    },
    {
      urls: [
        '*://api.openai.com/*',
        '*://*.openai.com/*',
        '*://*.anthropic.com/*',
        '*://api.anthropic.com/*'
      ]
    }
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
