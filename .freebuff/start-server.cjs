const { spawn } = require('child_process');
const path = require('path');

const logFile = path.join(__dirname, 'preview-884ac8b3-4c29-42b7-bc24-5636bbb2b9ef.log');
const errFile = path.join(__dirname, 'preview-884ac8b3-4c29-42b7-bc24-5636bbb2b9ef.log.err');

const fs = require('fs');
const outStream = fs.openSync(logFile, 'w');
const errStream = fs.openSync(errFile, 'w');

const child = spawn('node', [
  path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js'),
  '--port=3000',
  '--host=0.0.0.0'
], {
  detached: true,
  stdio: ['ignore', outStream, errStream],
  cwd: path.join(__dirname, '..')
});

child.unref();
console.log(child.pid);
