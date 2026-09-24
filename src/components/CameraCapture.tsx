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
    <div className="relative w-full aspect-[4/3] bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* Loading overlay */}
      {loading && !error && (
        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-10">
          <div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white text-sm font-medium">Đang mở camera...</p>
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

      {/* Face guide (static oval, purely cosmetic framing aid) */}
      {!loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-36 h-44 rounded-full border-2 border-dashed border-white/60" />
          <div className="absolute bottom-14 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white text-sm font-medium">Đặt khuôn mặt vào vòng tròn</span>
          </div>
        </div>
      )}

      {/* Shutter button */}
      {!loading && !error && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-20">
          <button
            onClick={onCapture}
            className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:bg-gray-100"
            aria-label="Chụp ảnh"
          >
            <span className="material-symbols-outlined text-[#0F1E44] text-3xl">photo_camera</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;
