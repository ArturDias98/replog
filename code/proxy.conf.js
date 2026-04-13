const fs = require('fs');
const path = require('path');

const envVars = {};
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    envVars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const target = process.env.API_BASE_URL || envVars.API_BASE_URL || '';

module.exports = {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
  },
};
