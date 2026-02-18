import { scrubTextWithMapping, restorePII } from '../utils/pii-detector';

const PII_MAPPING_KEY = 'aegis-pii-mapping';

async function storageGet(keys: string[]): Promise<Record<string, unknown>> {
  return (await chrome.runtime.sendMessage({ action: 'storage-get', keys })) ?? {};
}
async function storageSet(items: Record<string, unknown>): Promise<void> {
  await chrome.runtime.sendMessage({ action: 'storage-set', items });
}

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

async function handleClipboardAction(action: 'scrub' | 'restore') {
  const text = readClipboard();
  if (!text.trim()) {
    throw new Error('Clipboard is empty');
  }
  if (action === 'scrub') {
    const { scrubbed, mapping } = scrubTextWithMapping(text);
    await storageSet({ [PII_MAPPING_KEY]: mapping });
    writeClipboard(scrubbed);
  } else {
    const data = await storageGet([PII_MAPPING_KEY]);
    const mapping = data[PII_MAPPING_KEY];
    if (!mapping || Object.keys(mapping).length === 0) {
      throw new Error('No mapping—scrub a prompt first');
    }
    const restored = restorePII(text, mapping as Record<string, string>);
    writeClipboard(restored);
  }
}

chrome.runtime.onMessage.addListener(
  (
    msg: { action: string; text?: string },
    _sender: unknown,
    sendResponse: (r: unknown) => void
  ) => {
    if (msg.action === 'scrub' || msg.action === 'restore') {
      handleClipboardAction(msg.action)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: String(err) }));
      return true;
    }
    return false;
  }
);
