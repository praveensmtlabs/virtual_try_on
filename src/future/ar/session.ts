/**
 * Future Live AR session contract — stub only.
 * No MediaPipe / getUserMedia implementation in Phase 1.
 */
export interface ARPoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface ARTryOnSession {
  start(): Promise<void>;
  stop(): void;
  onPose(cb: (landmarks: ARPoseLandmark[]) => void): void;
  captureFrame(): Promise<Blob | null>;
}
