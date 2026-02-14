import { getPIISummary, scrubTextWithMapping, restorePII } from '../../src/utils/pii-detector';

const PII_MAPPING_KEY = 'aegis-pii-mapping';

const input = document.getElementById('input') as HTMLTextAreaElement;
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

  if (hasPII) {
    warnings.innerHTML = Object.entries(summary)
      .map(([type, count]) => `
        <div class="warning-item">
          <span class="type">${type}</span>
          <span class="count">${count}</span>
        </div>
      `)
      .join('');
    copyBtn.disabled = false;
  } else {
    warnings.innerHTML = '<div class="safe">✓ No PII detected</div>';
    copyBtn.disabled = false;
  }

  restoreBtn.disabled = false;
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

input.addEventListener('input', updateUI);
input.addEventListener('paste', () => setTimeout(updateUI, 0));
copyBtn.addEventListener('click', copyScrubbed);
restoreBtn.addEventListener('click', restorePIIHandler);
