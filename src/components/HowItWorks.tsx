/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Binary, Sparkles, Shield, AlertTriangle } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 text-slate-300 text-xs sm:text-sm">
      <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
        <Shield className="w-5 h-5 text-cyan-400" />
        <h3 className="text-base font-semibold text-slate-100">
          How PassGuard Works Under the Hood
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Entropy */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <Binary className="w-4 h-4" />
            <span>1. Information Entropy</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Shannon entropy measures mathematical unpredictability in bits ($L \times \log_2(R)$), where $L$ is length and $R$ is pool size. Each additional bit doubles the work an attacker must perform.
          </p>
        </div>

        {/* Pattern Heuristics */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <Shield className="w-4 h-4" />
            <span>2. Pattern Heuristics</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Theoretical entropy fails when humans choose predictable habits. PassGuard inspects ~390 breached words, leetspeak tricks (<code className="text-slate-300">p@ssw0rd</code>), QWERTY keyboard walks, sequential runs, repeated chunks, and calendar years.
          </p>
        </div>

        {/* Cryptographic PRNG */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>3. Rejection Sampling</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Passwords are built using the Web Cryptography API (<code className="text-slate-300">crypto.getRandomValues</code>) rather than pseudo-random <code className="text-rose-400">Math.random</code>. Rejection sampling prevents modulo bias, ensuring every character has an equal probability.
          </p>
        </div>
      </div>

      {/* Limitations Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-900/40 text-amber-200/90 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-300">Important Security Limitations &amp; Best Practices</p>
          <p className="leading-relaxed text-slate-300">
            Analysis results are heuristic estimates, not mathematical guarantees. Real-world credential stuffing attacks also utilize compromised email lists, credential reuse, and phishing.
            PassGuard is <strong>not a substitute for a password manager</strong>. We strongly recommend storing unique, generated passwords in a dedicated, audited password manager (like Bitwarden, 1Password, or KeePassXC) and enabling hardware multi-factor authentication (FIDO2/WebAuthn).
          </p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
