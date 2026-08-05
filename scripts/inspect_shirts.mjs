import fs from "fs";

function parseGlb(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("File not found:", filePath);
    return;
  }
  const buf = fs.readFileSync(filePath);
  const jsonLen = buf.readUInt32LE(12);
  const jsonStr = buf.toString("utf8", 20, 20 + jsonLen);
  const json = JSON.parse(jsonStr);
  console.log("=== " + filePath + " ===");
  console.log("Meshes:", json.meshes?.map(m => m.name));
  console.log("Nodes:", json.nodes?.map(n => n.name).slice(0, 15));
  console.log("Materials:", json.materials?.map(m => m.name));
}

parseGlb("public/models/clothes/white-shirt.glb");
parseGlb("public/models/clothes/_downloads/bk-denim-shirt.glb");
parseGlb("public/models/clothes/fitted/denim-shirt.glb");
