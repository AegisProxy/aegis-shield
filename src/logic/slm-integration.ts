import type { PIIMatch } from '../utils/pii-detector';

// Chrome extension: dynamic import() of chrome-extension:// URLs fails. Fetch first, create blob URLs,
// then dynamically import Transformers and set wasmPaths before any ONNX init.
let transformersPromise: Promise<typeof import('@huggingface/transformers')> | null = null;
async function getTransformers() {
  if (transformersPromise) return transformersPromise;
  transformersPromise = (async () => {
    const mod = await import('@huggingface/transformers');
    const { env } = mod;
    if (typeof chrome !== 'undefined' && env?.backends?.onnx?.wasm) {
      // Single-threaded: avoids Worker creation; Workers fail to import blob: URLs in extension context
      env.backends.onnx.wasm.numThreads = 1;
      const base = chrome.runtime.getURL('transformers/');
      // Use chrome-extension URL directly (no blob) so Worker-free import works
      env.backends.onnx.wasm.wasmPaths = base;
    }
    return mod;
  })();
  return transformersPromise;
}

const NER_MODEL = 'Xenova/bert-base-NER';

/** NER entity type to our PII type */
const ENTITY_TO_PII: Record<string, string> = {
  PER: 'person',
  PERSON: 'person',
  ORG: 'org',
  ORGANIZATION: 'org',
  LOC: 'location',
  LOCATION: 'location',
  MISC: 'misc',
};

type NERPipeline = {
  (text: string, opts?: { ignore_labels?: string[] }): Promise<unknown>;
  dispose?: () => Promise<void>;
};
let nerPipeline: NERPipeline | null = null;

/** Progress info from Transformers.js (status, file, progress 0-100, loaded/total bytes) */
export type SLMProgressInfo = {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

async function getPipeline(onProgress?: (p: SLMProgressInfo) => void): Promise<NERPipeline> {
  const { pipeline } = await getTransformers();
  if (!nerPipeline) {
    // @ts-expect-error - pipeline return type is complex
    nerPipeline = await pipeline('token-classification', NER_MODEL, {
      dtype: 'int8', // Use quantized model (~108 MB vs ~431 MB full)
      progress_callback: (p: SLMProgressInfo) => {
        if (p?.status) console.debug('[Aegis] NER:', p.status, p.file, p.progress != null ? `${p.progress}%` : '');
        onProgress?.(p);
      },
    });
  }
  return nerPipeline;
}

interface NERToken {
  entity: string;
  word: string;
  score: number;
  index: number;
}

/** Aggregate B-/I- tagged tokens into full entity spans */
function aggregateEntities(tokens: NERToken[], text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];
  let current: { type: string; value: string; score: number } | null = null;

  function flush() {
    if (current) {
      const span = findSpan(current.value, text, matches);
      if (span) matches.push({ type: current.type, value: current.value, ...span });
      current = null;
    }
  }

  for (const t of tokens) {
    const baseType = t.entity.replace(/^[BI]-/, '');
    const piiType = ENTITY_TO_PII[baseType] ?? baseType.toLowerCase();
    const word = t.word.replace(/^##/, '');

    if (t.entity.startsWith('B-')) {
      flush();
      current = { type: piiType, value: word, score: t.score };
    } else if (t.entity.startsWith('I-') && current && current.type === piiType) {
      current.value += (t.word.startsWith('##') ? '' : ' ') + word;
      current.score = Math.min(current.score, t.score);
    } else {
      flush();
    }
  }
  flush();
  return matches;
}

function findSpan(
  value: string,
  text: string,
  existing: PIIMatch[]
): { startIndex: number; endIndex: number } | null {
  const normalized = value.trim();
  if (!normalized) return null;
  let searchFrom = 0;
  while (true) {
    const idx = text.indexOf(normalized, searchFrom);
    if (idx === -1) return null;
    const end = idx + normalized.length;
    const overlaps = existing.some(
      (m) => (idx >= m.startIndex && idx < m.endIndex) || (end > m.startIndex && end <= m.endIndex) || (idx <= m.startIndex && end >= m.endIndex)
    );
    if (!overlaps) return { startIndex: idx, endIndex: end };
    searchFrom = end;
  }
}

export interface SLMConfig {
  minScore?: number;
  enabledTypes?: string[];
  /** Called during model download with progress (status, file, progress 0-100, loaded/total) */
  onProgress?: (p: SLMProgressInfo) => void;
}

/**
 * Detect PII using NER model (person names, orgs, locations).
 * Complements regex detection for context-aware entity recognition.
 */
export async function detectPIIWithSLM(text: string, config?: SLMConfig): Promise<PIIMatch[]> {
  if (!text?.trim()) return [];
  const minScore = config?.minScore ?? 0.8;
  const enabledTypes = new Set(config?.enabledTypes ?? ['person', 'org', 'location', 'misc']);

  try {
    const classifier = await getPipeline(config?.onProgress);
    const output = (await classifier(text, { ignore_labels: ['O'] })) as NERToken[];
    if (!Array.isArray(output) || output.length === 0) return [];

    const matches = aggregateEntities(output, text);
    return matches.filter((m) => m && enabledTypes.has(m.type) && m.value.length >= 2);
  } catch (err) {
    console.warn('[Aegis] SLM detection failed:', err);
    return [];
  }
}

/**
 * Preload the NER model (e.g. when AI toggle is enabled). Shows download progress via onProgress.
 * Call this when the user enables AI detection, even before they paste text.
 */
export async function preloadSLMModel(onProgress?: (p: SLMProgressInfo) => void): Promise<void> {
  await getPipeline(onProgress);
}

export async function disposeSLM(): Promise<void> {
  const p = nerPipeline as { dispose?: () => Promise<void> } | null;
  if (p?.dispose) {
    await p.dispose();
  }
  nerPipeline = null;
}
