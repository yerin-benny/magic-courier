// 클라이언트와 Cloud Functions 가 같아야 하는 파일을 functions/lib/ 로 복사한다.
//
// 왜 복사인가: 배포 경계가 다르다. firebase deploy 는 functions/ 아래만 올린다.
// 그렇다고 규칙을 양쪽에 손으로 적으면 반드시 어긋난다. 원본은 src/ 쪽 하나뿐이고
// 이 스크립트가 복사본을 만든다.
//
//   npm run sync:functions    복사한다
//   npm run verify:functions  복사본이 원본과 같은지 확인한다 (다르면 실패)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** [원본, 복사본] */
const FILES = [
  ['src/game/ranking.js', 'functions/lib/ranking.js'],
  ['src/data/schools.json', 'functions/lib/schools.json'],
];

const HEADER = '// 이 파일은 자동 복사본이다. 고치지 말 것. 원본: %SOURCE%\n// 다시 만들려면: npm run sync:functions\n';

function bodyOf(source) {
  return readFileSync(resolve(root, source), 'utf8');
}

function wrapped(source) {
  const body = bodyOf(source);
  if (source.endsWith('.json')) return body; // JSON 에는 주석을 넣을 수 없다
  return HEADER.replace('%SOURCE%', source) + body;
}

const verify = process.argv.includes('--verify');
let failed = 0;

for (const [source, copy] of FILES) {
  const target = resolve(root, copy);
  const want = wrapped(source);
  if (verify) {
    const have = existsSync(target) ? readFileSync(target, 'utf8') : null;
    if (have !== want) {
      console.error(`✗ ${copy} 가 ${source} 와 다릅니다. npm run sync:functions 를 돌리세요.`);
      failed += 1;
    } else {
      console.log(`✓ ${copy}`);
    }
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, want, 'utf8');
    console.log(`복사: ${source} → ${copy}`);
  }
}

if (failed) process.exit(1);
if (verify) console.log('복사본이 원본과 같습니다.');
