import fs from 'fs';
import path from 'path';

function checkGlb(filename) {
  const filePath = path.join(process.cwd(), 'public/models/avatars', filename);
  if (!fs.existsSync(filePath)) {
    console.log(filename, "DOES NOT EXIST");
    return;
  }
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  try {
    const json = JSON.parse(jsonStr);
    console.log(`\n=== ${filename} === (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
    console.log("extensionsRequired:", json.extensionsRequired);
    console.log("extensionsUsed:", json.extensionsUsed);
    console.log("meshes:", json.meshes ? json.meshes.length : 0);
    console.log("nodes:", json.nodes ? json.nodes.length : 0);
    console.log("skins:", json.skins ? json.skins.length : 0);
    console.log("animations:", json.animations ? json.animations.length : 0);
  } catch (e) {
    console.error("Error parsing GLB json for", filename, e.message);
  }
}

checkGlb("adult male 3d model.glb");
checkGlb("user-adult-male-tripo.glb");
checkGlb("user-adult-male-tripo.min.glb");
checkGlb("ch36-mixamo.min.glb");
checkGlb("adult-male.glb");
checkGlb("base_male.glb");
checkGlb("mixamo-aj.glb");
