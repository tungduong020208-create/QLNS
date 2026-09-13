/**
 * ManagerCheckInToggle — dedicated check-in/check-out toggle for managers.
 *
 * Managers do NOT go through the employee camera flow (CheckInCheckOut).
 * Instead they get a single switch: ON = check-in (opens the manager session),
 * OFF = check-out (closes it). The session uses the same localStorage keys and
 * the same CheckInRecord pipeline as the employee flow, so the manager dashboard
 * ("Trạng thái nhân viên hôm nay", work hours, geofence monitoring) sees it
 * identically. The employee flow is untouched.
 */

import React, { useEffect, useState } from 'react';
import { CheckInRecord, CheckInMethod } from '../types';
import {
  STORAGE_KEY_CHECKIN_SESSION,
  STORAGE_KEY_ATTENDANCE_RECORDS,
} from '../utils/constants';
import { safeParse, writeStoredValue } from '../hooks/usePersistentState';

interface ManagerCheckInToggleProps {
  employeeId: string;
  onCheckIn: (record: CheckInRecord) => void;
}

/** Same shape CheckInCheckOut persists into STORAGE_KEY_CHECKIN_SESSION */
interface CheckInSession {
  employeeId: string;
  hasCheckedIn: boolean;
  checkInTime: string;
  checkInTimestamp: number;
  checkInMethod: CheckInMethod;
  address: string;
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

/** One-time migration: legacy manager sessions used method 'photo' → 'toggle' */
const normalizeSessionMethod = (session: CheckInSession): CheckInSession => {
  if (session.employeeId.startsWith('MGR-') && session.checkInMethod === 'photo') {
    return { ...session, checkInMethod: 'toggle' };
  }
  return session;
};

export const ManagerCheckInToggle: React.FC<ManagerCheckInToggleProps> = ({ employeeId, onCheckIn }) => {
  const [now, setNow] = useState(new Date());
  const [session, setSession] = useState<CheckInSession | null>(() => {
    const parsed = safeParse<CheckInSession | null>(STORAGE_KEY_CHECKIN_SESSION, null);
    if (parsed && parsed.employeeId === employeeId && parsed.hasCheckedIn) {
      return normalizeSessionMethod(parsed);
    }
    return null;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOffConfirm, setShowOffConfirm] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Follow external changes to the session (another tab, storage cleared, …)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key !== STORAGE_KEY_CHECKIN_SESSION) return;
      const parsed = safeParse<CheckInSession | null>(STORAGE_KEY_CHECKIN_SESSION, null);
      if (parsed && parsed.employeeId === employeeId && parsed.hasCheckedIn) {
        setSession(normalizeSessionMethod(parsed));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [employeeId]);

  const buildRecord = (type: 'checkin' | 'checkout', timestamp: number): CheckInRecord => ({
    id: `checkin-${Date.now()}`,
    type,
    time: formatTime(new Date(timestamp)),
    address: 'Điểm danh bằng nút gạt của quản lý',
    photo: '',
    smileDetected: false,
    timestamp,
    checkInMethod: 'toggle',
  });

  // ON → check-in: write the manager session + attendance record (same pipeline
  // as CheckInCheckOut so every consumer works unchanged).
  const handleCheckIn = () => {
    setBusy(true);
    setError(null);
    try {
      const nowMs = Date.now();
      const newSession: CheckInSession = {
        employeeId,
        hasCheckedIn: true,
        checkInTime: formatTime(new Date(nowMs)),
        checkInTimestamp: nowMs,
        checkInMethod: 'toggle',
        address: 'Điểm danh bằng nút gạt của quản lý',
      };
      localStorage.setItem(STORAGE_KEY_CHECKIN_SESSION, JSON.stringify(newSession));
      setSession(newSession);      const record = buildRecord('checkin', nowMs);
      const allRecords = safeParse<Record<string, CheckInRecord[]>>(STORAGE_KEY_ATTENDANCE_RECORDS, {});
      if (!allRecords[employeeId]) allRecords[employeeId] = [];
      allRecords[employeeId].push(record);
      // Storage full → live state still works, only the persisted copy is skipped
      writeStoredValue(STORAGE_KEY_ATTENDANCE_RECORDS, allRecords);

      onCheckIn(record);
    } catch {
      setError('Không thể ghi nhận check-in. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  // OFF → check-out: clear the session + append the checkout record
  const handleCheckOut = () => {
    setBusy(true);
    setError(null);
    try {
      const nowMs = Date.now();
      localStorage.removeItem(STORAGE_KEY_CHECKIN_SESSION);
      setSession(null);

      const record = buildRecord('checkout', nowMs);
      const allRecords = safeParse<Record<string, CheckInRecord[]>>(STORAGE_KEY_ATTENDANCE_RECORDS, {});
      if (!allRecords[employeeId]) allRecords[employeeId] = [];
      allRecords[employeeId].push(record);
      // Storage full → live state still works, only the persisted copy is skipped
      writeStoredValue(STORAGE_KEY_ATTENDANCE_RECORDS, allRecords);

      onCheckIn(record);
    } catch {
      setError('Không thể ghi nhận check-out. Vui lòng thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const formatElapsed = (startTimestamp: number, nowMs: number): string => {
    const diff = Math.floor((nowMs - startTimestamp) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-navy overflow-hidden mb-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F1E44] to-[#1A2D5A] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-[11px] uppercase tracking-wider font-semibold mb-0.5">
              CHẤM CÔNG QUẢN LÝ
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-white font-heading text-3xl font-bold tabular-nums tracking-tight">
                {formatTime(now)}
              </span>
            </div>
            <p className="text-white/70 text-xs mt-1">
              {now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-3xl">admin_panel_settings</span>
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                session ? 'bg-[#4CAF72]/20' : 'bg-[#EFC14B]/20'
              }`}
            >
              <span
                className={`material-symbols-outlined text-xl ${session ? 'text-[#4CAF72]' : 'text-[#EFC14B]'}`}
              >
                {session ? 'work_history' : 'work_outline'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#0F1E44]">
                {session ? 'Đang trong ca làm việc' : 'Chưa check-in'}
              </p>
              <p className="text-[11px] text-[#7A829A]">
                {session ? `Vào ca lúc ${session.checkInTime}` : 'Gạt nút để bắt đầu ca của bạn'}
              </p>
            </div>
          </div>

          {/* Switch */}
          <button
            role="switch"
            aria-checked={!!session}
            aria-label={session ? 'Check-out' : 'Check-in'}
            disabled={busy}
            onClick={() => (session ? setShowOffConfirm(true) : handleCheckIn())}
            className={`relative inline-flex h-8 w-14 flex-shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-wait ${
              session ? 'bg-[#4CAF72]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform duration-200 ${
                session ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Elapsed while checked in */}
        {session && (
          <div className="mt-4 bg-gradient-to-br from-[#4CAF72]/10 to-[#2E7D52]/5 border border-[#4CAF72]/30 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold mb-0.5">
                  Thời gian đang làm
                </p>
                <p className="text-2xl font-heading font-bold text-[#2E7D52] tabular-nums tracking-tight">
                  {formatElapsed(session.checkInTimestamp, now.getTime())}
                </p>
              </div>
              <div className="w-10 h-10 bg-[#4CAF72]/10 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-[#4CAF72] rounded-full animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] text-[#4CAF72] mt-1 text-center">Đang trong ca làm việc</p>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-[#FF3131]/10 border border-[#FF3131]/30 rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FF3131] text-lg">warning</span>
            <p className="text-xs text-[#FF3131] font-medium">{error}</p>
          </div>
        )}

        <p className="text-[10px] text-[#7A829A]/80 text-center mt-3 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[12px]">shield</span>
          Vị trí chỉ được theo dõi trong giờ làm việc (từ lúc check-in) và dừng ngay khi check-out
        </p>
      </div>

      {/* Check-out confirmation */}
      {showOffConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-16 h-16 bg-[#FF3131]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#FF3131] text-3xl">logout</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] text-center mb-2">Check-out?</h3>
            <p className="text-sm text-[#7A829A] text-center mb-5">
              Gạt nút về OFF sẽ kết thúc ca làm việc và dừng theo dõi vị trí.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowOffConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE]"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  setShowOffConfirm(false);
                  handleCheckOut();
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#FF3131] text-white hover:bg-[#D42C2C]"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
