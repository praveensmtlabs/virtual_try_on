import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

function checkAvatar(filename) {
  const filePath = path.join(process.cwd(), 'public/models/avatars', filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File NOT found: ${filename}\n`);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const loader = new GLTFLoader();

  loader.parse(buf.buffer, '', (gltf) => {
    console.log(`\n=== ${filename} ===`);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    console.log("Size:", JSON.stringify(size));
    console.log("Min Y:", box.min.y.toFixed(4), "Max Y:", box.max.y.toFixed(4));
    let meshCount = 0;
    let errors = [];
    scene.traverse(o => {
      const m = o;
      if (m.isMesh) {
        meshCount++;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        const matInfo = mats.map(mat => {
          const std = mat;
          return `name=${mat.name}, color=${std.color?.getHexString()}, map=${!!std.map}, opacity=${std.opacity}`;
        });
        console.log(` Mesh '${m.name}': ${matInfo.join(' | ')}`);
      }
    });
    console.log(`Total Meshes: ${meshCount}`);
    if (gltf.animations?.length) {
      console.log(`Animations: ${gltf.animations.map(a => a.name).join(', ')}`);
    }
    console.log('');
  }, (err) => {
    console.error(`ERROR loading ${filename}:`, err.message);
  });
}

checkAvatar("simple-male.glb");
