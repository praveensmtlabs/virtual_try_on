import fs from 'fs';
import path from 'path';

// Let's inspect mesh bounding boxes in base_male.glb and adult-male.glb
function checkBBox(filename) {
  const filePath = path.join(process.cwd(), 'public/models/avatars', filename);
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
  const json = JSON.parse(jsonStr);
  console.log(`\n=== BBOX CHECK: ${filename} ===`);
  for (const accessor of json.accessors) {
    if (accessor.min && accessor.max && accessor.type === 'VEC3') {
      const min = accessor.min;
      const max = accessor.max;
      const dx = max[0] - min[0];
      const dy = max[1] - min[1];
      const dz = max[2] - min[2];
      if (dy > 0.5) {
        console.log(`Accessor ${accessor.name || ''}: Y range [${min[1].toFixed(2)}, ${max[1].toFixed(2)}], dy = ${dy.toFixed(2)}, dx = ${dx.toFixed(2)}, dz = ${dz.toFixed(2)}`);
      }
    }
  }
}

checkBBox("base_male.glb");
checkBBox("adult-male.glb");
checkBBox("ch36-mixamo.min.glb");
