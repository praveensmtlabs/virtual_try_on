import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== CH36-MIXAMO.GLB INSPECTION ===");
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  
  scene.traverse((o) => {
    if (o.isMesh) {
      const sm = o;
      console.log(`Mesh: ${sm.name}, type: ${sm.type}, visible: ${sm.visible}`);
      if (sm.isSkinnedMesh) {
        console.log(`  Skeleton bones: ${sm.skeleton?.bones?.length}`);
      }
      if (sm.geometry) {
        sm.geometry.computeBoundingBox();
        console.log(`  Geometry bbox:`, JSON.stringify(sm.geometry.boundingBox));
      }
      const mats = Array.isArray(sm.material) ? sm.material : [sm.material];
      mats.forEach(mat => {
        console.log(`  Material: name=${mat.name}, map=${!!mat.map}, color=${mat.color?.getHexString()}`);
      });
    }
  });

  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log("Scene BBox size:", JSON.stringify(size));
  console.log("Scene BBox min:", JSON.stringify(box.min), "max:", JSON.stringify(box.max));
});
