import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/anim-library-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== CHECKING SCALE KEYFRAMES IN anim-library-mixamo.glb ===");
  gltf.animations?.forEach((anim) => {
    anim.tracks.forEach((track) => {
      if (track.name.endsWith('.scale')) {
        const vals = track.values;
        let nonOne = false;
        for (let i = 0; i < vals.length; i++) {
          if (Math.abs(vals[i] - 1) > 0.01) nonOne = true;
        }
        if (nonOne) {
          console.log(`Track '${track.name}' in '${anim.name}' has non-1 scale values! Sample:`, vals.slice(0, 6));
        }
      }
    });
  });
});
