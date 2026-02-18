import { scrubTextWithMapping, restorePII } from '../../src/utils/pii-detector';

const OFFSCREEN_PATH = '/offscreen.html';
const PII_MAPPING_KEY = 'aegis-pii-mapping';

async function readClipboardViaTab(tabId: number): Promise<string> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => navigator.clipboard.readText(),
  });
  const result = results?.[0]?.result;
  return typeof result === 'string' ? result : '';
}

async function writeClipboardViaTab(tabId: number, text: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: (t: string) => navigator.clipboard.writeText(t),
    args: [text],
  });
}

async function ensureOffscreenDoc() {
  const existing = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_PATH)],
  });
  if (existing.length) return;
  await chrome.offscreen.createDocument({
    url: chrome.runtime.getURL(OFFSCREEN_PATH),
    reasons: [chrome.offscreen.Reason.CLIPBOARD],
    justification: 'Scrub and restore PII from clipboard via context menu',
  });
}

function setupContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'aegis-scrub',
      title: 'Scrub clipboard',
      contexts: ['all'],
    });
    chrome.contextMenus.create({
      id: 'aegis-restore',
      title: 'Restore PII in clipboard',
      contexts: ['all'],
    });
  });
}

async function runViaOffscreen(action: 'scrub' | 'restore'): Promise<{ ok: boolean; error?: string }> {
  await ensureOffscreenDoc();
  await new Promise((r) => setTimeout(r, 150));
  return (await chrome.runtime.sendMessage({ action })) as { ok: boolean; error?: string };
}

export default defineBackground(() => {
  setupContextMenus();
  chrome.runtime.onInstalled.addListener(setupContextMenus);

  async function runClipboardAction(action: 'scrub' | 'restore') {
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const tabId = activeTab?.id;
      const url = activeTab?.url || '';

      const isInjectable =
        tabId &&
        url &&
        !url.startsWith('chrome://') &&
        !url.startsWith('chrome-extension://') &&
        !url.startsWith('about:') &&
        !url.startsWith('edge://');

      if (isInjectable && tabId) {
        const text = await readClipboardViaTab(tabId);
        if (!text.trim()) {
          console.warn('Aegis Shield: Clipboard is empty');
          return;
        }
        if (action === 'scrub') {
          const { scrubbed, mapping } = scrubTextWithMapping(text);
          await chrome.storage.local.set({ [PII_MAPPING_KEY]: mapping });
          await writeClipboardViaTab(tabId, scrubbed);
        } else {
          const { [PII_MAPPING_KEY]: mapping } = await chrome.storage.local.get(PII_MAPPING_KEY);
          if (!mapping || Object.keys(mapping).length === 0) {
            console.warn('Aegis Shield: No mapping—scrub a prompt first');
            return;
          }
          const restored = restorePII(text, mapping);
          await writeClipboardViaTab(tabId, restored);
        }
      } else {
        const response = await runViaOffscreen(action);
        if (!response?.ok && response?.error) {
          console.warn('Aegis Shield:', response.error);
        }
      }
    } catch (e) {
      console.warn('Aegis Shield:', e);
    }
  }

  chrome.contextMenus.onClicked.addListener((info) => {
    const action = info.menuItemId === 'aegis-scrub' ? 'scrub' : 'restore';
    runClipboardAction(action);
  });

  chrome.commands.onCommand.addListener((command) => {
    if (command === 'scrub-clipboard') runClipboardAction('scrub');
    else if (command === 'restore-pii') runClipboardAction('restore');
  });
});
