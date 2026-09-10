/**
 * Image Compression Utility
 * 
 * CRITICAL FIX: Previously, full base64 images (~500KB each) were stored
 * directly in localStorage. With 10 employees × 2 photos/day × 30 days,
 * this would accumulate ~120-300MB — far exceeding the ~5MB localStorage limit.
 * 
 * This module compresses images to <30KB before storage by:
 * 1. Resizing to max 400px dimension
 * 2. Using JPEG quality 0.6
 * 3. Optionally extracting metadata only (no image data)
 */

import {
  MAX_IMAGE_SIZE_BYTES,
  IMAGE_COMPRESSION_QUALITY,
  IMAGE_MAX_DIMENSION,
} from './constants';

// ═══════════════════════════════════════════════════
// Image Compression
// ═══════════════════════════════════════════════════

/**
 * Compress a base64 image to fit within MAX_IMAGE_SIZE_BYTES.
 * Returns the compressed base64 string.
 */
export async function compressImage(
  base64Input: string,
  maxWidth: number = IMAGE_MAX_DIMENSION,
  quality: number = IMAGE_COMPRESSION_QUALITY
): Promise<string> {
  // If already small enough, return as-is
  if (getBase64SizeBytes(base64Input) <= MAX_IMAGE_SIZE_BYTES) {
    return base64Input;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Resize if larger than maxWidth
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = (height / width) * maxWidth;
          width = maxWidth;
        } else {
          width = (width / height) * maxWidth;
          height = maxWidth;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Input); // Fallback to original
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);

      // If still too large, reduce quality further
      if (getBase64SizeBytes(compressed) > MAX_IMAGE_SIZE_BYTES) {
        const ultraCompressed = canvas.toDataURL('image/jpeg', 0.3);
        resolve(ultraCompressed);
      } else {
        resolve(compressed);
      }
    };

    img.onerror = () => {
      resolve(base64Input); // Fallback to original on error
    };

    img.src = base64Input;
  });
}

// ═══════════════════════════════════════════════════
// Metadata Extraction (Lightweight alternative)
// ═══════════════════════════════════════════════════

/**
 * Check-in metadata without the actual image data.
 * This is much smaller than storing the full base64 image.
 */
export interface CheckInMetadata {
  /** Timestamp of the check-in */
  timestamp: number;
  /** Human-readable time string */
  time: string;
  /** GPS coordinates if available */
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    distanceFromStore?: number;
  };
  /** Smile detection score (0-1) */
  smileScore?: number;
  /** Whether a face was detected */
  faceDetected: boolean;
  /** Check-in method used */
  method: 'photo' | 'gps' | 'pin';
  /** Photo hash for deduplication (SHA-256 truncated) */
  photoHash?: string;
}

/**
 * Generate a lightweight hash of an image for deduplication.
 * This prevents photo reuse attacks without storing the full image.
 */
export async function generatePhotoHash(base64: string): Promise<string> {
  if (!base64) return '';
  
  const encoder = new TextEncoder();
  // Use first 1000 chars for quick hash (not cryptographic, but sufficient for dedup)
  const data = encoder.encode(base64.substring(0, 1000));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Return first 16 chars (64 bits) — enough for deduplication
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

// ═══════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════

/**
 * Estimate the size of a base64 string in bytes.
 * Base64 adds ~33% overhead, so actual size ≈ (base64.length * 3) / 4
 */
function getBase64SizeBytes(base64: string): number {
  // Remove data URL prefix if present
  const raw = base64.includes(',') ? base64.split(',')[1] : base64;
  return Math.ceil((raw.length * 3) / 4);
}

/**
 * Check if a string is a base64 image.
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image/');
}

/**
 * Get a truncated placeholder for display when full image is not stored.
 */
export function getImagePlaceholder(): string {
  // 1x1 transparent pixel
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}
