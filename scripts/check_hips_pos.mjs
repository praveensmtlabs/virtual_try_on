import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/anim-library-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== CHECKING HIPS POSITION KEYFRAMES IN anim-library-mixamo.glb ===");
  gltf.animations?.forEach((anim) => {
    anim.tracks.forEach((track) => {
      if (track.name === 'mixamorigHips.position') {
        console.log(`Track '${track.name}' in '${anim.name}' Hips position sample:`, Array.from(track.values.slice(0, 6)).map(v => v.toFixed(2)));
      }
    });
  });
});
