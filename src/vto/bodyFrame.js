import * as THREE from 'three';

export const POSE = {
    NOSE: 0,
    LEFT_EYE_INNER: 1,
    LEFT_EYE: 2,
    LEFT_EYE_OUTER: 3,
    RIGHT_EYE_INNER: 4,
    RIGHT_EYE: 5,
    RIGHT_EYE_OUTER: 6,
    LEFT_EAR: 7,
    RIGHT_EAR: 8,
    MOUTH_LEFT: 9,
    MOUTH_RIGHT: 10,
    L_SHOULDER: 11,
    R_SHOULDER: 12,
    L_ELBOW: 13,
    R_ELBOW: 14,
    L_WRIST: 15,
    R_WRIST: 16,
    L_PINKY: 17,
    R_PINKY: 18,
    L_INDEX: 19,
    R_INDEX: 20,
    L_THUMB: 21,
    R_THUMB: 22,
    L_HIP: 23,
    R_HIP: 24,
    L_KNEE: 25,
    R_KNEE: 26,
    L_ANKLE: 27,
    R_ANKLE: 28,
    L_HEEL: 29,
    R_HEEL: 30,
    L_FOOT_INDEX: 31,
    R_FOOT_INDEX: 32
};

const isLandmarkVisible = (landmark, threshold) => {
    if (!landmark) return false;
    if (threshold == null) return true;
    if (typeof landmark.visibility !== 'number') return true;
    return landmark.visibility >= threshold;
};

const toVector = (landmark) => new THREE.Vector3(landmark.x, landmark.y, landmark.z);

export function limbDirection(landmarks, fromIndex, toIndex, visibilityThreshold = 0.5) {
    if (!landmarks || !Array.isArray(landmarks)) return null;
    const from = landmarks[fromIndex];
    const to = landmarks[toIndex];
    if (!isLandmarkVisible(from, visibilityThreshold) || !isLandmarkVisible(to, visibilityThreshold)) {
        return null;
    }

    const direction = toVector(to).sub(toVector(from));
    if (direction.lengthSq() < 1e-8) {
        return null;
    }
    return direction.normalize();
}

export function computeBodyBasis(landmarks, visibilityThreshold = 0.5, noseIndex = POSE.NOSE) {
    if (!landmarks || !Array.isArray(landmarks)) return null;
    const ls = landmarks[POSE.L_SHOULDER];
    const rs = landmarks[POSE.R_SHOULDER];
    const lh = landmarks[POSE.L_HIP];
    const rh = landmarks[POSE.R_HIP];

    if (!isLandmarkVisible(ls, visibilityThreshold) || !isLandmarkVisible(rs, visibilityThreshold) ||
        !isLandmarkVisible(lh, visibilityThreshold) || !isLandmarkVisible(rh, visibilityThreshold)) {
        return null;
    }

    const leftShoulder = toVector(ls);
    const rightShoulder = toVector(rs);
    const leftHip = toVector(lh);
    const rightHip = toVector(rh);

    const shoulderDirection = rightShoulder.clone().sub(leftShoulder);
    const hipMidpoint = leftHip.clone().add(rightHip).multiplyScalar(0.5);
    const shoulderMidpoint = leftShoulder.clone().add(rightShoulder).multiplyScalar(0.5);
    const upward = shoulderMidpoint.clone().sub(hipMidpoint);

    if (shoulderDirection.lengthSq() < 1e-8 || upward.lengthSq() < 1e-8) {
        return null;
    }

    const x = shoulderDirection.clone().normalize();
    const z = new THREE.Vector3().crossVectors(x, upward).normalize();
    if (z.lengthSq() < 1e-8) {
        return null;
    }

    const y = new THREE.Vector3().crossVectors(z, x).normalize();
    return { x, y, z };
}
