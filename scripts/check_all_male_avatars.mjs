import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

function checkAvatar(filename) {
  const filePath = path.join(process.cwd(), 'public/models/avatars', filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File NOT found: ${filename}`);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const loader = new GLTFLoader();

  loader.parse(buf.buffer, '', (gltf) => {
    console.log(`\n=== CHECKING ${filename} ===`);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    console.log("Size:", size);
    console.log("Min Y:", box.min.y, "Max Y:", box.max.y);
    let meshCount = 0;
    scene.traverse(o => {
      if (o.isMesh) {
        meshCount++;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        console.log(` Mesh '${o.name}': mats=${mats.map(m => m.name)}, map=${mats.some(m => !!m.map)}`);
      }
    });
    console.log(`Total Meshes: ${meshCount}`);
  });
}

checkAvatar("adult-male.glb");
checkAvatar("base_male.glb");
checkAvatar("mixamo-aj.glb");
checkAvatar("mixamo-marker-man.glb");
