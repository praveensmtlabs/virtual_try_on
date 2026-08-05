"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useAvatarStore } from "@/store/avatarStore";
import { useClothingStore } from "@/store/clothingStore";
import { AVATARS } from "@/data/avatars";
import { CLOTHING } from "@/data/clothing";
import { SMPLXPoseMapper } from "@/vto/SMPLXBoneMapper";

// Helper: dispose geometry & materials on model removal
const disposeModel = (model: THREE.Object3D | null) => {
  if (!model) return;
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (mesh.material.map) mesh.material.map.dispose();
          mesh.material.dispose();
        }
      }
    }
  });
};

// Helper: Measure bust projection depth to detect female bust vs male chest
const getBustProjection = (model: THREE.Object3D | null): number | null => {
  if (!model) return null;
  let breast: THREE.Bone | null = null;
  let spine: THREE.Bone | null = null;
  const norm = (n: string) => (n || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  model.traverse((n) => {
    if (breast && spine) return;
    if ((n as THREE.Bone).isBone) {
      const name = norm(n.name);
      if (!breast && name.includes("breast")) breast = n as THREE.Bone;
      if (!spine && (name.includes("spine02") || name.includes("spine"))) spine = n as THREE.Bone;
    }
  });

  if (!breast || !spine) return null;
  const bv = new THREE.Vector3();
  const sv = new THREE.Vector3();
  breast.getWorldPosition(bv);
  spine.getWorldPosition(sv);
  let val = bv.z - sv.z;
  if (Math.abs(val) > 1.0) val /= 100.0;
  return val;
};

// Helper: Align Garment pelvis/hips bone to body hips bone world position (demotry algorithm)
export const alignGarmentToBody = (garmentWrapper: THREE.Group, bodyModel: THREE.Object3D) => {
  if (!garmentWrapper || !bodyModel) return;

  if (!garmentWrapper.userData._bustScaled) {
    garmentWrapper.userData._bustScaled = true;
    const bodyBust = getBustProjection(bodyModel);
    const garmentBust = getBustProjection(garmentWrapper);
    const shortfall = bodyBust !== null ? bodyBust - (garmentBust || 0) : 0;
    if (shortfall > 0.03 && shortfall < 0.25) {
      const zScale = 1 + Math.min((shortfall + 0.01) / 0.15, 0.08);
      garmentWrapper.scale.z *= zScale;
    }
    garmentWrapper.updateMatrixWorld(true);
  }

  bodyModel.updateMatrixWorld(true);
  let bodyHipsWorld: THREE.Vector3 | null = null;
  const _bv = new THREE.Vector3();

  bodyModel.traverse((node) => {
    if (bodyHipsWorld) return;
    if ((node as THREE.Bone).isBone) {
      const n = (node.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (n.includes("hip") || n.includes("pelvis")) {
        node.getWorldPosition(_bv);
        if (_bv.y > 0.3) {
          bodyHipsWorld = _bv.clone();
        }
      }
    }
  });

  if (!bodyHipsWorld) {
    const box = new THREE.Box3().setFromObject(bodyModel);
    bodyHipsWorld = new THREE.Vector3(
      (box.min.x + box.max.x) / 2,
      box.min.y + (box.max.y - box.min.y) * 0.52,
      (box.min.z + box.max.z) / 2
    );
  }

  if (!garmentWrapper.userData._pelvisLocalY) {
    const savedPos = garmentWrapper.position.clone();
    garmentWrapper.position.set(0, 0, 0);
    garmentWrapper.updateMatrixWorld(true);

    let pelvisWorldY: number | null = null;
    const _gv = new THREE.Vector3();
    garmentWrapper.traverse((node) => {
      if (pelvisWorldY !== null) return;
      if ((node as THREE.Bone).isBone) {
        const n = (node.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const isPelvis =
          n === "pelvis" || n === "hip" || n === "hips" || n.endsWith("hips");
        if (isPelvis) {
          node.getWorldPosition(_gv);
          pelvisWorldY = _gv.y;
        }
      }
    });

    const parentScaleY = garmentWrapper.parent ? garmentWrapper.parent.scale.y : 1.0;
    garmentWrapper.userData._pelvisLocalY =
      pelvisWorldY !== null
        ? (pelvisWorldY - (garmentWrapper.parent ? garmentWrapper.parent.position.y : 0)) /
        parentScaleY
        : 1.065;

    garmentWrapper.userData._pelvisLocalX = 0;
    garmentWrapper.userData._pelvisLocalZ = 0;

    garmentWrapper.position.copy(savedPos);
  }

  const pelvisLocalY = garmentWrapper.userData._pelvisLocalY;
  const isFemale = getBustProjection(bodyModel) !== null;
  const upperNeckOffsetY = isFemale ? 0.005 : 0.028;

  if (garmentWrapper.parent) {
    garmentWrapper.parent.updateMatrixWorld(true);
    const hipsLocal = garmentWrapper.parent.worldToLocal(bodyHipsWorld.clone());

    garmentWrapper.position.x = hipsLocal.x - (garmentWrapper.userData._pelvisLocalX || 0);
    garmentWrapper.position.y =
      hipsLocal.y - (garmentWrapper.userData._pelvisLocalY || 0) - upperNeckOffsetY;
    garmentWrapper.position.z = hipsLocal.z - (garmentWrapper.userData._pelvisLocalZ || 0);
  } else {
    garmentWrapper.position.set(
      bodyHipsWorld.x,
      bodyHipsWorld.y - pelvisLocalY - upperNeckOffsetY,
      bodyHipsWorld.z
    );
  }
};

// Helper: Measure local bounding box of garment
const getLocalBox = (root: THREE.Object3D): THREE.Box3 => {
  root.updateMatrixWorld(true);
  const rootWorldInv = root.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  root.traverse((node) => {
    if (!(node as THREE.Mesh).isMesh) return;
    const mesh = node as THREE.Mesh;
    const pos = mesh.geometry?.attributes?.position;
    if (!pos) return;
    mesh.updateMatrixWorld(true);
    const l2root = rootWorldInv.clone().multiply(mesh.matrixWorld);
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(l2root);
      box.expandByPoint(v);
    }
  });
  return box;
};

// Helper: Inflate garment vertex normals slightly to prevent z-fighting/poke-through (demotry algorithm)
const inflateSkinnedGarment = (
  garmentModel: THREE.Object3D,
  margin = 0.016,
  backExtraMargin = 0.012,
  isFemale = false
) => {
  garmentModel.traverse((node) => {
    if (!(node as THREE.SkinnedMesh).isSkinnedMesh) return;
    const sm = node as THREE.SkinnedMesh;
    const geom = sm.geometry;
    const pos = geom.attributes.position;
    let norm = geom.attributes.normal;
    if (!norm) {
      geom.computeVertexNormals();
      norm = geom.attributes.normal;
    }
    if (!pos || !norm) return;
    for (let i = 0; i < pos.count; i++) {
      const nx = norm.getX(i);
      const ny = norm.getY(i);
      const nz = norm.getZ(i);

      let effectiveMargin = nz < -0.05 ? margin + backExtraMargin * -nz : margin;
      if (ny > 0.15) {
        effectiveMargin += (isFemale ? 0.012 : 0.008) * ny;
      }
      if (isFemale && nz > 0.05) {
        effectiveMargin += 0.038 * nz;
      }
      pos.setXYZ(
        i,
        pos.getX(i) + nx * effectiveMargin,
        pos.getY(i) + ny * effectiveMargin,
        pos.getZ(i) + nz * effectiveMargin
      );
    }
    pos.needsUpdate = true;
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
  });
};

export function StudioCanvas() {
  const mountRef = useRef<HTMLDivElement>(null);

  const selectedAvatarId = useAvatarStore((s) => s.selectedAvatarId);
  const yaw = useAvatarStore((s) => s.yaw);
  const coatId = useClothingStore((s) => s.coatId);
  const shirtId = useClothingStore((s) => s.shirtId);
  const pantsId = useClothingStore((s) => s.pantsId);

  const stateRef = useRef<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    worldGroup?: THREE.Group;
    bodyModel?: THREE.Object3D;
    bodyPoseMapper?: SMPLXPoseMapper;
    loadedGarments?: Record<
      string,
      { id: string; model: THREE.Group; isStatic?: boolean; poseMapper?: SMPLXPoseMapper }
    >;
    manualRotationY: number;
    animFrameId?: number;
  }>({
    manualRotationY: 0,
    loadedGarments: {},
  });

  // Sync yaw state from store to manual rotation
  useEffect(() => {
    if (stateRef.current) {
      stateRef.current.manualRotationY = yaw;
    }
  }, [yaw]);

  // Main 3D Canvas initialization
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || window.innerWidth;
    const h = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f0eb);

    // Perfectly centered camera view
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0.45, 2.5);
    camera.lookAt(0, 0.35, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
    });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf5f0eb, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Lights (demotry setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff8f0, 1.3);
    keyLight.position.set(1.5, 3, 3);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe8f0ff, 0.7);
    fillLight.position.set(-2, 2, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    const worldGroup = new THREE.Group();
    // Stand-aligned centered position & scale (demotry mannequin setup)
    worldGroup.position.set(0, -0.42, 0);
    worldGroup.scale.setScalar(0.78);
    scene.add(worldGroup);

    stateRef.current.scene = scene;
    stateRef.current.camera = camera;
    stateRef.current.renderer = renderer;
    stateRef.current.worldGroup = worldGroup;

    // OrbitControls for smooth drag & zoom
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.35, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.2;
    controls.maxDistance = 5;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.update();

    // Render loop
    const animate = () => {
      stateRef.current.animFrameId = requestAnimationFrame(animate);
      controls.update();

      if (stateRef.current.worldGroup) {
        stateRef.current.worldGroup.rotation.y = stateRef.current.manualRotationY;
      }

      // Re-align & retarget equipped garments per frame
      const { bodyModel, bodyPoseMapper, loadedGarments } = stateRef.current;
      if (bodyModel && loadedGarments) {
        for (const cat in loadedGarments) {
          const entry = loadedGarments[cat];
          if (entry && entry.model && !entry.isStatic) {
            alignGarmentToBody(entry.model, bodyModel);
            if (selectedAvatarId === "adult-female" && entry.poseMapper && bodyPoseMapper) {
              entry.poseMapper.alignWithBodyPose(bodyPoseMapper);
            }
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(mount);

    return () => {
      ro.disconnect();
      if (stateRef.current.animFrameId) {
        cancelAnimationFrame(stateRef.current.animFrameId);
      }
      controls.dispose();
      disposeModel(stateRef.current.bodyModel ?? null);
      if (stateRef.current.loadedGarments) {
        for (const cat in stateRef.current.loadedGarments) {
          disposeModel(stateRef.current.loadedGarments[cat]?.model ?? null);
        }
      }
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load Base Avatar Model (Male: skeleton.fbx, Female: female.glb)
  useEffect(() => {
    const avatarDef = AVATARS.find((a) => a.id === selectedAvatarId) ?? AVATARS[0];
    const isFemale = avatarDef.gender === "female";
    const modelPath = isFemale ? "/assets/characters/female.glb" : "/assets/characters/skeleton.fbx";

    let isCancelled = false;

    const loadAvatar = async () => {
      const { worldGroup, bodyModel: oldModel, loadedGarments } = stateRef.current;
      if (oldModel && worldGroup) {
        worldGroup.remove(oldModel);
        disposeModel(oldModel);
        stateRef.current.bodyModel = undefined;
      }

      const fileExt = modelPath.split(".").pop()?.toLowerCase();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("/draco/");

      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      const onLoaded = (loadedData: any) => {
        if (isCancelled) return;
        const model = loadedData.scene || loadedData;

        model.traverse((node: THREE.Object3D) => {
          if ((node as THREE.SkinnedMesh).isSkinnedMesh) {
            const mesh = node as THREE.SkinnedMesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;

            if (mesh.material) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                const stdMat = mat as THREE.MeshStandardMaterial;
                const matName = (stdMat.name || "").toLowerCase();
                const isHairOrFeature =
                  matName.includes("hair") ||
                  matName.includes("scalp") ||
                  matName.includes("eyelash") ||
                  matName.includes("tearline") ||
                  matName.includes("occlusion") ||
                  matName.includes("cornea");

                if (isHairOrFeature) {
                  stdMat.transparent = true;
                  if (matName.includes("hair") || matName.includes("scalp")) {
                    stdMat.color.setHex(0x3d271d); // Natural dark brown hair tone
                    stdMat.roughness = 0.85;
                  }
                } else {
                  stdMat.transparent = false;
                  stdMat.opacity = 1;
                  if (!stdMat.map) {
                    stdMat.color.setHex(0xd4a373); // Warm natural skin tone
                  }
                  stdMat.roughness = 0.55;
                  stdMat.metalness = 0.05;
                  stdMat.polygonOffset = true;
                  stdMat.polygonOffsetFactor = 1;
                  stdMat.polygonOffsetUnits = 1;
                }
              });
            }
          }
        });

        if (!isFemale) {
          if (fileExt === "fbx") {
            model.scale.setScalar(0.01);
            model.position.set(0, 0, 0);
          } else {
            model.scale.setScalar(1.0);
            model.position.set(0, 0, 0);
          }
        } else {
          model.scale.setScalar(1.0);
          model.position.set(0, 0, 0);
        }

        stateRef.current.bodyModel = model;
        if (worldGroup) {
          worldGroup.add(model);
        }

        const poseMapper = new SMPLXPoseMapper({}, false);
        poseMapper.initializeBones(model);
        stateRef.current.bodyPoseMapper = poseMapper;

        // Re-align existing loaded garments to the new body
        if (loadedGarments) {
          for (const cat in loadedGarments) {
            const entry = loadedGarments[cat];
            if (entry && entry.model && !entry.isStatic) {
              alignGarmentToBody(entry.model, model);
              if (entry.poseMapper) {
                entry.poseMapper.alignWithBodyPose(poseMapper);
              }
            }
          }
        }
      };

      if (fileExt === "fbx") {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(modelPath, onLoaded, undefined, (err) => console.error("FBX load error", err));
      } else {
        gltfLoader.load(modelPath, onLoaded, undefined, (err) => console.error("GLTF load error", err));
      }
    };

    loadAvatar();

    return () => {
      isCancelled = true;
    };
  }, [selectedAvatarId]);

  // Load Equipped Garments (Coat, Shirt, Pants) & Align Perfectly to Avatar Body
  useEffect(() => {
    const equippedIds = [coatId, shirtId, pantsId].filter(Boolean) as string[];
    const loadedGarments = stateRef.current.loadedGarments || {};
    const worldGroup = stateRef.current.worldGroup;
    const bodyModel = stateRef.current.bodyModel;
    const bodyPoseMapper = stateRef.current.bodyPoseMapper;
    const isFemale = selectedAvatarId === "adult-female";

    // 1. Unload removed garments
    for (const cat in loadedGarments) {
      const entry = loadedGarments[cat];
      if (entry && !equippedIds.includes(entry.id)) {
        if (worldGroup && entry.model) {
          worldGroup.remove(entry.model);
        }
        disposeModel(entry.model);
        delete loadedGarments[cat];
      }
    }

    // 2. Load new equipped garments using DRACO-enabled GLTFLoader
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    equippedIds.forEach((id) => {
      const item = CLOTHING.find((c) => c.id === id);
      if (!item || !item.modelPath) return;

      const catKey = item.category;
      if (loadedGarments[catKey] && loadedGarments[catKey].id === id) return; // already loaded

      gltfLoader.load(
        item.modelPath,
        (gltf) => {
          const rawModel = gltf.scene;
          const modelWrapper = new THREE.Group();
          modelWrapper.name = `GarmentWrapper_${id}`;
          modelWrapper.add(rawModel);

          if (worldGroup) {
            worldGroup.add(modelWrapper);
          }

          let hasSkinnedMesh = false;
          modelWrapper.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
              const mesh = node as THREE.Mesh;
              mesh.frustumCulled = false;
              mesh.castShadow = true;
              mesh.receiveShadow = true;

              if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
                hasSkinnedMesh = true;
              }
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((mat) => {
                if (!mat) return;
                mat.side = THREE.DoubleSide;
                mat.depthWrite = true;
                if (item.color && item.id.includes("gemini")) {
                  const stdMat = mat as THREE.MeshStandardMaterial;
                  if (stdMat && stdMat.color) {
                    stdMat.color.set(item.color);
                  }
                }
                mat.needsUpdate = true;
              });
            }
          });

          const isStatic = !hasSkinnedMesh;
          let gPoseMapper: SMPLXPoseMapper | undefined = undefined;

          if (isStatic) {
            // Fit static pant / garment bounding box to hips & height (demotry static fitting)
            const box = getLocalBox(rawModel);
            const pHeight = box.max.y - box.min.y;

            const waistY = isFemale ? 1.05 : 1.0;
            const targetHeight = isFemale ? 0.96 : 0.92;
            const scaleY = pHeight > 0 ? targetHeight / pHeight : 1.0;

            if (isFemale) {
              let topMinX = Infinity, topMaxX = -Infinity;
              let topMinZ = Infinity, topMaxZ = -Infinity;
              const topCutoffY = box.min.y + (box.max.y - box.min.y) * 0.8;

              rawModel.traverse((node) => {
                if (!(node as THREE.Mesh).isMesh) return;
                const mesh = node as THREE.Mesh;
                mesh.updateMatrixWorld(true);
                const pos = mesh.geometry?.attributes?.position;
                if (!pos) return;
                const wv = new THREE.Vector3();
                for (let i = 0; i < pos.count; i++) {
                  wv.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(mesh.matrixWorld);
                  if (wv.y >= topCutoffY) {
                    if (wv.x < topMinX) topMinX = wv.x;
                    if (wv.x > topMaxX) topMaxX = wv.x;
                    if (wv.z < topMinZ) topMinZ = wv.z;
                    if (wv.z > topMaxZ) topMaxZ = wv.z;
                  }
                }
              });

              const topWidth = topMaxX > topMinX ? topMaxX - topMinX : box.max.x - box.min.x;
              const topDepth = topMaxZ > topMinZ ? topMaxZ - topMinZ : box.max.z - box.min.z;

              const targetHipWidth = 0.34;
              const targetHipDepth = 0.355;

              const scaleX = topWidth > 0 ? targetHipWidth / topWidth : scaleY;
              const scaleZ = topDepth > 0 ? targetHipDepth / topDepth : scaleY;

              rawModel.scale.set(scaleX, scaleY, scaleZ);
              rawModel.position.y = waistY - box.max.y * scaleY + 0.005;
              rawModel.position.x = -((topMinX + topMaxX) / 2) * scaleX;
              rawModel.position.z = -((topMinZ + topMaxZ) / 2) * scaleZ - 0.02;
            } else {
              // Male pants (demotry taper algorithm for tight_pant.glb / blackpant)
              const taperPoints = [
                { y: 24.88, sx: 0.048, sz: 0.054, meshZ: 0.274, zOffset: 0.026 },
                { y: 22.0, sx: 0.05, sz: 0.052, meshZ: -0.532, zOffset: 0.024 },
                { y: 20.05, sx: 0.05, sz: 0.05, meshZ: -0.605, zOffset: 0.02 },
                { y: 12.73, sx: 0.054, sz: 0.048, meshZ: -0.486, zOffset: 0.008 },
                { y: 5.0, sx: 0.066, sz: 0.056, meshZ: -1.751, zOffset: -0.038 },
                { y: 1.26, sx: 0.068, sz: 0.058, meshZ: -1.878, zOffset: -0.036 },
              ];
              const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
              const scaleAt = (yVal: number) => {
                const first = taperPoints[0];
                const last = taperPoints[taperPoints.length - 1];
                if (yVal >= first.y) return first;
                if (yVal <= last.y) return last;
                for (let i = 0; i < taperPoints.length - 1; i++) {
                  const a = taperPoints[i], b = taperPoints[i + 1];
                  if (yVal <= a.y && yVal >= b.y) {
                    const t = (yVal - b.y) / (a.y - b.y);
                    return {
                      sx: lerp(b.sx, a.sx, t),
                      sz: lerp(b.sz, a.sz, t),
                      meshZ: lerp(b.meshZ, a.meshZ, t),
                      zOffset: lerp(b.zOffset, a.zOffset, t),
                    };
                  }
                }
                return last;
              };

              rawModel.updateMatrixWorld(true);
              const rawModelWorldInv = rawModel.matrixWorld.clone().invert();
              const taperedGeometries = new Set();
              rawModel.traverse((node) => {
                if (!(node as THREE.Mesh).isMesh) return;
                const mesh = node as THREE.Mesh;
                const geom = mesh.geometry;
                const pos = geom?.attributes?.position;
                if (!pos || taperedGeometries.has(pos)) return;
                taperedGeometries.add(pos);
                mesh.updateMatrixWorld(true);
                const l2w = rawModelWorldInv.clone().multiply(mesh.matrixWorld);
                const w2l = l2w.clone().invert();
                const wv = new THREE.Vector3();
                for (let i = 0; i < pos.count; i++) {
                  wv.set(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(l2w);
                  const { sx, sz, meshZ, zOffset } = scaleAt(wv.y);

                  if (wv.y >= 18.0 && wv.y <= 24.88) {
                    const absX = Math.abs(wv.x);
                    if (absX < 15.5) {
                      const shift = (15.5 - absX) * 0.96;
                      if (wv.x < 0) wv.x += shift;
                      else wv.x -= shift;
                    }
                  }

                  wv.x *= sx;
                  wv.z = (wv.z - meshZ) * sz + zOffset;
                  wv.applyMatrix4(w2l);
                  pos.setXYZ(i, wv.x, wv.y, wv.z);
                }
                pos.needsUpdate = true;
                geom.computeVertexNormals();
                geom.computeBoundingBox();
                geom.computeBoundingSphere();
              });

              const fittedBox = getLocalBox(rawModel);
              rawModel.scale.set(1, scaleY, 1);
              rawModel.position.y = waistY - fittedBox.max.y * scaleY + 0.055;
              rawModel.position.x = -(fittedBox.min.x + fittedBox.max.x) / 2;
              rawModel.position.z = 0;
            }
          } else {
            const isOuterwear = catKey === "coat" || catKey === "Jackets" || catKey === "Coats";
            const inflateMargin = isFemale ? (isOuterwear ? 0.032 : 0.014) : (isOuterwear ? 0.026 : 0.022);
            const backExtraMargin = isFemale ? (isOuterwear ? 0.024 : 0.016) : (isOuterwear ? 0.015 : 0.016);
            inflateSkinnedGarment(modelWrapper, inflateMargin, backExtraMargin, isFemale);
            if (bodyModel) {
              alignGarmentToBody(modelWrapper, bodyModel);
            }
            gPoseMapper = new SMPLXPoseMapper({}, false);
            gPoseMapper.initializeBones(modelWrapper);
            if (isFemale && bodyPoseMapper) {
              gPoseMapper.alignWithBodyPose(bodyPoseMapper);
            }
          }

          loadedGarments[catKey] = { id, model: modelWrapper, isStatic, poseMapper: gPoseMapper };
          stateRef.current.loadedGarments = loadedGarments;
        },
        undefined,
        (err) => console.error(`Failed to load garment ${id}:`, err)
      );
    });
  }, [coatId, shirtId, pantsId, selectedAvatarId]);

  return (
    <div
      ref={mountRef}
      className="studio-canvas-host"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
