/**
 * CameraCapture — camera preview + manual shutter, NO smile AI.
 *
 * Replaced SmileDetector (2026-09-24): the check-in photo is a simple
 * presence proof — the employee presses the shutter, the frame is captured,
 * done. Removing face-api.js also removes ~6MB of model loading and the
 * "AI didn't detect your smile" dead-ends on devices where detection
 * misbehaved.
 *
 * Contract: the component owns NOTHING about attendance records — it only
 * reports a captured frame (onCapture) and camera failures (onCameraError).
 */

import React, { useState, useRef, useEffect } from 'react';

const CameraCapture: React.FC<{
  onCapture: () => void;
  onCameraError?: (error: string) => void;
}> = ({ onCapture, onCameraError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
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
      } catch (err: unknown) {
        if (mounted) {
          const errorMsg = err instanceof Error ? err.message : 'Không thể truy cập camera';
          setError(errorMsg);
          onCameraError?.(errorMsg);
        }
      }
    };

    start();

    return () => {
      mounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [onCameraError]);

  return (
    <div className="relative w-full h-[68vh] min-h-[420px] max-h-[760px] bg-black overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-white/10">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      {/* Loading overlay */}
      {loading && !error && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm font-medium tracking-wide">Đang mở camera...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 bg-black/75 flex items-center justify-center p-4 z-30">
          <div className="bg-white rounded-2xl p-5 max-w-xs text-center shadow-xl">
            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
            <p className="text-sm text-gray-600 mt-3 leading-6">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
            <div className="rounded-full bg-black/35 px-2.5 py-1.5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] uppercase tracking-[0.22em] text-white/75 font-semibold">Selfie</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-black/35 px-2.5 py-1.5 border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
              <span className="text-[10px] text-white/80 font-medium">HD</span>
            </div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="relative">
              <div className="w-40 h-52 rounded-[42%] border-2 border-white/85 shadow-[0_0_0_3px_rgba(255,255,255,0.08)]" />
              <div className="absolute -inset-3 rounded-[45%] border border-white/20" />
            </div>
          </div>

          <div className="absolute left-0 right-0 bottom-0 z-20 px-4 pb-5 pt-14 bg-gradient-to-t from-black/80 via-black/35 to-transparent">
            <div className="mb-5 flex items-center justify-center">
              <div className="rounded-full bg-black/35 border border-white/10 backdrop-blur-md px-4 py-2 text-white/85 text-xs font-medium shadow-lg">
                Đặt khuôn mặt vào khung rồi bấm chụp
              </div>
            </div>

            <div className="flex items-center justify-center">
              <button
                onClick={onCapture}
                className="group relative flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.1),0_0_28px_rgba(255,255,255,0.35)] active:scale-95 transition-transform duration-150"
                aria-label="Chụp ảnh"
              >
                <span className="absolute inset-[10px] rounded-full border border-[#0F1E44]/20" />
                <span className="absolute inset-[3px] rounded-full bg-[#F5F7FB] group-active:scale-95 transition-transform" />
                <span className="material-symbols-outlined text-[#0F1E44] text-3xl relative z-10">photo_camera</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CameraCapture;
