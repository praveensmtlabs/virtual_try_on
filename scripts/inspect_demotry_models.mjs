import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const loader = new GLTFLoader();

function inspectGlb(fileName) {
  const filePath = path.join(process.cwd(), 'public/assets/characters', fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`File ${fileName} does not exist.`);
    return;
  }
  const buf = fs.readFileSync(filePath);
  loader.parse(buf.buffer, '', (gltf) => {
    console.log(`\n=== INSPECTING ${fileName} ===`);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);

    let meshes = 0, bones = 0;
    scene.traverse((o) => {
      if (o.isMesh) meshes++;
      if (o.isBone || o.type === 'Bone') bones++;
    });

    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);

    console.log(`Summary: meshes=${meshes}, bones=${bones}`);
    console.log(`BBox size: x=${size.x.toFixed(2)}, y=${size.y.toFixed(2)}, z=${size.z.toFixed(2)}`);
    console.log(`BBox min.y=${box.min.y.toFixed(2)}, max.y=${box.max.y.toFixed(2)}`);
  });
}

inspectGlb('female.glb');
inspectGlb('adultmale3dmodel.glb');
inspectGlb('xbot.glb');
inspectGlb('michelle.glb');
