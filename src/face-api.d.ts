declare module 'face-api.js' {
  export function loadSsdMobilenetv1Model(url: string): Promise<void>;
  export function loadFaceExpressionModel(url: string): Promise<void>;
  export function detectAllFaces(
    input: HTMLVideoElement | HTMLCanvasElement,
    options?: any
  ): FaceDetectionTask;
  export function detectSingleFace(
    input: HTMLVideoElement | HTMLCanvasElement,
    options?: any
  ): FaceDetectionTask;

  interface FaceDetectionTask {
    withFaceExpressions(): Promise<FaceDetectionWithExpressions[]>;
  }

  interface FaceDetectionWithExpressions {
    detection: {
      box: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    };
    expressions: {
      happy: number;
      sad: number;
      angry: number;
      neutral: number;
      fearful: number;
      disgusted: number;
      surprised: number;
    };
  }

  export class SsdMobilenetv1Options {
    constructor(options?: { minConfidence?: number; maxResults?: number });
  }

  export const ssdMobilenetv1: any;
}
