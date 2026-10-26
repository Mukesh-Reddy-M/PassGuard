# PassGuard — Local Password Strength Analyzer & Generator

PassGuard is a 100% client-side, privacy-first web application designed to evaluate password strength, diagnose weak pattern heuristics, and generate cryptographically secure passwords and passphrases without ever storing, caching, or transmitting user input.

---

## 1. Description & Core Philosophy

Most online password checkers leak sensitive user entries over the network to external APIs or third-party analytical endpoints. PassGuard operates on a strict zero-knowledge model:

- **100% Client-Side:** All computation occurs in browser memory.
- **Zero Storage:** Never uses `localStorage`, `sessionStorage`, `IndexedDB`, cookies, or URL search parameters.
- **Zero Leaks:** Never invokes `console.log`, `fetch`, or `XMLHttpRequest`. Employs a strict `safeLog` audit trail accepting only whitelisted, non-sensitive metadata (such as score integers and character count numbers).
- **Hard Content Security Policy:** Implements `connect-src 'none'` to block any outbound network connection at the browser engine level.

---

## 2. Key Features

### 🔍 Real-Time Heuristic Analyzer
- **Score (0–4):** Very Weak (0), Weak (1), Fair (2), Strong (3), and Very Strong (4).
- **Effective Entropy:** Shows *effective* bits, not just `length × log2(pool)`. Runs (`aaaa`), sequences (`abcd`), repeated chunks (`abcabcabc`), keyboard walks, dates, and dictionary words are discounted to the few bits they really carry (`password` ≈ 9 bits, not 38).
- **Offline Crack Time Estimates:** Simulates offline brute-force attack runtimes against a 10-billion guesses/second hashcat array.
- **Breached Passwords & Leetspeak:** Detects matches against ~390 common breached passwords, leetspeak permutations (`p@ssw0rd` -> `password`), and common root affixes (`password123`, `Summer2024`).
- **Repetitive & Symmetrical Patterns:** Flags consecutive duplicate characters (`aaaa`), repeated blocks (`abcabcabc`), and palindromes (`123321`).
- **Sequential Runs:** Detects ascending and descending sequences in numbers (`1234`, `9876`) and alphabet letters (`abcd`, `dcba`).
- **Keyboard Walks:** Identifies QWERTY horizontal row traces (`qwerty`, `asdfgh`, `zxcvbn`) and vertical/diagonal walks (`1qaz2wsx`).
- **Dates & Years:** Identifies 4-digit calendar years (`1990`, `2024`) and formatted date patterns (`12/05/1999`, `2024-10-25`).
- **Plain-English Explanations:** Every identified pattern explains *why* it is vulnerable and provides a specific actionable fix suggestion.
- **Interactive Security Checklist:** 12 verification criteria showing pass/fail status.

### 🎲 Cryptographically Secure Generator
- **Web Cryptography API Only:** Uses `crypto.getRandomValues` exclusively (never `Math.random`).
- **Rejection Sampling:** Eliminates modulo bias to guarantee uniform distribution across character sets and wordlists.
- **Random String Mode:**
  - Length slider from 8 to 64 characters.
  - Toggles for lowercase, uppercase, numbers, and symbols.
  - Guarantees at least one character from each enabled class.
  - Option to exclude ambiguous characters (`0`, `O`, `o`, `l`, `1`, `I`, `|`, `` ` ``).
- **Multi-Word Passphrase Mode:**
  - 3 to 10 words (default 6) selected from a bundled dictionary of 230 words (~7.8 bits per word).
  - Configurable separators (`-`, `_`, `.`, space, `#`, `+`).
  - Casing choices: Title Case, lowercase, or UPPERCASE.
  - Optional random numeric digit insertion.
- **Clipboard Auto-Clear:** "Copy" button copies password to clipboard and schedules a 30-second countdown to automatically clear the clipboard (best effort). Includes an immediate "Clear now" control.
- **Honest Strength Rating:** Generated secrets are rated from their *true* entropy (`words × log2(wordlist size)` or `length × log2(pool)`), not from character counts. With the bundled 230-word list a 4-word passphrase is only ~35 bits (Weak); use 6+ words (~50 bits) or 7+ for strong.
- **Safe Options:** The last enabled character type cannot be unchecked, and invalid inputs raise errors instead of silently producing weaker passwords.

---

## 3. Privacy Guarantees

1. **Strict CSP:** `default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';` prevents all background socket connections and HTTP fetches.
2. **Safe Input Attributes:** Password input fields enforce `autoComplete="off"`, `spellCheck={false}`, and `autoCapitalize="off"`.
3. **No External CDNs or Fonts:** All icons and assets are bundled locally in the build artifact.
4. **Immediate Memory Erasure:** Clicking "Clear" resets state immediately in memory.

---

## 4. How the Analysis Works

1. **Character Pool Size ($R$):**
   $$\text{Pool} = \sum_{\text{classes}} (\text{lower}: 26, \text{upper}: 26, \text{digits}: 10, \text{symbols}: 33)$$
2. **Information Entropy ($H$):**
   $$H = L \cdot \log_2(R)$$
   Where $L$ is the string length and $R$ is the size of the character pool.
3. **Effective Entropy:**
   Raw entropy overstates security when humans rely on predictable patterns. PassGuard collapses runs, sequences, and repeats, discounts keyboard walks and dates, and caps dictionary matches at roughly `log2(dictionary size)` bits plus a small allowance for tweaks. The score uses this effective value; the raw value is kept only for transparency.
4. **Generated secrets:**
   Passphrase strength is `words × log2(N)` where `N` is the real wordlist size. Fixed separators and capitalization style add no entropy because an attacker can assume them.

---

## 5. Project Structure

```
├── index.html                   # Strict CSP and HTML entry point
├── package.json                 # Dependencies and npm scripts
├── metadata.json                # AI Studio application metadata
├── src/
│   ├── App.tsx                  # Top-level shell with tab navigation & toasts
│   ├── main.tsx                 # React DOM bootstrapping
│   ├── index.css                # Tailwind CSS import
│   ├── components/
│   │   ├── Analyzer.tsx         # Real-time password inspector
│   │   ├── Generator.tsx        # Crypto-secure password & passphrase generator
│   │   ├── StrengthMeter.tsx    # Color-coded strength bar & entropy badge
│   │   ├── FindingsList.tsx     # Plain-English findings & checklist
│   │   ├── PrivacyBanner.tsx    # Privacy specs & zero-knowledge guarantee
│   │   └── HowItWorks.tsx       # Technical explanation & limitations
│   ├── data/
│   │   ├── commonPasswords.ts   # ~390 common breached passwords set
│   │   └── wordlist.ts          # 230 passphrase dictionary words
│   ├── lib/
│   │   ├── analyzer.ts          # Pure analysis logic and scoring
│   │   ├── entropy.ts           # Shannon entropy & crack time estimation
│   │   ├── generator.ts         # Rejection-sampled cryptorandom generation
│   │   ├── patterns.ts          # Heuristic pattern detection (leetspeak, walks, dates)
│   │   └── safeLog.ts           # Whitelist-only logger preventing secret leaks
│   └── __tests__/
│       ├── analyzer.test.ts     # Analyzer boundary & checklist tests
│       ├── entropy.test.ts      # Entropy sanity & crack time tests
│       ├── generator.test.ts    # Length, variety, exclusion & 1000-uniqueness tests
│       ├── patterns.test.ts     # Leet, affix, sequence & walk detection tests
│       ├── regressions.test.ts  # Regression tests: entropy, RNG range, generator validation
│       ├── privacyAudit.test.ts # Source code scan for console.log / storage calls
│       └── safeLog.test.ts      # Metadata validation & rejection tests
```

---

## 6. How to Run Tests

PassGuard includes a Vitest unit test suite (71 tests) covering pure library logic, regression tests for past bugs, and source privacy audits.

> Requires Node.js 20+ (tested on 22). Install with a plain `npm install`.

```bash
# Run all unit tests once
npm test

# Run tests in watch mode
npm run test:watch

# Type check codebase
npm run lint

# Build production bundle
npm run build
```

---

## 7. Limitations & Security Notes

- **Heuristic Estimates:** Entropy and strength scores are heuristic estimations based on mathematical models and dictionary checks. They do not constitute an absolute guarantee against dedicated or targeted attacks.
- **Typed passphrases are rated by length:** A user-typed phrase of dictionary words (e.g. `correct horse battery staple`) is scored mostly by length and variety, so it can look stronger than it is against a dictionary attack. Only the generator knows the true entropy of its own output.
- **Bundled Wordlist Size:** The in-app dictionary contains ~390 common passwords and 230 passphrase words to maintain zero-network, low-bundle footprint. Production offline auditing tools (e.g. `zxcvbn` or large dictionary files with millions of entries) may recognize additional niche phrases.
- **Not a Password Manager Replacement:** PassGuard is an educational and analytical tool. Users should always store generated credentials in an encrypted, audited offline password manager (such as Bitwarden, KeePassXC, or 1Password) with hardware FIDO2/WebAuthn two-factor authentication enabled.

---

## 8. Deployment (GitHub Pages)

The build uses relative asset paths (`base: './'`), so it works from a sub-path such as `https://<user>.github.io/PassGuard/`.

```bash
npm run build      # outputs ./dist
```

Publish the `dist/` folder with GitHub Pages (for example via a `actions/deploy-pages` workflow). The production CSP in `index.html` stays strict (`connect-src 'none'`); it is only relaxed by a Vite plugin while running `npm run dev`.
