import fs from 'fs';
import path from 'path';

const dir = path.join(process.cwd(), 'public/models/avatars');
const files = fs.readdirSync(dir);
console.log("Files in public/models/avatars:");
files.forEach(f => {
  const stat = fs.statSync(path.join(dir, f));
  console.log(` - ${f} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
});
