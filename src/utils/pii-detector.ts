/**
 * Fast-pass PII detector using regex patterns
 * This provides a quick first-pass detection before more sophisticated SLM analysis
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
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // US Phone numbers (various formats)
  phone: /(\+1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  
  // US Social Security Numbers (SSN)
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // Credit card numbers (only format with separators to reduce false positives)
  creditCard: /\b(?:\d{4}[-\s]){3}\d{4}\b/g,
  
  // US Zip codes (5 digits optionally followed by hyphen and 4 more digits)
  // Note: This may still match some 5-digit numbers; future SLM integration will improve accuracy
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
export function getPIISummary(text: string): Record<string, number> {
  const matches = detectPII(text);
  const summary: Record<string, number> = {};
  
  for (const match of matches) {
    summary[match.type] = (summary[match.type] || 0) + 1;
  }
  
  return summary;
}

/** Placeholder labels for redacted PII types */
const PII_PLACEHOLDERS: Record<string, string> = {
  email: '[EMAIL]',
  phone: '[PHONE]',
  ssn: '[SSN]',
  creditCard: '[CARD]',
  zipCode: '[ZIP]',
  ipAddress: '[IP]',
  date: '[DATE]',
};

/**
 * Redacts PII in text by replacing detected values with placeholders
 */
export function redactPII(text: string): string {
  const matches = detectPII(text);
  // Sort by startIndex descending so we replace from end to start (preserves indices)
  const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  
  let result = text;
  for (const match of sortedMatches) {
    const placeholder = PII_PLACEHOLDERS[match.type] ?? `[${match.type.toUpperCase()}]`;
    result = result.slice(0, match.startIndex) + placeholder + result.slice(match.endIndex);
  }
  return result;
}

/** Zero-width and invisible Unicode characters to strip */
const UNICODE_INVISIBLE_PATTERN = /[\u200B-\u200D\u2060\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u3164\uFFA0\uE0020-\uE007F]/g;

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
