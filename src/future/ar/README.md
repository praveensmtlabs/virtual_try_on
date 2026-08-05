# Future: Live AR Try-On

**Not implemented in Phase 1.**

## Planned flow

1. `navigator.mediaDevices.getUserMedia()`
2. MediaPipe Pose / Selfie Segmentation (or TFJS Pose)
3. Body landmarks → approximate skeleton
4. Garment scale / position from landmarks
5. Three.js / WebGL overlay update each frame
6. Capture photo / video

## Extension point

See `ARTryOnSession` interface in `session.ts`.
Keep camera + ML off the main studio Canvas until this module is activated.
