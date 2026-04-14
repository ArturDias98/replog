const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;

// Update manifest.webmanifest
const manifestPath = path.join(root, 'public', 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

// Update angular.json define.APP_VERSION
const angularPath = path.join(root, 'angular.json');
const angular = JSON.parse(fs.readFileSync(angularPath, 'utf8'));
angular.projects.code.architect.build.options.define.APP_VERSION = `'${version}'`;
fs.writeFileSync(angularPath, JSON.stringify(angular, null, 2) + '\n', 'utf8');

console.log(`Version synced to ${version}`);
