import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Aegis Shield',
    description:
      'A privacy-first browser extension for AI prompt scrubbing and Unicode tag stripping. Paste prompts to detect and redact PII before sending to ChatGPT, Claude, or any AI.',
    version: '1.0.0',
    permissions: ['storage'],
  },
});
