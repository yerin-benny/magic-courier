// 회차 경로 추첨 3000회 시뮬레이션 (STEP 7). 실행: npm run verify:routes
//
// spec 3-1의 시뮬레이션 결과와 비교한다.
//   - 여권 1권(30스탬프)은 정확히 8회차에 완성
//   - 1권의 대륙 분포: 아시아 6.3 유럽 6.3 아프리카 5.8 북아메리카 4.4 남아메리카 4.1 오세아니아 2.5 특별 0.7
//   - 60개국 전부 방문은 평균 15회차
//   - 대륙 중복 금지 해제는 15회차 전체에서 평균 2회
//
// 위반이 있으면 고치지 않고 목록만 출력한다.

import { createRng } from '../src/core/random.js';
import { COUNTRIES, CONTINENTS } from '../src/data/countries.js';
import { drawRoute } from '../src/game/route.js';

const RUNS = 3000;
const PASSPORT_SIZE = 30;
const EXPECTED = { asia: 6.3, europe: 6.3, africa: 5.8, northAmerica: 4.4, southAmerica: 4.1, oceania: 2.5, special: 0.7 };
const EXPECTED_PASSPORT_ROUNDS = 8;
const EXPECTED_ALL_ROUNDS = 15;
const EXPECTED_RELEASES = 2;

const byId = Object.fromEntries(COUNTRIES.map((c) => [c.id, c]));
const violations = [];

const passportRounds = [];
const allRounds = [];
const releases = [];
const continentSum = Object.fromEntries(Object.keys(CONTINENTS).map((k) => [k, 0]));
let distinctContinentRoutes = 0;
let totalRoutes = 0;
let repeatedInRoute = 0;

const rng = createRng(20260916);
for (let run = 0; run < RUNS; run++) {
  const visited = [];
  const visitedSet = new Set();
  let round = 0;
  let passportAt = null;
  let allAt = null;
  let releaseCount = 0;
  let prevLast = null;
  while (round < 15) {
    round += 1;
    const { route, releasedContinentRule } = drawRoute(visitedSet, { rng, exclude: prevLast ? [prevLast] : [] });
    totalRoutes += 1;
    if (new Set(route).size !== route.length) repeatedInRoute += 1;
    if (new Set(route.map((id) => byId[id].continent)).size === 4) distinctContinentRoutes += 1;
    if (releasedContinentRule) releaseCount += 1;
    for (const id of route) {
      if (!visitedSet.has(id)) {
        visitedSet.add(id);
        visited.push(id);
        if (visited.length === PASSPORT_SIZE && passportAt === null) passportAt = round;
        if (visited.length === COUNTRIES.length && allAt === null) allAt = round;
      }
    }
    prevLast = route[route.length - 1];
  }
  passportRounds.push(passportAt);
  allRounds.push(allAt);
  releases.push(releaseCount);
  for (const id of visited.slice(0, PASSPORT_SIZE)) continentSum[byId[id].continent] += 1;
}

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

console.log(`[경로 추첨 시뮬레이션 ${RUNS}회]`);
console.log(`  여권 1권(30스탬프) 완성 회차: 평균 ${avg(passportRounds).toFixed(2)}, 최소 ${Math.min(...passportRounds)}, 최대 ${Math.max(...passportRounds)}  (기대 ${EXPECTED_PASSPORT_ROUNDS})`);
if (passportRounds.some((r) => r !== EXPECTED_PASSPORT_ROUNDS)) violations.push('여권 1권이 8회차에 정확히 완성되지 않는 경우가 있다');

console.log('  1권 대륙 분포 (평균 국가 수 / 기대):');
for (const k of Object.keys(CONTINENTS)) {
  const v = continentSum[k] / RUNS;
  const diff = v - EXPECTED[k];
  console.log(`    ${CONTINENTS[k].name.padEnd(6, ' ')} ${v.toFixed(2)} / ${EXPECTED[k]}  (${diff >= 0 ? '+' : ''}${diff.toFixed(2)})`);
  if (Math.abs(diff) > 0.5) violations.push(`${CONTINENTS[k].name} 분포가 기대와 0.5 이상 다르다 (${v.toFixed(2)} vs ${EXPECTED[k]})`);
}

console.log(`  60개국 전부 방문 회차: 평균 ${avg(allRounds).toFixed(2)}  (기대 ${EXPECTED_ALL_ROUNDS})`);
if (Math.abs(avg(allRounds) - EXPECTED_ALL_ROUNDS) > 0.5) violations.push('60개국 전부 방문 회차가 15에서 0.5 이상 벗어난다');

console.log(`  대륙 중복 금지 해제: 15회차 동안 평균 ${avg(releases).toFixed(2)}회  (기대 약 ${EXPECTED_RELEASES})`);
if (Math.abs(avg(releases) - EXPECTED_RELEASES) > 1) violations.push('대륙 중복 해제 횟수가 기대(2회)에서 1회 이상 벗어난다');

console.log(`  한 회차 4개국이 모두 다른 대륙인 비율: ${((distinctContinentRoutes / totalRoutes) * 100).toFixed(1)}%`);
console.log(`  한 회차 안에 같은 나라가 두 번 든 경우: ${repeatedInRoute}건`);
if (repeatedInRoute > 0) violations.push('한 회차 안에 같은 나라가 두 번 들었다');

console.log('\n[결과]');
if (violations.length === 0) {
  console.log('  위반 항목 없음');
  process.exit(0);
}
console.log(`  위반 ${violations.length}건 (고치지 않았다. 목록만 출력한다)`);
for (const v of violations) console.log(`  - ${v}`);
process.exit(1);
