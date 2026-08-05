// src/vto/SMPLXBoneMapper.js
//
// Professional avatar clothing system — similar to Ready Player Me / MetaHuman approach.
//
// ARCHITECTURE:
// - The T-shirt GLB keeps its OWN SMPL-X skeleton (never replaced).
// - In mannequin mode: each garment bone is retargeted from the corresponding
//   body bone via alignWithBodyPose(), using a BIND-POSE-RELATIVE ROTATION
//   DELTA (not an absolute quaternion copy) — see that method's docblock for
//   why this matters whenever body and garment don't share one rig.
// - In live-camera mode: MediaPipe landmarks directly drive the garment bones.
//
// This eliminates all the previous math errors from:
//   1. Unit scale mismatches (FBX cm vs GLB meters)
//   2. T-pose vs A-pose boneInverse incompatibilities
//   3. bindMatrix coordinate frame clashes

import * as THREE from 'three';
import { resolveBoneRoles } from './boneRoles';
import { limbDirection, POSE } from './bodyFrame';

// Bones we actively drive. Order matters: parents before children.
const DRIVEN_BONES = [
    // Spine chain
    { bone: 'pelvis',          child: null,           from: null,           to: null           },
    { bone: 'spine1',          child: 'spine2',       from: null,           to: null           },
    { bone: 'spine2',          child: 'spine3',       from: null,           to: null           },
    { bone: 'spine3',          child: null,           from: null,           to: null           },
    // Neck / head
    { bone: 'neck',            child: 'head',         from: null,           to: null           },
    // Left arm chain
    { bone: 'left_collar',     child: 'left_shoulder',from: null,           to: null           },
    { bone: 'left_shoulder',   child: 'left_elbow',   from: POSE.L_SHOULDER,to: POSE.L_ELBOW  },
    { bone: 'left_elbow',      child: 'left_wrist',   from: POSE.L_ELBOW,   to: POSE.L_WRIST  },
    // Right arm chain
    { bone: 'right_collar',    child: 'right_shoulder',from: null,          to: null           },
    { bone: 'right_shoulder',  child: 'right_elbow',  from: POSE.R_SHOULDER,to: POSE.R_ELBOW  },
    { bone: 'right_elbow',     child: 'right_wrist',  from: POSE.R_ELBOW,   to: POSE.R_WRIST  },
];

// Only these bones are driven by MediaPipe live landmarks
const LIVE_POSE_BONES = DRIVEN_BONES.filter(b => b.from !== null);

export class SMPLXPoseMapper {
    constructor(boneData = {}, isMobile = false) {
        this.initialized = false;
        this.roleMap = {};
        this.restAxis = {};         // role -> THREE.Vector3 (rest direction in bone-local space)
        this.bindQuat = {};         // role -> THREE.Quaternion (bone's local bind-pose quaternion)
        this.bindWorldQuat = {};    // role -> THREE.Quaternion (bone's WORLD bind-pose quaternion)
        this.lastQuat = {};         // role -> THREE.Quaternion (for slerp smoothing)
        this.visibilityThreshold = isMobile ? 0.1 : 0.5;
        this.slerpAmount = isMobile ? 0.5 : 0.35;

        this._q = new THREE.Quaternion();
        this._qInv = new THREE.Quaternion();
        this._target = new THREE.Vector3();
        this._worldQuat = new THREE.Quaternion();
        this._parentWorldQuat = new THREE.Quaternion();
        this._parentWorldQuatInv = new THREE.Quaternion();
        this._bindInv = new THREE.Quaternion();
        this._deltaWorld = new THREE.Quaternion();
        this._targetWorld = new THREE.Quaternion();
    }

    /**
     * Call once after loading a garment GLB (or body FBX) to cache all bone references.
     * Works for BOTH SMPL-X rigs and Mixamo FBX rigs.
     */
    initializeBones(riggedModel) {
        this.roleMap = {};
        this.restAxis = {};
        this.bindQuat = {};
        this.bindWorldQuat = {};
        this.lastQuat = {};

        riggedModel?.updateMatrixWorld(true);

        let skeletonBones = [];
        riggedModel?.traverse((obj) => {
            if (obj.isSkinnedMesh && obj.skeleton && skeletonBones.length === 0) {
                skeletonBones = obj.skeleton.bones;
            }
        });

        // Also search for standalone bone hierarchies (FBX models without a skinned mesh)
        if (skeletonBones.length === 0) {
            riggedModel?.traverse((obj) => {
                if (obj.isBone && (!obj.parent || !obj.parent.isBone)) {
                    // Root bone found — collect all descendants
                    const bones = [];
                    obj.traverse(b => { if (b.isBone) bones.push(b); });
                    if (bones.length > skeletonBones.length) skeletonBones = bones;
                }
            });
        }

        if (skeletonBones.length === 0) {
            this.initialized = false;
            return;
        }

        // ── CRITICAL: resolve rig-agnostic bone roles ──────────────────────────────
        // resolveBoneRoles auto-detects Mixamo / SMPL-X / CC_Base from bone names and
        // returns a { roleName → THREE.Bone } map. Without this call, roleMap stays {}
        // (the loop below always sees undefined bones and skips them), initialized stays
        // false, and no retargeting or T-pose corrections ever run.
        this.roleMap = resolveBoneRoles(skeletonBones);

        this.riggedModel = riggedModel;
        const containerWorldQuatInv = new THREE.Quaternion();
        if (riggedModel && riggedModel.parent) {
            riggedModel.parent.updateMatrixWorld(true);
            riggedModel.parent.getWorldQuaternion(containerWorldQuatInv).invert();
        }

        // For each driven bone, cache its bind-pose rest direction (child's local position)
        // and its bind-pose quaternion (so we can reset to rest easily).
        for (const entry of DRIVEN_BONES) {
            const bone = this.roleMap[entry.bone];
            const child = this.roleMap[entry.child];
            if (!bone) continue;

            // Cache bind quaternion (local, and container-relative world for cross-rig retargeting)
            this.bindQuat[entry.bone] = bone.quaternion.clone();
            const wq = bone.getWorldQuaternion(new THREE.Quaternion());
            if (riggedModel && riggedModel.parent) {
                wq.premultiply(containerWorldQuatInv);
            }
            this.bindWorldQuat[entry.bone] = wq;
            this.lastQuat[entry.bone] = bone.quaternion.clone();

            // Cache rest axis (direction from bone to child in bone's local space)
            if (child) {
                const axis = child.position.clone().normalize();
                if (axis.lengthSq() > 1e-8) {
                    this.restAxis[entry.bone] = axis;
                }
            }
        }

        this.initialized = Object.keys(this.bindQuat).length > 0;
        console.log(`[SMPLXPoseMapper] Initialized ${Object.keys(this.bindQuat).length} bones. Mixamo: ${skeletonBones.some(b => /mixamorig/i.test(b.name))}`);
    }

    /**
     * Reset all driven bones to their bind-pose quaternion.
     * Used when switching to mannequin mode.
     */
    resetBones() {
        if (!this.initialized) return;
        for (const entry of DRIVEN_BONES) {
            const bone = this.roleMap[entry.bone];
            const bindQ = this.bindQuat[entry.bone];
            if (bone && bindQ) {
                bone.quaternion.copy(bindQ);
                if (this.lastQuat[entry.bone]) this.lastQuat[entry.bone].copy(bindQ);
            }
        }
    }

    /**
     * PROFESSIONAL MANNEQUIN MODE:
     * Retarget each garment bone from the corresponding body bone using a
     * BIND-POSE-RELATIVE ROTATION DELTA — the standard animation-retargeting
     * technique (Mixamo, Unity Humanoid, Ready Player Me / MetaHuman all do
     * this), not a raw quaternion copy.
     *
     * Why: the body rig (Mixamo FBX, or Reallusion CC_Base) and the garment
     * rig (SMPL-X) do NOT share one rest pose — a given role's "zero rotation"
     * points a different way in each convention. Copying the body bone's
     * absolute world quaternion onto the garment bone therefore applies the
     * body rig's rest-pose offset as if it were motion, which folds the
     * garment mesh in on itself instead of just posing it.
     *
     * Instead we compute how far the body bone has rotated AWAY FROM ITS OWN
     * bind pose (in world space), and apply that same world-space delta on
     * top of the garment bone's OWN bind pose:
     *
     *   deltaWorld        = bodyBone.currentWorldQuat * inverse(bodyBone.bindWorldQuat)
     *   garmentTargetWorld = deltaWorld * garmentBone.bindWorldQuat
     *   garmentBone.localQuat = inverse(garmentParent.worldQuat) * garmentTargetWorld
     *
     * When the body bone hasn't moved from its bind pose, deltaWorld is
     * identity and the garment bone simply stays in its own correct rest
     * shape — regardless of how differently the two rigs' rest poses are
     * oriented. Any additional body rotation (live tracking, the manual
     * A-pose→T-pose correction, etc.) then carries over as real motion.
     *
     * @param {SMPLXPoseMapper} bodyPoseMapper - the initialized mapper for the body model
     */
    alignWithBodyPose(bodyPoseMapper) {
        if (!this.initialized || !bodyPoseMapper || !bodyPoseMapper.initialized) return;

        let bodyContainerQuatInv = null;
        if (bodyPoseMapper.riggedModel && bodyPoseMapper.riggedModel.parent) {
            bodyPoseMapper.riggedModel.parent.updateMatrixWorld(true);
            bodyContainerQuatInv = bodyPoseMapper.riggedModel.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        }

        for (const entry of DRIVEN_BONES) {
            const garmentBone = this.roleMap[entry.bone];
            const bodyBone = bodyPoseMapper.roleMap[entry.bone];
            const bodyBindWorld = bodyPoseMapper.bindWorldQuat[entry.bone];
            const garmentBindWorld = this.bindWorldQuat[entry.bone];
            if (!garmentBone || !bodyBone || !bodyBindWorld || !garmentBindWorld) continue;

            // How far the body bone has rotated away from ITS OWN bind pose, in container-relative space.
            bodyBone.getWorldQuaternion(this._worldQuat);
            if (bodyContainerQuatInv) {
                this._worldQuat.premultiply(bodyContainerQuatInv);
            }
            this._bindInv.copy(bodyBindWorld).invert();
            this._deltaWorld.copy(this._worldQuat).multiply(this._bindInv);

            // Apply that same container-relative delta on top of the garment bone's OWN bind pose.
            this._targetWorld.copy(this._deltaWorld).multiply(garmentBindWorld);

            // Convert to garment bone's parent-local space.
            if (garmentBone.parent) {
                garmentBone.parent.getWorldQuaternion(this._parentWorldQuat);
                if (bodyContainerQuatInv) {
                    this._parentWorldQuat.premultiply(bodyContainerQuatInv);
                }
                this._parentWorldQuatInv.copy(this._parentWorldQuat).invert();
                garmentBone.quaternion.copy(this._parentWorldQuatInv).multiply(this._targetWorld);
            } else {
                garmentBone.quaternion.copy(this._targetWorld);
            }

            garmentBone.updateMatrixWorld(true);
        }
    }

    /**
     * LIVE CAMERA MODE:
     * Drive arm bones from MediaPipe world landmarks.
     *
     * @param {THREE.Object3D} model - garment wrapper
     * @param {Array} worldLandmarks - MediaPipe poseWorldLandmarks (metric)
     * @param {number} timestamp
     */
    applyPoseToRiggedGarment(model, worldLandmarks, timestamp) {
        if (!this.initialized || !worldLandmarks || !model) return;

        for (const entry of LIVE_POSE_BONES) {
            const bone = this.roleMap[entry.bone];
            const restAxis = this.restAxis[entry.bone];
            if (!bone || !restAxis || !bone.parent) continue;

            const dirScene = limbDirection(worldLandmarks, entry.from, entry.to, this.visibilityThreshold);
            if (!dirScene) continue;

            // Convert the world-space limb direction into bone's parent-local space
            bone.parent.getWorldQuaternion(this._q);
            this._qInv.copy(this._q).invert();
            this._target.copy(dirScene).applyQuaternion(this._qInv).normalize();

            const targetQuat = new THREE.Quaternion().setFromUnitVectors(restAxis, this._target);
            const smoothed = this.lastQuat[entry.bone];
            smoothed.slerp(targetQuat, this.slerpAmount);
            bone.quaternion.copy(smoothed);
        }
    }
}
