/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { analyzePassword } from '../lib/analyzer.ts';

describe('analyzePassword', () => {
  it('handles empty input gracefully', () => {
    const res = analyzePassword('');
    expect(res.score).toBe(0);
    expect(res.label).toBe('Very Weak');
    expect(res.entropy).toBe(0);
    expect(res.findings.length).toBeGreaterThan(0);
  });

  it('marks passwords under 8 characters as Very Weak with critical finding', () => {
    const res = analyzePassword('Ab1!');
    expect(res.score).toBe(0);
    expect(res.label).toBe('Very Weak');
    const critical = res.findings.find((f) => f.id === 'length_under_8');
    expect(critical).toBeDefined();
    expect(critical?.type).toBe('critical');
    expect(critical?.explanation).toBeTruthy();
    expect(critical?.suggestion).toBeTruthy();
  });

  it('flags known breached passwords with score 0', () => {
    const res = analyzePassword('password');
    expect(res.score).toBe(0);
    expect(res.label).toBe('Very Weak');
    const commonFinding = res.findings.find((f) => f.id === 'common_exact');
    expect(commonFinding).toBeDefined();
    expect(commonFinding?.type).toBe('critical');
  });

  it('flags leetspeak variations with critical finding', () => {
    const res = analyzePassword('p@ssw0rd');
    expect(res.score).toBe(0);
    const leetFinding = res.findings.find((f) => f.id === 'common_leetspeak');
    expect(leetFinding).toBeDefined();
  });

  it('flags common passwords with trailing numbers (Summer2024)', () => {
    const res = analyzePassword('Summer2024');
    expect(res.score).toBeLessThanOrEqual(1);
    const affixFinding = res.findings.find((f) => f.id === 'common_affix');
    expect(affixFinding).toBeDefined();
  });

  it('scores long, high-entropy passwords as Strong or Very Strong', () => {
    const res = analyzePassword('vK9#mQ2$zL8*pT4!wX7&');
    expect(res.score).toBeGreaterThanOrEqual(3);
    expect(res.entropy).toBeGreaterThan(70);
    expect(res.checks.find((c) => c.id === 'min_16_chars')?.passed).toBe(true);
    expect(res.checks.find((c) => c.id === 'has_symbols')?.passed).toBe(true);
  });

  it('verifies all 12 checklist criteria exist', () => {
    const res = analyzePassword('SampleTestPass123!');
    expect(res.checks.length).toBe(12);
    expect(res.checks.every((c) => typeof c.passed === 'boolean')).toBe(true);
  });
});
