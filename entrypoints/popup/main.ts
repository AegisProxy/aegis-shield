import { getPIISummary, scrubTextWithMapping, restorePII } from '../../src/utils/pii-detector';

const PII_MAPPING_KEY = 'aegis-pii-mapping';

const input = document.getElementById('input') as HTMLTextAreaElement;
const pasteBtn = document.getElementById('paste') as HTMLButtonElement;
const results = document.getElementById('results')!;
const warnings = document.getElementById('warnings')!;
const copyBtn = document.getElementById('copy') as HTMLButtonElement;
const restoreBtn = document.getElementById('restore') as HTMLButtonElement;
const emptyState = document.getElementById('empty')!;

function updateUI() {
  const text = input.value.trim();

  if (!text) {
    results.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  results.classList.remove('hidden');

  const summary = getPIISummary(text);
  const hasPII = Object.keys(summary).length > 0;
  const hasPlaceholders = /\[(?:EMAIL|PHONE|SSN|CARD|ZIP|IP|DATE)\]/i.test(text);

  if (hasPII) {
    warnings.innerHTML = Object.entries(summary)
      .map(([type, count]) => `
        <div class="flex items-center justify-between gap-2 rounded-md bg-destructive/5 px-2 py-1.5 text-xs">
          <span class="font-medium capitalize text-destructive">${type}</span>
          <span class="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] font-medium text-destructive">${count}</span>
        </div>
      `)
      .join('');
    copyBtn.disabled = false;
  } else {
    warnings.innerHTML = '<div class="rounded-md bg-green-50 px-2 py-1.5 text-xs font-medium text-green-800">✓ No PII detected</div>';
    copyBtn.disabled = true;
  }

  restoreBtn.disabled = !hasPlaceholders;
}

function copyScrubbed() {
  const text = input.value;
  const { scrubbed, mapping } = scrubTextWithMapping(text);
  chrome.storage.local.set({ [PII_MAPPING_KEY]: mapping });
  navigator.clipboard.writeText(scrubbed).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy scrubbed text'; }, 1500);
  });
}

async function restorePIIHandler() {
  const text = input.value;
  const { [PII_MAPPING_KEY]: mapping } = await chrome.storage.local.get(PII_MAPPING_KEY);
  if (!mapping || Object.keys(mapping).length === 0) {
    restoreBtn.textContent = 'No mapping - scrub first!';
    setTimeout(() => { restoreBtn.textContent = 'Restore PII'; }, 2000);
    return;
  }
  const restored = restorePII(text, mapping);
  input.value = restored;
  navigator.clipboard.writeText(restored).then(() => {
    restoreBtn.textContent = 'Restored & copied!';
    setTimeout(() => { restoreBtn.textContent = 'Restore PII'; }, 1500);
  });
  updateUI();
}

async function pasteFromClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text?.trim()) {
      input.value = text;
      updateUI();
      pasteBtn.textContent = 'Pasted!';
      setTimeout(() => { pasteBtn.textContent = 'Paste'; }, 1000);
    }
  } catch {
    input.focus();
    document.execCommand('paste');
    updateUI();
  }
}

async function loadShortcuts() {
  try {
    const commands = await chrome.commands.getAll();
    const scrub = commands.find((c) => c.name === 'scrub-clipboard');
    const restore = commands.find((c) => c.name === 'restore-pii');
    const scrubEl = document.getElementById('shortcut-scrub');
    const restoreEl = document.getElementById('shortcut-restore');
    if (scrubEl) scrubEl.textContent = scrub?.shortcut || 'Not set';
    if (restoreEl) restoreEl.textContent = restore?.shortcut || 'Not set';
  } catch {
    /* commands API not available */
  }
}

document.getElementById('shortcuts-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
});

input.addEventListener('input', updateUI);
input.addEventListener('paste', () => setTimeout(updateUI, 0));
pasteBtn.addEventListener('click', pasteFromClipboard);
copyBtn.addEventListener('click', copyScrubbed);
restoreBtn.addEventListener('click', restorePIIHandler);
loadShortcuts();
