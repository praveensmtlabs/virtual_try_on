import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== BONE NAMES AND INITIAL TRANSFORMS ===");
  gltf.scene.traverse((o) => {
    if (o.isBone || o.type === 'Bone') {
      console.log(`Bone '${o.name}': pos=[${o.position.toArray().map(v=>v.toFixed(3))}], rot=[${o.rotation.toArray().slice(0,3).map(v=>v.toFixed(3))}], scale=[${o.scale.toArray().map(v=>v.toFixed(3))}]`);
    }
  });
});
