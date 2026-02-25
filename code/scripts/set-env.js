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

const envDir = path.resolve(__dirname, '..', 'src', 'environments');
if (!fs.existsSync(envDir)) {
    fs.mkdirSync(envDir, { recursive: true });
}

const content = `export const environment = {
    googleClientId: '${googleClientId}',
};
`;

fs.writeFileSync(path.join(envDir, 'environment.ts'), content);

console.log('Environment files generated.');
