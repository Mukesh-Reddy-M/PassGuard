/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  detectCommonPassword,
  detectRepeatedPatterns,
  detectSequences,
  detectKeyboardWalks,
  detectDatesAndYears,
  normalizeLeetspeak,
} from '../lib/patterns.ts';

describe('normalizeLeetspeak', () => {
  it('substitutes standard leet characters to lowercase letters', () => {
    expect(normalizeLeetspeak('p@ssw0rd')).toBe('password');
    expect(normalizeLeetspeak('3l3ph4nt')).toBe('elephant');
    expect(normalizeLeetspeak('h3ll0')).toBe('hello');
  });
});

describe('detectCommonPassword', () => {
  it('detects exact common breached passwords', () => {
    expect(detectCommonPassword('123456').matched).toBe(true);
    expect(detectCommonPassword('password').matched).toBe(true);
    expect(detectCommonPassword('admin').matched).toBe(true);
    expect(detectCommonPassword('dragon').matched).toBe(true);
    expect(detectCommonPassword('qwerty').matched).toBe(true);
  });

  it('detects case-insensitive common passwords', () => {
    expect(detectCommonPassword('PaSswOrD').matched).toBe(true);
    expect(detectCommonPassword('ADMIN').matched).toBe(true);
  });

  it('detects leetspeak substitutions of common passwords', () => {
    const res = detectCommonPassword('p@ssw0rd');
    expect(res.matched).toBe(true);
    expect(res.type).toBe('leetspeak');

    const res2 = detectCommonPassword('P@55w0rd');
    expect(res2.matched).toBe(true);
  });

  it('detects common words with trailing digits or affixes', () => {
    const res1 = detectCommonPassword('password123');
    expect(res1.matched).toBe(true);
    expect(res1.type).toBe('affix');

    const res2 = detectCommonPassword('Summer2024');
    expect(res2.matched).toBe(true);
    expect(res2.type).toBe('affix');

    const res3 = detectCommonPassword('admin99');
    expect(res3.matched).toBe(true);
    expect(res3.type).toBe('affix');
  });

  it('does not flag secure random strings', () => {
    expect(detectCommonPassword('kX9#mP2$vL8@qW4!').matched).toBe(false);
    expect(detectCommonPassword('unrelated-cryptic-phrase').matched).toBe(false);
  });
});

describe('detectRepeatedPatterns', () => {
  it('detects 3+ consecutive identical characters', () => {
    const res = detectRepeatedPatterns('aaaapassword');
    expect(res.found).toBe(true);
    expect(res.type).toBe('single_char');

    const res2 = detectRepeatedPatterns('1111189');
    expect(res2.found).toBe(true);
    expect(res2.type).toBe('single_char');
  });

  it('detects repeated chunks and syllables', () => {
    const res = detectRepeatedPatterns('abcabcabc');
    expect(res.found).toBe(true);
    expect(res.type).toBe('chunk');

    const res2 = detectRepeatedPatterns('testtest');
    expect(res2.found).toBe(true);
    expect(res2.type).toBe('chunk');

    const res3 = detectRepeatedPatterns('121212');
    expect(res3.found).toBe(true);
    expect(res3.type).toBe('chunk');
  });

  it('detects mirrored patterns / palindromes', () => {
    const res = detectRepeatedPatterns('123321');
    expect(res.found).toBe(true);
    expect(res.type).toBe('mirrored');

    const res2 = detectRepeatedPatterns('radar');
    expect(res2.found).toBe(true);
    expect(res2.type).toBe('mirrored');
  });

  it('returns false for non-repeating characters', () => {
    expect(detectRepeatedPatterns('kX9#mP2$vL8').found).toBe(false);
  });
});

describe('detectSequences', () => {
  it('detects ascending and descending numerical sequences', () => {
    const asc = detectSequences('pass1234word');
    expect(asc.found).toBe(true);
    expect(asc.kind).toBe('numeric');
    expect(asc.direction).toBe('ascending');

    const desc = detectSequences('code9876safe');
    expect(desc.found).toBe(true);
    expect(desc.kind).toBe('numeric');
    expect(desc.direction).toBe('descending');
  });

  it('detects ascending and descending alphabetical sequences', () => {
    const asc = detectSequences('myabcdcode');
    expect(asc.found).toBe(true);
    expect(asc.kind).toBe('alpha');
    expect(asc.direction).toBe('ascending');

    const desc = detectSequences('myfedccode');
    expect(desc.found).toBe(true);
    expect(desc.kind).toBe('alpha');
    expect(desc.direction).toBe('descending');
  });

  it('returns false when no sequence is present', () => {
    expect(detectSequences('p9x2m8q4').found).toBe(false);
  });
});

describe('detectKeyboardWalks', () => {
  it('detects horizontal keyboard row walks', () => {
    expect(detectKeyboardWalks('qwerty').found).toBe(true);
    expect(detectKeyboardWalks('asdfgh').found).toBe(true);
    expect(detectKeyboardWalks('zxcvbn').found).toBe(true);
    expect(detectKeyboardWalks('poiuy').found).toBe(true);
  });

  it('detects vertical / diagonal keyboard walks', () => {
    expect(detectKeyboardWalks('1qaz2wsx').found).toBe(true);
    expect(detectKeyboardWalks('qazwsx').found).toBe(true);
    expect(detectKeyboardWalks('1qaz').found).toBe(true);
    expect(detectKeyboardWalks('zaq1').found).toBe(true);
  });

  it('returns false for non-walk characters', () => {
    expect(detectKeyboardWalks('b8k3p9').found).toBe(false);
  });
});

describe('detectDatesAndYears', () => {
  it('detects standalone or embedded calendar years', () => {
    const res1 = detectDatesAndYears('secret1990');
    expect(res1.found).toBe(true);
    expect(res1.kind).toBe('year');

    const res2 = detectDatesAndYears('Pass2024!');
    expect(res2.found).toBe(true);
    expect(res2.kind).toBe('year');
  });

  it('detects formatted date strings', () => {
    const res1 = detectDatesAndYears('12/05/1999');
    expect(res1.found).toBe(true);
    expect(res1.kind).toBe('date');

    const res2 = detectDatesAndYears('2024-10-25');
    expect(res2.found).toBe(true);
    expect(res2.kind).toBe('date');
  });

  it('detects compact date numbers', () => {
    const res = detectDatesAndYears('01011990');
    expect(res.found).toBe(true);
  });

  it('returns false when no date or year is present', () => {
    expect(detectDatesAndYears('hello-world-guard').found).toBe(false);
  });
});
