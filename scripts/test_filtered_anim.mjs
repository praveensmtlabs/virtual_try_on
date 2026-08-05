import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import fs from 'fs';
import path from 'path';

global.self = global;

const avatarBuf = fs.readFileSync(path.join(process.cwd(), 'public/models/avatars/ch36-mixamo.glb'));
const animBuf = fs.readFileSync(path.join(process.cwd(), 'public/models/avatars/anim-library-mixamo.glb'));

const loader = new GLTFLoader();

loader.parse(avatarBuf.buffer, '', (avatarGltf) => {
  loader.parse(animBuf.buffer, '', (animGltf) => {
    console.log("=== TESTING FILTERED ANIMATION PLAYBACK (NO HIPS POSITION) ===");
    const model = SkeletonUtils.clone(avatarGltf.scene);
    
    model.traverse((o) => {
      if (o.name && /^mixamorig\d+:?/i.test(o.name)) {
        o.name = o.name.replace(/^mixamorig\d+:?/i, "mixamorig");
      }
    });

    const mixer = new THREE.AnimationMixer(model);
    const idleClip = animGltf.animations.find(a => a.name === 'idle');
    
    // clone clip and remove position track for Hips
    const clonedClip = idleClip.clone();
    clonedClip.tracks = clonedClip.tracks.filter(t => {
      t.name = t.name.replace(/^mixamorig\d+:?/i, "mixamorig");
      // filter out root hips position track so rest pose is preserved
      if (t.name.includes("Hips.position")) return false;
      return true;
    });

    const action = mixer.clipAction(clonedClip);
    action.play();

    // Update mixer by 0.2s
    mixer.update(0.2);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    console.log("AFTER FILTERED ANIMATION PLAY - Min:", box.min.toArray().map(v=>v.toFixed(2)), "Max:", box.max.toArray().map(v=>v.toFixed(2)));

    const hips = model.getObjectByName("mixamorigHips");
    if (hips) {
      const worldPos = new THREE.Vector3();
      hips.getWorldPosition(worldPos);
      console.log("Hips World Position after filtered animation:", worldPos.toArray().map(v=>v.toFixed(2)));
    }
  });
});
