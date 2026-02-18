/**
 * Placeholder for future SLM (Small Language Model) integration.
 * Possible: context-aware PII detection, custom pattern learning.
 */

export interface SLMConfig {
  modelPath?: string;
  threshold?: number;
  enabledDetectors?: string[];
}

export async function detectPIIWithSLM(_text: string, _config?: SLMConfig): Promise<never> {
  throw new Error('SLM integration not yet implemented');
}
