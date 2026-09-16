// 문제 생성기 전수 검증 스크립트 (STEP 3).
// 실행: npm run verify:generators
//
// 검사 항목
//   1) 유형별 전수 문항 공간 크기 → 3부 확정값과 비교
//   2) 모든 문항의 조건 위반 여부 (분모 범위, 답 상한, 기약, 답 1, D 자연수, E 역수 분모 1)
//   3) 무작위 3만 건 뽑기에서 최근 60문항 제외 큐가 중복을 0으로 만드는지
//   4) 한 단원(8회차 × 4배송 = 160문제) 시뮬레이션에서 유형 배분이 20문제당 A3 B2 C3 D2 E2 F2 G2 문장제4 인지
//
// 위반이 있으면 고치지 않고 목록으로만 출력하고 종료 코드 1을 돌려준다.

import { gcd, rationalEquals, makeRational, divide, multiply } from '../src/core/fraction.js';
import { createRng } from '../src/core/random.js';
import {
  GENERATORS, TYPES, pickProblem, buildDelivery, createRecentQueue, DELIVERY_PLANS, isWordSlot,
} from '../src/generators/index.js';

const CONFIRMED = { A: 565, B: 1139, C: 12824, D: 430, E: null, F: 8163, G: 2101 };
const TOLERANCE = 0.05; // 3부 수치와 ±5% 안이면 같은 조건으로 본다

const violations = [];
function violate(type, message, sample) {
  violations.push({ type, message, sample });
}

const isProper = (f) => f.whole === 0 && f.num < f.den;
const isReducedFrac = (f) => f.num === 0 || gcd(f.num, f.den) === 1;
const value = (r) => r.num / r.den;
const ONE = makeRational(1, 1);

// ---------- 1) 문항 공간 크기 ----------
console.log('\n[1] 유형별 문항 공간 크기 (구현 / 3부 확정값)');
const sizes = {};
for (const t of TYPES) {
  const all = GENERATORS[t].enumerate();
  sizes[t] = all.length;
  const target = CONFIRMED[t];
  let note = '';
  if (target) {
    const diff = (all.length - target) / target;
    note = `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}%`;
    if (Math.abs(diff) > TOLERANCE) violate(t, `문항 공간이 3부 확정값과 ${(diff * 100).toFixed(1)}% 차이`, `${all.length} vs ${target}`);
  } else {
    note = '(3부 미기재, C에서 나누는 분자 1 제외)';
  }
  console.log(`  ${t}: ${String(all.length).padStart(6)} / ${String(target ?? '-').padStart(6)}  ${note}`);
}

// ---------- 2) 전수 조건 검사 ----------
console.log('\n[2] 전수 조건 검사');

function checkAll(type, all, checks) {
  const keys = new Set();
  let failed = 0;
  for (const p of all) {
    if (keys.has(p.key)) { violate(type, '키 중복', p.key); failed++; }
    keys.add(p.key);
    for (const [name, ok] of checks) {
      if (!ok(p)) {
        failed++;
        if (failed <= 5) violate(type, name, p.key);
      }
    }
  }
  console.log(`  ${type}: ${all.length}건 검사, 위반 ${failed}건`);
}

const divisionOk = (p) => rationalEquals(divide(p.dividend, p.divisor), p.answer);

checkAll('A', GENERATORS.A.enumerate(), [
  ['분모 5~40', (p) => p.dividend.den >= 5 && p.dividend.den <= 40],
  ['분모 같음', (p) => p.dividend.den === p.divisor.den],
  ['두 분수 진분수', (p) => isProper(p.dividend) && isProper(p.divisor)],
  ['두 분수 기약', (p) => isReducedFrac(p.dividend) && isReducedFrac(p.divisor)],
  ['답 자연수 2~8', (p) => p.answer.den === 1 && p.answer.num >= 2 && p.answer.num <= 8],
  ['나눗셈 값 일치', divisionOk],
]);

checkAll('B', GENERATORS.B.enumerate(), [
  ['분모 5~25', (p) => p.dividend.den >= 5 && p.dividend.den <= 25],
  ['분모 같음', (p) => p.dividend.den === p.divisor.den],
  ['나누는 분자 2~12', (p) => p.divisor.num >= 2 && p.divisor.num <= 12],
  ['나누어떨어지지 않음', (p) => p.dividend.num % p.divisor.num !== 0],
  ['두 분수 기약', (p) => isReducedFrac(p.dividend) && isReducedFrac(p.divisor)],
  ['답의 분모 12 이하', (p) => p.answer.den >= 2 && p.answer.den <= 12],
  ['나눗셈 값 일치', divisionOk],
]);

checkAll('C', GENERATORS.C.enumerate(), [
  ['분모 2~25', (p) => p.dividend.den >= 2 && p.dividend.den <= 25 && p.divisor.den >= 2 && p.divisor.den <= 25],
  ['두 분모 다름', (p) => p.dividend.den !== p.divisor.den],
  ['두 분수 기약 진분수', (p) => isProper(p.dividend) && isProper(p.divisor) && isReducedFrac(p.dividend) && isReducedFrac(p.divisor)],
  ['답 분모 39 이하', (p) => p.answer.den <= 39],
  ['답 10 이하', (p) => value(p.answer) <= 10],
  ['답 1 아님', (p) => !rationalEquals(p.answer, ONE)],
  ['나눗셈 값 일치', divisionOk],
]);

checkAll('D', GENERATORS.D.enumerate(), [
  ['자연수 2~24', (p) => p.dividend.num === 0 && p.dividend.whole >= 2 && p.dividend.whole <= 24],
  ['나누는 분수 기약 진분수, 분모 2~30', (p) => isProper(p.divisor) && isReducedFrac(p.divisor) && p.divisor.den <= 30],
  ['나누는 분자가 자연수의 약수', (p) => p.dividend.whole % p.divisor.num === 0],
  ['나누는 분자 ≠ 자연수', (p) => p.divisor.num !== p.dividend.whole],
  ['답 자연수', (p) => p.answer.den === 1],
  ['답 60 이하', (p) => p.answer.num <= 60],
  ['나눗셈 값 일치', divisionOk],
]);

checkAll('E', GENERATORS.E.enumerate(), [
  ['나누는 분자 2 이상', (p) => p.divisor.num >= 2],
  ['역수 칸 분모 1 아님', (p) => p.reciprocal.den !== 1],
  ['역수 칸 = 나누는 분수 뒤집기', (p) => p.reciprocal.num === p.divisor.den && p.reciprocal.den === p.divisor.num],
  ['역수 곱 = 답', (p) => rationalEquals(multiply(p.dividend, p.reciprocal), p.answer)],
  ['유형 C 조건 (분모 다름, 답 분모 39, 답 10)', (p) => p.dividend.den !== p.divisor.den && p.answer.den <= 39 && value(p.answer) <= 10],
]);

checkAll('F', GENERATORS.F.enumerate(), [
  ['대분수 자연수부 1~5', (p) => p.dividend.whole >= 1 && p.dividend.whole <= 5],
  ['분모 2~12', (p) => p.dividend.den >= 2 && p.dividend.den <= 12 && p.divisor.den >= 2 && p.divisor.den <= 12],
  ['분수부 기약 진분수', (p) => p.dividend.num < p.dividend.den && isReducedFrac(p.dividend) && p.divisor.num < p.divisor.den && isReducedFrac(p.divisor)],
  ['나누는 수 자연수부 0~3', (p) => p.divisor.whole <= 3],
  ['답 15 이하', (p) => value(p.answer) <= 15],
  ['답의 분모 15 이하', (p) => p.answer.den <= 15],
  ['답 1 아님', (p) => !rationalEquals(p.answer, ONE)],
  ['나눗셈 값 일치', divisionOk],
]);

checkAll('G', GENERATORS.G.enumerate(), [
  ['답 × 곱하는 수 = 곱', (p) => rationalEquals(multiply(p.answer, p.multiplier), makeRational(p.product.num, p.product.den))],
  ['곱 기약 진분수, 분모 39 이하', (p) => isProper(p.product) && isReducedFrac(p.product) && p.product.den <= 39],
  ['곱하는 수 기약 진분수, 분모 2~12', (p) => isProper(p.multiplier) && isReducedFrac(p.multiplier) && p.multiplier.den <= 12],
  ['답 기약, 분모 12 이하, 3 이하, 1 아님', (p) => gcd(p.answer.num, p.answer.den) === 1 && p.answer.den <= 12 && value(p.answer) <= 3 && !rationalEquals(p.answer, ONE)],
]);

// F, C 통틀어 (대분수)÷(대분수) 존재 확인
const fAll = GENERATORS.F.enumerate();
const fMixedDiv = fAll.filter((p) => p.divisor.whole >= 1).length;
const fProperDiv = fAll.length - fMixedDiv;
console.log(`  F 내역: (대분수)÷(진분수) ${fProperDiv}건, (대분수)÷(대분수) ${fMixedDiv}건`);
if (fMixedDiv === 0 || fProperDiv === 0) violate('F', '(대분수)÷(진분수)와 (대분수)÷(대분수)가 모두 있어야 한다');

// ---------- 3) 무작위 3만 건 + 최근 60문항 큐 ----------
console.log('\n[3] 무작위 30,000건 뽑기, 최근 60문항 제외 큐 중복 검사');
{
  const rng = createRng(20260916);
  const recent = createRecentQueue();
  const history = [];
  let dupInWindow = 0;
  let typeCycle = 0;
  while (history.length < 30000) {
    // 유형은 실제 배송 구성 순서대로 순환시킨다 (문장제 슬롯은 건너뜀)
    const plan = DELIVERY_PLANS[Math.floor(typeCycle / 5) % 4];
    const slot = plan[typeCycle % 5];
    typeCycle++;
    if (isWordSlot(slot)) continue;
    const p = pickProblem(slot, { rng, recent });
    const start = Math.max(0, history.length - 60);
    for (let j = start; j < history.length; j++) {
      if (history[j] === p.key) { dupInWindow++; break; }
    }
    history.push(p.key);
  }
  console.log(`  뽑은 문항 ${history.length}건, 직전 60문항과 겹친 경우 ${dupInWindow}건`);
  if (dupInWindow > 0) violate('큐', '최근 60문항 안에서 중복 발생', `${dupInWindow}건`);

  // 큐가 유형별이 아니라 전체 기준인지: 큐 안에 여러 유형 키가 섞여 있어야 한다
  const typesInQueue = new Set(recent.toArray().map((k) => k.split('|')[0]));
  console.log(`  큐 안의 유형: ${[...typesInQueue].sort().join(', ')} (전체 기준 큐)`);
  if (typesInQueue.size < 2) violate('큐', '큐가 유형별로 나뉘어 있다');
}

// ---------- 4) 한 단원 160문제 시뮬레이션 ----------
console.log('\n[4] 한 단원(8회차 × 4배송 = 160문제) 유형 배분');
{
  const rng = createRng(7);
  const recent = createRecentQueue();
  let seq = 0;
  // 문장제는 STEP 4 전이라 자리만 채운다
  const stubWord = (group) => ({ type: 'W', group, key: `W${group}|stub-${seq++}` });
  const expectedPer20 = { A: 3, B: 2, C: 3, D: 2, E: 2, F: 2, G: 2, W: 4 };
  const total = {};
  let perRoundOk = true;
  const keys = [];
  for (let round = 0; round < 8; round++) {
    const roundCount = {};
    for (let d = 0; d < 4; d++) {
      for (const p of buildDelivery(d, { rng, recent, wordProblemGenerator: stubWord })) {
        roundCount[p.type] = (roundCount[p.type] || 0) + 1;
        total[p.type] = (total[p.type] || 0) + 1;
        keys.push(p.key);
      }
    }
    for (const t of Object.keys(expectedPer20)) {
      if ((roundCount[t] || 0) !== expectedPer20[t]) perRoundOk = false;
    }
  }
  const line = Object.keys(expectedPer20).map((t) => `${t}${total[t] || 0}`).join(' ');
  console.log(`  160문제 합계: ${line}  (20문제당 기대: A3 B2 C3 D2 E2 F2 G2 문장제4)`);
  console.log(`  매 회차 20문제 배분 일치: ${perRoundOk ? '예' : '아니오'}`);
  if (!perRoundOk) violate('배송 구성', '회차별 유형 배분이 기대와 다르다');
  const unique = new Set(keys).size;
  console.log(`  160문제 중 서로 다른 문항: ${unique}건`);
  let dup = 0;
  for (let i = 0; i < keys.length; i++) {
    if (keys.slice(Math.max(0, i - 60), i).includes(keys[i])) dup++;
  }
  console.log(`  직전 60문항과 겹친 경우: ${dup}건`);
  if (dup > 0) violate('큐', '한 단원 안에서 최근 60문항 중복', `${dup}건`);
}

// ---------- 결과 ----------
console.log('\n[결과]');
if (violations.length === 0) {
  console.log('  위반 항목 없음');
  process.exit(0);
}
console.log(`  위반 ${violations.length}건 (고치지 않았다. 목록만 출력한다)`);
for (const v of violations) {
  console.log(`  - [${v.type}] ${v.message}${v.sample ? `  예: ${v.sample}` : ''}`);
}
process.exit(1);
