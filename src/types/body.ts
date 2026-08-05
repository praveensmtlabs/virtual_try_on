export type BodyShapeId =
  | "slim"
  | "average"
  | "athletic"
  | "muscular"
  | "bodybuilder"
  | "plusSize";

export interface BodyMeasurements {
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hips: number;
  shoulderWidth: number;
  armSize: number;
  legSize: number;
}

export interface BodyShapeState {
  shapeId: BodyShapeId;
  measurements: BodyMeasurements;
}

export const DEFAULT_MEASUREMENTS: Record<BodyShapeId, BodyMeasurements> = {
  slim: {
    height: 1.75,
    weight: 60,
    chest: 0.86,
    waist: 0.72,
    hips: 0.88,
    shoulderWidth: 0.9,
    armSize: 0.85,
    legSize: 0.9,
  },
  average: {
    height: 1.75,
    weight: 72,
    chest: 1,
    waist: 1,
    hips: 1,
    shoulderWidth: 1,
    armSize: 1,
    legSize: 1,
  },
  athletic: {
    height: 1.78,
    weight: 78,
    chest: 1.08,
    waist: 0.92,
    hips: 0.98,
    shoulderWidth: 1.08,
    armSize: 1.06,
    legSize: 1.04,
  },
  muscular: {
    height: 1.8,
    weight: 88,
    chest: 1.18,
    waist: 0.95,
    hips: 1.05,
    shoulderWidth: 1.16,
    armSize: 1.14,
    legSize: 1.1,
  },
  bodybuilder: {
    height: 1.8,
    weight: 100,
    chest: 1.32,
    waist: 0.98,
    hips: 1.12,
    shoulderWidth: 1.28,
    armSize: 1.26,
    legSize: 1.18,
  },
  plusSize: {
    height: 1.75,
    weight: 105,
    chest: 1.22,
    waist: 1.28,
    hips: 1.3,
    shoulderWidth: 1.1,
    armSize: 1.12,
    legSize: 1.16,
  },
};
