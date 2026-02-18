import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Aegis Shield',
    description:
      'A privacy-first browser extension for AI prompt scrubbing and Unicode tag stripping. Real-time PII warnings on LLM sites + popup to scrub/restore.',
    version: '1.0.0',
    permissions: ['storage'],
    host_permissions: [
      '*://chatgpt.com/*',
      '*://*.openai.com/*',
      '*://claude.ai/*',
      '*://*.anthropic.com/*',
      '*://gemini.google.com/*',
      '*://perplexity.ai/*',
    ],
  },
});
