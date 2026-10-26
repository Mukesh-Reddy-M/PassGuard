/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import PrivacyBanner from './components/PrivacyBanner.tsx';
import Analyzer from './components/Analyzer.tsx';
import Generator from './components/Generator.tsx';
import HowItWorks from './components/HowItWorks.tsx';
import { safeLog } from './lib/safeLog.ts';
import { ShieldCheck, Search, KeyRound, HelpCircle, CheckCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'generate'>('analyze');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleTabChange = (tab: 'analyze' | 'generate') => {
    setActiveTab(tab);
    safeLog({ event: 'tab_switched', tabName: tab });
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Clean Tabs) - Zone 3 (Action) */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-100 whitespace-nowrap">
              PassGuard
            </span>
          </div>

          {/* Zone 2: Navigation Tabs */}
          <nav
            className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl"
            role="tablist"
            aria-label="Application tabs"
          >
            <button
              type="button"
              role="tab"
              id="tab-analyze"
              aria-selected={activeTab === 'analyze'}
              aria-controls="panel-analyze"
              onClick={() => handleTabChange('analyze')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'analyze'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Analyze</span>
            </button>

            <button
              type="button"
              role="tab"
              id="tab-generate"
              aria-selected={activeTab === 'generate'}
              aria-controls="panel-generate"
              onClick={() => handleTabChange('generate')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                activeTab === 'generate'
                  ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700/60'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Generate</span>
            </button>
          </nav>

          {/* Zone 3: How It Works toggle */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowHowItWorks(!showHowItWorks)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-cyan-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors whitespace-nowrap shrink-0"
              aria-expanded={showHowItWorks}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">How It Works</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Privacy Banner - Always Prominent */}
        <PrivacyBanner />

        {/* Optional Collapsible How It Works view */}
        {showHowItWorks && (
          <div className="animate-in fade-in duration-200">
            <HowItWorks />
          </div>
        )}

        {/* Tab Panels */}
        <div className="relative">
          {activeTab === 'analyze' && (
            <div
              id="panel-analyze"
              role="tabpanel"
              aria-labelledby="tab-analyze"
              tabIndex={0}
              className="focus:outline-none"
            >
              <Analyzer />
            </div>
          )}

          {activeTab === 'generate' && (
            <div
              id="panel-generate"
              role="tabpanel"
              aria-labelledby="tab-generate"
              tabIndex={0}
              className="focus:outline-none"
            >
              <Generator onNotify={showNotification} />
            </div>
          )}
        </div>

        {/* Always visible footer explanation if How It Works is closed */}
        {!showHowItWorks && (
          <div className="pt-4 border-t border-slate-900 text-center">
            <p className="text-xs text-slate-500">
              Heuristic estimates calculated locally via Shannon entropy and pattern matching. Never transmits passwords.
            </p>
          </div>
        )}
      </main>

      {/* Toast Notification Container */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/40 text-cyan-200 text-xs sm:text-sm shadow-xl animate-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>PassGuard — 100% Client-Side Local Security Auditing</p>
      </footer>
    </div>
  );
}
