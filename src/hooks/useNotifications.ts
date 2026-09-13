/**
 * useNotifications — the notification center domain.
 *
 * Legacy migration: rows persisted before the `category` field existed get a
 * sensible default on first load (reward/penalty → 'management', else 'handover').
 * The manager handover route relies on filtering 'handover' rows out, so this
 * migration must be preserved even though new rows always set category.
 */

import { useEffect } from 'react';
import { NotificationItem, NotificationCategory } from '../types';
import { INITIAL_NOTIFICATIONS } from '../data/initialData';
import { STORAGE_KEY_NOTIFICATIONS } from '../utils/constants';
import { usePersistentState } from './usePersistentState';

export function useNotifications() {
  const [notifications, setNotifications] = usePersistentState<NotificationItem[]>(
    STORAGE_KEY_NOTIFICATIONS,
    INITIAL_NOTIFICATIONS
  );

  // One-time migration for pre-category rows (no-op for fresh data)
  useEffect(() => {
    setNotifications(prev => prev.map(n => n.category ? n : {
      ...n,
      category: (n.category || (n.type === 'reward' || n.type === 'penalty' ? 'management' : 'handover')) as NotificationCategory,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pushNotification = (notification: NotificationItem) => {
    setNotifications(prev => [notification, ...prev]);
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  /** Silently mark everything read — the badge disappearing is the feedback. */
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return { notifications, pushNotification, markRead, markAllRead };
}
