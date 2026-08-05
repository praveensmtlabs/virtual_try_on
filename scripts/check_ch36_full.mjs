import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

function checkFull(filename) {
  const filePath = path.join(process.cwd(), 'public/models/avatars', filename);
  const buf = fs.readFileSync(filePath);
  const loader = new GLTFLoader();

  loader.parse(buf.buffer, '', (gltf) => {
    console.log(`\n==========================================`);
    console.log(`FILE: ${filename}`);
    console.log(`==========================================`);
    const nodes = [];
    const bones = [];
    const meshes = [];
    gltf.scene.traverse((o) => {
      nodes.push(o.name);
      if (o.isMesh) {
        meshes.push({
          name: o.name,
          visible: o.visible,
          type: o.type,
          mat: Array.isArray(o.material) ? o.material.map(m => m.name) : o.material?.name,
          vertCount: o.geometry?.attributes?.position?.count
        });
      }
      if (o.isBone || o.type === 'Bone' || /mixamorig/i.test(o.name)) {
        bones.push(o.name);
      }
    });
    console.log(`Total Nodes: ${nodes.length}`);
    console.log(`Total Meshes: ${meshes.length}`, meshes);
    console.log(`Total Bones: ${bones.length}`);
    console.log(`Sample Bones:`, bones.slice(0, 15));
    
    if (gltf.animations) {
      console.log(`Embedded Animations: ${gltf.animations.length}`);
      gltf.animations.forEach((anim, i) => {
        console.log(`  Anim [${i}] "${anim.name}", duration=${anim.duration}s, tracks=${anim.tracks.length}`);
      });
    }
  });
}

checkFull("ch36-mixamo.min.glb");
checkFull("adult-male.glb");
