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
    console.log("=== SIMULATING ANIMATION PLAYBACK ON ch36-mixamo.glb ===");
    const model = SkeletonUtils.clone(avatarGltf.scene);
    
    // Rename bones if needed
    model.traverse((o) => {
      if (o.name && /^mixamorig\d+:?/i.test(o.name)) {
        o.name = o.name.replace(/^mixamorig\d+:?/i, "mixamorig");
      }
    });

    model.updateMatrixWorld(true);
    const boxBefore = new THREE.Box3().setFromObject(model);
    console.log("BBox BEFORE animation:", "minY=", boxBefore.min.y.toFixed(2), "maxY=", boxBefore.max.y.toFixed(2));

    // Play 'idle' clip
    const idleClip = animGltf.animations.find(a => a.name === 'idle');
    const mixer = new THREE.AnimationMixer(model);
    const action = mixer.clipAction(idleClip);
    action.play();
    mixer.update(0.1); // Advance 0.1s

    model.updateMatrixWorld(true);
    const boxAfter = new THREE.Box3().setFromObject(model);
    console.log("BBox AFTER playing idle animation:", "minY=", boxAfter.min.y.toFixed(2), "maxY=", boxAfter.max.y.toFixed(2));
  });
});
