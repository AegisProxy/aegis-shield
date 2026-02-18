import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Aegis Shield',
    description: 'Detect and redact PII in prompts before sending to AI. Paste, scrub, copy, restore PII in your browser.',
    version: '1.0.0',
    permissions: ['storage', 'contextMenus', 'offscreen', 'scripting', 'activeTab', 'clipboardRead', 'clipboardWrite'],
    commands: {
      'scrub-clipboard': {
        suggested_key: { default: 'Ctrl+Shift+S', mac: 'Command+Shift+S' },
        description: 'Scrub clipboard (replace with redacted PII)',
      },
      'restore-pii': {
        suggested_key: { default: 'Ctrl+Shift+Z', mac: 'Command+Shift+Z' },
        description: 'Restore PII in clipboard',
      },
    },
  },
});
