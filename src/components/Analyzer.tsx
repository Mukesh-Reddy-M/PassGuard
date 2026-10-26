/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId, useEffect } from 'react';
import { analyzePassword, AnalysisResult } from '../lib/analyzer.ts';
import { safeLog } from '../lib/safeLog.ts';
import StrengthMeter from './StrengthMeter.tsx';
import FindingsList from './FindingsList.tsx';
import { Eye, EyeOff, Trash2, ShieldAlert } from 'lucide-react';

export const Analyzer: React.FC = () => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputId = useId();

  // Run analysis in real-time
  const result: AnalysisResult = analyzePassword(password);

  // Safe logging of score & entropy metadata without ever recording the password
  useEffect(() => {
    if (password.length > 0) {
      safeLog({
        event: 'analysis_complete',
        score: result.score,
        entropyBits: result.entropy,
        findingsCount: result.findings.length,
      });
    }
  }, [password, result.score, result.entropy, result.findings.length]);

  const handleClear = () => {
    setPassword('');
    safeLog({ event: 'analysis_cleared' });
  };

  return (
    <div className="space-y-6">
      {/* Input container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-slate-200 flex items-center gap-2"
          >
            <span>Password to Inspect</span>
            <span className="text-xs text-slate-500 font-normal">
              (evaluated strictly in local memory)
            </span>
          </label>

          {password.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-800/80 transition-colors"
              aria-label="Clear password and analysis results"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Input box */}
        <div className="relative flex items-center">
          <input
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Type or paste any password to analyze patterns..."
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            data-lpignore="true"
            aria-describedby="password-format-hint"
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 font-mono text-sm sm:text-base pr-24 tracking-wide transition-all"
          />

          <div className="absolute right-2.5 flex items-center gap-1.5 text-slate-400">
            {password.length > 0 && (
              <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700/60">
                {password.length} {password.length === 1 ? 'char' : 'chars'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              aria-label={showPassword ? 'Hide password characters' : 'Show password characters'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <p id="password-format-hint" className="text-xs text-slate-500">
          Evaluates length, character classes, ~390 common breached passwords, leetspeak tricks, sequences, keyboard walks, and dates.
        </p>

        {/* Strength Meter summary */}
        {password.length > 0 && (
          <div className="pt-2">
            <StrengthMeter
              score={result.score}
              label={result.label}
              entropy={result.entropy}
              crackTime={result.crackTime}
              poolSize={result.poolSize}
            />
          </div>
        )}
      </div>

      {/* When empty vs when entered */}
      {password.length === 0 ? (
        <div className="border border-dashed border-slate-800 rounded-2xl p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400">
            <ShieldAlert className="w-6 h-6 text-slate-500" />
          </div>
          <h4 className="text-base font-medium text-slate-300">Ready to Inspect Password</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Begin typing above to see instant heuristic analysis, entropy calculations, and exact guidance on eliminating weak patterns.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6">
          <FindingsList findings={result.findings} checks={result.checks} />
        </div>
      )}
    </div>
  );
};

export default Analyzer;
