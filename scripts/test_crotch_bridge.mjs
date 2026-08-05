import fs from 'fs';
import * as THREE from 'three';
global.self = global;
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const fileBuffer = fs.readFileSync('public/3dmodels/men/pants/pants_black/tight_pant.glb');
const loader = new GLTFLoader();

loader.parse(fileBuffer.buffer, '', (gltf) => {
  const model = gltf.scene;

  model.traverse((node) => {
    if (node.isMesh && node.name.includes('Pants')) {
      const pos = node.geometry.attributes.position;
      let leftMaxX = -Infinity;
      let rightMinX = Infinity;

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        
        if (y >= 18.0 && y <= 24.88) {
          const absX = Math.abs(x);
          if (absX < 15.5) {
            const shift = (15.5 - absX) * 0.98;
            if (x < 0) x += shift;
            else x -= shift;
          }
        }

        const sx = 0.052;
        const scaledX = x * sx;

        if (y >= 19.5 && y <= 23.5) {
          if (pos.getX(i) < 0 && scaledX > leftMaxX) leftMaxX = scaledX;
          if (pos.getX(i) > 0 && scaledX < rightMinX) rightMinX = scaledX;
        }
      }

      console.log(`With shift 15.5 * 0.98: Left Max X = ${leftMaxX.toFixed(4)}, Right Min X = ${rightMinX.toFixed(4)}`);
      console.log(`Crotch Gap = ${(rightMinX - leftMaxX).toFixed(4)}m`);
    }
  });
  process.exit(0);
});
