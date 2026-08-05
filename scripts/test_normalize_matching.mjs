import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import fs from 'fs';
import path from 'path';

global.self = global;

function normalizeName(name) {
  return name.replace(/^mixamorig\d+:?/i, "mixamorig");
}

function testNormalize(filename) {
  const filePath = path.join(process.cwd(), 'public/models/avatars', filename);
  const buf = fs.readFileSync(filePath);
  const loader = new GLTFLoader();

  loader.parse(buf.buffer, '', (gltf) => {
    console.log(`\nTesting normalize on ${filename}:`);
    const boneNames = new Set();
    gltf.scene.traverse((o) => {
      const norm = normalizeName(o.name);
      if (/mixamorig/i.test(norm)) {
        boneNames.add(norm);
      }
    });

    console.log(`Normalized Bones (${boneNames.size}):`, Array.from(boneNames).slice(0, 10));

    if (gltf.animations) {
      gltf.animations.forEach((clip) => {
        const trackTargets = clip.tracks.map(t => normalizeName(t.name.split('.')[0]));
        const missing = trackTargets.filter(t => !boneNames.has(t));
        console.log(`Clip "${clip.name}": tracks=${clip.tracks.length}, missing targets=${missing.length}`);
      });
    }
  });
}

testNormalize("ch36-mixamo.min.glb");
testNormalize("anim-library-mixamo.glb");
