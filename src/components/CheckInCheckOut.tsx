import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { CheckInRecord, CheckInMethod } from '../types';
import {
  getCurrentPosition,
  isWithinStoreRadius,
  generateShiftPin,
  validateShiftPin,
  getCurrentShiftType,
  getLocationErrorMessage,
  getCheckInMethodLabel,
  getCheckInMethodColor,
} from '../utils/checkin';

interface CheckInCheckOutProps {
  employeeId: string;
  onCheckIn: (record: CheckInRecord) => void;
}

type ModalView = 'idle' | 'permission' | 'camera' | 'review' | 'success' | 'fail' | 'fallback-select' | 'gps' | 'pin';
type ActionType = 'checkin' | 'checkout';

const SmileDetector: React.FC<{
  onDetected: () => void;
  onManualCapture?: () => void;
  onCameraError?: (error: string) => void;
}> = ({ onDetected, onManualCapture, onCameraError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [smileScore, setSmileScore] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const detectedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        await Promise.all([
          faceapi.loadSsdMobilenetv1Model('/models'),
          faceapi.loadFaceExpressionModel('/models'),
        ]);

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setLoading(false);

        const detect = async () => {
          if (!videoRef.current || !canvasRef.current || !mounted || detectedRef.current) return;
          const video = videoRef.current;
          if (video.readyState < 2) {
            animFrameRef.current = requestAnimationFrame(detect);
            return;
          }

          try {
            const detections = await faceapi
              .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
              .withFaceExpressions();

            if (!mounted) return;

            if (detections.length > 0) {
              setFaceDetected(true);
              const happy = detections[0].expressions.happy;
              setSmileScore(happy);

              if (happy >= 0.5 && !detectedRef.current) {
                detectedRef.current = true;
                onDetected();
                return;
              }
            } else {
              setFaceDetected(false);
              setSmileScore(0);
            }
          } catch {
            // Silently continue
          }

          if (mounted && !detectedRef.current) {
            animFrameRef.current = requestAnimationFrame(detect);
          }
        };

        animFrameRef.current = requestAnimationFrame(detect);
      } catch (err: any) {
        if (mounted) {
          const errorMsg = err?.message || 'Không thể truy cập camera';
          setError(errorMsg);
          onCameraError?.(errorMsg);
        }
      }
    };

    start();

    return () => {
      mounted = false;
      cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [onDetected, onCameraError]);

  const smilePct = Math.min(Math.round(smileScore * 100), 100);

  const handleManualCapture = () => {
    if (!videoRef.current || !onManualCapture) return;
    detectedRef.current = true;
    onManualCapture();
  };

  return (
    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Smile progress ring */}
      <div className="absolute top-3 right-3 w-16 h-16">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="3"
          />
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={smileScore >= 0.5 ? '#22c55e' : smileScore >= 0.3 ? '#eab308' : '#ef4444'}
            strokeWidth="3"
            strokeDasharray={`${smilePct}, 100`}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">{smilePct}%</span>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-10">
          <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm font-medium">Đang tải AI model...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-10">
          <div className="bg-white rounded-xl p-4 max-w-xs text-center">
            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
            <p className="text-sm text-gray-600 mt-2">{error}</p>
          </div>
        </div>
      )}

      {/* Face guide & status */}
      {!loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div
            className={`w-36 h-44 rounded-full border-2 border-dashed transition-colors duration-300 mb-4 ${
              faceDetected
                ? smileScore >= 0.5
                  ? 'border-green-400'
                  : 'border-yellow-400'
                : 'border-white/60'
            }`}
          />
          <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            {!faceDetected ? (
              <span className="text-white text-sm font-medium">Đặt khuôn mặt vào vòng tròn</span>
            ) : smileScore < 0.3 ? (
              <span className="text-white text-sm font-medium">😠 Hãy cười lên nào!</span>
            ) : smileScore < 0.5 ? (
              <span className="text-yellow-300 text-sm font-medium">😊 Cười nhiều hơn nữa!</span>
            ) : (
              <span className="text-green-300 text-sm font-bold">😄 Tuyệt vời! Đang chụp...</span>
            )}
          </div>
        </div>
      )}

      {/* Smile threshold bar */}
      {!loading && !error && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                smileScore >= 0.5 ? 'bg-green-400' : smileScore >= 0.3 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${smilePct}%` }}
            />
          </div>
          <p className="text-white text-[10px] text-center mt-1 opacity-80">Mức nụ cười tối thiểu: 50%</p>
        </div>
      )}

      {/* Manual Capture Button */}
      {!loading && !error && onManualCapture && (
        <div className="absolute bottom-14 left-0 right-0 flex justify-center z-20">
          <button
            onClick={handleManualCapture}
            className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-100"
          >
            <span className="material-symbols-outlined text-[#0F1E44] text-3xl">photo_camera</span>
          </button>
        </div>
      )}
    </div>
  );
};

const CheckInCheckOut: React.FC<CheckInCheckOutProps> = ({ employeeId, onCheckIn }) => {
  const [now, setNow] = useState(new Date());
  const [address, setAddress] = useState('Đang lấy vị trí...');
  const [locationReady, setLocationReady] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [view, setView] = useState<ModalView>('idle');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkInMethod, setCheckInMethod] = useState<CheckInMethod | null>(null);
  const [actionType, setActionType] = useState<ActionType>('checkin');

  // Fallback state
  const [cameraRetryCount, setCameraRetryCount] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gpsError, setGpsError] = useState('');
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLocked, setPinLocked] = useState(false);
  const [pinLockTimer, setPinLockTimer] = useState(0);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // PIN lock timer
  useEffect(() => {
    if (pinLocked && pinLockTimer > 0) {
      const timer = setInterval(() => {
        setPinLockTimer((prev) => {
          if (prev <= 1) {
            setPinLocked(false);
            setPinAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [pinLocked, pinLockTimer]);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setAddress('Thiết bị không hỗ trợ định vị');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=vi`
          );
          const data = await res.json();
          const display =
            data?.display_name?.split(',').slice(0, 3).join(',') ||
            `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
          setAddress(display);
        } catch {
          setAddress(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        }
        setLocationReady(true);
      },
      () => {
        setAddress('Không thể lấy vị trí');
        setLocationReady(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  const formatDate = (d: Date) =>
    d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const captureCurrentFrame = useCallback(() => {
    const video = document.querySelector('#smile-video video') as HTMLVideoElement;
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
      setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
    } else {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
    }
    setTimeout(() => setView('review'), 500);
  }, []);

  const handleSmileDetected = useCallback(() => {
    captureCurrentFrame();
  }, [captureCurrentFrame]);

  const handleManualCapture = useCallback(() => {
    captureCurrentFrame();
  }, [captureCurrentFrame]);

  // Camera error handler
  const handleCameraError = useCallback((error: string) => {
    setCameraError(error);
    setCameraRetryCount((prev) => prev + 1);
  }, []);

  const createRecord = (method: CheckInMethod, photo: string = '', location?: any, pinAttempt?: number, fallbackReason?: string) => {
    const now = new Date();
    const newRecord: CheckInRecord = {
      id: `checkin-${Date.now()}`,
      type: actionType,
      time: formatTime(now),
      address,
      photo,
      smileDetected: method === 'photo',
      timestamp: now.getTime(),
      checkInMethod: method,
      location,
      pinAttempt,
      fallbackReason,
    };
    setRecord(newRecord);
    setCheckInMethod(method);
    setView('success');
    onCheckIn(newRecord);

    if (actionType === 'checkin') {
      setHasCheckedIn(true);
      setCheckInTime(formatTime(now));
    } else {
      setHasCheckedIn(false);
      setCheckInTime(null);
    }
  };

  const handleConfirm = () => {
    createRecord('photo', capturedPhoto || '');
  };

  const handleCaptureClick = (type: ActionType) => {
    setActionType(type);
    setCameraRetryCount(0);
    setCameraError('');
    setView('permission');
  };

  const handlePermissionAllow = () => {
    setView('camera');
  };

  const handlePermissionDeny = () => {
    setView('fallback-select');
  };

  // Camera failed - show fallback
  const handleCameraFailed = () => {
    setView('fallback-select');
  };

  // GPS Check-in
  const handleGPSCheckIn = async () => {
    setView('gps');
    setGpsStatus('loading');
    setGpsError('');

    try {
      const position = await getCurrentPosition();
      const { within, distance } = isWithinStoreRadius(
        position.coords.latitude,
        position.coords.longitude
      );

      setGpsDistance(distance);

      if (within) {
        setGpsStatus('success');
        setTimeout(() => {
          createRecord(
            'gps',
            '',
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              distanceFromStore: distance,
            },
            undefined,
            cameraError || 'user_choice'
          );
        }, 1500);
      } else {
        setGpsStatus('error');
        setGpsError(`Bạn đang cách cửa hàng ${distance}m. Vui lòng đến trong phạm vi 100m.`);
      }
    } catch (err: any) {
      setGpsStatus('error');
      setGpsError(getLocationErrorMessage(err));
    }
  };

  // PIN Check-in
  const handlePinCheckIn = () => {
    setView('pin');
    setPinInput('');
    setPinError('');
  };

  const handlePinSubmit = () => {
    if (pinLocked) return;

    const today = new Date().toISOString().split('T')[0];
    const shiftType = getCurrentShiftType();
    const isValid = validateShiftPin(pinInput, today, shiftType);

    if (isValid) {
      createRecord('pin', '', undefined, pinAttempts + 1, cameraError || 'user_choice');
    } else {
      const newAttempts = pinAttempts + 1;
      setPinAttempts(newAttempts);
      setPinError('Mã PIN không đúng. Vui lòng thử lại.');

      if (newAttempts >= 3) {
        setPinLocked(true);
        setPinLockTimer(300); // 5 minutes
        setPinError('Đã nhập sai 3 lần. Vui lòng thử lại sau 5 phút.');
      }
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setView('camera');
  };

  const handleClose = () => {
    setView('idle');
    setCapturedPhoto(null);
    setRecord(null);
    setCameraRetryCount(0);
    setCameraError('');
    setGpsStatus('idle');
    setGpsError('');
    setGpsDistance(null);
    setPinInput('');
    setPinError('');
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const currentPin = generateShiftPin(todayStr, getCurrentShiftType());

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
            {!locationReady && (
              <div className="ml-auto mt-0.5">
                <div className="w-4 h-4 border-2 border-[#EFC14B]/30 border-t-[#EFC14B] rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Action */}
        <div className="px-5 py-4">
          {!hasCheckedIn ? (
            <>
              <button
                onClick={() => handleCaptureClick('checkin')}
                disabled={view !== 'idle'}
                className="w-full bg-[#0F1E44] text-white rounded-xl h-[52px] flex items-center justify-center gap-2.5 shadow-md hover:bg-[#1A2D5A] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined fill text-[22px]">add_a_photo</span>
                <span className="font-semibold text-base">Check-in ngay</span>
              </button>
              <p className="text-[11px] text-[#7A829A] text-center mt-2">
                📸 Chụp ảnh nụ cười để xác nhận điểm danh
              </p>

              {/* Show fallback button after 2 camera failures */}
              {cameraRetryCount >= 2 && (
                <button
                  onClick={handleCameraFailed}
                  className="w-full mt-3 bg-[#FDF8EE] border border-[#E8DFD0] text-[#0F1E44] rounded-xl h-10 flex items-center justify-center gap-2 text-sm font-medium hover:bg-[#EFC14B]/10 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  Dùng phương án dự phòng
                </button>
              )}
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-700">Đã check-in lúc {checkInTime}</p>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      {getCheckInMethodLabel(checkInMethod || 'photo')}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCaptureClick('checkout')}
                disabled={view !== 'idle'}
                className="w-full bg-[#FF3131] text-white rounded-xl h-[52px] flex items-center justify-center gap-2.5 shadow-md hover:bg-[#D42C2C] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined fill text-[22px]">logout</span>
                <span className="font-semibold text-base">Check-out</span>
              </button>
              <p className="text-[11px] text-[#7A829A] text-center mt-2">
                📸 Chụp ảnh để xác nhận kết thúc ca làm việc
              </p>
            </>
          )}
        </div>
      </div>

      {/* Permission Dialog */}
      {view === 'permission' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="w-16 h-16 bg-[#EFC14B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[#0F1E44] text-3xl">photo_camera</span>
            </div>
            <h3 className="font-heading text-xl font-bold text-[#0F1E44] text-center mb-2">
              Cho phép truy cập Camera
            </h3>
            <p className="text-sm text-[#7A829A] text-center mb-6">
              Ứng dụng cần quyền truy cập camera để chụp ảnh xác nhận check-in.
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
                onClick={handlePermissionDeny}
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

      {/* Camera Modal */}
      {view === 'camera' && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3 bg-black">
            <button onClick={handleClose} className="text-white p-1">
              <span className="material-symbols-outlined">close</span>
            </button>
            <p className="text-white text-sm font-semibold">{actionType === 'checkin' ? 'Check-in' : 'Check-out'} - Chụp ảnh nụ cười</p>
            <div className="w-8" />
          </div>

          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div id="smile-video">
                <SmileDetector
                  onDetected={handleSmileDetected}
                  onManualCapture={handleManualCapture}
                  onCameraError={handleCameraError}
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
                onClick={handleCameraFailed}
                className="w-full py-2.5 bg-[#EFC14B] text-[#0F1E44] rounded-xl text-sm font-semibold"
              >
                Dùng phương án dự phòng
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fallback Selection Modal */}
      {view === 'fallback-select' && (
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
                onClick={handlePinCheckIn}
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
              onClick={handleClose}
              className="w-full py-2.5 text-sm font-medium text-[#7A829A] hover:text-[#0F1E44]"
            >
              Quay lại
            </button>
          </div>
        </div>
      )}

      {/* GPS Check-in Modal */}
      {view === 'gps' && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            {gpsStatus === 'loading' && (
              <>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
                <h3 className="font-heading text-lg font-bold text-[#0F1E44] mb-2">Đang kiểm tra vị trí...</h3>
                <p className="text-sm text-[#7A829A]">Vui lòng đợi trong giây lát</p>
              </>
            )}

            {gpsStatus === 'success' && (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-green-700 mb-2">Điểm danh thành công!</h3>
                <p className="text-sm text-[#7A829A]">📍 Xác nhận vị trí: {gpsDistance}m từ cửa hàng</p>
              </>
            )}

            {gpsStatus === 'error' && (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
                </div>
                <h3 className="font-heading text-lg font-bold text-[#FF3131] mb-2">Không thể điểm danh</h3>
                <p className="text-sm text-[#7A829A] mb-4">{gpsError}</p>
                <button
                  onClick={handleClose}
                  className="w-full py-2.5 bg-[#0F1E44] text-white rounded-xl text-sm font-semibold"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* PIN Check-in Modal */}
      {view === 'pin' && (
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
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPinInput(val);
                setPinError('');
              }}
              placeholder="000000"
              className="w-full text-center text-2xl font-bold tracking-[0.3em] py-3 border border-[#E8DFD0] rounded-xl focus:border-[#EFC14B] outline-none mb-2"
              disabled={pinLocked}
              maxLength={6}
            />

            {pinError && (
              <p className="text-xs text-[#FF3131] text-center mb-3">{pinError}</p>
            )}

            {pinLocked && (
              <p className="text-xs text-[#7A829A] text-center mb-3">
                Thử lại sau {Math.floor(pinLockTimer / 60)}:{(pinLockTimer % 60).toString().padStart(2, '0')}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[#7A829A] hover:bg-[#FDF8EE]"
              >
                Hủy
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={pinInput.length !== 6 || pinLocked}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0F1E44] text-white hover:bg-[#1A2D5A] disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {view === 'review' && capturedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-xl font-bold text-[#0F1E44]">
                  Xác nhận {actionType === 'checkin' ? 'check-in' : 'check-out'}
                </h3>
                <button onClick={handleClose} className="w-8 h-8 rounded-full bg-[#FDF8EE] flex items-center justify-center">
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
                onClick={handleRetake}
                className="flex-1 h-12 rounded-xl border-2 border-[#E8DFD0] text-[#7A829A] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#FDF8EE] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Chụp lại
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-12 rounded-xl bg-[#0F1E44] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#1A2D5A] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg fill">check</span>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {view === 'success' && record && (
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
                <span className="text-xs text-[#7A829A]">Thời gian</span>
                <span className="text-xs font-bold text-[#0F1E44]">{record.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-[#7A829A]">Phương thức</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getCheckInMethodColor(record.checkInMethod)}`}>
                  {getCheckInMethodLabel(record.checkInMethod)}
                </span>
              </div>
              {record.location && (
                <div className="flex justify-between">
                  <span className="text-xs text-[#7A829A]">Khoảng cách</span>
                  <span className="text-xs font-bold text-[#0F1E44]">{record.location.distanceFromStore}m</span>
                </div>
              )}
            </div>

            {record.photo && (
              <div className="rounded-lg overflow-hidden border border-[#E8DFD0] mb-5">
                <img src={record.photo} alt="Check-in" className="w-full aspect-video object-cover" style={{ transform: 'scaleX(-1)' }} />
              </div>
            )}

            <button
              onClick={handleClose}
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
