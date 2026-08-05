import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

function checkBones(filename) {
  const filePath = path.join(process.cwd(), 'public/models/avatars', filename);
  const buf = fs.readFileSync(filePath);
  const loader = new GLTFLoader();

  loader.parse(buf.buffer, '', (gltf) => {
    console.log(`\n==========================================`);
    console.log(`FILE: ${filename}`);
    console.log(`==========================================`);
    const nodes = [];
    const bones = [];
    gltf.scene.traverse((o) => {
      nodes.push(o.name);
      if (o.isBone || o.type === 'Bone' || /mixamorig/i.test(o.name)) {
        bones.push(o.name);
      }
    });
    console.log(`Total Nodes: ${nodes.length}`);
    console.log(`Total Bones: ${bones.length}`);
    console.log(`Sample Nodes:`, nodes.slice(0, 15));
    console.log(`Sample Bones:`, bones.slice(0, 15));
    
    if (gltf.animations && gltf.animations.length) {
      console.log(`Embedded Animations: ${gltf.animations.length}`);
      const clip = gltf.animations[0];
      console.log(`Clip "${clip.name}" tracks: ${clip.tracks.length}`);
      console.log(`Sample Track Names:`, clip.tracks.slice(0, 5).map(t => t.name));
    }
  });
}

checkBones("ch36-mixamo.min.glb");
checkBones("anim-library-mixamo.glb");
checkBones("adult-male.glb");
