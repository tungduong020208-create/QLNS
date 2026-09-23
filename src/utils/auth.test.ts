/**
 * auth.ts unit tests (vitest)
 * Run: npm test
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword, generateShiftPin, validateShiftPin } from './auth';

// Mock browser globals needed by auth.ts (device fingerprint source)
beforeAll(() => {
  if (typeof globalThis.screen === 'undefined') {
    (globalThis as any).screen = { width: 1920, height: 1080 };
  }
});

describe('hashPassword', () => {
  it('returns a 64-char SHA-256 hex string', async () => {
    const h = await hashPassword('aiicafe');
    expect(typeof h).toBe('string');
    expect(h.length).toBe(64);
  });

  it('is deterministic for the same input', async () => {
    expect(await hashPassword('aiicafe')).toBe(await hashPassword('aiicafe'));
  });

  it('differentiates case and hashes empty strings', async () => {
    const h = await hashPassword('aiicafe');
    expect(h).not.toBe(await hashPassword('AIICAFE'));
    expect(await hashPassword('')).not.toBe('');
  });
});

describe('verifyPassword', () => {
  it('verifies the correct password', async () => {
    const stored = await hashPassword('test123');
    expect(await verifyPassword('test123', stored)).toBe(true);
  });

  it('rejects wrong, superset and subset passwords', async () => {
    const stored = await hashPassword('test123');
    expect(await verifyPassword('wrong', stored)).toBe(false);
    expect(await verifyPassword('test1234', stored)).toBe(false);
    expect(await verifyPassword('test12', stored)).toBe(false);
  });
});

describe('generateShiftPin / validateShiftPin', () => {
  it('generates a 6-digit pin', () => {
    const pin = generateShiftPin('2026-09-21', 'morning');
    expect(typeof pin).toBe('string');
    expect(pin).toMatch(/^\d{6}$/);
  });

  it('validates the correct pin', () => {
    const pin = generateShiftPin('2026-09-21', 'morning');
    expect(validateShiftPin(pin, '2026-09-21', 'morning')).toBe(true);
  });

  it('rejects wrong pin, date and shift', () => {
    const pin = generateShiftPin('2026-09-21', 'morning');
    expect(validateShiftPin('000000', '2026-09-21', 'morning')).toBe(false);
    expect(validateShiftPin(pin, '2026-09-22', 'morning')).toBe(false);
    expect(validateShiftPin(pin, '2026-09-21', 'afternoon')).toBe(false);
  });

  it('is deterministic for the same input', () => {
    expect(generateShiftPin('2026-09-21', 'morning')).toBe(generateShiftPin('2026-09-21', 'morning'));
  });
});
