import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/anim-library-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== ANIMATIONS IN anim-library-mixamo.glb ===");
  gltf.animations?.forEach((anim, i) => {
    console.log(`Animation [${i}] '${anim.name}': duration=${anim.duration.toFixed(2)}s, tracks=${anim.tracks.length}`);
    if (anim.tracks.length > 0) {
      console.log("  Sample tracks:", anim.tracks.slice(0, 3).map(t => t.name));
    }
  });
});
