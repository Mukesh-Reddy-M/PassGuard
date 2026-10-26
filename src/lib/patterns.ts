/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COMMON_PASSWORDS } from '../data/commonPasswords.ts';

export interface CommonPasswordMatch {
  matched: boolean;
  type?: 'exact' | 'leetspeak' | 'affix';
  matchedWord?: string;
}

export interface RepeatedPatternMatch {
  found: boolean;
  type?: 'single_char' | 'chunk' | 'mirrored';
  pattern?: string;
  count?: number;
}

export interface SequenceMatch {
  found: boolean;
  sequence?: string;
  kind?: 'alpha' | 'numeric';
  direction?: 'ascending' | 'descending';
}

export interface KeyboardWalkMatch {
  found: boolean;
  walk?: string;
}

export interface DateMatch {
  found: boolean;
  match?: string;
  kind?: 'year' | 'date';
}

/**
 * Standard leetspeak substitutions to root characters.
 */
const LEET_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '(': 'c',
  '[': 'c',
  '{': 'c',
  '<': 'c',
  '3': 'e',
  '6': 'g',
  '9': 'g',
  '!': 'i',
  '|': 'i',
  '1': 'i',
  '0': 'o',
  '$': 's',
  '5': 's',
  '7': 't',
  '+': 't',
};

/**
 * Normalizes a string by replacing leetspeak characters with alphabet equivalents.
 */
export function normalizeLeetspeak(input: string): string {
  let normalized = '';
  const lower = input.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    normalized += LEET_MAP[ch] || ch;
  }
  return normalized;
}

/**
 * Normalizes leetspeak specifically converting digits to 'l' instead of 'i' if needed.
 */
export function normalizeLeetspeakAlt(input: string): string {
  let normalized = '';
  const lower = input.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (ch === '1' || ch === '!') {
      normalized += 'l';
    } else {
      normalized += LEET_MAP[ch] || ch;
    }
  }
  return normalized;
}

/**
 * Checks if the password matches common breached passwords:
 * 1. Exact match (case-insensitive)
 * 2. Leetspeak match (e.g. p@ssw0rd -> password)
 * 3. Base root match with trailing/leading digits or punctuation (e.g. password123, Summer2024, admin99!)
 */
export function detectCommonPassword(password: string): CommonPasswordMatch {
  if (!password) return { matched: false };

  const lower = password.toLowerCase().trim();

  // Check affix match (common root + trailing/leading digits, years, or punctuation)
  // e.g. password123, Summer2024, admin99!, !welcome!
  const matchTrailing = lower.match(/^([a-zA-Z@$!0-9]+?)(?:19\d{2}|20\d{2}|\d{1,6}|[!@#$%^&*()_+=-]+)$/);
  if (matchTrailing && matchTrailing[1] && matchTrailing[1] !== lower) {
    const root = matchTrailing[1].toLowerCase();
    const rootLeet = normalizeLeetspeak(root);
    if (root.length >= 4 && COMMON_PASSWORDS.has(root)) {
      return { matched: true, type: 'affix', matchedWord: root };
    }
    if (rootLeet.length >= 4 && COMMON_PASSWORDS.has(rootLeet)) {
      return { matched: true, type: 'affix', matchedWord: rootLeet };
    }
  }

  const stripped = lower.replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z]+$/, '');
  if (stripped.length >= 4 && stripped !== lower) {
    if (COMMON_PASSWORDS.has(stripped)) {
      return { matched: true, type: 'affix', matchedWord: stripped };
    }
    const strippedLeet = normalizeLeetspeak(stripped);
    if (COMMON_PASSWORDS.has(strippedLeet)) {
      return { matched: true, type: 'affix', matchedWord: strippedLeet };
    }
  }

  // 1. Direct exact match
  if (COMMON_PASSWORDS.has(lower)) {
    return { matched: true, type: 'exact', matchedWord: lower };
  }

  // 2. Leetspeak match
  const leet1 = normalizeLeetspeak(lower);
  if (COMMON_PASSWORDS.has(leet1)) {
    return { matched: true, type: 'leetspeak', matchedWord: leet1 };
  }
  const leet2 = normalizeLeetspeakAlt(lower);
  if (COMMON_PASSWORDS.has(leet2)) {
    return { matched: true, type: 'leetspeak', matchedWord: leet2 };
  }

  return { matched: false };
}

/**
 * Checks for repeated characters:
 * - 3 or more consecutive identical characters (e.g. 'aaaa', '1111')
 * - Repeated chunks (e.g. 'abcabcabc', '121212', 'passpass')
 * - Mirrored patterns (palindromes length >= 4, e.g. 'abcba', '123321')
 */
export function detectRepeatedPatterns(password: string): RepeatedPatternMatch {
  if (!password || password.length < 3) return { found: false };

  const lower = password.toLowerCase();

  // 1. Single character repetitions (3+ in a row)
  const singleCharRegex = /(.)\1{2,}/;
  const singleMatch = lower.match(singleCharRegex);
  if (singleMatch) {
    return {
      found: true,
      type: 'single_char',
      pattern: singleMatch[0],
      count: singleMatch[0].length,
    };
  }

  // 2. Repeated chunks (substring of length 2 to len/2 repeating 2+ times)
  const maxChunkLen = Math.floor(lower.length / 2);
  for (let len = 2; len <= maxChunkLen; len++) {
    for (let i = 0; i <= lower.length - len * 2; i++) {
      const chunk = lower.substring(i, i + len);
      let count = 1;
      let nextPos = i + len;
      while (nextPos + len <= lower.length && lower.substring(nextPos, nextPos + len) === chunk) {
        count++;
        nextPos += len;
      }
      if (count >= 2 && chunk.length * count >= 4) {
        return {
          found: true,
          type: 'chunk',
          pattern: chunk,
          count,
        };
      }
    }
  }

  // 3. Mirrored pattern / palindrome (length >= 4)
  if (lower.length >= 4) {
    const reversed = lower.split('').reverse().join('');
    if (lower === reversed) {
      return {
        found: true,
        type: 'mirrored',
        pattern: password,
      };
    }
  }

  return { found: false };
}

/**
 * Checks for alphabetical or numerical sequences (length >= 3):
 * e.g. 'abcd', '1234', '9876', 'dcba'
 */
export function detectSequences(password: string): SequenceMatch {
  if (!password || password.length < 3) return { found: false };

  const lower = password.toLowerCase();

  // 1. Numerical sequences (ascending: '1234', descending: '9876')
  const numAsc = '012345678901';
  const numDesc = '109876543210';
  for (let i = 0; i <= lower.length - 3; i++) {
    for (let len = Math.min(6, lower.length - i); len >= 3; len--) {
      const sub = lower.substring(i, i + len);
      if (/^\d+$/.test(sub)) {
        if (numAsc.includes(sub)) {
          return { found: true, sequence: sub, kind: 'numeric', direction: 'ascending' };
        }
        if (numDesc.includes(sub)) {
          return { found: true, sequence: sub, kind: 'numeric', direction: 'descending' };
        }
      }
    }
  }

  // 2. Alphabetical sequences (ascending: 'abcd', descending: 'dcba')
  const alphaAsc = 'abcdefghijklmnopqrstuvwxyz';
  const alphaDesc = 'zyxwvutsrqponmlkjihgfedcba';
  for (let i = 0; i <= lower.length - 3; i++) {
    for (let len = Math.min(6, lower.length - i); len >= 3; len--) {
      const sub = lower.substring(i, i + len);
      if (/^[a-z]+$/.test(sub)) {
        if (alphaAsc.includes(sub)) {
          return { found: true, sequence: sub, kind: 'alpha', direction: 'ascending' };
        }
        if (alphaDesc.includes(sub)) {
          return { found: true, sequence: sub, kind: 'alpha', direction: 'descending' };
        }
      }
    }
  }

  return { found: false };
}

/**
 * Checks for keyboard walks:
 * QWERTY row walks (qwerty, asdfgh, zxcvbn)
 * Vertical / diagonal column walks (1qaz, 2wsx, 3edc, etc.)
 */
export function detectKeyboardWalks(password: string): KeyboardWalkMatch {
  if (!password || password.length < 3) return { found: false };

  const lower = password.toLowerCase();

  // QWERTY keyboard rows and columns (forward and reversed)
  const KEYBOARD_PATTERNS = [
    // Rows
    '1234567890-=',
    '=-0987654321',
    'qwertyuiop',
    'poiuytrewq',
    'asdfghjkl',
    'lkjhgfdsa',
    'zxcvbnm',
    'mnbvcxz',
    // Columns / Diagonals
    '1qaz',
    'zaq1',
    '2wsx',
    'xsw2',
    '3edc',
    'cde3',
    '4rfv',
    'vfr4',
    '5tgb',
    'bgt5',
    '6yhn',
    'nhy6',
    '7ujm',
    'mju7',
    '8ik,',
    ',ki8',
    '9ol.',
    '.lo9',
    '0p;/',
    '/;p0',
    // Zig-zag / cross walks
    '1qaz2wsx',
    'qazwsx',
    'wsxedc',
    'edcrfv',
    'rfvtgb',
    'tgbyhn',
  ];

  for (const pattern of KEYBOARD_PATTERNS) {
    // If pattern contains the password or a significant substring (length >= 3 for rows, >= 3 for columns)
    const minLen = pattern.length <= 4 ? 3 : 4;
    for (let i = 0; i <= lower.length - minLen; i++) {
      for (let len = Math.min(pattern.length, lower.length - i); len >= minLen; len--) {
        const sub = lower.substring(i, i + len);
        if (pattern.includes(sub)) {
          return { found: true, walk: sub };
        }
      }
    }
  }

  return { found: false };
}

/**
 * Detects dates and years:
 * - 4-digit years (1900-2099)
 * - Formatted dates (DD/MM/YYYY, MM-DD-YYYY, YYYY-MM-DD, etc.)
 * - Compact 8-digit dates (DDMMYYYY, YYYYMMDD)
 */
export function detectDatesAndYears(password: string): DateMatch {
  if (!password || password.length < 4) return { found: false };

  // 1. Formatted dates (e.g. 12/05/1999, 2024-05-12, 01.01.2000)
  const formattedDateRegex =
    /\b(?:(?:0?[1-9]|[12]\d|3[01])[-/.](?:0?[1-9]|1[012])[-/.](?:19\d{2}|20\d{2}))\b|\b(?:(?:19\d{2}|20\d{2})[-/.](?:0?[1-9]|1[012])[-/.](?:0?[1-9]|[12]\d|3[01]))\b/;
  const dateMatch = password.match(formattedDateRegex);
  if (dateMatch) {
    return { found: true, match: dateMatch[0], kind: 'date' };
  }

  // 2. Compact 8-digit date (e.g. 12051999, 19991205)
  const compactDateRegex = /(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[0-2])(?:19\d{2}|20\d{2})|(?:19\d{2}|20\d{2})(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])/;
  const compactMatch = password.match(compactDateRegex);
  if (compactMatch) {
    return { found: true, match: compactMatch[0], kind: 'date' };
  }

  // 3. Isolated or embedded 4-digit year (1920-2099)
  const yearRegex = /(?:19[2-9]\d|20[0-9]\d)/;
  const yearMatch = password.match(yearRegex);
  if (yearMatch) {
    return { found: true, match: yearMatch[0], kind: 'year' };
  }

  return { found: false };
}
