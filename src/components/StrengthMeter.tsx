/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StrengthScore, StrengthLabel } from '../lib/analyzer.ts';

interface StrengthMeterProps {
  score: StrengthScore;
  label: StrengthLabel;
  entropy: number;
  crackTime: string;
  poolSize?: number;
}

const SCORE_COLORS: Record<StrengthScore, { bar: string; text: string; bg: string }> = {
  0: { bar: 'bg-rose-500', text: 'text-rose-400', bg: 'bg-rose-950/40 border-rose-500/30' },
  1: { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30' },
  2: { bar: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-950/40 border-amber-500/30' },
  3: { bar: 'bg-emerald-500', text: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30' },
  4: { bar: 'bg-cyan-400', text: 'text-cyan-300', bg: 'bg-cyan-950/40 border-cyan-500/30' },
};

export const StrengthMeter: React.FC<StrengthMeterProps> = ({
  score,
  label,
  entropy,
  crackTime,
  poolSize = 0,
}) => {
  const currentTheme = SCORE_COLORS[score];

  return (
    <div className="w-full space-y-3.5" role="region" aria-label="Password strength analysis summary">
      {/* Top summary row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
            Strength Level:
          </span>
          <span
            className={`text-sm sm:text-base font-bold ${currentTheme.text}`}
            aria-live="polite"
            id="strength-status-label"
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400 tabular-nums">
          <span title="Information entropy in Shannon bits">
            <span className="text-slate-500">Entropy:</span>{' '}
            <strong className="text-slate-200 font-mono">{entropy.toFixed(1)} bits</strong>
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          {poolSize > 0 && (
            <>
              <span title="Theoretical pool size based on character variety">
                <span className="text-slate-500">Pool:</span>{' '}
                <strong className="text-slate-200 font-mono">{poolSize} chars</strong>
              </span>
              <span aria-hidden="true" className="text-slate-700">·</span>
            </>
          )}
          <span title="Estimated offline brute-force time assuming 10 billion guesses/sec">
            <span className="text-slate-500">Crack Time:</span>{' '}
            <strong className="text-slate-200">{crackTime}</strong>
          </span>
        </div>
      </div>

      {/* 5-segment strength bar */}
      <div
        className="grid grid-cols-5 gap-1.5 h-2.5 w-full bg-slate-900/60 p-1 rounded-md border border-slate-800"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-labelledby="strength-status-label"
      >
        {[0, 1, 2, 3, 4].map((step) => {
          const isActive = step <= score;
          return (
            <div
              key={step}
              className={`h-full rounded-sm transition-all duration-300 ${
                isActive ? currentTheme.bar : 'bg-slate-800/80'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default StrengthMeter;
