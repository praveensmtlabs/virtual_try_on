import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== ARMATURE TRANSFORM IN ch36-mixamo.glb ===");
  gltf.scene.traverse((o) => {
    if (o.type === 'Group' || o.name.includes('Armature') || o.name.includes('armature')) {
      console.log(`Object '${o.name}' type=${o.type}: pos=${JSON.stringify(o.position)}, scale=${JSON.stringify(o.scale)}, rot=${JSON.stringify(o.rotation)}`);
    }
  });
});
