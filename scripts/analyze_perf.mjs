import fs from 'fs';
import path from 'path';

function getDirStats(dirPath) {
  let totalSize = 0;
  let fileCount = 0;
  const files = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        totalSize += stat.size;
        fileCount++;
        if (stat.size > 5 * 1024 * 1024) { // Files > 5MB
          files.push({
            path: path.relative(process.cwd(), fullPath).replace(/\\/g, '/'),
            sizeMB: (stat.size / (1024 * 1024)).toFixed(2)
          });
        }
      }
    }
  }

  walk(dirPath);
  return { totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2), fileCount, files };
}

console.log('=== PROJECT BASE PERFORMANCE ANALYSIS ===');
console.log('Public folder stats:', getDirStats('public'));
console.log('Src folder stats:', getDirStats('src'));
if (fs.existsSync('.next')) {
  console.log('.next folder stats:', getDirStats('.next'));
}
