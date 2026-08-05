import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public/models/avatars/adult-male.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  
  console.log("=== THREE.JS LOAD TEST: base_male.glb ===");
  console.log("Box min:", box.min.x, box.min.y, box.min.z);
  console.log("Box max:", box.max.x, box.max.y, box.max.z);
  console.log("Box size:", size.x, size.y, size.z);
  console.log("Box center:", center.x, center.y, center.z);
  
  const height = size.y;
  let scale = 1;
  if (height < 1.4 || height > 2.2) {
    scale = THREE.MathUtils.clamp(1.72 / height, 0.15, 8);
  }
  console.log("Calculated scale:", scale);
}, (err) => console.error(err));
