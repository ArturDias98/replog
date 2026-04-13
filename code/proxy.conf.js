const fs = require('fs');
const path = require('path');

const envJsPath = path.resolve(__dirname, 'public', 'env.js');
let target = '';

if (fs.existsSync(envJsPath)) {
  const content = fs.readFileSync(envJsPath, 'utf-8');
  const match = content.match(/window\.__env\.apiBaseUrl\s*=\s*['"]([^'"]*)['"]/);
  if (match) target = match[1];
}

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
  },
};
