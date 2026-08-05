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
  console.log("=== CHECKING BONE SCALES IN ch36-mixamo.glb ===");
  const scene = gltf.scene;
  
  scene.traverse((o) => {
    if (o.isBone || o.type === 'Bone') {
      const s = o.scale;
      if (Math.abs(s.x - 1) > 0.01 || Math.abs(s.y - 1) > 0.01 || Math.abs(s.z - 1) > 0.01) {
        console.log(`BONE '${o.name}' has non-1 scale:`, s.x, s.y, s.z);
      }
    }
  });
});
