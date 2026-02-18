/**
 * PII detector using regex patterns for emails, phones, SSNs, cards, IPs, dates, etc.
 */

export interface PIIMatch {
  type: string;
  value: string;
  startIndex: number;
  endIndex: number;
}

// Regex patterns for common PII types
const PII_PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  
  // US Phone numbers (various formats)
  phone: /(\+1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // US Social Security Numbers (SSN)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Credit card numbers (only format with separators to reduce false positives)
  creditCard: /\b(?:\d{4}[-\s]){3}\d{4}\b/g,
  
  // US Zip+4 codes (5 digits hyphen 4 digits)
  zipCode: /\b\d{5}-\d{4}\b/g,
  
  // IPv4 addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // Dates in common formats (MM/DD/YYYY, DD-MM-YYYY, etc.)
  date: /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g,
};

/**
 * Scans text for PII using regex patterns
 * @param text - The text to scan
 * @returns Array of detected PII matches
 */
export function detectPII(text: string): PIIMatch[] {
  const matches: PIIMatch[] = [];
  
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    // Reset regex lastIndex to ensure fresh scanning
    pattern.lastIndex = 0;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Additional validation for certain types
      if (type === 'creditCard' && !isValidCreditCardFormat(match[0])) {
        continue;
      }
      
      if (type === 'ipAddress' && !isValidIPAddress(match[0])) {
        continue;
      }
      
      matches.push({
        type,
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }
  
  return matches;
}

/**
 * Basic validation for credit card number format
 */
function isValidCreditCardFormat(value: string): boolean {
  const digits = value.replace(/[-\s]/g, '');
  
  // Must be between 13-19 digits
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }
  
  // Luhn algorithm check
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validates IP address format
 */
function isValidIPAddress(value: string): boolean {
  const parts = value.split('.');
  
  if (parts.length !== 4) {
    return false;
  }
  
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Checks if text contains any PII
 */
export function hasPII(text: string): boolean {
  return detectPII(text).length > 0;
}

/**
 * Returns a summary of detected PII types
 */
export function getPIISummary(text: string, matches?: PIIMatch[]): Record<string, number> {
  const m = matches ?? detectPII(text);
  const summary: Record<string, number> = {};
  for (const match of m) {
    summary[match.type] = (summary[match.type] || 0) + 1;
  }
  return summary;
}

/** Placeholder labels for redacted PII types */
export const PII_PLACEHOLDERS: Record<string, string> = {
  email: '[EMAIL]',
  phone: '[PHONE]',
  ssn: '[SSN]',
  creditCard: '[CARD]',
  zipCode: '[ZIP]',
  ipAddress: '[IP]',
  date: '[DATE]',
  person: '[NAME]',
  org: '[ORG]',
  location: '[LOCATION]',
  misc: '[MISC]',
};

/**
 * Redacts PII in text by replacing detected values with placeholders
 */
export function redactPII(text: string, matches?: PIIMatch[]): string {
  const m = matches ?? detectPII(text);
  const sortedMatches = [...m].sort((a, b) => b.startIndex - a.startIndex);
  let result = text;
  for (const match of sortedMatches) {
    const placeholder = PII_PLACEHOLDERS[match.type] ?? `[${match.type.toUpperCase()}]`;
    result = result.slice(0, match.startIndex) + placeholder + result.slice(match.endIndex);
  }
  return result;
}

/** Zero-width and invisible Unicode characters to strip */
const UNICODE_INVISIBLE_PATTERN = /[\u200B-\u200D\u2060\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u3164\uFFA0\u{E0020}-\u{E007F}]/gu;

/**
 * Strips invisible Unicode characters (zero-width spaces, watermarks, etc.) from text
 */
export function stripUnicodeTags(text: string): string {
  return text.replace(UNICODE_INVISIBLE_PATTERN, '');
}

/**
 * Scrubs text: strips Unicode tags and redacts PII
 */
export function scrubText(text: string): string {
  return redactPII(stripUnicodeTags(text));
}

/** Merge and deduplicate PII matches; regex takes precedence on overlap */
export function mergePIIMatches(regexMatches: PIIMatch[], slmMatches: PIIMatch[]): PIIMatch[] {
  const merged = [...regexMatches];
  for (const m of slmMatches) {
    const overlaps = merged.some(
      (r) =>
        (m.startIndex >= r.startIndex && m.startIndex < r.endIndex) ||
        (m.endIndex > r.startIndex && m.endIndex <= r.endIndex) ||
        (m.startIndex <= r.startIndex && m.endIndex >= r.endIndex)
    );
    if (!overlaps) merged.push(m);
  }
  return merged.sort((a, b) => a.startIndex - b.startIndex);
}

/**
 * Scrubs text and returns a mapping of placeholders to original values (for later restore)
 * Uses first occurrence of each PII type when multiple exist
 */
export function scrubTextWithMapping(text: string, extraMatches?: PIIMatch[]): { scrubbed: string; mapping: Record<string, string> } {
  const stripped = stripUnicodeTags(text);
  const matches = extraMatches ? mergePIIMatches(detectPII(stripped), extraMatches) : detectPII(stripped);
  const mapping: Record<string, string> = {};
  for (const match of matches) {
    const placeholder = PII_PLACEHOLDERS[match.type] ?? `[${match.type.toUpperCase()}]`;
    if (!(placeholder in mapping)) {
      mapping[placeholder] = match.value;
    }
  }
  return {
    scrubbed: redactPII(stripped, matches),
    mapping,
  };
}

/**
 * Restores placeholders in text with original PII values from a previous scrub
 */
export function restorePII(text: string, mapping: Record<string, string>): string {
  let result = text;
  for (const [placeholder, value] of Object.entries(mapping)) {
    result = result.split(placeholder).join(value);
  }
  return result;
}
