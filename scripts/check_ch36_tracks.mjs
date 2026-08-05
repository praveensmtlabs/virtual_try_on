import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.min.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  const clip = gltf.animations[0];
  console.log("Track 0:", clip.tracks[0].name);
  console.log("Track 1:", clip.tracks[1].name);
  console.log("Track 2:", clip.tracks[2].name);
  console.log("Track 3:", clip.tracks[3].name);
  console.log("Sample tracks:", clip.tracks.slice(0, 10).map(t => t.name));
});
