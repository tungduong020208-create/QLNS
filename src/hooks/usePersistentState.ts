/**
 * usePersistentState — React state synced to localStorage.
 *
 * THE foundational hook of the state layer: every domain hook
 * (useAuth, useEvidences, useShifts, …) is built on this one.
 *
 * Why it exists:
 * - App.tsx previously hand-rolled 10+ pairs of "useState(read localStorage)
 *   + useEffect(write back)" — each an opportunity to forget the save effect,
 *   hardcode a key string differently, or crash on corrupted JSON.
 * - This hook centralizes that pattern ONCE:
 *     • read is parse-safe (corrupted/missing data → fallback, never throw)
 *     • writes are wrapped (storage full → app keeps working in-memory)
 *     • the key ALWAYS comes from the caller's hands — pass the constant
 *       from utils/constants, never a raw string.
 *
 * safeParse() is also exported for non-hook call sites (auth utils, class-like
 * managers, export screens) so the ENTIRE app has exactly one way to read
 * localStorage — and zero places where one corrupted key can crash a render.
 *
 * Migration safety: values saved by the old hand-rolled code were plain
 * JSON.stringify, which this hook reads identically — so existing user
 * data survives the refactor untouched.
 */

import { useEffect, useState } from 'react';

/**
 * Read and parse a localStorage value, never throwing.
 * THE canonical way to read storage anywhere in the app.
 *
 * @param key      localStorage key — import the constant from utils/constants
 * @param fallback Returned when the key is missing OR the stored JSON is
 *                 corrupted (schema drift, manual tampering, partial writes)
 */
export function safeParse<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    return JSON.parse(saved) as T;
  } catch {
    // Corrupted JSON, storage unavailable (private mode), … → fallback
    return fallback;
  }
}

/** Serialize and persist a value, never throwing. Returns success. */
export function writeStoredValue<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full or unavailable — keep working in-memory
    return false;
  }
}

/**
 * State synced to localStorage with parse-safe read and wrapped writes.
 *
 * @param key     localStorage key — import the constant from utils/constants
 * @param initial Fallback when nothing (or something corrupted) is stored
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => safeParse(key, initial));

  // Save on every change (including the initial mount write — harmless,
  // and it normalizes legacy un-saved defaults into storage immediately).
  useEffect(() => {
    writeStoredValue(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
