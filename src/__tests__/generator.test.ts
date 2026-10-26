/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  generateRandomPassword,
  generatePassphrase,
  getSecureRandomInt,
} from '../lib/generator.ts';

describe('getSecureRandomInt', () => {
  it('returns integers in the range [0, max - 1]', () => {
    for (let i = 0; i < 100; i++) {
      const val = getSecureRandomInt(10);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(10);
    }
  });
});

describe('generateRandomPassword', () => {
  it('generates passwords of requested lengths', () => {
    const lengths = [8, 12, 16, 24, 32, 64];
    for (const len of lengths) {
      const pwd = generateRandomPassword({
        length: len,
        includeLower: true,
        includeUpper: true,
        includeDigits: true,
        includeSymbols: true,
        excludeAmbiguous: false,
      });
      expect(pwd.length).toBe(len);
    }
  });

  it('guarantees each enabled character set is present', () => {
    for (let trial = 0; trial < 50; trial++) {
      const pwd = generateRandomPassword({
        length: 16,
        includeLower: true,
        includeUpper: true,
        includeDigits: true,
        includeSymbols: true,
        excludeAmbiguous: false,
      });

      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
      expect(/[^a-zA-Z0-9]/.test(pwd)).toBe(true);
    }
  });

  it('never contains ambiguous characters when excludeAmbiguous is true', () => {
    const ambiguousChars = ['0', 'O', 'l', '1', 'I'];
    for (let trial = 0; trial < 50; trial++) {
      const pwd = generateRandomPassword({
        length: 32,
        includeLower: true,
        includeUpper: true,
        includeDigits: true,
        includeSymbols: true,
        excludeAmbiguous: true,
      });

      for (const ch of ambiguousChars) {
        expect(pwd.includes(ch)).toBe(false);
      }
    }
  });

  it('generates 1000 unique passwords without collisions (randomness sanity)', () => {
    const generatedSet = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      const pwd = generateRandomPassword({
        length: 16,
        includeLower: true,
        includeUpper: true,
        includeDigits: true,
        includeSymbols: true,
        excludeAmbiguous: false,
      });
      generatedSet.add(pwd);
    }

    expect(generatedSet.size).toBe(count);
  });
});

describe('generatePassphrase', () => {
  it('generates the specified number of words and separator', () => {
    const pass = generatePassphrase({
      wordCount: 4,
      separator: '-',
      casing: 'lowercase',
      includeNumber: false,
    });

    const parts = pass.split('-');
    expect(parts.length).toBe(4);
    expect(parts.every((p) => p.length > 0)).toBe(true);
  });

  it('handles custom separators', () => {
    const pass = generatePassphrase({
      wordCount: 5,
      separator: '#',
      casing: 'lowercase',
      includeNumber: false,
    });

    expect(pass.split('#').length).toBe(5);
  });

  it('respects casing options', () => {
    const passTitle = generatePassphrase({
      wordCount: 3,
      separator: '.',
      casing: 'titlecase',
      includeNumber: false,
    });
    for (const word of passTitle.split('.')) {
      expect(word[0]).toBe(word[0].toUpperCase());
    }

    const passUpper = generatePassphrase({
      wordCount: 3,
      separator: '_',
      casing: 'uppercase',
      includeNumber: false,
    });
    expect(passUpper).toBe(passUpper.toUpperCase());
  });

  it('appends a number when includeNumber is true', () => {
    const pass = generatePassphrase({
      wordCount: 4,
      separator: '-',
      casing: 'lowercase',
      includeNumber: true,
    });

    expect(/\d/.test(pass)).toBe(true);
  });
});
