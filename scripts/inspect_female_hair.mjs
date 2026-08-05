import fs from 'fs';
import * as THREE from 'three';
global.self = global;
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const fileBuffer = fs.readFileSync('public/assets/characters/female.glb');
const loader = new GLTFLoader();

loader.parse(fileBuffer.buffer, '', (gltf) => {
  const model = gltf.scene;
  model.traverse((child) => {
    if (child.isMesh) {
      const mat = Array.isArray(child.material) ? child.material[0] : child.material;
      console.log(`Mesh: "${child.name}", mat: "${mat.name}", map: ${!!mat.map}, alphaMap: ${!!mat.alphaMap}, transparent: ${mat.transparent}, color: #${mat.color.getHexString()}`);
    }
  });
  process.exit(0);
});
