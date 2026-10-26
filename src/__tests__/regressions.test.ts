/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { analyzePassword } from '../lib/analyzer.ts';
import {
  calculatePassphraseEntropy,
  estimateStructuralBits,
  scoreFromBits,
} from '../lib/entropy.ts';
import {
  estimatePassphraseEntropy,
  estimateRandomPasswordEntropy,
  generatePassphrase,
  generateRandomPassword,
  getSecureRandomInt,
  MAX_PASSPHRASE_WORDS,
  RandomPasswordOptions,
} from '../lib/generator.ts';
import { WORDLIST } from '../data/wordlist.ts';

const baseOptions: RandomPasswordOptions = {
  length: 16,
  includeLower: true,
  includeUpper: true,
  includeDigits: true,
  includeSymbols: true,
  excludeAmbiguous: false,
};

describe('effective entropy discounts predictable patterns', () => {
  it('treats known breached passwords as nearly zero entropy', () => {
    expect(analyzePassword('password').entropy).toBeLessThan(15);
    expect(analyzePassword('P@ssw0rd').entropy).toBeLessThan(20);
  });

  it('discounts common-word + year/symbol patterns', () => {
    expect(analyzePassword('Summer2024!').entropy).toBeLessThan(30);
  });

  it('does not reward very long repeated strings', () => {
    const result = analyzePassword('a'.repeat(5000));
    expect(result.entropy).toBeLessThan(25);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it('collapses repeated chunks and sequences', () => {
    expect(estimateStructuralBits('abcabcabc')).toBeLessThan(20);
    expect(estimateStructuralBits('12345678')).toBeLessThan(15);
    expect(estimateStructuralBits('zyxwvuts')).toBeLessThan(15);
  });

  it('keeps full entropy for genuinely random strings', () => {
    const result = analyzePassword('Xk9#mP2$vL7@qR4!nW');
    expect(result.entropy).toBeGreaterThan(100);
    expect(result.entropy).toBe(result.rawEntropy);
  });

  it('never reports effective entropy above raw entropy', () => {
    const samples = ['a', 'password123', 'qwerty', 'Tr0ub4dor&3', '😀😀😀😀', 'MyDogRex1990', '1qaz2wsx!'];
    for (const sample of samples) {
      const result = analyzePassword(sample);
      expect(result.entropy).toBeLessThanOrEqual(result.rawEntropy);
    }
  });
});

describe('getSecureRandomInt input validation and range', () => {
  it('returns 0 for max = 1', () => {
    expect(getSecureRandomInt(1)).toBe(0);
  });

  it('does not hang and stays in range above 65536 (regression: infinite loop)', () => {
    for (const max of [65535, 65536, 65537, 1_000_000, 2 ** 32]) {
      for (let i = 0; i < 50; i++) {
        const value = getSecureRandomInt(max);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(max);
      }
    }
  });

  it('rejects invalid ranges instead of looping or returning fractions', () => {
    for (const bad of [0, -1, NaN, Infinity, 2.5, 2 ** 32 + 1]) {
      expect(() => getSecureRandomInt(bad)).toThrow(RangeError);
    }
  });

  it('is roughly uniform (no modulo bias)', () => {
    const buckets = new Array<number>(7).fill(0);
    const draws = 70000;
    for (let i = 0; i < draws; i++) buckets[getSecureRandomInt(7)]++;
    const expected = draws / 7;
    for (const count of buckets) {
      expect(Math.abs(count - expected) / expected).toBeLessThan(0.06);
    }
  });
});

describe('generateRandomPassword validation', () => {
  it('throws when no character type is enabled (no silent fallback)', () => {
    expect(() =>
      generateRandomPassword({
        ...baseOptions,
        includeLower: false,
        includeUpper: false,
        includeDigits: false,
        includeSymbols: false,
      })
    ).toThrow();
  });

  it('falls back to a safe default length for NaN and clamps out-of-range lengths', () => {
    expect(generateRandomPassword({ ...baseOptions, length: NaN })).toHaveLength(16);
    expect(generateRandomPassword({ ...baseOptions, length: 0 })).toHaveLength(8);
    expect(generateRandomPassword({ ...baseOptions, length: -5 })).toHaveLength(8);
    expect(generateRandomPassword({ ...baseOptions, length: 1000 })).toHaveLength(64);
  });

  it('honours a single enabled set together with ambiguous-character exclusion', () => {
    const onlyDigits: RandomPasswordOptions = {
      ...baseOptions,
      length: 40,
      includeLower: false,
      includeUpper: false,
      includeSymbols: false,
      excludeAmbiguous: true,
    };
    for (let i = 0; i < 100; i++) {
      expect(generateRandomPassword(onlyDigits)).toMatch(/^[2-9]+$/);
    }
  });

  it('reports random-password entropy from the real pool size', () => {
    const bits = estimateRandomPasswordEntropy({ ...baseOptions, length: 20 });
    expect(bits).toBeGreaterThan(110);
    expect(bits).toBeLessThan(140);
  });
});

describe('passphrase entropy is honest about the wordlist size', () => {
  it('computes bits from the real wordlist, not from character counts', () => {
    const bits = estimatePassphraseEntropy({
      wordCount: 4,
      separator: '-',
      casing: 'lowercase',
      includeNumber: false,
    });
    expect(bits).toBeCloseTo(4 * Math.log2(WORDLIST.length), 0);
    expect(bits).toBeLessThan(40);
  });

  it('rates a 4-word passphrase as weak and a 7+ word passphrase as strong', () => {
    const four = estimatePassphraseEntropy({ wordCount: 4, separator: '-', casing: 'titlecase', includeNumber: true });
    const seven = estimatePassphraseEntropy({ wordCount: 7, separator: '-', casing: 'titlecase', includeNumber: true });
    expect(scoreFromBits(four)).toBeLessThanOrEqual(1);
    expect(scoreFromBits(seven)).toBeGreaterThanOrEqual(3);
  });

  it('gives no bonus for fixed separator or capitalization style', () => {
    const plain = calculatePassphraseEntropy(5, WORDLIST.length, false, false, false);
    const styled = calculatePassphraseEntropy(5, WORDLIST.length, true, false, true);
    expect(styled).toBe(plain);
  });

  it('supports up to the maximum word count and clamps above it', () => {
    const phrase = generatePassphrase({
      wordCount: 100,
      separator: '-',
      casing: 'lowercase',
      includeNumber: false,
    });
    expect(phrase.split('-')).toHaveLength(MAX_PASSPHRASE_WORDS);
  });

  it('falls back to a sensible word count for NaN', () => {
    const phrase = generatePassphrase({
      wordCount: NaN,
      separator: '-',
      casing: 'lowercase',
      includeNumber: false,
    });
    expect(phrase.split('-').length).toBeGreaterThanOrEqual(3);
  });
});
