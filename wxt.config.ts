import { defineConfig } from 'wxt';
import path from 'node:path';
import fs from 'node:fs/promises';

export default defineConfig({
  manifest: {
    host_permissions: ['https://*.huggingface.co/*', 'https://huggingface.co/*'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    web_accessible_resources: [
      {
        resources: ['transformers/ort-wasm-simd-threaded.jsep.mjs', 'transformers/ort-wasm-simd-threaded.jsep.wasm'],
        matches: ['<all_urls>'],
      },
    ],
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
  hooks: {
    'build:publicAssets': async (_wxt, assets) => {
      const root = process.cwd();
      const srcDir = path.resolve(root, 'node_modules/@huggingface/transformers/dist');
      const files = ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm'];
      for (const f of files) {
        assets.push({
          absoluteSrc: path.join(srcDir, f),
          relativeDest: `transformers/${f}`,
        });
      }
    },
    // Ensure transformers exist in dev mode too
    'build:done': async (wxt) => {
      const root = wxt?.config?.root ?? process.cwd();
      const srcDir = path.resolve(root, 'node_modules/@huggingface/transformers/dist');
      const destDir = path.join(root, '.output', 'chrome-mv3', 'transformers');
      await fs.mkdir(destDir, { recursive: true });
      for (const f of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
        try {
          await fs.copyFile(path.join(srcDir, f), path.join(destDir, f));
        } catch {
          /* ignore */
        }
      }
    },
  },
});
