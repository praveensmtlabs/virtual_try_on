// scripts/clean_next.js
// Removes the .next build directory to avoid stale caches causing module resolution errors.
const fs = require('fs');
const path = require('path');

const nextDir = path.resolve(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('Removing stale .next folder...');
  fs.rmSync(nextDir, { recursive: true, force: true });
} else {
  console.log('.next folder does not exist, nothing to clean.');
}
