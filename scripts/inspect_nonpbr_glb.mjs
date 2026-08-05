import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36_nonpbr.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== INSPECTING ch36_nonpbr.glb ===");
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
  
  scene.traverse((o) => {
    if (o.isMesh) {
      console.log(`Mesh [${o.name}]: type=${o.type}, isSkinned=${o.isSkinnedMesh}, visible=${o.visible}`);
      console.log(`  Position:`, o.position);
      console.log(`  Scale:`, o.scale);
      console.log(`  Material:`, Array.isArray(o.material) ? o.material.map(m => m.name) : o.material?.name);
      if (o.material) {
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        console.log(`  Material color:`, m.color?.getHexString(), `map:`, !!m.map);
        console.log(`  Opacity:`, m.opacity, `Transparent:`, m.transparent);
      }
    }
  });
});
