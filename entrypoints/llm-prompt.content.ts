/**
 * Content script for LLM chat sites - shows real-time PII warnings in the prompt input area.
 * Runs at document_idle to avoid conflicts. Does NOT modify requests.
 */
import { hasPII, getPIISummary } from '../src/utils/pii-detector';

const INPUT_SELECTORS = [
  '#prompt-textarea',
  'form.stretch textarea',
  'textarea[placeholder*="Message"]',
  'textarea[placeholder*="Ask"]',
  'textarea[placeholder*="message"]',
  '[contenteditable="true"][role="textbox"]',
  'textarea',
  '[contenteditable="true"]',
];

function findInput(): HTMLElement | null {
  for (const sel of INPUT_SELECTORS) {
    const el = document.querySelector(sel);
    if (el && (el instanceof HTMLTextAreaElement || el.isContentEditable)) {
      return el as HTMLElement;
    }
  }
  return null;
}

const attached = new WeakSet<HTMLElement>();

function attachMonitor(element: HTMLElement) {
  if (attached.has(element)) return;
  attached.add(element);

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
  element.addEventListener('keyup', check);
  element.addEventListener('paste', () => setTimeout(check, 150));

  const observer = new MutationObserver(check);
  observer.observe(element, { characterData: true, childList: true, subtree: true });
}

function showToast(summary: Record<string, number>) {
  let toast = document.getElementById('aegis-shield-toast');
  if (!toast && document.body) {
    toast = document.createElement('div');
    toast.id = 'aegis-shield-toast';
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
      fontSize: '13px',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid rgb(254 202 202)',
      backgroundColor: 'rgb(254 242 242)',
      color: 'rgb(153 27 27)',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      maxWidth: '320px',
    });
    document.body.appendChild(toast);
  }

  const types = Object.entries(summary)
    .map(([t, n]) => `${t} (${n})`)
    .join(', ');
  toast!.innerHTML = `<span style="font-weight:600">PII detected:</span> ${types}`;
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
    const tryInit = () => {
      if (init()) return true;
      return false;
    };

    if (tryInit()) return;

    const root = document.body ?? document.documentElement;
    if (root && root instanceof Node) {
      const observer = new MutationObserver(() => {
        if (tryInit()) observer.disconnect();
      });
      try {
        observer.observe(root, { childList: true, subtree: true });
      } catch {
        /* ignore */
      }
    }

    [500, 1500, 3000, 5000].forEach((ms) => setTimeout(tryInit, ms));
  },
});
