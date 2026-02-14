import { getPIISummary, scrubText } from '../../src/utils/pii-detector';

const input = document.getElementById('input') as HTMLTextAreaElement;
const results = document.getElementById('results')!;
const warnings = document.getElementById('warnings')!;
const copyBtn = document.getElementById('copy') as HTMLButtonElement;
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
}

function copyScrubbed() {
  const text = input.value;
  const scrubbed = scrubText(text);
  navigator.clipboard.writeText(scrubbed).then(() => {
    const originalText = copyBtn.textContent;
    copyBtn.textContent = 'Copied!';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 1500);
  });
}

input.addEventListener('input', updateUI);
input.addEventListener('paste', () => setTimeout(updateUI, 0));
copyBtn.addEventListener('click', copyScrubbed);
