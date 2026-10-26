/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Finding, SecurityCheckItem } from '../lib/analyzer.ts';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Check, X } from 'lucide-react';

interface FindingsListProps {
  findings: Finding[];
  checks: SecurityCheckItem[];
}

export const FindingsList: React.FC<FindingsListProps> = ({ findings, checks }) => {
  return (
    <div className="space-y-6">
      {/* Pattern Findings & Explanations */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center justify-between">
          <span>Pattern Analysis &amp; Guidance</span>
          <span className="text-xs text-slate-500 font-normal">
            {findings.length} insight{findings.length === 1 ? '' : 's'}
          </span>
        </h3>

        {findings.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
            No specific pattern vulnerabilities detected.
          </div>
        ) : (
          <div className="space-y-3" role="list" aria-label="Security findings">
            {findings.map((item) => {
              const isCritical = item.type === 'critical';
              const isWarning = item.type === 'warning';
              const isSuccess = item.type === 'success';

              const badgeStyles = isCritical
                ? 'bg-rose-950/40 border-rose-900/50 text-rose-300'
                : isWarning
                ? 'bg-amber-950/40 border-amber-900/50 text-amber-300'
                : isSuccess
                ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-300';

              const icon = isCritical ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : isWarning ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : isSuccess ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              );

              return (
                <div
                  key={item.id}
                  role="listitem"
                  className={`p-3.5 rounded-xl border text-xs sm:text-sm space-y-2 transition-all ${badgeStyles}`}
                >
                  <div className="flex items-start gap-2.5">
                    {icon}
                    <div className="flex-1">
                      <p className="font-semibold text-slate-100">{item.title}</p>
                      <p className="text-slate-300 mt-1 leading-relaxed text-xs">
                        <span className="font-medium text-slate-200">Why it matters:</span> {item.explanation}
                      </p>
                      <p className="text-slate-300 mt-1.5 leading-relaxed text-xs">
                        <span className="font-semibold text-cyan-300">Fix suggestion:</span> {item.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Security Rule Checklist */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-3">
          Security Check Criteria
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                check.passed
                  ? 'bg-slate-900/40 border-slate-800 text-slate-300'
                  : check.critical
                  ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                  : 'bg-slate-900/20 border-slate-800/80 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`p-1 rounded-full ${
                    check.passed
                      ? 'bg-emerald-950 text-emerald-400'
                      : check.critical
                      ? 'bg-rose-950 text-rose-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {check.passed ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <X className="w-3 h-3" />
                  )}
                </span>
                <span className={check.passed ? 'text-slate-200' : 'text-slate-400'}>
                  {check.label}
                </span>
              </span>
              <span className="text-[11px] font-mono tabular-nums">
                {check.passed ? (
                  <span className="text-emerald-400 font-medium">Passed</span>
                ) : (
                  <span className="text-rose-400">Failed</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FindingsList;
