/**
 * Face-API.js Model Loader — Singleton Pattern
 * 
 * CRITICAL FIX: Previously, the face-api.js models (~6MB total) were loaded
 * every time the CheckInCheckOut component mounted. This caused:
 * - Slow check-in on mobile (3G/4G)
 * - Unnecessary network requests
 * - Poor UX with repeated "Đang tải AI model..." messages
 * 
 * This module ensures models are loaded ONCE and cached in memory.
 */

import * as faceapi from 'face-api.js';

// ═══════════════════════════════════════════════════
// Singleton Model Manager
// ═══════════════════════════════════════════════════

type LoadState = 'idle' | 'loading' | 'loaded' | 'error';

class FaceApiModelManager {
  private static instance: FaceApiModelManager;
  private state: LoadState = 'idle';
  private loadPromise: Promise<boolean> | null = null;
  private errorMessage: string = '';

  private constructor() {}

  /**
   * Get the singleton instance.
   */
  static getInstance(): FaceApiModelManager {
    if (!FaceApiModelManager.instance) {
      FaceApiModelManager.instance = new FaceApiModelManager();
    }
    return FaceApiModelManager.instance;
  }

  /**
   * Load models if not already loaded.
   * Returns true if models are ready, false if failed.
   * Subsequent calls return immediately if already loaded.
   */
  async loadModels(): Promise<boolean> {
    // Already loaded — return immediately
    if (this.state === 'loaded') {
      return true;
    }

    // Currently loading — wait for existing promise
    if (this.state === 'loading' && this.loadPromise) {
      return this.loadPromise;
    }

    // Start loading
    this.state = 'loading';
    this.loadPromise = this.doLoad();

    try {
      const result = await this.loadPromise;
      return result;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Check if models are loaded and ready.
   */
  isLoaded(): boolean {
    return this.state === 'loaded';
  }

  /**
   * Get the current load state.
   */
  getState(): LoadState {
    return this.state;
  }

  /**
   * Get the error message if loading failed.
   */
  getError(): string {
    return this.errorMessage;
  }

  /**
   * Reset the manager (for testing or forced reload).
   */
  reset(): void {
    this.state = 'idle';
    this.loadPromise = null;
    this.errorMessage = '';
  }

  /**
   * Internal: Actually load the models from /models directory.
   */
  private async doLoad(): Promise<boolean> {
    try {
      // Load both models in parallel for faster initialization
      await Promise.all([
        faceapi.loadSsdMobilenetv1Model('/models'),
        faceapi.loadFaceExpressionModel('/models'),
      ]);

      this.state = 'loaded';
      this.errorMessage = '';
      console.log('[FaceAPI] Models loaded successfully (singleton)');
      return true;
    } catch (err: any) {
      this.state = 'error';
      this.errorMessage = err?.message || 'Failed to load face detection models';
      console.error('[FaceAPI] Model loading failed:', this.errorMessage);
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════

/**
 * Load face-api.js models (singleton — only loads once).
 * Use this instead of calling faceapi.loadXxxModel directly.
 * 
 * @returns true if models are ready, false if failed
 */
export async function loadFaceApiModels(): Promise<boolean> {
  return FaceApiModelManager.getInstance().loadModels();
}

/**
 * Check if face-api models are ready.
 */
export function areFaceApiModelsLoaded(): boolean {
  return FaceApiModelManager.getInstance().isLoaded();
}

/**
 * Get model loading error message.
 */
export function getFaceApiError(): string {
  return FaceApiModelManager.getInstance().getError();
}

/**
 * Reset the model manager (for testing).
 */
export function resetFaceApiModels(): void {
  FaceApiModelManager.getInstance().reset();
}
