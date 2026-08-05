import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const filePath = path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.min.glb');
const buf = fs.readFileSync(filePath);
const loader = new GLTFLoader();

loader.parse(buf.buffer, '', (gltf) => {
  console.log("=== CH36-MIXAMO.MIN.GLB DEEP INSPECTION ===");
  const scene = gltf.scene;
  
  // List all objects
  scene.traverse((o) => {
    const m = o;
    const isB = m.isBone || m.type === 'Bone';
    const isMesh = m.isMesh;
    if (isMesh) {
      console.log(`MESH [${m.name}] pos:`, JSON.stringify(m.position), 'scale:', JSON.stringify(m.scale), 'visible:', m.visible);
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      mats.forEach(mat => {
        const std = mat;
        console.log(`  Material: ${mat.name} color:${std.color?.getHexString()} opacity:${std.opacity} transparent:${std.transparent} side:${std.side}`);
      });
      // Check geometry bounds
      if (m.geometry) {
        m.geometry.computeBoundingBox();
        console.log(`  Geometry BBox:`, JSON.stringify(m.geometry.boundingBox));
      }
    }
  });
  
  // Scene-level bounding box
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  console.log('\nScene BBox size:', JSON.stringify(size));
  console.log('Scene BBox center:', JSON.stringify(center));
  console.log('Scene BBox min.y:', box.min.y, 'max.y:', box.max.y);
  
  // Check scene root scale
  console.log('\nScene root position:', JSON.stringify(scene.position));
  console.log('Scene root scale:', JSON.stringify(scene.scale));
  console.log('Scene root rotation:', JSON.stringify(scene.rotation));
  
  // Count all objects
  let bones = 0, meshes = 0, groups = 0;
  scene.traverse((o) => {
    if (o.isBone || o.type === 'Bone') bones++;
    else if (o.isMesh) meshes++;
    else if (o.type === 'Group' || o.type === 'Object3D') groups++;
  });
  console.log(`\nSummary: bones=${bones} meshes=${meshes} groups=${groups}`);
  console.log(`Animations: ${gltf.animations?.map(a => `${a.name}(${a.duration.toFixed(2)}s)`).join(', ')}`);
});
