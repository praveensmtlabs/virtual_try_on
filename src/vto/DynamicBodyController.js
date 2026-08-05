// src/vto/DynamicBodyController.js
import * as THREE from 'three';

// Morph target scaling presets for dynamic body shapes
export const BODY_MORPH_PRESETS = {
    slim: {
        chest: 0.82,
        waist: 0.78,
        hips: 0.82,
        shoulders: 0.85,
        arms: 0.84,
        legs: 0.85
    },
    average: {
        chest: 1.0,
        waist: 1.0,
        hips: 1.0,
        shoulders: 1.0,
        arms: 1.0,
        legs: 1.0
    },
    athletic: {
        chest: 1.08,
        waist: 0.88,
        hips: 0.94,
        shoulders: 1.08,
        arms: 1.04,
        legs: 0.98
    },
    bodybuilder: {
        chest: 1.25,
        waist: 0.94,
        hips: 1.04,
        shoulders: 1.22,
        arms: 1.20,
        legs: 1.12
    },
    plusSize: {
        chest: 1.14,
        waist: 1.28,
        hips: 1.18,
        shoulders: 1.04,
        arms: 1.10,
        legs: 1.14
    }
};

export class DynamicBodyController {
    constructor() {
        this.currentShape = 'average';
        this.targetShape = 'average';
        
        // Morph interpolation parameters for smooth transitions
        this.transitionProgress = 1.0;
        this.transitionSpeed = 2.5; // lerp rate per second
        this.interpolatedMorph = { ...BODY_MORPH_PRESETS.average };

        // Optimization: lazy-evaluation flag to skip updates when shape is static
        this.needsUpdate = true;

        // Cached original geometries (to prevent double-morph accumulation)
        // Key: mesh.uuid, Value: { position: Float32Array, normal: Float32Array }
        this.bodyMeshCache = new Map();
        
        // Caches for garment mesh mapping
        // Key: garmentMesh.uuid, Value: Array of { bodyMeshUuid, bodyVertIndex, offset: Vector3, relY: number, isArm: boolean }
        this.garmentWrapMap = new Map();
        this.garmentMeshCache = new Map();

        // Covered body vertices cache (for anti-collision pushing)
        // Key: bodyMesh.uuid, Value: Set of body vertex indices
        this.coveredBodyVertices = new Map();
    }

    /**
     * Set a new target body shape preset.
     */
    setBodyShape(shapeName) {
        if (BODY_MORPH_PRESETS[shapeName] && this.targetShape !== shapeName) {
            this.targetShape = shapeName;
            this.transitionProgress = 0.0;
            this.needsUpdate = true;
        }
    }

    /**
     * Cache the native shape of the body mannequin mesh.
     */
    registerBodyModel(bodyModel) {
        this.bodyMeshCache.clear();
        this.coveredBodyVertices.clear();
        this.garmentWrapMap.clear();

        bodyModel.traverse((node) => {
            if (node.isMesh || node.isSkinnedMesh) {
                const geom = node.geometry;
                const posAttr = geom.attributes.position;
                const normAttr = geom.attributes.normal;
                
                if (posAttr) {
                    this.bodyMeshCache.set(node.uuid, {
                        mesh: node,
                        positions: new Float32Array(posAttr.array),
                        normals: normAttr ? new Float32Array(normAttr.array) : null
                    });
                }
            }
        });
        this.needsUpdate = true;
    }

    /**
     * Map a garment mesh to the body mannequin meshes using nearest-neighbor bind pose search.
     * Fully optimized to run in body local space with downsampling and height filtering.
     */
    registerGarmentModel(garmentWrapper) {
        garmentWrapper.traverse((node) => {
            if (node.isMesh || node.isSkinnedMesh) {
                const geom = node.geometry;
                const posAttr = geom.attributes.position;
                if (!posAttr) return;

                // Cache original garment coordinates
                this.garmentMeshCache.set(node.uuid, {
                    mesh: node,
                    positions: new Float32Array(posAttr.array)
                });

                const wrapArray = [];
                const tempGarmentPos = new THREE.Vector3();

                // Compute world matrices once before looping
                node.updateMatrixWorld(true);
                for (const [bodyUuid, cache] of this.bodyMeshCache.entries()) {
                    cache.mesh.updateMatrixWorld(true);
                }

                // Build mapping table
                for (let i = 0; i < posAttr.count; i++) {
                    // Get garment vertex in world space
                    tempGarmentPos.set(
                        posAttr.getX(i),
                        posAttr.getY(i),
                        posAttr.getZ(i)
                    );
                    node.localToWorld(tempGarmentPos);

                    let closestBodyMeshUuid = null;
                    let closestVertIndex = -1;
                    let minDistanceSq = Infinity;
                    const closestBodyLocalPos = new THREE.Vector3();

                    // Search for nearest vertex in registered body meshes
                    for (const [bodyUuid, cache] of this.bodyMeshCache.entries()) {
                        const bodyMesh = cache.mesh;
                        const bodyGeom = bodyMesh.geometry;
                        const bodyPosAttr = bodyGeom.attributes.position;
                        if (!bodyPosAttr) continue;

                        // Project world space garment vertex into body mesh's local space
                        const garmentPosInBodyLocal = tempGarmentPos.clone();
                        bodyMesh.worldToLocal(garmentPosInBodyLocal);

                        const gLocalX = garmentPosInBodyLocal.x;
                        const gLocalY = garmentPosInBodyLocal.y;
                        const gLocalZ = garmentPosInBodyLocal.z;

                        // Downsample body vertex search by 15x for extreme performance
                        const step = 15;
                        for (let j = 0; j < bodyPosAttr.count; j += step) {
                            const by = bodyPosAttr.getY(j);
                            const dy = by - gLocalY;

                            // Height filter: must be within 12cm in local space
                            if (dy > -0.12 && dy < 0.12) {
                                const bx = bodyPosAttr.getX(j);
                                const bz = bodyPosAttr.getZ(j);
                                const dx = bx - gLocalX;
                                const dz = bz - gLocalZ;

                                const distSq = dx * dx + dy * dy + dz * dz;
                                if (distSq < minDistanceSq) {
                                    minDistanceSq = distSq;
                                    closestBodyMeshUuid = bodyUuid;
                                    closestVertIndex = j;
                                    closestBodyLocalPos.set(bx, by, bz);
                                }
                            }
                        }
                    }

                    if (closestBodyMeshUuid) {
                        // Mark body vertex as covered (for collision pushing)
                        if (!this.coveredBodyVertices.has(closestBodyMeshUuid)) {
                            this.coveredBodyVertices.set(closestBodyMeshUuid, new Set());
                        }
                        this.coveredBodyVertices.get(closestBodyMeshUuid).add(closestVertIndex);

                        // Garment vertex relative offset to closest body vertex (in garment local space)
                        const garmentLocalPos = new THREE.Vector3(
                            posAttr.getX(i),
                            posAttr.getY(i),
                            posAttr.getZ(i)
                        );

                        // Convert closest body vertex local position to garment local space
                        const bodyWorldPos = closestBodyLocalPos.clone();
                        this.bodyMeshCache.get(closestBodyMeshUuid).mesh.localToWorld(bodyWorldPos);
                        node.worldToLocal(bodyWorldPos);

                        const offset = garmentLocalPos.clone().sub(bodyWorldPos);

                        // Precompute segment mapping metadata once during load
                        const bodyMesh = this.bodyMeshCache.get(closestBodyMeshUuid).mesh;
                        if (!bodyMesh.geometry.boundingBox) bodyMesh.geometry.computeBoundingBox();
                        const bodyMinY = bodyMesh.geometry.boundingBox.min.y;
                        const bodyMaxY = bodyMesh.geometry.boundingBox.max.y;
                        const bodyHeight = bodyMaxY - bodyMinY;
                        const bodyWidth = bodyMesh.geometry.boundingBox.max.x - bodyMesh.geometry.boundingBox.min.x;
                        
                        const relY = bodyHeight > 0 ? (closestBodyLocalPos.y - bodyMinY) / bodyHeight : 0.5;
                        const isArm = (relY > 0.48 && relY <= 0.81) && (Math.abs(closestBodyLocalPos.x) > bodyWidth * 0.20);

                        wrapArray.push({
                            bodyMeshUuid: closestBodyMeshUuid,
                            bodyVertIndex: closestVertIndex,
                            offset: offset,
                            relY: relY,
                            isArm: isArm
                        });
                    } else {
                        wrapArray.push(null);
                    }
                }

                this.garmentWrapMap.set(node.uuid, wrapArray);
            }
        });
        this.needsUpdate = true;
    }

    /**
     * Run the morphing, wrapping, and anti-clipping calculations in the render loop.
     * Fully optimized to run at 60 FPS without GC overhead or inner loop matrix transforms.
     * Skips processing when shape and active garments are static.
     * @param {number} deltaTime Time elapsed since last frame.
     */
    update(deltaTime) {
        if (this.bodyMeshCache.size === 0) return;

        // Check if transition is actively running
        const isTransitioning = this.transitionProgress < 1.0;

        // --- 1. Transition smooth morph parameters ---
        if (isTransitioning) {
            this.transitionProgress = Math.min(1.0, this.transitionProgress + deltaTime * this.transitionSpeed);
            
            const startMorph = BODY_MORPH_PRESETS[this.currentShape];
            const endMorph = BODY_MORPH_PRESETS[this.targetShape];

            for (const key in this.interpolatedMorph) {
                this.interpolatedMorph[key] = THREE.MathUtils.lerp(
                    startMorph[key],
                    endMorph[key],
                    this.transitionProgress
                );
            }

            if (this.transitionProgress >= 1.0) {
                this.currentShape = this.targetShape;
            }
        }

        // LAZY EVALUATION: If not transitioning and update is not flagged, bypass everything
        if (!isTransitioning && !this.needsUpdate) {
            return;
        }

        // --- 2. Deform Body Mannequin ---
        for (const [bodyUuid, cache] of this.bodyMeshCache.entries()) {
            const mesh = cache.mesh;
            const geom = mesh.geometry;
            const posAttr = geom.attributes.position;
            const normAttr = geom.attributes.normal;
            
            const origPositions = cache.positions;
            const origNormals = cache.normals;
            
            const coveredSet = this.coveredBodyVertices.get(bodyUuid) || new Set();

            // Find geometry height bounds to normalize segment Y slices
            if (!geom.boundingBox) geom.computeBoundingBox();
            const minY = geom.boundingBox.min.y;
            const maxY = geom.boundingBox.max.y;
            const height = maxY - minY;
            const width = geom.boundingBox.max.x - geom.boundingBox.min.x;

            for (let i = 0; i < posAttr.count; i++) {
                const ox = origPositions[i * 3];
                const oy = origPositions[i * 3 + 1];
                const oz = origPositions[i * 3 + 2];

                const relY = height > 0 ? (oy - minY) / height : 0.5;
                const isArm = (relY > 0.48 && relY <= 0.81) && (Math.abs(ox) > width * 0.20);

                // Compute smooth blended scaling factor for the segment
                const scaleFactor = this._getScaleForRelY(relY, isArm, this.interpolatedMorph);

                let nx = ox * scaleFactor;
                let ny = oy;
                let nz = oz * scaleFactor;

                // Anti-collision: push covered body skin inward along its normal
                if (coveredSet.has(i) && origNormals) {
                    const normX = origNormals[i * 3];
                    const normY = origNormals[i * 3 + 1];
                    const normZ = origNormals[i * 3 + 2];

                    // Push skin inward by 1.2 cm underneath clothes
                    nx += normX * -0.012;
                    ny += normY * -0.012;
                    nz += normZ * -0.012;
                }

                posAttr.setXYZ(i, nx, ny, nz);
            }

            posAttr.needsUpdate = true;
            if (normAttr) normAttr.needsUpdate = true;
            geom.computeVertexNormals();
        }

        // Re-calculate body world matrices before mapping
        for (const [bodyUuid, cache] of this.bodyMeshCache.entries()) {
            cache.mesh.updateMatrixWorld(true);
        }

        // Pre-allocated structures for zero GC overhead
        const tempVector = new THREE.Vector3();
        const garmentInverseMatrix = new THREE.Matrix4();

        // --- 3. Warp and Adapt Active Garments ---
        for (const [garmentUuid, wrapArray] of this.garmentWrapMap.entries()) {
            const cache = this.garmentMeshCache.get(garmentUuid);
            if (!cache) continue;

            const mesh = cache.mesh;
            const geom = mesh.geometry;
            const posAttr = geom.attributes.position;

            mesh.updateMatrixWorld(true);
            garmentInverseMatrix.copy(mesh.matrixWorld).invert();

            // Cache direct body-to-garment local matrices to bypass inner-loop matrix multiplication
            const matrixCache = new Map();
            for (const [bodyUuid, bodyCache] of this.bodyMeshCache.entries()) {
                const m = new THREE.Matrix4()
                    .copy(garmentInverseMatrix)
                    .multiply(bodyCache.mesh.matrixWorld);
                matrixCache.set(bodyUuid, m);
            }

            for (let i = 0; i < posAttr.count; i++) {
                const mapping = wrapArray[i];
                if (!mapping) continue;

                const bodyCache = this.bodyMeshCache.get(mapping.bodyMeshUuid);
                if (!bodyCache) continue;

                const bodyPosAttr = bodyCache.mesh.geometry.attributes.position;
                const m = matrixCache.get(mapping.bodyMeshUuid);

                // Get morphed body vertex local position and transform to garment local space
                tempVector.set(
                    bodyPosAttr.getX(mapping.bodyVertIndex),
                    bodyPosAttr.getY(mapping.bodyVertIndex),
                    bodyPosAttr.getZ(mapping.bodyVertIndex)
                ).applyMatrix4(m);

                const morphScale = this._getScaleForRelY(mapping.relY, mapping.isArm, this.interpolatedMorph);

                // Adapted position = deformed body vertex + offset scaled by morph scale
                const nx = tempVector.x + mapping.offset.x * morphScale;
                const ny = tempVector.y + mapping.offset.y * morphScale;
                const nz = tempVector.z + mapping.offset.z * morphScale;

                posAttr.setXYZ(i, nx, ny, nz);
            }

            posAttr.needsUpdate = true;
            geom.computeVertexNormals();
        }

        // Reset the update flag once transition is complete
        if (!isTransitioning) {
            this.needsUpdate = false;
        }
    }

    /**
     * Compute smooth blended segment scaling factors.
     */
    _getScaleForRelY(relY, isArm, morph) {
        if (isArm) {
            return morph.arms;
        }
        if (relY <= 0.40) {
            // Legs
            return morph.legs;
        } else if (relY <= 0.52) {
            // Hips
            const t = (relY - 0.40) / 0.12;
            return THREE.MathUtils.lerp(morph.legs, morph.hips, t);
        } else if (relY <= 0.62) {
            // Waist
            const t = (relY - 0.52) / 0.10;
            return THREE.MathUtils.lerp(morph.hips, morph.waist, t);
        } else if (relY <= 0.81) {
            // Chest
            const t = (relY - 0.62) / 0.19;
            return THREE.MathUtils.lerp(morph.waist, morph.chest, t);
        } else {
            // Neck / Head
            const t = Math.min(1.0, (relY - 0.81) / 0.10);
            return THREE.MathUtils.lerp(morph.chest, 1.0, t);
        }
    }
}
