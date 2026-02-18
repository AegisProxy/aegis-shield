import { scrubTextWithMapping, restorePII } from '../utils/pii-detector';

const PII_MAPPING_KEY = 'aegis-pii-mapping';

function readClipboard(): string {
  const el = document.createElement('textarea');
  el.style.cssText = 'position:fixed;left:-9999px;';
  document.body.appendChild(el);
  el.focus();
  const ok = document.execCommand('paste');
  const value = el.value || '';
  document.body.removeChild(el);
  if (!ok && !value) {
    throw new Error('Could not read clipboard. Try using the popup instead.');
  }
  return value;
}

function writeClipboard(text: string): void {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.cssText = 'position:fixed;left:-9999px;';
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(el);
  if (!ok) {
    throw new Error('Could not write to clipboard.');
  }
}

chrome.runtime.onMessage.addListener(
  (
    msg: { action: 'scrub' | 'restore' },
    _sender: unknown,
    sendResponse: (r: { ok: boolean; error?: string }) => void
  ) => {
    handleClipboardAction(msg.action)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // keep channel open for async response
  }
);

async function handleClipboardAction(action: 'scrub' | 'restore') {
  const text = readClipboard();
  if (!text.trim()) {
    throw new Error('Clipboard is empty');
  }

  if (action === 'scrub') {
    const { scrubbed, mapping } = scrubTextWithMapping(text);
    await chrome.storage.local.set({ [PII_MAPPING_KEY]: mapping });
    writeClipboard(scrubbed);
  } else {
    const { [PII_MAPPING_KEY]: mapping } = await chrome.storage.local.get(PII_MAPPING_KEY);
    if (!mapping || Object.keys(mapping).length === 0) {
      throw new Error('No mapping—scrub a prompt first');
    }
    const restored = restorePII(text, mapping);
    writeClipboard(restored);
  }
}
