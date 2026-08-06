import http from 'http';

function measureUrl(urlStr, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(urlStr, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({ url: urlStr, status: res.statusCode, durationMs: duration, bytes: data.length });
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ url: urlStr, error: 'timeout' });
    });
    req.on('error', (err) => {
      resolve({ url: urlStr, error: err.message });
    });
  });
}

async function run() {
  console.log('Testing HTTP response speed of 127.0.0.1:3000...');
  const res127 = await measureUrl('http://127.0.0.1:3000');
  console.log('127.0.0.1:3000:', res127);
}

run();
