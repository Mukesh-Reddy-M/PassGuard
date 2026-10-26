/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { calculateEntropy, estimateCrackTime, estimateStructuralBits, EntropyResult } from './entropy.ts';
import { COMMON_PASSWORDS } from '../data/commonPasswords.ts';
import {
  detectCommonPassword,
  detectDatesAndYears,
  detectKeyboardWalks,
  detectRepeatedPatterns,
  detectSequences,
} from './patterns.ts';

export type StrengthScore = 0 | 1 | 2 | 3 | 4;
export type StrengthLabel = 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';

export interface Finding {
  id: string;
  type: 'critical' | 'warning' | 'info' | 'success';
  title: string;
  explanation: string;
  suggestion: string;
}

export interface SecurityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  critical?: boolean;
}

export interface AnalysisResult {
  score: StrengthScore;
  label: StrengthLabel;
  /** Effective entropy in bits after discounting predictable structure/patterns. */
  entropy: number;
  /** Naive length * log2(pool) bits, shown for transparency only. */
  rawEntropy: number;
  poolSize: number;
  crackTime: string;
  findings: Finding[];
  checks: SecurityCheckItem[];
  length: number;
  hasLower: boolean;
  hasUpper: boolean;
  hasDigits: boolean;
  hasSymbols: boolean;
}

const SCORE_LABELS: Record<StrengthScore, StrengthLabel> = {
  0: 'Very Weak',
  1: 'Weak',
  2: 'Fair',
  3: 'Strong',
  4: 'Very Strong',
};

/**
 * Pure function that analyzes a password string in real-time.
 * Checks length, character variety, common breached passwords,
 * leetspeak substitutions, repeated chunks, sequences, keyboard walks, and dates.
 * Returns score (0-4), label, entropy in bits, plain-English findings, and checks checklist.
 * Never stores, caches, or logs the input password.
 */
export function analyzePassword(password: string): AnalysisResult {
  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      entropy: 0,
      rawEntropy: 0,
      poolSize: 0,
      crackTime: 'Instant',
      findings: [
        {
          id: 'empty_input',
          type: 'info',
          title: 'Awaiting password input',
          explanation: 'Enter a password above or use the Generator tab to create a cryptographically secure one.',
          suggestion: 'A strong password should be at least 16 characters or a 4+ word passphrase.',
        },
      ],
      checks: [
        { id: 'min_8_chars', label: 'At least 8 characters', passed: false, critical: true },
        { id: 'min_12_chars', label: 'At least 12 characters (recommended)', passed: false },
        { id: 'min_16_chars', label: 'At least 16 characters (optimal)', passed: false },
        { id: 'has_lower', label: 'Lowercase letters (a-z)', passed: false },
        { id: 'has_upper', label: 'Uppercase letters (A-Z)', passed: false },
        { id: 'has_digits', label: 'Numbers (0-9)', passed: false },
        { id: 'has_symbols', label: 'Special symbols (!@#$...)', passed: false },
        { id: 'no_common_passwords', label: 'No common breached words', passed: true },
        { id: 'no_repeats', label: 'No repeating characters or chunks', passed: true },
        { id: 'no_sequences', label: 'No alphabetical or numerical sequences', passed: true },
        { id: 'no_keyboard_walks', label: 'No keyboard walks (e.g. qwerty, 1qaz)', passed: true },
        { id: 'no_dates', label: 'No predictable years or dates', passed: true },
      ],
      length: 0,
      hasLower: false,
      hasUpper: false,
      hasDigits: false,
      hasSymbols: false,
    };
  }

  const length = password.length;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  const entropyResult: EntropyResult = calculateEntropy(password);

  const findings: Finding[] = [];

  // 1. Length evaluations
  if (length < 8) {
    findings.push({
      id: 'length_under_8',
      type: 'critical',
      title: 'Dangerously short length',
      explanation: 'Passwords under 8 characters can be completely brute-forced in seconds to minutes by modern GPU clusters, regardless of symbol complexity.',
      suggestion: 'Expand your password to at least 12-16 characters or switch to a multi-word passphrase.',
    });
  } else if (length < 12) {
    findings.push({
      id: 'length_under_12',
      type: 'warning',
      title: 'Short length (< 12 characters)',
      explanation: 'While 8-11 characters resist casual guessing, offline hashes with fast algorithms (MD5, SHA256) are easily cracked at this length.',
      suggestion: 'Add 4 or more additional characters to reach the recommended 12+ character threshold.',
    });
  } else if (length >= 16) {
    findings.push({
      id: 'length_optimal',
      type: 'success',
      title: 'Excellent length (16+ characters)',
      explanation: 'Length is the single most powerful factor against brute-force attacks, exponentially multiplying the computational search space.',
      suggestion: 'Maintain this length across your critical master accounts.',
    });
  }

  // 2. Common password and leetspeak detection
  const commonMatch = detectCommonPassword(password);
  if (commonMatch.matched) {
    if (commonMatch.type === 'exact') {
      findings.push({
        id: 'common_exact',
        type: 'critical',
        title: 'Known breached password detected',
        explanation: 'This exact password appears in public credential dumps and is tested first by every automated dictionary tool.',
        suggestion: 'Never use common dictionary words. Choose random unrelated words or generate a cryptographically strong string.',
      });
    } else if (commonMatch.type === 'leetspeak') {
      findings.push({
        id: 'common_leetspeak',
        type: 'critical',
        title: 'Predictable leetspeak substitution',
        explanation: `Simple symbol swaps (like '@' for 'a' or '0' for 'o') are standard permutations included in modern cracking dictionaries like Hashcat.`,
        suggestion: 'Avoid spelling out words with substitution tricks; use truly random characters or a long passphrase.',
      });
    } else if (commonMatch.type === 'affix') {
      findings.push({
        id: 'common_affix',
        type: 'warning',
        title: 'Common word with simple suffix or prefix',
        explanation: 'Combining a common word with simple trailing numbers or exclamation marks (e.g. "password123", "Summer2024!") is the most common pattern in leaked databases.',
        suggestion: 'Remove common base words entirely instead of just tacking numbers onto the end.',
      });
    }
  }

  // 3. Repeated characters, chunks, and mirrored patterns
  const repeatMatch = detectRepeatedPatterns(password);
  if (repeatMatch.found) {
    if (repeatMatch.type === 'single_char') {
      findings.push({
        id: 'repeated_chars',
        type: 'warning',
        title: 'Repeated identical characters',
        explanation: 'Consecutive identical characters drastically reduce the effective information entropy of your password.',
        suggestion: 'Avoid repeating the same key multiple times consecutively.',
      });
    } else if (repeatMatch.type === 'chunk') {
      findings.push({
        id: 'repeated_chunks',
        type: 'warning',
        title: 'Repeated substring pattern',
        explanation: 'Repeating syllables or chunks gives attackers repetitive pattern shortcuts that bypass brute-force entropy.',
        suggestion: 'Replace duplicate chunks with varied, non-repeating characters.',
      });
    } else if (repeatMatch.type === 'mirrored') {
      findings.push({
        id: 'mirrored_pattern',
        type: 'warning',
        title: 'Symmetrical / mirrored pattern',
        explanation: 'Mirrored or palindromic passwords have only half the effective entropy of a genuinely random sequence.',
        suggestion: 'Use an asymmetrical arrangement of words or characters.',
      });
    }
  }

  // 4. Sequential characters
  const seqMatch = detectSequences(password);
  if (seqMatch.found) {
    findings.push({
      id: 'sequential_characters',
      type: 'warning',
      title: `Sequential ${seqMatch.kind === 'numeric' ? 'numbers' : 'alphabet letters'} detected`,
      explanation: `Ascending or descending runs (like "${seqMatch.sequence}") are anticipated by password auditing tools and cracked instantly.`,
      suggestion: 'Avoid sequential progressions. Mix characters with random non-linear jumps.',
    });
  }

  // 5. Keyboard walks
  const walkMatch = detectKeyboardWalks(password);
  if (walkMatch.found) {
    findings.push({
      id: 'keyboard_walk',
      type: 'warning',
      title: 'Physical keyboard walk detected',
      explanation: `Patterns traced across keyboard keys (e.g. "${walkMatch.walk}") are among the first rule masks tested by password cracking algorithms.`,
      suggestion: 'Pick characters from disconnected keyboard rows and columns without directional walks.',
    });
  }

  // 6. Dates and years
  const dateMatch = detectDatesAndYears(password);
  if (dateMatch.found) {
    findings.push({
      id: 'date_or_year',
      type: 'warning',
      title: dateMatch.kind === 'date' ? 'Date format detected' : 'Calendar year detected',
      explanation: 'Dates, birth years, and current years are routinely scraped from public social media profiles to breach user accounts.',
      suggestion: 'Never include personal birthdates, anniversary years, or current calendar years.',
    });
  }

  // 7. Character variety
  const varietyCount =
    (hasLower ? 1 : 0) + (hasUpper ? 1 : 0) + (hasDigits ? 1 : 0) + (hasSymbols ? 1 : 0);

  if (varietyCount <= 1 && length >= 8) {
    findings.push({
      id: 'low_variety',
      type: 'warning',
      title: 'Limited character set',
      explanation: 'Using only a single character category (e.g. only lowercase letters) keeps the search pool small.',
      suggestion: 'Incorporate uppercase letters, numbers, and symbols to enlarge the character pool.',
    });
  } else if (varietyCount >= 4 && length >= 12) {
    findings.push({
      id: 'diverse_charset',
      type: 'success',
      title: 'Full character diversity',
      explanation: 'Your password includes lowercase, uppercase, digits, and special symbols, forcing an 95-character search space.',
      suggestion: 'Keep combining diverse character classes when using random passwords.',
    });
  }

  // Effective entropy: start from the structure-aware estimate, then discount
  // anything an attacker would guess from a dictionary / pattern list.
  const charBits = entropyResult.poolSize > 1 ? Math.log2(entropyResult.poolSize) : 0;
  const commonBits = Math.log2(COMMON_PASSWORDS.size);
  let effectiveBits = estimateStructuralBits(password);

  // 1) Discount predictable segments (each applied to the structural estimate)
  if (walkMatch.found && walkMatch.walk) {
    const walkLen = Array.from(walkMatch.walk).length;
    effectiveBits = Math.min(effectiveBits, Math.max(0, effectiveBits - walkLen * charBits + 8));
  }
  if (dateMatch.found && dateMatch.match) {
    const dateLen = Array.from(dateMatch.match).length;
    const dateBits = dateMatch.kind === 'year' ? 7 : 14;
    effectiveBits = Math.min(effectiveBits, Math.max(0, effectiveBits - dateLen * charBits + dateBits));
  }

  // 2) Dictionary hits cap the whole password at "pick a word (+ small tweak)".
  //    These are caps, not further subtractions, so discounts never double-count.
  if (commonMatch.matched) {
    if (commonMatch.type === 'exact') {
      effectiveBits = Math.min(effectiveBits, commonBits);
    } else if (commonMatch.type === 'leetspeak') {
      effectiveBits = Math.min(effectiveBits, commonBits + 3);
    } else if (commonMatch.type === 'affix') {
      effectiveBits = Math.min(effectiveBits, commonBits + 14);
    }
  }
  effectiveBits = Math.min(Math.round(effectiveBits * 10) / 10, entropyResult.bits);

  // Security Checklist
  const checks: SecurityCheckItem[] = [
    { id: 'min_8_chars', label: 'At least 8 characters', passed: length >= 8, critical: true },
    { id: 'min_12_chars', label: 'At least 12 characters (recommended)', passed: length >= 12 },
    { id: 'min_16_chars', label: 'At least 16 characters (optimal)', passed: length >= 16 },
    { id: 'has_lower', label: 'Lowercase letters (a-z)', passed: hasLower },
    { id: 'has_upper', label: 'Uppercase letters (A-Z)', passed: hasUpper },
    { id: 'has_digits', label: 'Numbers (0-9)', passed: hasDigits },
    { id: 'has_symbols', label: 'Special symbols (!@#$...)', passed: hasSymbols },
    { id: 'no_common_passwords', label: 'No common breached words', passed: !commonMatch.matched },
    { id: 'no_repeats', label: 'No repeating characters or chunks', passed: !repeatMatch.found },
    { id: 'no_sequences', label: 'No alphabetical or numerical sequences', passed: !seqMatch.found },
    { id: 'no_keyboard_walks', label: 'No keyboard walks (e.g. qwerty, 1qaz)', passed: !walkMatch.found },
    { id: 'no_dates', label: 'No predictable years or dates', passed: !dateMatch.found },
  ];

  // Scoring logic
  let score: StrengthScore = 0;

  if (length < 8) {
    score = 0;
  } else if (commonMatch.matched && (commonMatch.type === 'exact' || commonMatch.type === 'leetspeak')) {
    score = 0;
  } else {
    // Base score by length
    let points = 0;
    if (length >= 8) points = 1;
    if (length >= 12) points = 2;
    if (length >= 16) points = 3;
    if (length >= 20) points = 4;

    // Adjust for variety
    if (varietyCount >= 3 && points >= 1) {
      points += 1;
    }
    if (varietyCount === 1 && points > 1) {
      points -= 1;
    }

    // Adjust for entropy bits
    if (effectiveBits < 32) {
      points = Math.min(points, 1);
    } else if (effectiveBits < 48) {
      points = Math.min(points, 2);
    } else if (effectiveBits >= 75 && varietyCount >= 2 && length >= 16) {
      points = Math.max(points, 4);
    }

    // Deductions for pattern flaws
    if (commonMatch.matched && commonMatch.type === 'affix') {
      points = Math.min(points, 1);
    }
    if (repeatMatch.found) {
      points -= 1;
    }
    if (seqMatch.found) {
      points -= 1;
    }
    if (walkMatch.found) {
      points -= 1;
    }
    if (dateMatch.found) {
      points -= 1;
    }

    // Clamp score to 0..4
    const clamped = Math.max(0, Math.min(4, points));
    score = clamped as StrengthScore;
  }

  return {
    score,
    label: SCORE_LABELS[score],
    entropy: effectiveBits,
    rawEntropy: entropyResult.bits,
    poolSize: entropyResult.poolSize,
    crackTime: estimateCrackTime(effectiveBits),
    findings,
    checks,
    length,
    hasLower,
    hasUpper,
    hasDigits,
    hasSymbols,
  };
}
