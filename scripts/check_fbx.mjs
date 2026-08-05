import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public/models/avatars');
const files = fs.readdirSync(dir);
console.log("Searching for Ch36_nonPBR.fbx or similar:");
files.forEach(f => {
  if (f.toLowerCase().includes('ch36') || f.toLowerCase().includes('fbx')) {
    const stat = fs.statSync(path.join(dir, f));
    console.log(` - ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  }
});
