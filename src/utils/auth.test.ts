/**
 * auth.ts unit tests
 * Run: npx tsx src/utils/auth.test.ts
 */

import { hashPassword, verifyPassword, generateShiftPin, validateShiftPin } from './auth';

// Mock browser globals needed by auth.ts
if (typeof globalThis.screen === 'undefined') {
  (globalThis as any).screen = { width: 1920, height: 1080 };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.error(`  ❌ ${label}`);
  }
}

// ═══════════════════════════════════════════════════
// hashPassword
// ═══════════════════════════════════════════════════
console.log('\n── hashPassword ──');

{
  const h = await hashPassword('aiicafe');
  assert(typeof h === 'string', 'returns a string');
  assert(h.length === 64, 'SHA-256 hex is 64 chars');
  assert(h === (await hashPassword('aiicafe')), 'same input → same hash (deterministic)');
  assert(h !== (await hashPassword('AIICAFE')), 'different case → different hash');
  assert(h !== (await hashPassword('')), 'empty string has a hash');
}

// ═══════════════════════════════════════════════════
// verifyPassword
// ═══════════════════════════════════════════════════
console.log('\n── verifyPassword ──');

{
  const stored = await hashPassword('test123');
  assert(await verifyPassword('test123', stored), 'correct password verifies');
  assert(!(await verifyPassword('wrong', stored)), 'wrong password fails');
  assert(!(await verifyPassword('test1234', stored)), 'superset password fails');
  assert(!(await verifyPassword('test12', stored)), 'subset password fails');
}

// ═══════════════════════════════════════════════════
// generateShiftPin + validateShiftPin
// ═══════════════════════════════════════════════════
console.log('\n── generateShiftPin / validateShiftPin ──');

{
  const pin = generateShiftPin('2026-09-21', 'morning');
  assert(typeof pin === 'string', 'pin is a string');
  assert(/^\d{6}$/.test(pin), 'pin is 6 digits');
  assert(validateShiftPin(pin, '2026-09-21', 'morning'), 'valid pin validates');
  assert(!validateShiftPin('000000', '2026-09-21', 'morning'), 'wrong pin fails');
  assert(!validateShiftPin(pin, '2026-09-22', 'morning'), 'wrong date fails');
  assert(!validateShiftPin(pin, '2026-09-21', 'afternoon'), 'wrong shift fails');
  assert(generateShiftPin('2026-09-21', 'morning') === generateShiftPin('2026-09-21', 'morning'), 'same input → same pin');
}

// ═══════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════
console.log(`\n━━━ ${passed} passed, ${failed} failed ━━━`);
if (failed > 0) process.exit(1);
