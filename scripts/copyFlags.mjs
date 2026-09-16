// flag-icons(MIT) 패키지에서 60개국 국기 SVG(4:3)만 assets/flags/ 로 복사한다.
// 실행: npm run assets:flags   (패키지 버전을 올린 뒤에도 다시 돌리면 된다)

import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES } from '../src/data/countries.js';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../node_modules/flag-icons/flags/4x3');
const dest = resolve(here, '../assets/flags');
mkdirSync(dest, { recursive: true });

let copied = 0;
const missing = [];
for (const c of COUNTRIES) {
  const file = `${c.id.toLowerCase()}.svg`;
  const from = resolve(src, file);
  if (!existsSync(from)) {
    missing.push(c.id);
    continue;
  }
  copyFileSync(from, resolve(dest, file));
  copied += 1;
}
console.log(`국기 ${copied}개 복사 → assets/flags/`);
if (missing.length) {
  console.log(`없는 국기: ${missing.join(', ')}`);
  process.exit(1);
}
