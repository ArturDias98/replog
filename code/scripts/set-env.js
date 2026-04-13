const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '..', '.env');
const envVars = {};

if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        envVars[key] = value;
    }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID || envVars.GOOGLE_CLIENT_ID || '';
const apiBaseUrl = process.env.API_BASE_URL || envVars.API_BASE_URL || '';

const publicDir = path.resolve(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
}

const content = `(function (window) {
  window.__env = window.__env || {};
  window.__env.googleClientId = '${googleClientId}';
  window.__env.apiBaseUrl = '${apiBaseUrl}';
})(window);\n`;

fs.writeFileSync(path.join(publicDir, 'env.js'), content);

console.log('Environment files generated.');
