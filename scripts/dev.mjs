import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const initialBuild = spawn(npm, ['run', 'build', '--workspace', '@club-puntos/shared'], {
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
const initialExitCode = await new Promise((resolve) => initialBuild.on('exit', resolve));
if (initialExitCode !== 0) process.exit(typeof initialExitCode === 'number' ? initialExitCode : 1);

const children = ['dev:server', 'dev:web'].map((script) =>
  spawn(npm, ['run', script], { stdio: 'inherit', shell: process.platform === 'win32' })
);

for (const child of children) {
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) process.exitCode = code;
    for (const other of children) if (other !== child) other.kill();
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) child.kill(signal);
  });
}
