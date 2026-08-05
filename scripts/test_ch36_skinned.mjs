import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== TESTING ch36-mixamo.glb CLONE WITHOUT calculateInverses ===");
  const cloned = SkeletonUtils.clone(gltf.scene);
  
  // traverse and check materials and meshes
  cloned.traverse((obj) => {
    if (obj.isSkinnedMesh) {
      console.log("SkinnedMesh:", obj.name, "skeleton bones:", obj.skeleton.bones.length);
      console.log("boneInverses length:", obj.skeleton.boneInverses.length);
      // check first boneInverse matrix elements
      const inv0 = obj.skeleton.boneInverses[0];
      console.log("boneInverse[0] elements:", inv0 ? inv0.elements.slice(0, 4) : "none");
    }
  });

  cloned.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(cloned);
  const size = new THREE.Vector3();
  box.getSize(size);
  console.log("BBox size:", size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3));
  console.log("BBox min:", box.min.x.toFixed(3), box.min.y.toFixed(3), box.min.z.toFixed(3));
  console.log("BBox max:", box.max.x.toFixed(3), box.max.y.toFixed(3), box.max.z.toFixed(3));
});
