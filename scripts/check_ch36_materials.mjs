import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.min.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== CH36 MATERIAL DETAILS ===");
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      console.log(`Mesh: ${o.name}`);
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach(m => {
        console.log(`  Mat name: ${m.name}`);
        console.log(`  Color:`, m.color ? m.color.getHexString() : 'none');
        console.log(`  Opacity:`, m.opacity);
        console.log(`  Transparent:`, m.transparent);
        console.log(`  Map:`, m.map ? 'Has texture map' : 'No map');
        console.log(`  Roughness:`, m.roughness, `Metalness:`, m.metalness);
      });
    }
  });
});
