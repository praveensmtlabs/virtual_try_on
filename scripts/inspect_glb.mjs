import fs from "fs";
import path from "path";

function parseGlb(filePath) {
  const buf = fs.readFileSync(filePath);
  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const length = buf.readUInt32LE(8);

  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  const jsonStr = buf.toString("utf8", 20, 20 + jsonLen);
  const json = JSON.parse(jsonStr);

  let binBuf = null;
  if (20 + jsonLen < length) {
    const binLen = buf.readUInt32LE(20 + jsonLen);
    const binType = buf.readUInt32LE(24 + jsonLen);
    binBuf = buf.subarray(28 + jsonLen, 28 + jsonLen + binLen);
  }

  return { json, binBuf, fullBuf: buf };
}

const avatar = parseGlb("public/models/avatars/ch36-mixamo.min.glb");
console.log("Avatar nodes:", avatar.json.nodes?.length);
console.log("Avatar meshes:", avatar.json.meshes?.map(m => m.name));
console.log("Avatar skins:", avatar.json.skins?.length);
if (avatar.json.skins) {
  console.log("Skin 0 joints count:", avatar.json.skins[0].joints.length);
  const jointNames = avatar.json.skins[0].joints.map(j => avatar.json.nodes[j].name);
  console.log("First 10 joints:", jointNames.slice(0, 10));
}

const shirt = parseGlb("public/models/clothes/ready/ch36-shirt.glb");
console.log("\nShirt nodes:", shirt.json.nodes?.length);
console.log("Shirt meshes:", shirt.json.meshes?.map(m => m.name));
console.log("Shirt skins:", shirt.json.skins?.length);
if (shirt.json.skins) {
  console.log("Shirt skin joints count:", shirt.json.skins[0].joints.length);
}
