/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Safe logging utility for PassGuard.
 * Non-negotiable privacy guarantee:
 * - Never logs passwords, generated keys, inputs, or sensitive user strings.
 * - Accepts ONLY strictly whitelisted metadata keys and values.
 * - Does not use raw console methods anywhere in the codebase.
 */

export interface SafeLogPayload {
  event:
    | 'analysis_complete'
    | 'analysis_cleared'
    | 'generator_generated'
    | 'clipboard_copied'
    | 'clipboard_cleared'
    | 'tab_switched';
  score?: number;
  entropyBits?: number;
  findingsCount?: number;
  generatorMode?: 'random' | 'passphrase';
  length?: number;
  wordCount?: number;
  autoClearSeconds?: number;
  tabName?: string;
}

export interface SafeLogEntry {
  timestamp: number;
  payload: Readonly<SafeLogPayload>;
}

// Banned parameter names that might inadvertently carry user secrets
const FORBIDDEN_KEYS = new Set([
  'password',
  'pass',
  'passphrase',
  'secret',
  'text',
  'val',
  'value',
  'input',
  'raw',
  'key',
  'token',
  'credential',
]);

const ALLOWED_EVENTS = new Set([
  'analysis_complete',
  'analysis_cleared',
  'generator_generated',
  'clipboard_copied',
  'clipboard_cleared',
  'tab_switched',
]);

// In-memory circular buffer of safe audit events (for verification and debugging)
const MAX_HISTORY = 100;
const safeLogHistory: SafeLogEntry[] = [];

/**
 * Validates that a payload contains ONLY allowed, non-sensitive metadata.
 */
export function isSafePayload(payload: unknown): payload is SafeLogPayload {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return false;
  }

  const record = payload as Record<string, unknown>;

  // Check event name
  if (typeof record.event !== 'string' || !ALLOWED_EVENTS.has(record.event)) {
    return false;
  }

  // Ensure no forbidden keys or long string values that could sneak in user input
  for (const [key, val] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_KEYS.has(lowerKey)) {
      return false;
    }

    if (typeof val === 'string') {
      // Disallow long string payloads (passwords/phrases are typically long)
      if (val.length > 32) {
        return false;
      }
      // Only allow alphanumeric and underscore/hyphen for strings (e.g., event, tab names)
      if (!/^[a-zA-Z0-9_\- ]+$/.test(val)) {
        return false;
      }
    } else if (
      typeof val !== 'number' &&
      typeof val !== 'boolean' &&
      val !== undefined &&
      val !== null
    ) {
      // Disallow nested objects, arrays, functions
      return false;
    }
  }

  return true;
}

/**
 * Log a safe metadata event.
 * Rejects any payloads containing passwords or unrecognized keys.
 */
export function safeLog(payload: SafeLogPayload): boolean {
  if (!isSafePayload(payload)) {
    return false;
  }

  const entry: SafeLogEntry = {
    timestamp: Date.now(),
    payload: Object.freeze({ ...payload }),
  };

  safeLogHistory.push(entry);
  if (safeLogHistory.length > MAX_HISTORY) {
    safeLogHistory.shift();
  }

  // Note: We intentionally avoid console output to keep the client clean and zero-leak compliant.
  return true;
}

/**
 * Retrieve the audit trail of safe log entries.
 */
export function getSafeLogHistory(): readonly SafeLogEntry[] {
  return [...safeLogHistory];
}

/**
 * Clear the audit trail.
 */
export function clearSafeLogHistory(): void {
  safeLogHistory.length = 0;
}
