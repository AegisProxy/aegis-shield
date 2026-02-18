/**
 * Content script for LLM chat sites - shows real-time PII warnings in the prompt input area.
 * Runs at document_idle to avoid conflicts. Does NOT modify requests.
 */
import { hasPII, getPIISummary } from '../src/utils/pii-detector';

const INPUT_SELECTORS = [
  '#prompt-textarea',
  '[contenteditable="true"][role="textbox"]',
  'textarea[placeholder*="Message"]',
  'textarea[placeholder*="Ask"]',
  '[contenteditable="true"]',
];

function findInput(): HTMLElement | null {
  for (const sel of INPUT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) return el as HTMLElement;
  }
  return null;
}

function attachMonitor(element: HTMLElement) {
  let lastValue = '';

  const check = () => {
    const value = (element as HTMLTextAreaElement).value ?? element.textContent ?? '';
    if (value === lastValue) return;
    lastValue = value;

    if (value.trim() && hasPII(value)) {
      const summary = getPIISummary(value);
      showToast(summary);
    } else {
      hideToast();
    }
  };

  element.addEventListener('input', check);
  element.addEventListener('paste', () => setTimeout(check, 100));

  const observer = new MutationObserver(check);
  observer.observe(element, { characterData: true, childList: true, subtree: true });
}

function showToast(summary: Record<string, number>) {
  let toast = document.getElementById('aegis-shield-toast');
  if (!toast && document.body) {
    toast = document.createElement('div');
    toast.id = 'aegis-shield-toast';
    toast.style.cssText = `
      position:fixed;bottom:24px;right:24px;background:#ef4444;color:#fff;
      padding:12px 20px;border-radius:8px;font-family:system-ui,sans-serif;
      font-size:13px;font-weight:500;z-index:2147483647;
      box-shadow:0 4px 12px rgba(0,0,0,0.15);
    `;
    document.body.appendChild(toast);
  }

  const types = Object.entries(summary)
    .map(([t, n]) => `${t} (${n})`)
    .join(', ');
  toast!.innerHTML = `<strong>⚠ PII detected:</strong> ${types}`;
  toast!.style.display = 'block';
}

function hideToast() {
  const toast = document.getElementById('aegis-shield-toast');
  if (toast) toast.style.display = 'none';
}

function init() {
  const input = findInput();
  if (input) {
    attachMonitor(input);
    return true;
  }
  return false;
}

export default defineContentScript({
  matches: [
    '*://chatgpt.com/*',
    '*://*.openai.com/*',
    '*://claude.ai/*',
    '*://*.anthropic.com/*',
    '*://gemini.google.com/*',
    '*://perplexity.ai/*',
  ],
  runAt: 'document_idle',

  main() {
    if (init()) return;

    const root = document.body ?? document.documentElement;
    if (!root || !(root instanceof Node)) return;

    const observer = new MutationObserver(() => {
      if (init()) observer.disconnect();
    });
    try {
      observer.observe(root, { childList: true, subtree: true });
    } catch {
      // ignore
    }
    setTimeout(init, 1000);
  },
});
