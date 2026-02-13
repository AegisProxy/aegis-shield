import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Aegis Shield',
    description: 'A privacy-first browser extension for real-time AI prompt scrubbing and Unicode tag stripping',
    version: '1.0.0',
    permissions: ['storage', 'webRequest'],
    host_permissions: [
      '*://api.openai.com/*',
      '*://*.anthropic.com/*',
      '*://chatgpt.com/*',
      '*://*.openai.com/*'
    ],
  },
});
