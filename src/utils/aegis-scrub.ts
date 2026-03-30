/**
 * PII scrub / restore using {@link https://github.com/AegisProxy/aegis-sdk aegis-sdk} (AegisProtector).
 * Detection still uses regex + optional SLM in pii-detector; tokens are SDK placeholders (referential integrity per value).
 */

import { AegisProtector, type AegisExportedStateV1 } from 'aegis-sdk';
import {
  stripUnicodeTags,
  detectPII,
  mergePIIMatches,
  type PIIMatch,
} from './pii-detector';

/** One session id for all Shield UI / clipboard flows so placeholders are stable for restore. */
export const AEGIS_SHIELD_SESSION = 'aegis-shield';

/** chrome.storage.local key for exported Aegis state (v1 JSON). */
export const AEGIS_STATE_STORAGE_KEY = 'aegis-sdk-state-v1';

/** Matches tokens like `[REDACTED_EMAIL_abc12def]` or `[REDACTED_abc12def]`. */
export const AEGIS_PLACEHOLDER_RE = /\[REDACTED(?:_[A-Z]+)?_[a-f0-9]{8}\]/g;

function matchTypeToEntity(type: string): string {
  const map: Record<string, string> = {
    email: 'email',
    phone: 'phone',
    ssn: 'ssn',
    creditCard: 'card',
    zipCode: 'zip',
    ipAddress: 'ip',
    date: 'date',
    person: 'name',
    org: 'org',
    location: 'location',
    misc: 'misc',
  };
  return map[type] ?? type.toLowerCase();
}

export function textHasAegisPlaceholders(text: string): boolean {
  AEGIS_PLACEHOLDER_RE.lastIndex = 0;
  return AEGIS_PLACEHOLDER_RE.test(text);
}

/**
 * Strip invisible Unicode, detect PII (regex + optional SLM matches), redact via AegisProtector.
 */
export function scrubWithAegis(
  text: string,
  extraMatches?: PIIMatch[]
): { scrubbed: string; state: AegisExportedStateV1 } {
  const stripped = stripUnicodeTags(text);
  const matches = extraMatches
    ? mergePIIMatches(detectPII(stripped), extraMatches)
    : detectPII(stripped);
  const sorted = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  const protector = new AegisProtector();
  let result = stripped;
  for (const m of sorted) {
    const ph = protector.redact(
      m.value,
      matchTypeToEntity(m.type),
      AEGIS_SHIELD_SESSION
    );
    result = result.slice(0, m.startIndex) + ph + result.slice(m.endIndex);
  }
  return { scrubbed: result, state: protector.exportState() };
}

/**
 * Replace all Aegis placeholders in text using a previously saved exportState().
 */
export function restoreWithAegis(text: string, state: AegisExportedStateV1): string {
  const protector = new AegisProtector();
  protector.importState(state);
  const found = [...text.matchAll(AEGIS_PLACEHOLDER_RE)];
  found.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  let result = text;
  for (let i = found.length - 1; i >= 0; i--) {
    const mm = found[i]!;
    const ph = mm[0];
    const idx = mm.index ?? 0;
    try {
      const original = protector.unredact(ph);
      result = result.slice(0, idx) + original + result.slice(idx + ph.length);
    } catch {
      /* unknown token — leave as-is */
    }
  }
  return result;
}
