/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, WifiOff, HardDriveDownload, ChevronDown, ChevronUp } from 'lucide-react';

export const PrivacyBanner: React.FC = () => {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 text-slate-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-slate-100">
              Zero-Knowledge Privacy Guarantee
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Everything runs locally in your browser. Nothing is stored, tracked, or sent anywhere.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors self-start sm:self-auto px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60"
          aria-expanded={detailsOpen}
          aria-controls="privacy-details-panel"
        >
          <span>{detailsOpen ? 'Hide privacy rules' : 'Verify security specs'}</span>
          {detailsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {detailsOpen && (
        <div
          id="privacy-details-panel"
          className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
        >
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <WifiOff className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Zero Network Requests</p>
              <p className="text-slate-400 mt-0.5">
                Enforced by strict Content Security Policy (<code className="text-emerald-400">connect-src 'none'</code>). No external APIs, CDNs, or telemetry.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <HardDriveDownload className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Zero Persistent Storage</p>
              <p className="text-slate-400 mt-0.5">
                Passwords never touch persistent browser storage, cookies, or offline databases. State vanishes immediately on tab close or Clear.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200">Zero Console Leaks</p>
              <p className="text-slate-400 mt-0.5">
                All developer console logging of secrets is strictly blocked. Only whitelisted non-sensitive telemetry events are processed internally.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyBanner;
