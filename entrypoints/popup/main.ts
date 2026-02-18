import { getPIISummary, scrubTextWithMapping, restorePII, mergePIIMatches, detectPII } from '../../src/utils/pii-detector';
import { getStorageLocal } from '../../src/utils/storage';
import { preloadSLMModel, detectPIIWithSLM, disposeSLM } from '../../src/logic/slm-integration';

const PII_MAPPING_KEY = 'aegis-pii-mapping';
const SLM_DOWNLOADED_KEY = 'aegis-slm-downloaded';
const SLM_LOADING_KEY = 'aegis-slm-loading';
const SLM_PROGRESS_KEY = 'aegis-slm-progress';

function safeStorageLocal() {
  return getStorageLocal();
}

const HOLD_DURATION_MS = 1800;

const input = document.getElementById('input') as HTMLTextAreaElement;
const pasteBtn = document.getElementById('paste') as HTMLButtonElement;
const holdDownloadBtn = document.getElementById('hold-download-btn') as HTMLButtonElement;
const holdBtnFill = document.getElementById('hold-btn-fill') as HTMLSpanElement;
const holdBtnContainer = document.getElementById('hold-btn-container')!;
const holdDownloadArea = document.getElementById('hold-download-area')!;
const slmErrorEl = document.getElementById('slm-error') as HTMLDivElement;
const aiToggle = document.getElementById('ai-toggle')!;
const slmProgress = document.getElementById('slm-progress') as HTMLDivElement;
const slmProgressBarContainer = document.getElementById('slm-progress-bar-container')!;
const slmProgressBar = document.getElementById('slm-progress-bar') as HTMLDivElement;
const slmStatus = document.getElementById('slm-status') as HTMLSpanElement;
const results = document.getElementById('results')!;
const warnings = document.getElementById('warnings')!;
const copyBtn = document.getElementById('copy') as HTMLButtonElement;
const restoreBtn = document.getElementById('restore') as HTMLButtonElement;
const emptyState = document.getElementById('empty')!;

let slmDownloaded = false;
let aiEnabled = true; // AI toggle: on when model loaded (user can turn off)
let holdTimer: ReturnType<typeof setTimeout> | null = null;
let holdStartTime = 0;
let holdAnimationFrame = 0;

function renderSummary(summary: Record<string, number>, aiTypes?: Set<string>) {
  const hasPII = Object.keys(summary).length > 0;
  if (hasPII) {
    warnings.innerHTML = Object.entries(summary)
      .map(([type, count]) => {
        const fromAi = aiTypes?.has(type);
        const aiIcon = fromAi ? '<span class="ml-0.5 opacity-80" aria-hidden="true">✨</span>' : '';
        return `
        <div class="flex items-center justify-between gap-2 rounded-md bg-destructive/5 px-2 py-1.5 text-xs">
          <span class="font-medium capitalize text-destructive inline-flex items-center">${type}${aiIcon}</span>
          <span class="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] font-medium text-destructive">${count}</span>
        </div>
      `;
      })
      .join('');
    copyBtn.disabled = false;
  } else {
    warnings.innerHTML = '<div class="rounded-md bg-green-50 px-2 py-1.5 text-xs font-medium text-green-800">✓ No PII detected</div>';
    copyBtn.disabled = true;
  }
}

function showDownloadingUI() {
  holdBtnContainer.classList.add('hidden');
  slmProgress.classList.remove('hidden');
  slmProgressBarContainer.classList.remove('hidden');
  holdDownloadArea.classList.remove('hidden');
}

function showHoldButton() {
  holdBtnContainer.classList.remove('hidden');
  slmProgress.classList.add('hidden');
  holdDownloadBtn.disabled = false;
  holdBtnFill.style.width = '0%';
}

function showError(message: string) {
  slmErrorEl.textContent = '';
  slmErrorEl.innerHTML = `${escapeHtml(message)} <button type="button" id="slm-retry-btn" class="ml-1 font-medium underline hover:no-underline">Retry</button>`;
  slmErrorEl.classList.remove('hidden');
  document.getElementById('slm-retry-btn')?.addEventListener('click', retryDownload);
}

function hideError() {
  slmErrorEl.classList.add('hidden');
  slmErrorEl.textContent = '';
}

function updateAIToggleStyle() {
  aiToggle.classList.toggle('text-muted-foreground', !aiEnabled);
  aiToggle.classList.toggle('text-green-600', aiEnabled);
  aiToggle.classList.toggle('dark:text-green-400', aiEnabled);
  aiToggle.classList.toggle('backdrop-blur-md', aiEnabled);
  aiToggle.classList.toggle('bg-green-500/15', aiEnabled);
  aiToggle.classList.remove('ai-on', 'ai-off');
  void aiToggle.offsetWidth;
  if (aiEnabled) {
    aiToggle.classList.add('ai-on');
  } else {
    aiToggle.classList.add('ai-off');
    aiToggle.addEventListener(
      'animationend',
      () => {
        aiToggle.classList.remove('ai-off');
      },
      { once: true }
    );
  }
}

function escapeHtml(s: string) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function applyProgress(p: { file?: string; progress?: number; loaded?: number; total?: number }) {
  if (p.progress != null) {
    const mb = (n?: number) => (n != null ? (n / 1024 / 1024).toFixed(1) : '?');
    slmProgressBar.style.width = `${p.progress}%`;
    slmStatus.textContent = `Downloading ${p.file ?? 'model'}... ${Math.round(p.progress)}% (${mb(p.loaded)} / ${mb(p.total)} MB)`;
  } else {
    slmProgressBar.style.width = '0%';
    slmStatus.textContent = `Downloading ${p.file ?? 'model'}...`;
  }
}

function makeProgressUpdater() {
  return (p: { status?: string; file?: string; progress?: number; loaded?: number; total?: number }) => {
    if (p.status === 'progress' && p.progress != null) {
      applyProgress(p);
    } else if (p.status === 'initiate' || p.status === 'download') {
      slmProgressBar.style.width = '0%';
      slmStatus.textContent = `Downloading ${p.file ?? 'model'}...`;
    }
  };
}

function cancelHold() {
  if (holdTimer) {
    clearTimeout(holdTimer);
    holdTimer = null;
  }
  if (holdAnimationFrame) {
    cancelAnimationFrame(holdAnimationFrame);
    holdAnimationFrame = 0;
  }
  holdBtnFill.style.width = '0%';
}

function setSLMReady() {
  slmDownloaded = true;
  hideError();
  holdDownloadArea.classList.add('hidden');
  aiToggle.classList.remove('hidden');
  updateAIToggleStyle();
  slmProgress.classList.add('hidden');
  updateUI();
}

async function retryDownload() {
  hideError();
  try {
    await disposeSLM();
  } catch {
    /* ignore */
  }
  const storage = safeStorageLocal();
  if (storage) {
    try {
      await storage.remove([SLM_DOWNLOADED_KEY, SLM_LOADING_KEY, SLM_PROGRESS_KEY]);
    } catch {
      /* ignore */
    }
  }
  startDownload();
}

async function startDownload() {
  cancelHold();
  hideError();
  showDownloadingUI();
  slmStatus.textContent = 'Loading AI model... (keep this popup open)';
  slmProgressBar.style.width = '0%';

  const storage = safeStorageLocal();
  if (storage) await storage.set({ [SLM_LOADING_KEY]: true });

  const reportProgress = makeProgressUpdater();
  try {
    await preloadSLMModel(reportProgress);
    const storageAfter = safeStorageLocal();
    if (storageAfter) {
      await storageAfter.set({ [SLM_DOWNLOADED_KEY]: true, [SLM_LOADING_KEY]: false });
    }
    slmProgressBar.style.width = '100%';
    setSLMReady();
  } catch (e) {
    const storageErr = safeStorageLocal();
    if (storageErr) storageErr.set({ [SLM_LOADING_KEY]: false }).catch(() => {});
    showHoldButton();
    showError(String(e));
  }
}

function animateHold() {
  const elapsed = Date.now() - holdStartTime;
  const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
  holdBtnFill.style.width = `${pct}%`;
  if (pct < 100) {
    holdAnimationFrame = requestAnimationFrame(animateHold);
  }
}

function onHoldStart() {
  if (slmDownloaded || holdDownloadBtn.disabled) return;
  holdStartTime = Date.now();
  holdTimer = setTimeout(() => {
    holdTimer = null;
    startDownload();
  }, HOLD_DURATION_MS);
  holdAnimationFrame = requestAnimationFrame(animateHold);
}

function onHoldEnd() {
  if (holdTimer) {
    cancelHold();
  }
}

async function detectPIIInPopup(text: string): Promise<import('../../src/utils/pii-detector').PIIMatch[]> {
  return detectPIIWithSLM(text);
}

async function updateUI() {
  const text = input.value.trim();

  if (!text) {
    results.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  results.classList.remove('hidden');
  const hasPlaceholders = /\[(?:EMAIL|PHONE|SSN|CARD|ZIP|IP|DATE|NAME|ORG|LOCATION|MISC)\]/i.test(text);
  restoreBtn.disabled = !hasPlaceholders;

  const regexMatches = detectPII(text);
  let merged = regexMatches;
  let aiTypes: Set<string> | undefined;

  if (slmDownloaded && aiEnabled) {
    slmProgress.classList.remove('hidden');
    slmProgressBarContainer.classList.add('hidden');
    slmStatus.textContent = 'Scanning...';
    try {
      const slmMatches = await detectPIIInPopup(text);
      slmStatus.textContent = 'Scan complete';
      merged = mergePIIMatches(regexMatches, slmMatches);
      aiTypes = new Set(slmMatches.map((m) => m.type));
    } catch (e) {
      slmStatus.textContent = 'AI detection failed';
    }
  } else if (holdBtnContainer.classList.contains('hidden')) {
    // Downloading: keep progress visible (don't hide it when user types)
  } else {
    slmProgress.classList.add('hidden');
  }

  renderSummary(getPIISummary(text, merged), aiTypes);
}

async function copyScrubbed() {
  const text = input.value;
  let extraMatches: import('../../src/utils/pii-detector').PIIMatch[] | undefined;
  if (slmDownloaded && aiEnabled) {
    copyBtn.disabled = true;
    copyBtn.textContent = 'Scanning...';
    slmProgress.classList.remove('hidden');
    slmProgressBarContainer.classList.add('hidden');
    slmStatus.textContent = 'Scanning...';
    try {
      extraMatches = await detectPIIInPopup(text);
      slmStatus.textContent = 'Scan complete';
    } catch {
      slmStatus.textContent = 'AI detection failed';
    } finally {
      copyBtn.disabled = false;
      copyBtn.textContent = 'Copy scrubbed text';
    }
  }
  const { scrubbed, mapping } = scrubTextWithMapping(text, extraMatches);
  const storage = safeStorageLocal();
  if (storage) {
    try {
      await storage.set({ [PII_MAPPING_KEY]: mapping });
    } catch {
      /* ignore */
    }
  }
  await navigator.clipboard.writeText(scrubbed);
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy scrubbed text'; }, 1500);
}

async function restorePIIHandler() {
  const text = input.value;
  const storage = safeStorageLocal();
  if (!storage) {
    restoreBtn.textContent = 'Storage unavailable';
    setTimeout(() => { restoreBtn.textContent = 'Restore PII'; }, 2000);
    return;
  }
  const data = await storage.get([PII_MAPPING_KEY]);
  const mapping = data[PII_MAPPING_KEY];
  if (!mapping || Object.keys(mapping).length === 0) {
    restoreBtn.textContent = 'No mapping - scrub first!';
    setTimeout(() => { restoreBtn.textContent = 'Restore PII'; }, 2000);
    return;
  }
  const restored = restorePII(text, mapping as Record<string, string>);
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

holdDownloadBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  onHoldStart();
});
holdDownloadBtn.addEventListener('pointerup', onHoldEnd);
holdDownloadBtn.addEventListener('pointerleave', onHoldEnd);
holdDownloadBtn.addEventListener('pointercancel', onHoldEnd);
holdDownloadBtn.addEventListener('contextmenu', (e) => e.preventDefault());

// Re-check if download completed or failed while popup was closed
const storageApi = safeStorageLocal();
if (storageApi) {
  try {
    const api = (typeof globalThis !== 'undefined' ? globalThis : window) as { chrome?: { storage?: { onChanged?: { addListener: (cb: (changes: Record<string, { newValue?: unknown }>, area: string) => void) => void } } } };
    api?.chrome?.storage?.onChanged?.addListener?.((changes, area) => {
  if (area !== 'local') return;
  if (changes[SLM_DOWNLOADED_KEY]?.newValue === true && !slmDownloaded) {
    slmDownloaded = true;
    holdDownloadArea.classList.add('hidden');
    aiToggle.classList.remove('hidden');
    updateAIToggleStyle();
    slmProgress.classList.add('hidden');
    updateUI();
  }
  if (changes[SLM_LOADING_KEY]?.newValue === false && !slmDownloaded) {
    // Download stopped without completing (error)
    showHoldButton();
  }
  if (changes[SLM_PROGRESS_KEY]?.newValue) {
    const p = changes[SLM_PROGRESS_KEY].newValue as { file?: string; progress?: number; loaded?: number; total?: number };
    if (slmProgress && !slmProgress.classList.contains('hidden')) {
      applyProgress(p);
    }
  }
    });
  } catch {
    /* storage API not available */
  }
}

async function init() {
  const storageApi = safeStorageLocal();
  let storage: Record<string, unknown> = {};
  if (storageApi) {
    try {
      storage = await storageApi.get([SLM_DOWNLOADED_KEY, SLM_LOADING_KEY, SLM_PROGRESS_KEY]);
    } catch {
      /* ignore */
    }
  }
  slmDownloaded = !!storage[SLM_DOWNLOADED_KEY];
  const loading = !!storage[SLM_LOADING_KEY];

  if (slmDownloaded) {
    holdDownloadArea.classList.add('hidden');
    aiToggle.classList.remove('hidden');
    updateAIToggleStyle();
    slmProgress.classList.add('hidden');
  } else if (loading) {
    // Popup was closed during download (model load runs in popup) - treat as interrupted
    const storageApi = safeStorageLocal();
    if (storageApi) storageApi.set({ [SLM_LOADING_KEY]: false }).catch(() => {});
    holdDownloadArea.classList.remove('hidden');
    aiToggle.classList.add('hidden');
    showHoldButton();
  } else {
    holdDownloadArea.classList.remove('hidden');
    aiToggle.classList.add('hidden');
    showHoldButton();
  }

  aiToggle.addEventListener('click', () => {
    if (!slmDownloaded) return;
    aiEnabled = !aiEnabled;
    updateAIToggleStyle();
    updateUI();
  });

  updateUI();
}

input.addEventListener('input', () => updateUI());
input.addEventListener('paste', () => setTimeout(updateUI, 0));
pasteBtn.addEventListener('click', pasteFromClipboard);
copyBtn.addEventListener('click', () => copyScrubbed());
restoreBtn.addEventListener('click', restorePIIHandler);
loadShortcuts();
init();
