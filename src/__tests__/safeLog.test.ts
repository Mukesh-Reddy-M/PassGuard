/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  safeLog,
  isSafePayload,
  getSafeLogHistory,
  clearSafeLogHistory,
  SafeLogPayload,
} from '../lib/safeLog.ts';

describe('safeLog', () => {
  beforeEach(() => {
    clearSafeLogHistory();
  });

  it('accepts whitelisted metadata events', () => {
    const validPayload: SafeLogPayload = {
      event: 'analysis_complete',
      score: 3,
      entropyBits: 64.5,
      findingsCount: 2,
    };

    expect(isSafePayload(validPayload)).toBe(true);
    const logged = safeLog(validPayload);
    expect(logged).toBe(true);

    const history = getSafeLogHistory();
    expect(history.length).toBe(1);
    expect(history[0].payload.event).toBe('analysis_complete');
    expect(history[0].payload.score).toBe(3);
  });

  it('strictly rejects payloads containing password keys', () => {
    const dangerousPayload = {
      event: 'analysis_complete',
      password: 'SuperSecretPassword123!',
    };

    expect(isSafePayload(dangerousPayload)).toBe(false);
    const logged = safeLog(dangerousPayload as unknown as SafeLogPayload);
    expect(logged).toBe(false);
    expect(getSafeLogHistory().length).toBe(0);
  });

  it('strictly rejects payloads with forbidden secret keys (passphrase, secret, token, value)', () => {
    const forbiddenKeys = ['passphrase', 'secret', 'raw', 'text', 'value', 'key', 'token'];
    for (const key of forbiddenKeys) {
      const payload = {
        event: 'generator_generated',
        [key]: 'sensitive_data_value',
      };
      expect(isSafePayload(payload)).toBe(false);
      expect(safeLog(payload as unknown as SafeLogPayload)).toBe(false);
    }
    expect(getSafeLogHistory().length).toBe(0);
  });

  it('strictly rejects unwhitelisted event names', () => {
    const unapprovedEvent = {
      event: 'user_submitted_form',
      score: 4,
    };
    expect(isSafePayload(unapprovedEvent)).toBe(false);
    expect(safeLog(unapprovedEvent as unknown as SafeLogPayload)).toBe(false);
  });

  it('rejects overly long string values that could conceal passwords', () => {
    const longStringPayload = {
      event: 'tab_switched',
      tabName: 'a'.repeat(64),
    };
    expect(isSafePayload(longStringPayload)).toBe(false);
  });
});
