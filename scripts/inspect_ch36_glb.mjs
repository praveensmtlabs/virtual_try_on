import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== INSPECTING ch36-mixamo.glb ===");
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  
  console.log("BBox Min:", box.min);
  console.log("BBox Max:", box.max);
  console.log("BBox Size:", size);
  console.log("BBox Center:", center);
  
  let skinnedMeshes = 0;
  scene.traverse((o) => {
    if (o.isMesh) {
      skinnedMeshes++;
      console.log(`Mesh [${o.name}]: isSkinned=${o.isSkinnedMesh}, visible=${o.visible}`);
      console.log(`  MatrixWorld:`, o.matrixWorld.elements.slice(12, 16));
      console.log(`  Position:`, o.position);
      console.log(`  Scale:`, o.scale);
      console.log(`  Material:`, Array.isArray(o.material) ? o.material.map(m => m.name) : o.material?.name);
      if (o.material) {
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        console.log(`  Material color:`, m.color?.getHexString(), `map:`, !!m.map);
      }
      if (o.isSkinnedMesh) {
        console.log(`  Skeleton bones:`, o.skeleton?.bones?.length);
        console.log(`  BindMode:`, o.bindMode);
        console.log(`  BindMatrix:`, o.bindMatrix?.elements.slice(12, 16));
      }
    }
  });
});
