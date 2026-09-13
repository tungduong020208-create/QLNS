/**
 * useAuth — users, current session, and account operations.
 *
 * Owns the auth domain of localStorage:
 *   STORAGE_KEY_USERS           → full user list
 *   STORAGE_KEY_CURRENT_USER    → ONLY the logged-in user's id (auth.ts's
 *                                 session functions read this key expecting
 *                                 an id string — do NOT store the object)
 *   STORAGE_KEY_AUTH            → 'true' | 'false' login flag
 */

import { useEffect, useState } from 'react';
import { User } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import {
  STORAGE_KEY_USERS,
  STORAGE_KEY_CURRENT_USER,
  STORAGE_KEY_AUTH,
} from '../utils/constants';
import { usePersistentState } from './usePersistentState';
import { createSession, clearSession } from '../utils/auth';

export function useAuth() {
  const [users, setUsers] = usePersistentState<User[]>(STORAGE_KEY_USERS, INITIAL_USERS);

  // Restore session by id, resolved against the persisted user list
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (savedId) {
      return users.find(u => u.id === savedId) ?? null;
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = usePersistentState<boolean>(STORAGE_KEY_AUTH, false);

  // Persist ONLY the id (see storage contract in the file header)
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, currentUser.id);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  /**
   * Log a user in.
   *
   * createSession() is called EXPLICITLY here, before any state change.
   * History: the session keys were previously only ever written by a
   * refreshSession() call inside ProtectedRoute's useEffect — meaning login
   * worked only because of the incidental ORDER of React's render/effects
   * cycle. Any refactor of that order would have caused a login↔dashboard
   * redirect loop. Lesson: side effects a feature depends on must be invoked
   * directly by that feature's logic, never left to "happen" via component
   * lifecycles.
   */
  const login = (user: User) => {
    createSession(user.id);          // session keys first — the invariant ProtectedRoute depends on
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  /** Log out: clearSession() removes ALL session keys (token, expiry, flag, id). */
  const logout = () => {
    clearSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  /** Manager creates a new employee account. */
  const addUser = (newEmployee: User) => {
    setUsers(prev => [...prev, newEmployee]);
  };

  /** Password change: updates the target user (and the live session if it's them). */
  const changePassword = (userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u =>
      u.id === userId ? { ...u, password: newPassword, mustChangePassword: false } : u
    ));
    setCurrentUser(prev =>
      prev && prev.id === userId
        ? { ...prev, password: newPassword, mustChangePassword: false }
        : prev
    );
  };

  /** Profile update: merges fields into the current user + user list. */
  const updateUser = (updatedFields: Partial<User>) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updatedFields };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
  };

  return { users, currentUser, isLoggedIn, login, logout, addUser, changePassword, updateUser };
}
