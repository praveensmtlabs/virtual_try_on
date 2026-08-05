"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { AnimatePresence, motion } from "framer-motion";
import { useLookStore } from "@/store/lookStore";
import { useViewerStore } from "@/store/viewerStore";
import { AVATARS } from "@/data/avatars";
import { CLOTHING } from "@/data/clothing";
import { alignGarmentToBody } from "@/components/3d/StudioCanvas";
import type { SavedLook } from "@/types/outfit";

// Helper to dispose Three.js objects
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

// Helper: Inflate garment vertex normals slightly to prevent z-fighting/poke-through
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

function ComparePaneCanvas({ look }: { look: SavedLook }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 300;
    const h = mount.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdce3ec);

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
    renderer.setClearColor(0xdce3ec, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // Lights
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
    worldGroup.position.set(0, -0.42, 0);
    worldGroup.scale.setScalar(0.78);
    scene.add(worldGroup);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.35, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.2;
    controls.maxDistance = 5;
    controls.minPolarAngle = 0.2;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.update();

    let isCancelled = false;
    let bodyModel: THREE.Object3D | null = null;
    const loadedGarments: Record<string, { id: string; model: THREE.Group; isStatic?: boolean }> = {};

    let animFrameId = 0;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      controls.update();

      // Per-frame alignment for skinned garments to body
      if (bodyModel && loadedGarments) {
        for (const cat in loadedGarments) {
          const entry = loadedGarments[cat];
          if (entry && entry.model && !entry.isStatic) {
            alignGarmentToBody(entry.model, bodyModel);
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

    // Load avatar body & clothes for this saved look
    const avatarDef = AVATARS.find((a) => a.id === look.avatarId) ?? AVATARS[0];
    const isFemale = avatarDef.gender === "female";
    const avatarModelPath = isFemale
      ? "/assets/characters/female.glb"
      : "/assets/characters/skeleton.fbx";

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const onAvatarLoaded = (loadedData: any) => {
      if (isCancelled) return;
      bodyModel = loadedData.scene || loadedData;

      bodyModel!.traverse((node: THREE.Object3D) => {
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
              }
            });
          }
        }
      });

      if (!isFemale && avatarModelPath.endsWith(".fbx")) {
        bodyModel!.scale.setScalar(0.01);
      } else {
        bodyModel!.scale.setScalar(1.0);
      }
      bodyModel!.position.set(0, 0, 0);

      worldGroup.add(bodyModel!);

      // Extract saved clothing items safely (supporting legacy property names)
      const cObj = look.clothing || (look as any).outfit || {};
      const equippedIds = [
        cObj.coatId || (cObj as any).outfitId,
        cObj.shirtId || (cObj as any).topId,
        cObj.pantsId || (cObj as any).bottomId,
      ].filter(Boolean) as string[];

      equippedIds.forEach((id) => {
        const item = CLOTHING.find((c) => c.id === id);
        if (!item || !item.modelPath) return;

        const catKey = item.category;

        gltfLoader.load(
          item.modelPath,
          (gltf) => {
            if (isCancelled || !bodyModel) return;
            const rawModel = gltf.scene;
            const modelWrapper = new THREE.Group();
            modelWrapper.name = `GarmentWrapper_${id}`;
            modelWrapper.add(rawModel);

            worldGroup.add(modelWrapper);

            let hasSkinnedMesh = false;
            modelWrapper.traverse((node) => {
              if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                mesh.frustumCulled = false;
                if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
                  hasSkinnedMesh = true;
                }
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                mats.forEach((m) => {
                  if (m) {
                    m.side = THREE.DoubleSide;
                    m.depthWrite = true;
                    if (item.color && item.id.includes("gemini")) {
                      const stdMat = m as THREE.MeshStandardMaterial;
                      if (stdMat && stdMat.color) {
                        stdMat.color.set(item.color);
                      }
                    }
                    m.needsUpdate = true;
                  }
                });
              }
            });

            const isStatic = !hasSkinnedMesh;

            if (isStatic) {
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
                const scaleX = topWidth > 0 ? 0.34 / topWidth : scaleY;
                const scaleZ = topDepth > 0 ? 0.355 / topDepth : scaleY;

                rawModel.scale.set(scaleX, scaleY, scaleZ);
                rawModel.position.y = waistY - box.max.y * scaleY + 0.005;
                rawModel.position.x = -((topMinX + topMaxX) / 2) * scaleX;
                rawModel.position.z = -((topMinZ + topMaxZ) / 2) * scaleZ - 0.02;
              } else {
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
              const inflateMargin = isFemale
                ? isOuterwear
                  ? 0.032
                  : 0.014
                : isOuterwear
                  ? 0.026
                  : 0.022;
              const backExtraMargin = isFemale
                ? isOuterwear
                  ? 0.024
                  : 0.016
                : isOuterwear
                  ? 0.015
                  : 0.016;
              inflateSkinnedGarment(modelWrapper, inflateMargin, backExtraMargin, isFemale);
              alignGarmentToBody(modelWrapper, bodyModel!);
            }

            loadedGarments[catKey] = { id, model: modelWrapper, isStatic };
          },
          undefined,
          (err) => console.error(`Failed to load compare garment ${id}:`, err)
        );
      });
    };

    if (avatarModelPath.endsWith(".fbx")) {
      const fbxLoader = new FBXLoader();
      fbxLoader.load(avatarModelPath, onAvatarLoaded, undefined, (err) =>
        console.error("Compare FBX load error", err)
      );
    } else {
      gltfLoader.load(avatarModelPath, onAvatarLoaded, undefined, (err) =>
        console.error("Compare GLTF load error", err)
      );
    }

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
      controls.dispose();
      disposeModel(bodyModel);
      for (const cat in loadedGarments) {
        disposeModel(loadedGarments[cat]?.model ?? null);
      }
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [look]);

  const cObj = look.clothing || (look as any).outfit || {};
  const equippedNames = [
    cObj.coatId && CLOTHING.find((item) => item.id === cObj.coatId)?.name,
    cObj.shirtId && CLOTHING.find((item) => item.id === cObj.shirtId)?.name,
    cObj.pantsId && CLOTHING.find((item) => item.id === cObj.pantsId)?.name,
  ].filter(Boolean);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-white/20">
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1">
        <span className="rounded-full bg-black/60 px-3.5 py-1 text-xs font-semibold text-white backdrop-blur">
          {look.name}
        </span>
        {equippedNames.length > 0 && (
          <span className="rounded-md bg-black/40 px-2.5 py-0.5 text-[10px] text-white/80 backdrop-blur">
            {equippedNames.join(" • ")}
          </span>
        )}
      </div>
      <div ref={mountRef} className="h-full w-full" />
    </div>
  );
}

export function CompareLooks() {
  const open = useViewerStore((s) => s.openPanel === "compare");
  const setPanel = useViewerStore((s) => s.setPanel);
  const lookAId = useViewerStore((s) => s.compareLookA);
  const lookBId = useViewerStore((s) => s.compareLookB);
  const looks = useLookStore((s) => s.savedLooks);
  const lookA = looks.find((l) => l.id === lookAId);
  const lookB = looks.find((l) => l.id === lookBId);

  return (
    <AnimatePresence>
      {open && lookA && lookB && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex flex-col bg-[#1a1f26]/75 p-3 backdrop-blur-md md:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-white">
              Compare Saved Looks
            </h2>
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="rounded-full border border-white/25 bg-black/40 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-black/60"
            >
              Close
            </button>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
            <ComparePaneCanvas look={lookA} />
            <ComparePaneCanvas look={lookB} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
