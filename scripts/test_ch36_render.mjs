import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== TESTING CLONE WITHOUT calculateInverses ===");
  const cloned = SkeletonUtils.clone(gltf.scene);
  cloned.updateMatrixWorld(true);
  
  const box = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log("Cloned BBox size:", JSON.stringify(size));
  console.log("Cloned BBox min:", JSON.stringify(box.min), "max:", JSON.stringify(box.max));
  
  cloned.traverse((o) => {
    if (o.isMesh) {
      console.log(`Mesh: ${o.name}, visible: ${o.visible}, scale: ${JSON.stringify(o.scale)}`);
    }
  });
});
