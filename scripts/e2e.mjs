import { spawn, spawnSync } from 'node:child_process';
const dataPath = `.local-data/e2e-${Date.now()}.json`;
const server = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3100'],
  {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NEXT_DIST_DIR: '.next-e2e',
      NEXT_PUBLIC_BACKEND: 'local',
      LOCAL_DATA_PATH: dataPath,
    },
  },
);
server.stdout.on('data', () => {});
server.stderr.on('data', (d) => {
  if (String(d).includes('Error')) process.stderr.write(d);
});
let exit = 1;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw Error('E2E 서버가 종료되었어요.');
    try {
      ready = (await fetch('http://127.0.0.1:3100')).ok;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw Error('E2E 서버 준비 시간 초과');
  const test = spawn(
    process.execPath,
    ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2)],
    { stdio: 'inherit', env: { ...process.env, E2E_EXTERNAL: 'true', E2E_DATA_PATH: dataPath } },
  );
  exit = await new Promise((r) => test.on('exit', (code) => r(code ?? 1)));
} catch (e) {
  console.error(e);
} finally {
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
  else server.kill('SIGTERM');
}
process.exit(exit);
