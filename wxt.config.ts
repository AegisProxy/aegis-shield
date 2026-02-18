import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Aegis Shield',
    description: 'Detect and redact PII in prompts before sending to AI. Paste, scrub, copy—local-only.',
    version: '1.0.0',
    permissions: ['storage'],
  },
});
