import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarker = null;
let isInitialising = false;
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const MODEL_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/pose_landmarker.task';

export async function initPoseLandmarker() {
    if (poseLandmarker) return poseLandmarker;
    if (isInitialising) {
        while (isInitialising) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        return poseLandmarker;
    }

    isInitialising = true;
    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(WASM_PATH);
        poseLandmarker = await PoseLandmarker.createFromOptions({
            filesetResolver,
            modelAssetPath: MODEL_PATH,
            runningMode: 'VIDEO',
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        return poseLandmarker;
    } finally {
        isInitialising = false;
    }
}

export function detectWorldLandmarks(video, timestamp) {
    if (!poseLandmarker) return null;
    try {
        const result = poseLandmarker.detectForVideo(video, timestamp);
        if (!result) return null;

        const landmarks = result.poseWorldLandmarks || null;
        if (!landmarks) return null;
        return Array.isArray(landmarks) ? landmarks : null;
    } catch (error) {
        console.warn('Pose landmarker detection failed:', error);
        return null;
    }
}
