/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  calculatePoolSize,
  calculateEntropy,
  estimateCrackTime,
  calculatePassphraseEntropy,
} from '../lib/entropy.ts';

describe('calculatePoolSize', () => {
  it('returns 0 for empty string', () => {
    expect(calculatePoolSize('')).toBe(0);
  });

  it('calculates 26 for lowercase only', () => {
    expect(calculatePoolSize('abcdef')).toBe(26);
  });

  it('calculates 52 for mixed case', () => {
    expect(calculatePoolSize('abcDEF')).toBe(52);
  });

  it('calculates 62 for alphanumeric', () => {
    expect(calculatePoolSize('abcDEF123')).toBe(62);
  });

  it('calculates 95 for full ASCII set with symbols', () => {
    expect(calculatePoolSize('abcDEF123!@#')).toBe(95);
  });
});

describe('calculateEntropy', () => {
  it('returns 0 bits for empty input', () => {
    const result = calculateEntropy('');
    expect(result.bits).toBe(0);
    expect(result.crackTimeEstimate).toBe('Instant');
  });

  it('calculates higher entropy for longer strings with diverse pools', () => {
    const shortEntropy = calculateEntropy('abc12');
    const longEntropy = calculateEntropy('aB3!kP9$mQ2#zL8*');

    expect(shortEntropy.bits).toBeGreaterThan(0);
    expect(longEntropy.bits).toBeGreaterThan(shortEntropy.bits);
    expect(longEntropy.bits).toBeGreaterThan(80);
  });

  it('provides sensible crack time estimates', () => {
    expect(estimateCrackTime(20)).toContain('Instant');
    expect(estimateCrackTime(30)).toContain('seconds');
    expect(estimateCrackTime(70)).toContain('Centuries');
    expect(estimateCrackTime(100)).toContain('Trillions');
  });
});

describe('calculatePassphraseEntropy', () => {
  it('calculates entropy based on wordlist size and options', () => {
    const bits4Words = calculatePassphraseEntropy(4, 250, true, false, false);
    const bits6Words = calculatePassphraseEntropy(6, 250, true, false, false);

    expect(bits4Words).toBeGreaterThan(30);
    expect(bits6Words).toBeGreaterThan(bits4Words);
  });

  it('adds bonus for number insertion and capitalization', () => {
    const base = calculatePassphraseEntropy(4, 250, true, false, false);
    const withExtras = calculatePassphraseEntropy(4, 250, true, true, true);

    expect(withExtras).toBeGreaterThan(base);
  });
});
