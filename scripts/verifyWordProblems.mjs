// 문장제 20맥락 검증 스크립트 (STEP 4).
// 실행: npm run verify:word
//
//   1) 맥락별 전수 문항 수
//   2) 맥락별 100건 무작위 생성 검사
//      - 그룹 1에 자연수가 아닌 답이 섞였는가
//      - 현실에서 말이 안 되는 문장이 나오는가 (1/9 L를 8명이 나눈다 같은 것)
//        · 나누어지는 양이 나누는 양보다 작음 (답 < 1)
//        · 그룹 1: 나누어지는 양이 1 미만
//        · 시간 맥락의 분모가 2, 3, 4, 6, 12 밖
//        · 답이 맥락 상한 초과
//        · 문장에 "을(를)" 병기, 단위 풀어쓰기
//   3) 맥락별 생성 예시 3개씩, 총 60개 출력 (눈으로 읽기용)
//
// 위반이 있으면 고치지 않고 목록만 출력한다.

import { createRng } from '../src/core/random.js';
import { rationalToFraction } from '../src/core/fraction.js';
import { fractionText } from '../src/core/josa.js';
import {
  CONTEXTS, TIME_DENOMINATORS, enumerateContext, pickFromContext, wordProblemSpaceSizes,
} from '../src/generators/wordProblems/index.js';

const violations = [];
const violate = (id, message, sample) => violations.push({ id, message, sample });
const value = (r) => r.num / r.den;
const TIME_IDS = [11, 13, 14, 15, 16];

console.log('[1] 맥락별 전수 문항 수');
const sizes = wordProblemSpaceSizes();
for (const c of CONTEXTS) console.log(`  ${String(c.id).padStart(2)} ${c.name.padEnd(9, ' ')} ${String(sizes[c.id]).padStart(5)}건`);

console.log('\n[2] 맥락별 100건 무작위 생성 검사');
const rng = createRng(20260916);
for (const c of CONTEXTS) {
  let bad = 0;
  for (let i = 0; i < 100; i++) {
    const p = pickFromContext(c.id, { rng });
    const problems = [];
    if (c.group === 1 && p.answer.den !== 1) problems.push('그룹 1인데 답이 자연수가 아님');
    if (value(p.answer) < 1) problems.push('나누어지는 양이 나누는 양보다 작음');
    if (c.group === 1 && p.dividend.whole < 1) problems.push('그룹 1인데 나누어지는 양이 1 미만');
    if (TIME_IDS.includes(c.id) && !TIME_DENOMINATORS.includes(p.divisor.den)) problems.push('시간 분모가 2,3,4,6,12 밖');
    if (c.range.kind === 'rate' && value(p.answer) > c.range.cap) problems.push('답이 맥락 상한 초과');
    if (/\(를\)|\(가\)|\(을\)|\(이\)/.test(p.text)) problems.push('조사 병기');
    if (/리터|킬로그램|미터|센티|킬로미터|제곱미터/.test(p.text)) problems.push('단위 풀어쓰기');
    if (problems.length) {
      bad++;
      if (bad <= 3) violate(c.id, problems.join(', '), p.text);
    }
  }
  console.log(`  ${String(c.id).padStart(2)} ${c.name.padEnd(9, ' ')} 위반 ${bad}건`);
}

console.log('\n[3] 맥락별 생성 예시 3개 (총 60개)');
const rng2 = createRng(9);
for (const c of CONTEXTS) {
  console.log(`\n  [${c.id}] ${c.name} (그룹 ${c.group})`);
  const all = enumerateContext(c.id);
  const seen = new Set();
  while (seen.size < 3) {
    const p = rng2.pick(all);
    if (seen.has(p.key)) continue;
    seen.add(p.key);
    const ans = fractionText(rationalToFraction(p.answer));
    console.log(`    ${p.text}  → ${ans}${p.answerUnit}`);
  }
}

console.log('\n[결과]');
if (violations.length === 0) {
  console.log('  위반 항목 없음');
  process.exit(0);
}
console.log(`  위반 ${violations.length}건 (고치지 않았다. 목록만 출력한다)`);
for (const v of violations) console.log(`  - [맥락 ${v.id}] ${v.message}  예: ${v.sample}`);
process.exit(1);
