/**
 * SmileDetector — camera + face-api.js smile detection UI.
 *
 * Moved verbatim out of CheckInCheckOut.tsx (which is being split: business
 * rules live in src/utils/attendanceGate.ts, persistence in
 * src/utils/attendanceStore.ts, presentation here). This component knows
 * NOTHING about attendance records — it only reports "a smile happened"
 * (onDetected / onManualCapture) and camera failures (onCameraError).
 */

import React, { useState, useRef, useEffect } from 'react';
import type * as FaceApiNamespace from 'face-api.js';
import { loadFaceApiModels } from '../utils/faceApiModel';

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
        // FIX: Use singleton model loader instead of loading 6MB models every mount
        // This ensures models are loaded only once and cached in memory.
        // The faceapi namespace is typed via FaceApiNamespace (type-only import,
        // erased at build) and fetched at runtime here — first camera open.
        const modelsLoaded = await loadFaceApiModels();
        const faceapi: typeof FaceApiNamespace = await import('face-api.js');
        if (!modelsLoaded) {
          throw new Error('Không thể tải model nhận diện khuôn mặt');
        }

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

export default SmileDetector;
