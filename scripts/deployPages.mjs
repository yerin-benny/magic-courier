// GitHub Pages 배포. 빌드 결과(dist)를 gh-pages 브랜치에 통째로 올린다.
//
//   npm run deploy
//
// GitHub Actions 를 쓰지 않는 이유: 워크플로 파일을 올리려면 토큰에 workflow 권한이 필요한데
// 지금 로그인한 gh 토큰에는 없다. 로컬에서 빌드해 올리는 편이 단순하다.
//
// 소스는 main 브랜치에, 배포본은 gh-pages 브랜치 루트에 있다.

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });

console.log('> 빌드');
run('npm', ['run', 'build'], { shell: process.platform === 'win32' });

const dist = join(root, 'dist');
if (!existsSync(dist)) throw new Error('dist 가 없습니다');

const wt = mkdtempSync(join(tmpdir(), 'mc-pages-'));
try {
  console.log('> gh-pages 워크트리 준비');
  run('git', ['worktree', 'add', '--detach', wt]);
  const inWt = { cwd: wt };
  // gh-pages 브랜치는 이미 있으므로 --orphan gh-pages 는 실패한다.
  // 매번 새 이름의 고아 브랜치를 만들어 커밋하고, gh-pages 로 force push 한다.
  // 배포본은 빌드하면 다시 만들 수 있으니 히스토리를 쌓지 않는다.
  const temp = `pages-${Date.now()}`;
  execFileSync('git', ['checkout', '--orphan', temp], { ...inWt, stdio: 'ignore' });
  execFileSync('git', ['rm', '-rq', '--cached', '.'], { ...inWt, stdio: 'ignore' });
  for (const name of execFileSync('git', ['ls-files', '-o', '--directory'], { ...inWt, encoding: 'utf8' }).split('\n')) {
    const t = name.trim();
    if (t && t !== '.git/') rmSync(join(wt, t), { recursive: true, force: true });
  }

  cpSync(dist, wt, { recursive: true });
  rmSync(join(wt, 'dev'), { recursive: true, force: true }); // 개발용 페이지는 올리지 않는다
  writeFileSync(join(wt, '.nojekyll'), ''); // _ 로 시작하는 파일도 그대로 서빙

  console.log('> 커밋·푸시');
  run('git', ['add', '-A'], inWt);
  run('git', ['-c', 'core.safecrlf=false', 'commit', '-q', '-m', `GitHub Pages 배포본 (${new Date().toISOString().slice(0, 16)})`], inWt);
  run('git', ['push', '-f', 'origin', 'HEAD:gh-pages'], inWt);
  console.log('\n끝났습니다: https://yerin-benny.github.io/magic-courier/');
  console.log('(반영까지 1~2분 걸립니다)');
} finally {
  try {
    run('git', ['worktree', 'remove', '--force', wt]);
  } catch {
    /* 워크트리가 이미 없으면 넘어간다 */
  }
  run('git', ['worktree', 'prune']);
}
