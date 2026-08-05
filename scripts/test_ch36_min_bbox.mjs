import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.min.glb');
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
  
  console.log("=== THREE.JS LOAD TEST: ch36-mixamo.min.glb ===");
  console.log("Box min:", box.min.x.toFixed(4), box.min.y.toFixed(4), box.min.z.toFixed(4));
  console.log("Box max:", box.max.x.toFixed(4), box.max.y.toFixed(4), box.max.z.toFixed(4));
  console.log("Box size:", size.x.toFixed(4), size.y.toFixed(4), size.z.toFixed(4));
  console.log("Box center:", center.x.toFixed(4), center.y.toFixed(4), center.z.toFixed(4));
  
  const height = size.y;
  let scale = 1;
  if (height < 1.4 || height > 2.2) {
    scale = THREE.MathUtils.clamp(1.72 / height, 0.15, 8);
  }
  console.log("Calculated scale:", scale);
}, (err) => console.error(err));
