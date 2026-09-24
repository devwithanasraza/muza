import { spawn } from 'child_process';

const processes = [
  { name: 'API   ', cmd: 'npm', args: ['run', 'dev:api'], color: '\x1b[36m' },
  { name: 'WORKER', cmd: 'npm', args: ['run', 'dev:worker'], color: '\x1b[33m' },
  { name: 'WEB   ', cmd: 'npm', args: ['run', 'dev:web'], color: '\x1b[35m' },
];

const children = [];

console.log('\x1b[32m%s\x1b[0m', '🚀 Launching MUZA Full-Stack Suite (API, Worker, Web)...');

for (const p of processes) {
  const child = spawn(p.cmd, p.args, {
    shell: true,
    stdio: 'pipe',
  });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${p.color}[${p.name}]\x1b[0m ${line}`);
      }
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${p.color}[${p.name} ERR]\x1b[0m ${line}`);
      }
    }
  });

  children.push(child);
}

function shutdown() {
  console.log('\n\x1b[31m%s\x1b[0m', '🛑 Terminating MUZA processes...');
  for (const child of children) {
    child.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
