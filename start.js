// start.js
import { spawn } from 'child_process';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Start the backend server
const server = spawn('node', ['server/api.js'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// Start the frontend development server
const client = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// Handle process termination
process.on('SIGINT', () => {
  server.kill('SIGINT');
  client.kill('SIGINT');
  process.exit();
});

console.log('🚀 Started backend server and frontend development server');
console.log('📊 Backend running on http://localhost:3001');
console.log('🖥️ Frontend running on http://localhost:5173'); 