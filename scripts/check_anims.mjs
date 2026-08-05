import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== ANIMATIONS IN ch36-mixamo.glb ===");
  if (!gltf.animations || gltf.animations.length === 0) {
    console.log("No animations in GLTF file.");
  } else {
    gltf.animations.forEach((anim, i) => {
      console.log(`Animation [${i}] '${anim.name}': duration=${anim.duration}s, tracks=${anim.tracks.length}`);
      if (anim.tracks.length > 0) {
        console.log("  Sample tracks:", anim.tracks.slice(0, 5).map(t => t.name));
      }
    });
  }
});
