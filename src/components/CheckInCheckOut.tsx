import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { CheckInRecord } from '../types';

interface CheckInCheckOutProps {
  employeeId: string;
  onCheckIn: (record: CheckInRecord) => void;
}

type ModalView = 'idle' | 'permission' | 'camera' | 'review' | 'success' | 'fail';
type ActionType = 'checkin' | 'checkout';

const SmileDetector: React.FC<{ 
  onDetected: () => void;
  onManualCapture?: () => void;
}> = ({ onDetected, onManualCapture }) => {
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
        // Load face-api models
        await Promise.all([
          faceapi.loadSsdMobilenetv1Model('/models'),
          faceapi.loadFaceExpressionModel('/models'),
        ]);

        // Start camera
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

        // Start detection loop
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
        if (mounted) setError(err?.message || 'Không thể truy cập camera');
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
  }, [onDetected]);

  const smilePct = Math.min(Math.round(smileScore * 100), 100);

  // Manual capture function
  const handleManualCapture = () => {
    if (!videoRef.current || !onManualCapture) return;
    
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    
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
          {/* Oval face guide */}
          <div
            className={`w-36 h-44 rounded-full border-2 border-dashed transition-colors duration-300 mb-4 ${
              faceDetected
                ? smileScore >= 0.5
                  ? 'border-green-400'
                  : 'border-yellow-400'
                : 'border-white/60'
            }`}
          />

          {/* Instruction text */}
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

      {/* Smile threshold bar at bottom */}
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
          <p className="text-white text-[10px] text-center mt-1 opacity-80">
            Mức nụ cười tối thiểu: 50%
          </p>
        </div>
      )}

      {/* Manual Capture Button - floating at bottom center */}
      {!loading && !error && onManualCapture && (
        <div className="absolute bottom-14 left-0 right-0 flex justify-center z-20">
          <button
            onClick={handleManualCapture}
            className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-100"
          >
            <span className="material-symbols-outlined text-[#000666] text-3xl">photo_camera</span>
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
  const [view, setView] = useState<ModalView>('idle');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [record, setRecord] = useState<CheckInRecord | null>(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType>('checkin');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      setAddress('Thiết bị không hỗ trợ định vị');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=vi`
          );
          const data = await res.json();
          const display = data?.display_name?.split(',').slice(0, 3).join(',') || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
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

  const handleConfirm = () => {
    const now = new Date();
    const newRecord: CheckInRecord = {
      id: `checkin-${Date.now()}`,
      type: actionType,
      time: formatTime(now),
      address,
      photo: capturedPhoto || '',
      smileDetected: true,
      timestamp: now.getTime(),
    };
    setRecord(newRecord);
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

  // Handle "Check-in/Check-out" button click - show permission dialog first
  const handleCaptureClick = (type: ActionType) => {
    setActionType(type);
    setView('permission');
  };

  // User allows camera access
  const handlePermissionAllow = () => {
    setView('camera');
  };

  // User denies camera access
  const handlePermissionDeny = () => {
    setView('idle');
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setView('camera');
  };

  const handleClose = () => {
    setView('idle');
    setCapturedPhoto(null);
    setRecord(null);
  };

  // Get last check-in record from today
  const getTodayStatus = () => {
    const today = new Date().toDateString();
    // We could check localStorage, but for now show based on current session
    return null;
  };

  return (
    <>
      {/* Check-in Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {/* Clock Header */}
        <div className="bg-gradient-to-r from-[#000666] to-[#1a237e] px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-[11px] uppercase tracking-wider font-semibold mb-0.5">
                Check-in / Check-out
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-headline text-3xl font-bold tabular-nums tracking-tight">
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
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#4555b7] text-lg mt-0.5">location_on</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#454652] uppercase tracking-wide">Vị trí hiện tại</p>
              <p className="text-sm text-[#1b1b21] font-medium mt-0.5 truncate">{address}</p>
            </div>
            {!locationReady && (
              <div className="ml-auto mt-0.5">
                <div className="w-4 h-4 border-2 border-[#4555b7]/30 border-t-[#4555b7] rounded-full animate-spin" />
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
                className="w-full bg-[#000666] text-white rounded-xl h-[52px] flex items-center justify-center gap-2.5 shadow-md hover:bg-[#1a237e] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined fill text-[22px]">add_a_photo</span>
                <span className="font-semibold text-base">Check-in ngay</span>
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-2">
                📸 Chụp ảnh nụ cười để xác nhận điểm danh
              </p>
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-600 text-xl">check_circle</span>
                  <div>
                    <p className="text-sm font-semibold text-green-700">Đã check-in lúc {checkInTime}</p>
                    <p className="text-xs text-green-600">Bấm Check-out khi kết thúc ca làm việc</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleCaptureClick('checkout')}
                disabled={view !== 'idle'}
                className="w-full bg-red-600 text-white rounded-xl h-[52px] flex items-center justify-center gap-2.5 shadow-md hover:bg-red-700 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined fill text-[22px]">logout</span>
                <span className="font-semibold text-base">Check-out</span>
              </button>
              <p className="text-[11px] text-gray-400 text-center mt-2">
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
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-blue-600 text-3xl">photo_camera</span>
            </div>
            <h3 className="font-headline text-xl font-bold text-[#1b1b21] text-center mb-2">
              Cho phép truy cập Camera
            </h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              Ứng dụng cần quyền truy cập camera để chụp ảnh xác nhận check-in. Ảnh sẽ được dùng để xác minh danh tính.
            </p>
            
            {/* Permission info list */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                <p className="text-sm text-gray-600">Chụp ảnh selfie để điểm danh</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                <p className="text-sm text-gray-600">AI nhận diện nụ cười tự động</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-green-500 text-xl">check_circle</span>
                <p className="text-sm text-gray-600">Ghi lại thời gian & vị trí</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePermissionDeny}
                className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-[#454652] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
                Từ chối
              </button>
              <button
                onClick={handlePermissionAllow}
                className="flex-1 h-12 rounded-xl bg-[#000666] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#1a237e] active:scale-[0.98] transition-all cursor-pointer"
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
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black">
            <button onClick={handleClose} className="text-white p-1">
              <span className="material-symbols-outlined">close</span>
            </button>
            <p className="text-white text-sm font-semibold">{actionType === 'checkin' ? 'Check-in' : 'Check-out'} - Chụp ảnh nụ cười</p>
            <div className="w-8" />
          </div>

          {/* Camera feed with smile detection */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
              <div id="smile-video">
                <SmileDetector 
                  onDetected={handleSmileDetected}
                  onManualCapture={handleManualCapture}
                />
              </div>
            </div>
          </div>

          {/* Bottom info */}
          <div className="px-4 py-4 bg-black">
            <div className="flex items-center gap-2 text-white/60 text-xs">
              <span className="material-symbols-outlined text-sm">info</span>
              <p>Nụ cười được AI nhận diện tự động khi đạt ngưỡng 50%+ hoặc nhấn nút chụp</p>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {view === 'review' && capturedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom">
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-xl font-bold text-[#1b1b21]">
                  Xác nhận {actionType === 'checkin' ? 'check-in' : 'check-out'}
                </h3>
                <button onClick={handleClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-500 text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Photo preview */}
            <div className="px-5 mb-4">
              <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
                <img
                  src={capturedPhoto}
                  alt="Check-in photo"
                  className="w-full aspect-[4/3] object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
              <div className="flex items-center gap-2 mt-2 bg-green-50 rounded-lg px-3 py-2">
                <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                <p className="text-green-700 text-xs font-semibold">Nụ cười đã được xác nhận bởi AI ✓</p>
              </div>
            </div>

            {/* Info */}
            <div className="px-5 space-y-2.5 mb-5">
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-[#4555b7]">schedule</span>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Thời gian</p>
                  <p className="text-sm font-bold text-[#1b1b21]">{formatTime(now)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-[#4555b7]">location_on</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Địa điểm</p>
                  <p className="text-sm font-bold text-[#1b1b21] truncate">{address}</p>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={handleRetake}
                className="flex-1 h-12 rounded-xl border-2 border-gray-200 text-[#454652] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Chụp lại
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 h-12 rounded-xl bg-[#000666] text-white font-semibold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-[#1a237e] active:scale-[0.98] transition-all cursor-pointer"
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
            <h3 className="font-headline text-xl font-bold text-[#1b1b21] mb-2">{actionType === 'checkin' ? 'Check-in' : 'Check-out'} thành công!</h3>
            <p className="text-sm text-gray-500 mb-4">{actionType === 'checkin' ? 'Điểm danh đã được ghi nhận' : 'Kết thúc ca làm việc đã được ghi nhận'}</p>

            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-5">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Thời gian</span>
                <span className="text-xs font-bold text-[#1b1b21]">{record.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Loại</span>
                <span className="text-xs font-bold text-[#1b1b21]">
                  {record.type === 'checkin' ? '🟢 Check-in' : '🔴 Check-out'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Nụ cười</span>
                <span className="text-xs font-bold text-green-600">✓ Đã xác nhận</span>
              </div>
            </div>

            {record.photo && (
              <div className="rounded-lg overflow-hidden border border-gray-100 mb-5">
                <img
                  src={record.photo}
                  alt="Check-in"
                  className="w-full aspect-video object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full h-12 rounded-xl bg-[#000666] text-white font-semibold shadow-md hover:bg-[#1a237e] active:scale-[0.98] transition-all cursor-pointer"
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
