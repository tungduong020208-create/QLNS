import React, { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { CheckInRecord, CheckInMethod } from '../types';
import {
  getCurrentPosition,
  isWithinStoreRadius,
  getDistanceToOffice,
  getLocationErrorMessage,
  getCheckInMethodLabel,
  getCheckInMethodColor,
} from '../utils/checkin';
import { compressImage, generatePhotoHash } from '../utils/imageCompress';
import { validateShiftPin, getCurrentShiftType } from '../utils/auth';
import { validateWifiConnection, IpCheckResult, OFFICE_WIFI_NAME } from '../utils/ipCheck';
import { resolveAttendanceGate } from '../utils/attendanceGate';
import { makeAttendanceStore } from '../utils/attendanceStore';
import {
  attendanceFlowReducer,
  attendanceSessionReducer,
  deriveInitialSessionState,
  initialPinState,
  pinReducer,
  sanitizePinInput,
  shouldLockPin,
  toWifiSnapshot,
  WifiSnapshot,
} from '../utils/attendanceFlow';
import { DEFAULT_STORE, OFFICE_WIFI } from '../utils/constants';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useCameraPermission } from '../hooks/useCameraPermission';
import SmileDetector from './SmileDetector';

interface CheckInCheckOutProps {
  employeeId: string;
  onCheckIn: (record: CheckInRecord) => void;
}

type ActionType = 'checkin' | 'checkout';

/** Ticking clock shared by the header, the elapsed timers and records. */
function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

const formatDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const formatElapsed = (startTimestamp: number, nowMs: number): string => {
  const diff = Math.floor((nowMs - startTimestamp) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const formatElapsedVerbose = (startTimestamp: number, nowMs: number): string => {
  const diff = Math.floor((nowMs - startTimestamp) / 1000);
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} giờ`);
  if (m > 0) parts.push(`${m} phút`);
  if (s > 0 || parts.length === 0) parts.push(`${s} giây`);
  return parts.join(' ');
};

/**
 * CheckInCheckOut — presentation only.
 *
 * All state transitions live in `attendanceFlow.ts` (pure reducers, unit
 * tested in scripts/test-attendance.ts); persistence lives in
 * `attendanceStore.ts`; the gating rules live in `attendanceGate.ts`. This
 * component is the event→dispatch wiring plus JSX. If you are adding a
 * business rule, it does NOT belong here.
 */
const CheckInCheckOut: React.FC<CheckInCheckOutProps> = ({ employeeId, onCheckIn }) => {
  // Persistence is delegated to the dedicated module (see attendanceStore.ts):
  // the component no longer knows the storage keys or the record-map shape.
  const attendance = useMemo(() => makeAttendanceStore(localStorage), []);

  // ── Reducers (the only state owners) ────────────────────────────────────
  const [flow, dispatchFlow] = useReducer(attendanceFlowReducer, { view: 'idle' });
  const [session, dispatchSession] = useReducer(
    attendanceSessionReducer,
    undefined,
    () => deriveInitialSessionState(attendance.readActiveSession(employeeId))
  );
  const [pin, dispatchPin] = useReducer(pinReducer, initialPinState);

  // ── Presentation-only leftovers ─────────────────────────────────────────
  const [actionType, setActionType] = useState<ActionType>('checkin');
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const now = useNow();
  const location = useCurrentLocation();
  const camera = useCameraPermission();
  const address = location.address || 'Đang lấy vị trí...';

  // PIN lock countdown — timer is a component concern; the transition rules
  // (lock at 3 wrong attempts, unlock at 0) live in pinReducer.
  useEffect(() => {
    if (!pin.locked) return;
    const timer = setInterval(() => dispatchPin({ type: 'tick' }), 1000);
    return () => clearInterval(timer);
  }, [pin.locked]);

  // ── Capture → record (compression + hash + persistence via reducer) ────
  const commitRecord = useCallback(
    async (method: CheckInMethod, photo: string = '', loc?: any, pinAttempt?: number, fallbackReason?: string) => {
      const ts = new Date();
      const timestamp = ts.getTime();

      let compressedPhoto = photo;
      let photoHash = '';
      if (photo && method === 'photo') {
        try {
          compressedPhoto = await compressImage(photo);
          photoHash = await generatePhotoHash(photo);
        } catch (err) {
          console.warn('Image compression failed, using original:', err);
        }
      }

      const newRecord: CheckInRecord = {
        id: `checkin-${Date.now()}`,
        type: actionType,
        time: formatTime(ts),
        address,
        photo: compressedPhoto, // COMPRESSED image (<30KB)
        smileDetected: method === 'photo',
        timestamp,
        checkInMethod: method,
        location: loc,
        pinAttempt,
        fallbackReason,
      };

      // Persistence happens HERE — once per user action, not inside the
      // reducer (React may double-invoke reducers in dev/StrictMode; storage
      // writes there would double-append records).
      if (actionType === 'checkin') {
        attendance.saveActiveSession({
          employeeId,
          hasCheckedIn: true,
          checkInTime: newRecord.time,
          checkInTimestamp: newRecord.timestamp,
          checkInMethod: method,
          address: newRecord.address,
        });
      } else {
        attendance.clearActiveSession();
      }
      attendance.appendEmployeeRecord(employeeId, newRecord);

      // Render-state mirror of the same transition (pure reducer).
      dispatchSession({ type: 'attendance-captured', capture: { type: actionType, method, record: newRecord } });
      onCheckIn(newRecord);
    },
    [actionType, address, onCheckIn]
  );

  // ── Gate: Wi-Fi + GPS in parallel, decision in the pure gate ────────────
  const runGateCheck = useCallback(async (type: ActionType) => {
    setActionType(type);
    setCameraRetryCount(0);

    const [wifiSettled, gpsSettled] = await Promise.allSettled([
      validateWifiConnection(),
      getCurrentPosition(),
    ]);

    let wifiResult: IpCheckResult;
    if (wifiSettled.status === 'fulfilled') {
      wifiResult = wifiSettled.value;
    } else {
      wifiResult = {
        isValid: false,
        publicIP: null,
        localIP: null,
        error: 'Lỗi kiểm tra kết nối Wi-Fi',
        useFallback: OFFICE_WIFI.fallbackEnabled,
        details: { publicIPValid: false, localIPValid: false },
      };
    }

    let gpsErrorMessage: string | null = null;
    if (gpsSettled.status === 'rejected') {
      const reason: any = gpsSettled.reason;
      gpsErrorMessage = typeof reason?.code === 'number'
        ? getLocationErrorMessage(reason as GeolocationPositionError)
        : (reason?.message || 'Không thể xác định vị trí GPS');
    }

    const gate = resolveAttendanceGate({
      wifi: wifiResult,
      gpsPosition: gpsSettled.status === 'fulfilled'
        ? {
            coords: {
              latitude: gpsSettled.value.coords.latitude,
              longitude: gpsSettled.value.coords.longitude,
              accuracy: gpsSettled.value.coords.accuracy,
            },
          }
        : null,
      gpsErrorMessage,
      officeRadiusMeters: DEFAULT_STORE.radius,
      distanceToOffice: getDistanceToOffice,
    });

    const wifi: WifiSnapshot | null =
      gate.verdict === 'wifi-invalid' ? toWifiSnapshot(wifiResult) : null;
    dispatchFlow({
      type: 'gate-verdict',
      verdict:
        gate.verdict === 'wifi-invalid'
          ? 'wifi-blocked'
          : gate.verdict === 'wifi-fallback'
            ? 'fallback'
            : gate.verdict,
      message: 'message' in gate ? gate.message : undefined,
      distance: 'distance' in gate ? gate.distance : undefined,
      wifi,
    });
  }, []);

  const handleCaptureClick = (type: ActionType) => {
    dispatchFlow({ type: 'attempt', action: type });
    runGateCheck(type);
  };

  // ── Camera frame capture (presentation-level glue) ──────────────────────
  const captureCurrentFrame = useCallback(() => {
    const video = document.querySelector('#smile-video video') as HTMLVideoElement;
    let photo: string;
    if (!video) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸 Smile Detected!', 320, 240);
      photo = canvas.toDataURL('image/jpeg', 0.8);
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      photo = canvas.toDataURL('image/jpeg', 0.8);
    }
    setTimeout(() => dispatchFlow({ type: 'smile-captured', photo }), 500);
  }, []);

  const handlePermissionAllow = async () => {
    // Real getUserMedia probe lives in the hook (reusable, testable seam).
    const result = await camera.probe();
    if (result === 'granted') {
      dispatchFlow({ type: 'camera-allowed' });
    } else {
      // Permission denied or camera unavailable
      setCameraRetryCount((prev) => prev + 1);
      dispatchFlow({ type: 'camera-denied' });
    }
  };

  // ── Fallback: GPS locate ─────────────────────────────────────────────────
  const handleGPSCheckIn = async () => {
    dispatchFlow({ type: 'fallback-gps' });
    try {
      const position = await getCurrentPosition();
      const { within, distance } = isWithinStoreRadius(
        position.coords.latitude,
        position.coords.longitude
      );

      if (within) {
        dispatchFlow({ type: 'gps-locate-phase', phase: 'success', distance });
        // Keep the 1.5s "Điểm danh thành công" beat before the success modal.
        setTimeout(async () => {
          await commitRecord(
            'gps',
            '',
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              distanceFromStore: distance,
            },
            undefined,
            'user_choice'
          );
          dispatchFlow({ type: 'confirmed' });
        }, 1500);
      } else {
        dispatchFlow({
          type: 'gps-locate-phase',
          phase: 'error',
          message: `Bạn đang cách cửa hàng ${distance}m. Vui lòng đến trong phạm vi 100m.`,
        });
      }
    } catch (err: any) {
      dispatchFlow({ type: 'gps-locate-phase', phase: 'error', message: getLocationErrorMessage(err) });
    }
  };

  // ── Fallback: PIN ────────────────────────────────────────────────────────
  const handlePinSubmit = async () => {
    if (pin.locked) return;

    const today = new Date().toISOString().split('T')[0];
    const shiftType = getCurrentShiftType();
    const isValid = validateShiftPin(flow.view === 'pin' ? flow.input : '', today, shiftType);

    if (isValid) {
      await commitRecord('pin', '', undefined, pin.attempts + 1, 'user_choice');
      dispatchFlow({ type: 'confirmed' });
      return;
    }

    dispatchPin({ type: 'wrong-attempt' });
    if (shouldLockPin(pin.attempts + 1)) {
      dispatchPin({ type: 'lock' });
      dispatchFlow({ type: 'pin-error', message: 'Đã nhập sai 3 lần. Vui lòng thử lại sau 5 phút.' });
    } else {
      dispatchFlow({ type: 'pin-error', message: 'Mã PIN không đúng. Vui lòng thử lại.' });
    }
  };

  const onClose = () => {
    dispatchFlow({ type: 'close' });
    dispatchPin({ type: 'reset' });
    setCameraRetryCount(0);
  };

  const busy = flow.view !== 'idle';
  const capturedPhoto = flow.view === 'review' ? flow.photo : null;
  const pinInput = flow.view === 'pin' ? flow.input : '';
  const pinError = flow.view === 'pin' ? flow.error : null;

  return (
    <>
      {/* Check-in Card */}
      <div className="bg-white rounded-2xl border border-[#E8DFD0] shadow-navy overflow-hidden mb-6">
        {/* Clock Header */}
        <div className="bg-gradient-to-r from-[#0F1E44] to-[#1A2D5A] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-[11px] uppercase tracking-wider font-semibold mb-0.5">
                CHECK-IN / CHECK-OUT
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-heading text-3xl font-bold tabular-nums tracking-tight">
                  {formatTime(now)}
                </span>
              </div>
              <p className="text-white/70 text-xs mt-1">{formatDate(now)}</p>
            </div>
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-3xl">schedule</span>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="px-5 py-3 border-b border-[#F5EDDF]">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#EFC14B] text-lg mt-0.5">location_on</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#7A829A] uppercase tracking-wide">Vị trí hiện tại</p>
              <p className="text-sm text-[#0F1E44] font-medium mt-0.5 truncate">{address}</p>
            </div>
            {!location.ready && (
              <div className="ml-auto mt-0.5">
                <div className="w-4 h-4 border-2 border-[#EFC14B]/30 border-t-[#EFC14B] rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="px-5 py-4">
          {session.status !== 'on' ? (
            <>
              <button
                onClick={() => handleCaptureClick('checkin')}
                disabled={busy}
                className="w-full bg-[#0F1E44] text-white rounded-xl h-[52px] flex items-center justify-center gap-2.5 shadow-md hover:bg-[#1A2D5A] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined fill text-[22px]">add_a_photo</span>
                <span className="font-semibold text-base">Check-in ngay</span>
              </button>
              <p className="text-[11px] text-[#7A829A] text-center mt-2">
                📸 Chụp ảnh nụ cười để xác nhận điểm danh
              </p>
              <p className="text-[10px] text-[#7A829A]/80 text-center mt-1 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[12px]">shield</span>
                Vị trí chỉ được theo dõi trong giờ làm việc (từ lúc check-in) và dừng ngay khi check-out
              </p>

              {/* Show fallback button after 2 camera failures */}
              {cameraRetryCount >= 2 && (
                <button
                  onClick={() => dispatchFlow({ type: 'open-fallback' })}
                  className="w-full mt-3 bg-[#FDF8EE] border border-[#E8DFD0] text-[#0F1E44] rounded-xl h-10 flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#EFC14B]/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  Dùng phương án dự phòng
                </button>
              )}
            </>
          ) : (
            <>
              {/* Active session card */}
              <div className="bg-gradient-to-br from-[#4CAF72]/10 to-[#2E7D52]/5 border border-[#4CAF72]/30 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#4CAF72]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#4CAF72] text-xl">check_circle</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#2E7D52]">Đã check-in lúc {session.checkInTime}</p>
                    <p className="text-[11px] text-[#4CAF72] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      {getCheckInMethodLabel(session.checkInMethod || 'photo')}
                    </p>
                  </div>
                </div>
                {session.checkInTimestamp && (
                  <div className="bg-white rounded-xl p-3 border border-[#4CAF72]/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold mb-0.5">Thời gian đang làm</p>
                        <p className="text-2xl font-heading font-bold text-[#2E7D52] tabular-nums tracking-tight">
                          {formatElapsed(session.checkInTimestamp, now.getTime())}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-[#4CAF72]/10 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-[#4CAF72] rounded-full animate-pulse" />
                      </div>
                    </div>
                    <p className="text-[10px] text-[#4CAF72] mt-1 text-center">Đang trong ca làm việc</p>
                    <p className="text-[10px] text-[#7A829A] mt-0.5 text-center">{formatElapsedVerbose(session.checkInTimestamp, now.getTime())}</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => handleCaptureClick('checkout')}
                disabled={busy}
                className="w-full bg-[#FF3131] text-white rounded-xl h-[52px] flex items-center justify-center gap-2.5 shadow-md hover:bg-[#D42C2C] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined fill text-[22px]">logout</span>
                <span className="font-semibold text-base">Check-out</span>
              </button>
              <p className="text-[11px] text-[#7A829A] text-center mt-2">
                📸 Chụp ảnh để xác nhận kết thúc ca làm việc
              </p>
              <p className="text-[10px] text-[#7A829A]/80 text-center mt-1 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[12px]">shield</span>
                Vị trí chỉ được theo dõi trong giờ làm việc và dừng ngay khi check-out
              </p>
            </>
          )}
        </div>
      </div>

      {/* Wi-Fi hard-block modal (state: wifi-blocked) */}
      {flow.view === 'wifi-blocked' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-16 h-16 bg-[#FF3131]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#FF3131] text-3xl">wifi_off</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] text-center mb-2">
              Chưa kết nối Wi-Fi quán
            </h3>
            <p className="text-sm text-[#7A829A] text-center mb-4">
              {flow.message || 'Bạn chưa kết nối với mạng Wi-Fi hợp lệ của quán.'}
            </p>

            {/* Show both IP types */}
            <div className="bg-[#F9F8FC] rounded-xl p-3 mb-4 space-y-2">
              {flow.wifi?.publicIP && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Public IP</p>
                    <p className="text-sm font-bold text-[#0F1E44] font-mono">{flow.wifi.publicIP}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    flow.wifi.publicIPValid ? 'bg-[#4CAF72]/20 text-[#4CAF72]' : 'bg-[#FF3131]/20 text-[#FF3131]'
                  }`}>
                    {flow.wifi.publicIPValid ? '✓ Hợp lệ' : '✗ Không hợp lệ'}
                  </span>
                </div>
              )}
              {flow.wifi?.localIP && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Local IP</p>
                    <p className="text-sm font-bold text-[#0F1E44] font-mono">{flow.wifi.localIP}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    flow.wifi.localIPValid ? 'bg-[#4CAF72]/20 text-[#4CAF72]' : 'bg-[#FF3131]/20 text-[#FF3131]'
                  }`}>
                    {flow.wifi.localIPValid ? '✓ Hợp lệ' : '✗ Không hợp lệ'}
                  </span>
                </div>
              )}
            </div>

            <div className="bg-[#EFC14B]/10 border border-[#EFC14B]/30 rounded-xl p-3 mb-4">
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#EFC14B] text-lg mt-0.5">wifi</span>
                <p className="text-xs text-[#7A829A]">
                  Wifi cần kết nối: <span className="font-bold text-[#0F1E44]">{OFFICE_WIFI_NAME}</span>. Nếu quán mất mạng, liên hệ Quản lý để bật chế độ dự phòng.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCaptureClick(actionType)}
              className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Thử lại
            </button>
            <button
              onClick={onClose}
              className="w-full h-11 mt-2 text-[#7A829A] rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#F9F8FC] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* GPS gate block modal (state: gps-unavailable | gps-too-far) */}
      {(flow.view === 'gps-unavailable' || flow.view === 'gps-too-far') && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              flow.view === 'gps-too-far' ? 'bg-[#EFC14B]/20' : 'bg-[#FF3131]/20'
            }`}>
              <span className={`material-symbols-outlined text-3xl ${
                flow.view === 'gps-too-far' ? 'text-[#EFC14B]' : 'text-[#FF3131]'
              }`}>
                {flow.view === 'gps-too-far' ? 'location_off' : 'gps_off'}
              </span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] text-center mb-2">
              {flow.view === 'gps-too-far' ? 'Ngoài phạm vi văn phòng' : 'Không xác định được vị trí'}
            </h3>
            <p className="text-sm text-[#7A829A] text-center mb-4">{flow.message}</p>
            {flow.view === 'gps-too-far' && (
              <div className="bg-[#F9F8FC] rounded-xl p-3 mb-4 flex items-center justify-between">
                <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Khoảng cách tới văn phòng</p>
                <p className="text-sm font-bold text-[#FF3131] font-mono">{flow.distance}m</p>
              </div>
            )}
            <p className="text-[11px] text-[#7A829A] text-center mb-4">
              Wi-Fi: <span className="font-bold text-[#0F1E44]">{OFFICE_WIFI_NAME}</span> đã được xác nhận — chỉ vị trí GPS chưa hợp lệ.
            </p>
            <button
              onClick={() => handleCaptureClick(actionType)}
              className="w-full h-12 bg-[#0F1E44] text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Thử lại
            </button>
            <button
              onClick={onClose}
              className="w-full h-11 mt-2 text-[#7A829A] rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#F9F8FC] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">close</span>
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Gate checks loading overlay (state: checking) */}
      {flow.view === 'checking' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-[#EFC14B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="inline-block w-8 h-8 border-3 border-[#EFC14B]/30 border-t-[#EFC14B] rounded-full animate-spin" />
            </div>
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-2">
              Kiểm tra kết nối Wi-Fi...
            </h3>
            <p className="text-sm text-[#7A829A]">
              Đang xác minh địa chỉ IP mạng của bạn
            </p>
          </div>
        </div>
      )}

      {/* Permission Dialog (state: permission) */}
      {flow.view === 'permission' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-16 h-16 bg-[#EFC14B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#0F1E44] text-3xl">photo_camera</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] text-center mb-2">
              Cho phép truy cập Camera
            </h3>
            <p className="text-sm text-[#7A829A] text-center mb-4">
              Ứng dụng cần quyền truy cập camera để chụp ảnh xác nhận check-in. Sau khi check-in, vị trí của bạn sẽ được theo dõi định kỳ trong giờ làm việc (dừng ngay khi check-out).
            </p>

            <div className="bg-[#FDF8EE] rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                <p className="text-sm text-[#3D4663]">Chụp ảnh selfie để điểm danh</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                <p className="text-sm text-[#3D4663]">AI nhận diện nụ cười tự động</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                <p className="text-sm text-[#3D4663]">Ghi lại thời gian & vị trí</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => dispatchFlow({ type: 'camera-denied' })}
                className="flex-1 h-12 rounded-xl border-2 border-[#E8DFD0] text-[#7A829A] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#FDF8EE] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Từ chối
              </button>
              <button
                onClick={handlePermissionAllow}
                className="flex-1 h-12 rounded-xl bg-[#0F1E44] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#1A2D5A] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">check</span>
                Cho phép
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal (state: camera) */}
      {flow.view === 'camera' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 bg-black">
            <button onClick={onClose} className="text-white p-1">
              <span className="material-symbols-outlined">close</span>
            </button>
            <p className="text-white text-sm font-semibold">{actionType === 'checkin' ? 'Check-in' : 'Check-out'} - Chụp ảnh nụ cười</p>
            <div className="w-8" />
          </div>

          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div id="smile-video">
                <SmileDetector
                  onDetected={captureCurrentFrame}
                  onManualCapture={captureCurrentFrame}
                  onCameraError={() => setCameraRetryCount((prev) => prev + 1)}
                />
              </div>
            </div>
          </div>

          <div className="px-4 py-4 bg-black">
            <div className="flex items-center gap-2 text-white/60 text-xs mb-3">
              <span className="material-symbols-outlined text-sm">info</span>
              <p>Nụ cười được AI nhận diện tự động khi đạt ngưỡng 50%+</p>
            </div>
            {cameraRetryCount >= 1 && (
              <button
                onClick={() => dispatchFlow({ type: 'open-fallback' })}
                className="w-full py-2.5 bg-[#EFC14B] text-[#0F1E44] rounded-xl text-sm font-semibold"
              >
                Dùng phương án dự phòng
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fallback Selection Modal (state: fallback-select) */}
      {flow.view === 'fallback-select' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-16 h-16 bg-[#EFC14B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#0F1E44] text-3xl">swap_horiz</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] text-center mb-2">
              Phương án dự phòng
            </h3>
            <p className="text-sm text-[#7A829A] text-center mb-6">
              Camera gặp sự cố. Chọn cách điểm danh thay thế:
            </p>

            <div className="space-y-3 mb-4">
              <button
                onClick={handleGPSCheckIn}
                className="w-full p-4 bg-[#FDF8EE] border border-[#E8DFD0] rounded-xl flex items-center gap-3 hover:bg-[#EFC14B]/10 transition-all"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-600 text-2xl">location_on</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#0F1E44]">Check-in bằng GPS</p>
                  <p className="text-xs text-[#7A829A]">Xác nhận vị trí cửa hàng</p>
                </div>
              </button>

              <button
                onClick={() => dispatchFlow({ type: 'fallback-pin' })}
                className="w-full p-4 bg-[#FDF8EE] border border-[#E8DFD0] rounded-xl flex items-center gap-3 hover:bg-[#EFC14B]/10 transition-all"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-600 text-2xl">pin</span>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#0F1E44]">Check-in bằng Mã PIN</p>
                  <p className="text-xs text-[#7A829A]">Nhập mã 6 số từ quản lý</p>
                </div>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm font-medium text-[#7A829A] hover:text-[#0F1E44]"
            >
              Quay lại
            </button>
          </div>
        </div>
      )}

      {/* GPS Check-in Modal (state: gps-locate) */}
      {flow.view === 'gps-locate' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            {flow.phase === 'loading' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-2">Đang kiểm tra vị trí...</h3>
                <p className="text-sm text-[#7A829A]">Vui lòng đợi trong giây lát</p>
              </>
            )}

            {flow.phase === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-green-700 mb-2">Điểm danh thành công!</h3>
                <p className="text-sm text-[#7A829A]">📍 Xác nhận vị trí: {flow.distance}m từ cửa hàng</p>
              </>
            )}

            {flow.phase === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-[#FF3131] mb-2">Không thể điểm danh</h3>
                <p className="text-sm text-[#7A829A] mb-4">{flow.message}</p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 bg-[#0F1E44] text-white rounded-xl text-sm font-semibold"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* PIN Check-in Modal (state: pin) */}
      {flow.view === 'pin' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-amber-600 text-3xl">pin</span>
            </div>
            <h3 className="font-heading text-lg font-bold text-[#0F1E44] text-center mb-2">Nhập Mã PIN</h3>
            <p className="text-sm text-[#7A829A] text-center mb-4">
              Nhập mã 6 số được hiển thị tại quầy quản lý
            </p>

            <input
              type="text"
              value={pinInput}
              onChange={(e) => dispatchFlow({ type: 'pin-typing', value: sanitizePinInput(e.target.value) })}
              placeholder="000000"
              className="w-full text-center text-2xl font-bold tracking-[0.3em] py-3 border border-[#E8DFD0] rounded-xl focus:border-[#EFC14B] outline-none mb-2"
              disabled={pin.locked}
              maxLength={6}
            />

            {pinError && (
              <p className="text-xs text-[#FF3131] text-center mb-3">{pinError}</p>
            )}

            {pin.locked && (
              <p className="text-xs text-[#7A829A] text-center mb-3">
                Thử lại sau {Math.floor(pin.lockTimer / 60)}:{(pin.lockTimer % 60).toString().padStart(2, '0')}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE]"
              >
                Hủy
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pinInput.length !== 6 || pin.locked}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0F1E44] text-white hover:bg-[#1A2D5A] disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal (state: review) */}
      {flow.view === 'review' && capturedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-bold text-[#0F1E44]">
                  Xác nhận {actionType === 'checkin' ? 'check-in' : 'check-out'}
                </h3>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#FDF8EE] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#7A829A] text-xl">close</span>
                </button>
              </div>
            </div>

            <div className="px-5 mb-4">
              <div className="rounded-xl overflow-hidden border border-[#E8DFD0] shadow-sm">
                <img src={capturedPhoto} alt="Check-in photo" className="w-full aspect-[4/3] object-cover" style={{ transform: 'scaleX(-1)' }} />
              </div>
              <div className="flex items-center gap-2 mt-2 bg-green-50 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                <p className="text-green-700 text-xs font-semibold">Nụ cười đã được xác nhận bởi AI ✓</p>
              </div>
            </div>

            <div className="px-5 space-y-2.5 mb-5">
              <div className="flex items-center gap-3 bg-[#FDF8EE] rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-[#EFC14B]">schedule</span>
                <div>
                  <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Thời gian</p>
                  <p className="text-sm font-bold text-[#0F1E44]">{formatTime(now)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#FDF8EE] rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-[#EFC14B]">location_on</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-[#7A829A] uppercase tracking-wider font-semibold">Địa điểm</p>
                  <p className="text-sm font-bold text-[#0F1E44] truncate">{address}</p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => dispatchFlow({ type: 'retake' })}
                className="flex-1 h-12 rounded-xl border-2 border-[#E8DFD0] text-[#7A829A] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#FDF8EE] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Chụp lại
              </button>
              <button
                onClick={async () => {
                  await commitRecord('photo', capturedPhoto || '');
                  dispatchFlow({ type: 'confirmed' });
                }}
                className="flex-1 h-12 rounded-xl bg-[#0F1E44] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#1A2D5A] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg fill">check</span>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal (state: success) */}
      {flow.view === 'success' && session.lastRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center shadow-2xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-green-600 text-5xl fill">check_circle</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] mb-2">
              {actionType === 'checkin' ? 'Check-in' : 'Check-out'} thành công!
            </h3>
            <p className="text-sm text-[#7A829A] mb-4">
              {actionType === 'checkin' ? 'Điểm danh đã được ghi nhận' : 'Kết thúc ca làm việc đã được ghi nhận'}
            </p>

            <div className="bg-[#FDF8EE] rounded-xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-xs text-[#7A829A]">Thời gian {actionType === 'checkin' ? 'vào' : 'ra'} ca</span>
                <span className="text-xs font-bold text-[#0F1E44]">{session.lastRecord.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-[#7A829A]">Phương thức</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCheckInMethodColor(session.lastRecord.checkInMethod)}`}>
                  {getCheckInMethodLabel(session.lastRecord.checkInMethod)}
                </span>
              </div>
              {session.lastRecord.location && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#7A829A]">Khoảng cách</span>
                  <span className="text-xs font-bold text-[#0F1E44]">{session.lastRecord.location.distanceFromStore}m</span>
                </div>
              )}
              {actionType === 'checkout' && session.workHoursSummary && (
                <>
                  {session.checkInTime && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[#7A829A]">Giờ vào</span>
                      <span className="text-xs font-bold text-[#0F1E44]">{session.checkInTime}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-[#7A829A]">Giờ ra</span>
                    <span className="text-xs font-bold text-[#0F1E44]">{session.lastRecord.time}</span>
                  </div>
                  <div className="bg-[#4CAF72]/10 border border-[#4CAF72]/30 rounded-lg p-3 mt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#4CAF72] text-lg">timer</span>
                        <span className="text-xs font-bold text-[#2E7D52]">Tổng giờ làm</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-heading font-bold text-[#2E7D52]">{session.workHoursSummary.duration}</span>
                        <span className="text-[10px] text-[#4CAF72] ml-1">({session.workHoursSummary.hours}h)</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {session.lastRecord.photo && (
              <div className="rounded-lg overflow-hidden border border-[#E8DFD0] mb-5">
                <img src={session.lastRecord.photo} alt="Check-in" className="w-full aspect-video object-cover" style={{ transform: 'scaleX(-1)' }} />
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-[#0F1E44] text-white font-semibold shadow-md hover:bg-[#1A2D5A] active:scale-[0.98] transition-all cursor-pointer"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default CheckInCheckOut;
