/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  generateRandomPassword,
  generatePassphrase,
  estimateRandomPasswordEntropy,
  estimatePassphraseEntropy,
  MIN_PASSPHRASE_WORDS,
  MAX_PASSPHRASE_WORDS,
  RandomPasswordOptions,
  PassphraseOptions,
  PassphraseCasing,
} from '../lib/generator.ts';
import { analyzePassword, AnalysisResult, StrengthLabel } from '../lib/analyzer.ts';
import { scoreFromBits, estimateCrackTime } from '../lib/entropy.ts';
import { safeLog } from '../lib/safeLog.ts';
import { WORDLIST } from '../data/wordlist.ts';
import StrengthMeter from './StrengthMeter.tsx';
import { RefreshCw, Copy, Check, Eye, EyeOff, Sparkles, Clock, AlertCircle } from 'lucide-react';

interface GeneratorProps {
  onNotify?: (message: string) => void;
}

const WORDLIST_SIZE = WORDLIST.length;

export const Generator: React.FC<GeneratorProps> = ({ onNotify }) => {
  const [mode, setMode] = useState<'random' | 'passphrase'>('random');

  // Random options
  const [randomOptions, setRandomOptions] = useState<RandomPasswordOptions>({
    length: 18,
    includeLower: true,
    includeUpper: true,
    includeDigits: true,
    includeSymbols: true,
    excludeAmbiguous: true,
  });

  // Passphrase options
  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>({
    wordCount: 6,
    separator: '-',
    casing: 'titlecase',
    includeNumber: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyCountdown, setCopyCountdown] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCopiedPasswordRef = useRef<string>('');

  const enabledTypeCount = [
    randomOptions.includeLower,
    randomOptions.includeUpper,
    randomOptions.includeDigits,
    randomOptions.includeSymbols,
  ].filter(Boolean).length;

  // Generate password function
  const regenerate = useCallback(() => {
    let result = '';
    try {
      result = mode === 'random'
        ? generateRandomPassword(randomOptions)
        : generatePassphrase(passphraseOptions);
      setGenerationError(null);
    } catch (err) {
      setGeneratedPassword('');
      setGenerationError(err instanceof Error ? err.message : 'Unable to generate a password.');
      return;
    }
    setGeneratedPassword(result);
    setCopied(false);

    const bits = mode === 'random'
      ? estimateRandomPasswordEntropy(randomOptions)
      : estimatePassphraseEntropy(passphraseOptions);
    safeLog({
      event: 'generator_generated',
      generatorMode: mode,
      length: result.length,
      wordCount: mode === 'passphrase' ? passphraseOptions.wordCount : undefined,
      score: scoreFromBits(bits),
      entropyBits: bits,
    });
  }, [mode, randomOptions, passphraseOptions]);

  // Initial generation
  useEffect(() => {
    regenerate();
  }, [regenerate]);

  // Handle clipboard copy with 30-second auto-clear
  const handleCopy = async () => {
    if (!generatedPassword) return;

    try {
      await navigator.clipboard.writeText(generatedPassword);
      lastCopiedPasswordRef.current = generatedPassword;
      setCopied(true);
      setCopyCountdown(30);

      safeLog({ event: 'clipboard_copied', autoClearSeconds: 30 });
      if (onNotify) {
        onNotify('Password copied to clipboard. Auto-clearing in 30 seconds.');
      }

      // Reset any existing timers
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      // Countdown interval for user feedback
      countdownIntervalRef.current = setInterval(() => {
        setCopyCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto clear after 30 seconds (best effort)
      clearTimerRef.current = setTimeout(async () => {
        try {
          // If possible, read clipboard or overwrite with empty space
          await navigator.clipboard.writeText('');
        } catch {
          // Ignore clipboard permission blocks in background
        }
        setCopied(false);
        setCopyCountdown(null);
        safeLog({ event: 'clipboard_cleared' });
        if (onNotify) {
          onNotify('Clipboard cleared for security.');
        }
      }, 30000);
    } catch {
      // Fallback manual selection
      if (onNotify) {
        onNotify('Unable to access clipboard directly. Please copy manually.');
      }
    }
  };

  // Immediate clipboard clearance
  const handleClearClipboardNow = async () => {
    try {
      await navigator.clipboard.writeText('');
    } catch {
      // Best effort
    }
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCopied(false);
    setCopyCountdown(null);
    safeLog({ event: 'clipboard_cleared' });
    if (onNotify) {
      onNotify('Clipboard cleared now.');
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Generated secrets are random, so their strength comes from the generator's
  // true entropy (the wordlist size matters for passphrases), not from pattern
  // heuristics that would count each character of a passphrase as random.
  const trueBits = mode === 'random'
    ? estimateRandomPasswordEntropy(randomOptions)
    : estimatePassphraseEntropy(passphraseOptions);
  const patternCheck: AnalysisResult = analyzePassword(generatedPassword);
  const SCORE_LABELS: StrengthLabel[] = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const strengthScore = generatedPassword
    ? (Math.min(scoreFromBits(trueBits), mode === 'random' ? patternCheck.score + 1 : 4) as 0 | 1 | 2 | 3 | 4)
    : 0;
  const analysis = {
    score: strengthScore,
    label: SCORE_LABELS[strengthScore],
    entropy: generatedPassword ? trueBits : 0,
    crackTime: estimateCrackTime(generatedPassword ? trueBits : 0),
    poolSize: mode === 'random' ? patternCheck.poolSize : 0,
  };

  return (
    <div className="space-y-6">
      {/* Mode selection tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setMode('random')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            mode === 'random'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Random Character String</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('passphrase')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
            mode === 'passphrase'
              ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>Multi-Word Passphrase</span>
        </button>
      </div>

      {generationError && (
        <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{generationError}</span>
        </div>
      )}

      {/* Generated output box */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300 uppercase tracking-wider">
            Generated Secure Password
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-slate-400">
              {generatedPassword.length} characters
            </span>
          </div>
        </div>

        {/* Display banner */}
        <div className="relative flex items-center bg-slate-950 border border-slate-700/80 rounded-xl p-4">
          <div className="font-mono text-base sm:text-lg text-cyan-200 break-all select-all flex-1 tracking-wide pr-2">
            {showPassword ? generatedPassword : '•'.repeat(generatedPassword.length)}
          </div>

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors shrink-0 ml-2"
            aria-label={showPassword ? 'Hide generated password' : 'Show generated password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={regenerate}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-100 text-xs sm:text-sm font-semibold border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              copied
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-sm'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Password'}</span>
          </button>

          {copied && copyCountdown !== null && (
            <div className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-2 text-xs text-slate-400 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800">
              <span className="flex items-center gap-1 text-emerald-400 font-mono tabular-nums">
                <Clock className="w-3.5 h-3.5" />
                <span>Auto-clears clipboard in {copyCountdown}s</span>
              </span>
              <button
                type="button"
                onClick={handleClearClipboardNow}
                className="text-[11px] underline text-slate-400 hover:text-rose-400 ml-2"
              >
                Clear now
              </button>
            </div>
          )}
        </div>

        {/* Strength analysis of generated string */}
        <div className="pt-3 border-t border-slate-800/80">
          <StrengthMeter
            score={analysis.score}
            label={analysis.label}
            entropy={analysis.entropy}
            crackTime={analysis.crackTime}
            poolSize={analysis.poolSize}
          />
        </div>
      </div>

      {/* Generator Configuration Options */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-200">
          {mode === 'random' ? 'Random Mode Parameters' : 'Passphrase Parameters'}
        </h3>

        {mode === 'random' ? (
          <div className="space-y-4">
            {/* Length slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs sm:text-sm">
                <label htmlFor="random-length-slider" className="font-medium text-slate-300">
                  Password Length: <span className="font-mono text-cyan-300 font-bold">{randomOptions.length} characters</span>
                </label>
                <span className="text-xs text-slate-500">8 to 64 chars</span>
              </div>
              <input
                id="random-length-slider"
                type="range"
                min="8"
                max="64"
                value={randomOptions.length}
                onChange={(e) =>
                  setRandomOptions({ ...randomOptions, length: parseInt(e.target.value, 10) })
                }
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            {/* Character Set Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={randomOptions.includeLower}
                  disabled={randomOptions.includeLower && enabledTypeCount === 1}
                  onChange={(e) =>
                    setRandomOptions({ ...randomOptions, includeLower: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  <strong className="block text-slate-100 font-medium">Lowercase Letters</strong>
                  <span>a-z (26 characters)</span>
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={randomOptions.includeUpper}
                  disabled={randomOptions.includeUpper && enabledTypeCount === 1}
                  onChange={(e) =>
                    setRandomOptions({ ...randomOptions, includeUpper: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  <strong className="block text-slate-100 font-medium">Uppercase Letters</strong>
                  <span>A-Z (26 characters)</span>
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={randomOptions.includeDigits}
                  disabled={randomOptions.includeDigits && enabledTypeCount === 1}
                  onChange={(e) =>
                    setRandomOptions({ ...randomOptions, includeDigits: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  <strong className="block text-slate-100 font-medium">Numbers</strong>
                  <span>0-9 (10 characters)</span>
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={randomOptions.includeSymbols}
                  disabled={randomOptions.includeSymbols && enabledTypeCount === 1}
                  onChange={(e) =>
                    setRandomOptions({ ...randomOptions, includeSymbols: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  <strong className="block text-slate-100 font-medium">Special Symbols</strong>
                  <span>!@#$%^&amp;*()_+-=...</span>
                </span>
              </label>
            </div>

            {/* Avoid ambiguous */}
            <div className="pt-2">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={randomOptions.excludeAmbiguous}
                  onChange={(e) =>
                    setRandomOptions({ ...randomOptions, excludeAmbiguous: e.target.checked })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  <strong className="block text-slate-100 font-medium">
                    Exclude Ambiguous Characters
                  </strong>
                  <span>Omit visually confusing characters: 0, O, l, 1, I</span>
                </span>
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Word count slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5 text-xs sm:text-sm">
                <label htmlFor="passphrase-words-slider" className="font-medium text-slate-300">
                  Word Count: <span className="font-mono text-cyan-300 font-bold">{passphraseOptions.wordCount} words</span>
                </label>
                <span className="text-xs text-slate-500">{MIN_PASSPHRASE_WORDS} to {MAX_PASSPHRASE_WORDS} words</span>
              </div>
              <input
                id="passphrase-words-slider"
                type="range"
                min={MIN_PASSPHRASE_WORDS}
                max={MAX_PASSPHRASE_WORDS}
                value={passphraseOptions.wordCount}
                onChange={(e) =>
                  setPassphraseOptions({
                    ...passphraseOptions,
                    wordCount: parseInt(e.target.value, 10),
                  })
                }
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>

            <p className="text-xs text-slate-500">
              Each word adds about {Math.log2(WORDLIST_SIZE).toFixed(1)} bits. Use 6+ words for a strong passphrase.
            </p>

            {/* Separator and casing selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label htmlFor="separator-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Word Separator
                </label>
                <select
                  id="separator-select"
                  value={passphraseOptions.separator}
                  onChange={(e) =>
                    setPassphraseOptions({ ...passphraseOptions, separator: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="-">Hyphen (-)</option>
                  <option value="_">Underscore (_)</option>
                  <option value=".">Period (.)</option>
                  <option value=" ">Space ( )</option>
                  <option value="#">Hash (#)</option>
                  <option value="+">Plus (+)</option>
                </select>
              </div>

              <div>
                <label htmlFor="casing-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Word Capitalization
                </label>
                <select
                  id="casing-select"
                  value={passphraseOptions.casing}
                  onChange={(e) =>
                    setPassphraseOptions({
                      ...passphraseOptions,
                      casing: e.target.value as PassphraseCasing,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="titlecase">Title Case (e.g. Correct-Horse-Battery)</option>
                  <option value="lowercase">lowercase (e.g. correct-horse-battery)</option>
                  <option value="uppercase">UPPERCASE (e.g. CORRECT-HORSE-BATTERY)</option>
                </select>
              </div>
            </div>

            {/* Include number */}
            <div className="pt-1">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 cursor-pointer hover:bg-slate-950 transition-colors">
                <input
                  type="checkbox"
                  checked={passphraseOptions.includeNumber}
                  onChange={(e) =>
                    setPassphraseOptions({
                      ...passphraseOptions,
                      includeNumber: e.target.checked,
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40 w-4 h-4"
                />
                <span className="text-xs text-slate-300">
                  <strong className="block text-slate-100 font-medium">Include Random Number</strong>
                  <span>Appends a random digit (0-9) to satisfy strict legacy website requirements</span>
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Cryptographic notice */}
        <div className="flex items-start gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-800/80">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            Entropy generated strictly via <code className="text-cyan-400 font-mono">crypto.getRandomValues</code> using rejection sampling to guarantee zero modulo bias.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Generator;
