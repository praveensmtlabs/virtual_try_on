import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SkeletonUtils } from 'three-stdlib';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public/models/avatars/adult-male.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  const source = gltf.scene;
  const cloned = SkeletonUtils.clone(source);
  
  console.log("\n=== CLONED GLTF SCENE INSPECTION ===");
  cloned.traverse((o) => {
    if (o.isSkinnedMesh) {
      console.log(`SkinnedMesh: ${o.name}`);
      console.log(`  default bindMode: ${o.bindMode}`);
      console.log(`  bindMatrixInverse isNull: ${!o.bindMatrixInverse}`);
      console.log(`  skeleton bone count: ${o.skeleton ? o.skeleton.bones.length : 0}`);
      console.log(`  skeleton root bone: ${o.skeleton && o.skeleton.bones[0] ? o.skeleton.bones[0].name : 'none'}`);
    }
  });
});
