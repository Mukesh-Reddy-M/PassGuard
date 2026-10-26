/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EntropyResult {
  bits: number;
  poolSize: number;
  rawBits: number;
  crackTimeEstimate: string;
}

/**
 * Calculates character pool size based on character varieties present.
 */
export function calculatePoolSize(password: string): number {
  if (!password) return 0;

  let pool = 0;
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSymbol = false;
  let hasOther = false;

  for (const ch of password) {
    if (ch >= 'a' && ch <= 'z') hasLower = true;
    else if (ch >= 'A' && ch <= 'Z') hasUpper = true;
    else if (ch >= '0' && ch <= '9') hasDigit = true;
    else if (
      (ch >= ' ' && ch <= '/') ||
      (ch >= ':' && ch <= '@') ||
      (ch >= '[' && ch <= '`') ||
      (ch >= '{' && ch <= '~')
    ) {
      hasSymbol = true;
    } else {
      hasOther = true;
    }
  }

  if (hasLower) pool += 26;
  if (hasUpper) pool += 26;
  if (hasDigit) pool += 10;
  if (hasSymbol) pool += 33;
  if (hasOther) pool += 64;

  return pool;
}

/**
 * Calculates information entropy in bits:
 * - Computes raw pool entropy: L * log2(pool)
 * - Returns rounded bits and human-readable offline brute-force crack time estimate.
 */
export function calculateEntropy(password: string): EntropyResult {
  if (!password) {
    return {
      bits: 0,
      poolSize: 0,
      rawBits: 0,
      crackTimeEstimate: 'Instant',
    };
  }

  const pool = calculatePoolSize(password);
  if (pool <= 1) {
    return {
      bits: 0,
      poolSize: pool,
      rawBits: 0,
      crackTimeEstimate: 'Instant',
    };
  }

  const rawBits = Array.from(password).length * Math.log2(pool);
  const roundedBits = Math.max(0, Math.round(rawBits * 10) / 10);

  return {
    bits: roundedBits,
    poolSize: pool,
    rawBits: Math.round(rawBits * 100) / 100,
    crackTimeEstimate: estimateCrackTime(roundedBits),
  };
}

/**
 * Estimates offline brute-force attack duration at 10 billion (10^10) guesses/sec
 * representing modern multi-GPU hashcat cracking arrays.
 */
export function estimateCrackTime(bits: number): string {
  if (bits <= 28) return 'Instant (< 1 second)';
  if (bits <= 36) return 'A few seconds to minutes';
  if (bits <= 48) return 'Hours to several days';
  if (bits <= 60) return 'Several months to years';
  if (bits <= 75) return 'Centuries';
  if (bits <= 90) return 'Millions of years';
  return 'Trillions of years';
}

/**
 * Calculates entropy for a passphrase constructed from a wordlist of size N.
 * Formula: words * log2(N) + log2(10) if a random digit is appended.
 *
 * The separator and capitalization style are fixed choices (not random), so an
 * attacker who knows the format gains nothing from them: they add 0 bits.
 * The flags are kept in the signature for backwards compatibility.
 */
export function calculatePassphraseEntropy(
  wordCount: number,
  wordlistSize: number,
  _hasSeparator: boolean,
  hasNumber: boolean,
  _hasCapitalization: boolean
): number {
  if (!Number.isFinite(wordCount) || !Number.isFinite(wordlistSize)) return 0;
  if (wordCount <= 0 || wordlistSize <= 1) return 0;

  let bits = wordCount * Math.log2(wordlistSize);
  if (hasNumber) {
    bits += Math.log2(10);
  }
  return Math.round(bits * 10) / 10;
}

/**
 * Maps entropy bits to a 0-4 strength score for randomly generated secrets
 * (passphrases / random strings) where the true entropy is known.
 */
export function scoreFromBits(bits: number): 0 | 1 | 2 | 3 | 4 {
  if (bits < 28) return 0;
  if (bits < 40) return 1;
  if (bits < 56) return 2;
  if (bits < 72) return 3;
  return 4;
}

/**
 * Structure-aware entropy estimate in bits.
 * Plain `length * log2(pool)` wildly over-counts predictable strings, so this
 * collapses runs ("aaaa"), +/-1 sequences ("abcd", "4321") and whole-string
 * repetition ("abcabcabc") into the few bits of information they really carry.
 */
export function estimateStructuralBits(password: string): number {
  const chars = Array.from(password);
  const n = chars.length;
  if (n === 0) return 0;
  const pool = calculatePoolSize(password);
  if (pool <= 1) return 0;
  const charBits = Math.log2(pool);

  // (a) greedy scan: collapse identical runs and +/-1 sequences
  let scanBits = 0;
  let i = 0;
  while (i < n) {
    let run = 1;
    while (i + run < n && chars[i + run] === chars[i]) run++;
    if (run >= 3) {
      scanBits += charBits + Math.log2(run);
      i += run;
      continue;
    }
    let seq = 1;
    if (i + 1 < n) {
      const step = chars[i + 1].codePointAt(0)! - chars[i].codePointAt(0)!;
      if (step === 1 || step === -1) {
        while (
          i + seq < n &&
          chars[i + seq].codePointAt(0)! - chars[i + seq - 1].codePointAt(0)! === step
        ) {
          seq++;
        }
      }
    }
    if (seq >= 3) {
      scanBits += charBits + 1 + Math.log2(seq);
      i += seq;
      continue;
    }
    scanBits += charBits;
    i++;
  }

  // (b) whole-string periodicity: smallest period p repeated to fill the string
  let periodBits = n * charBits;
  for (let p = 1; p <= Math.floor(n / 2); p++) {
    let periodic = true;
    for (let k = p; k < n; k++) {
      if (chars[k] !== chars[k - p]) {
        periodic = false;
        break;
      }
    }
    if (periodic) {
      periodBits = p * charBits + Math.log2(Math.ceil(n / p));
      break;
    }
  }

  return Math.max(0, Math.min(scanBits, periodBits));
}
