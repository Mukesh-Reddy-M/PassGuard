/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WORDLIST } from '../data/wordlist.ts';
import { calculatePassphraseEntropy } from './entropy.ts';

export interface RandomPasswordOptions {
  length: number;
  includeLower: boolean;
  includeUpper: boolean;
  includeDigits: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export type PassphraseCasing = 'lowercase' | 'titlecase' | 'uppercase';

export interface PassphraseOptions {
  wordCount: number;
  separator: string;
  casing: PassphraseCasing;
  includeNumber: boolean;
}

const LOWER_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const UPPER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_CHARS = '0123456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Ambiguous characters: 0, O, l, 1, I
const AMBIGUOUS_SET = new Set(['0', 'O', 'o', 'l', '1', 'I', '|', '`']);

/**
 * Cryptographically secure random integer generator using rejection sampling
 * to eliminate modulo bias.
 * NEVER uses Math.random.
 */
export function getSecureRandomInt(max: number): number {
  if (!Number.isSafeInteger(max) || max < 1 || max > 0x100000000) {
    throw new RangeError('getSecureRandomInt: max must be an integer between 1 and 2^32');
  }
  if (max === 1) return 0;

  // Pick the smallest unsigned word that covers `max`, then reject values in the
  // biased tail so every outcome has exactly the same probability.
  if (max <= 0x100) {
    const limit = 0x100 - (0x100 % max);
    const buffer = new Uint8Array(1);
    for (;;) {
      crypto.getRandomValues(buffer);
      if (buffer[0] < limit) return buffer[0] % max;
    }
  }
  if (max <= 0x10000) {
    const limit = 0x10000 - (0x10000 % max);
    const buffer = new Uint16Array(1);
    for (;;) {
      crypto.getRandomValues(buffer);
      if (buffer[0] < limit) return buffer[0] % max;
    }
  }
  const limit = 0x100000000 - (0x100000000 % max);
  const buffer = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buffer);
    if (buffer[0] < limit) return buffer[0] % max;
  }
}

/**
 * Fisher-Yates array shuffle using cryptographically secure random integers.
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(i + 1);
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Filter character set to remove ambiguous characters if requested.
 */
function filterAmbiguous(charset: string, exclude: boolean): string {
  if (!exclude) return charset;
  return charset
    .split('')
    .filter((ch) => !AMBIGUOUS_SET.has(ch))
    .join('');
}

const DEFAULT_PASSWORD_LENGTH = 16;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 64;

export const MIN_PASSPHRASE_WORDS = 3;
export const MAX_PASSPHRASE_WORDS = 10;

function normalizeLength(value: number): number {
  const n = Number.isFinite(value) ? Math.round(value) : DEFAULT_PASSWORD_LENGTH;
  return Math.max(MIN_PASSWORD_LENGTH, Math.min(MAX_PASSWORD_LENGTH, n));
}

/** Returns the character sets that are enabled (after ambiguous filtering). */
function getEnabledSets(options: RandomPasswordOptions): string[] {
  const sets: string[] = [];
  if (options.includeLower) sets.push(filterAmbiguous(LOWER_CHARS, options.excludeAmbiguous));
  if (options.includeUpper) sets.push(filterAmbiguous(UPPER_CHARS, options.excludeAmbiguous));
  if (options.includeDigits) sets.push(filterAmbiguous(DIGIT_CHARS, options.excludeAmbiguous));
  if (options.includeSymbols) sets.push(filterAmbiguous(SYMBOL_CHARS, options.excludeAmbiguous));
  return sets.filter((set) => set.length > 0);
}

/**
 * Generates a random password using crypto.getRandomValues and rejection sampling.
 * Guarantees at least one character from each enabled set.
 * Throws if no character type is enabled (callers must not fall back silently).
 */
export function generateRandomPassword(options: RandomPasswordOptions): string {
  const length = normalizeLength(options.length);
  const enabledSets = getEnabledSets(options);

  if (enabledSets.length === 0) {
    throw new Error('Enable at least one character type to generate a password.');
  }

  const allAvailableChars = enabledSets.join('');
  const passwordChars: string[] = [];

  // Guarantee at least one character from each enabled set
  for (const set of enabledSets) {
    passwordChars.push(set[getSecureRandomInt(set.length)]);
  }

  // Fill remaining length from the combined pool using rejection sampling
  while (passwordChars.length < length) {
    passwordChars.push(allAvailableChars[getSecureRandomInt(allAvailableChars.length)]);
  }

  // Shuffle so guaranteed characters are not in predictable positions
  return secureShuffle(passwordChars).join('');
}

/**
 * Entropy of a generated random password (bits): length * log2(pool size).
 * Slightly optimistic because of the one-per-set guarantee, but within ~1-2 bits.
 */
export function estimateRandomPasswordEntropy(options: RandomPasswordOptions): number {
  const sets = getEnabledSets(options);
  if (sets.length === 0) return 0;
  const poolSize = new Set(sets.join('')).size;
  return Math.round(normalizeLength(options.length) * Math.log2(poolSize) * 10) / 10;
}

/** True entropy of a generated passphrase, based on the real wordlist size. */
export function estimatePassphraseEntropy(options: PassphraseOptions): number {
  return calculatePassphraseEntropy(
    normalizePassphraseWords(options.wordCount),
    WORDLIST.length,
    options.separator.length > 0,
    options.includeNumber,
    options.casing !== 'lowercase'
  );
}

function normalizePassphraseWords(value: number): number {
  const n = Number.isFinite(value) ? Math.round(value) : 6;
  return Math.max(MIN_PASSPHRASE_WORDS, Math.min(MAX_PASSPHRASE_WORDS, n));
}

/**
 * Generates a multi-word passphrase using crypto.getRandomValues and the bundled wordlist.
 */
export function generatePassphrase(options: PassphraseOptions): string {
  const wordCount = normalizePassphraseWords(options.wordCount);
  const selectedWords: string[] = [];

  for (let i = 0; i < wordCount; i++) {
    const index = getSecureRandomInt(WORDLIST.length);
    let word = WORDLIST[index];

    if (options.casing === 'titlecase') {
      word = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    } else if (options.casing === 'uppercase') {
      word = word.toUpperCase();
    } else {
      word = word.toLowerCase();
    }

    selectedWords.push(word);
  }

  let result = selectedWords.join(options.separator);

  if (options.includeNumber) {
    const randomDigit = getSecureRandomInt(10);
    // Append the number to the end (or insert with separator)
    result = `${result}${options.separator || ''}${randomDigit}`;
  }

  return result;
}
