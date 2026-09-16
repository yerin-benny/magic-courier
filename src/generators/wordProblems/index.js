// 문장제 생성기 (spec 4-3). 맥락 데이터는 contexts.js.
//
// 유형 A~G와 같은 전수 열거 방식이다. 맥락마다 허용 범위 안의 (앞의 수, 뒤의 수) 조합을
// 전부 만들어 캐시하고, 조건(그룹 1은 답이 자연수)을 만족하지 않는 것은 처음부터 빼 둔다.
// "생성 후 답이 자연수가 아니면 폐기하고 재생성"을 열거 단계에서 미리 끝내는 셈이다.
//
// 문항 객체
//   type 'W', group 1|2, contextId, contextName, key, text, segments, dividend, divisor (표시용), answer (Rational), answerUnit
//   text 는 평문("... 3/4 kg을 ..."), segments 는 화면용 조각 배열이다. 화면에는 반드시 segments 를
//   renderSegments 로 그려서 분수가 세로 분수로 보이게 한다. text 를 그대로 화면에 쓰지 않는다.

import { gcd, makeFraction, makeWhole, makeRational } from '../../core/fraction.js';
import { fill, fillSegments, fractionText } from '../../core/josa.js';
import { createRng } from '../../core/random.js';
import { divideDisplay, memoize, mixedFractions, properFractions } from '../common.js';
import { CONTEXTS, GROUP_1_IDS, GROUP_2_IDS, TIME_DENOMINATORS } from './contexts.js';

export const TYPE = 'W';

export const COUNT_RULES = Object.freeze({
  wholeMin: 2, wholeMax: 9, mixedWholeMin: 1, mixedWholeMax: 4, mixedDenMin: 2, mixedDenMax: 9,
  divisorDenMin: 2, divisorDenMax: 9, answerMin: 2, answerMax: 30,
});
export const RATE_RULES = Object.freeze({ divisorDenMin: 2, divisorDenMax: 9 });
export const RATIO_RULES = Object.freeze({ denMin: 2, denMax: 12, mixedWholeMax: 4, answerMax: 10, answerDenMax: 12 });

function wholes(min, max) {
  const out = [];
  for (let n = min; n <= max; n++) out.push(makeWhole(n));
  return out;
}

/** 시간 맥락용 진분수: 분모 2, 3, 4, 6, 12, 기약 */
function timeFractions() {
  const out = [];
  for (const d of TIME_DENOMINATORS) {
    for (let n = 1; n < d; n++) {
      if (gcd(n, d) !== 1) continue;
      out.push(makeFraction({ num: n, den: d }));
    }
  }
  return out;
}

function pairsFor(range) {
  switch (range.kind) {
    case 'count': {
      const dividends = [
        ...wholes(COUNT_RULES.wholeMin, COUNT_RULES.wholeMax),
        ...mixedFractions(COUNT_RULES.mixedWholeMin, COUNT_RULES.mixedWholeMax, COUNT_RULES.mixedDenMin, COUNT_RULES.mixedDenMax),
      ];
      const divisors = properFractions(COUNT_RULES.divisorDenMin, COUNT_RULES.divisorDenMax);
      const out = [];
      for (const a of dividends) for (const b of divisors) {
        const answer = divideDisplay(a, b);
        if (answer.den !== 1) continue; // 그룹 1: 답은 반드시 자연수
        if (answer.num < COUNT_RULES.answerMin || answer.num > COUNT_RULES.answerMax) continue;
        out.push({ a, b, answer });
      }
      return out;
    }
    case 'rate': {
      const dividends = wholes(range.min, range.max);
      const divisors = range.time ? timeFractions() : properFractions(RATE_RULES.divisorDenMin, RATE_RULES.divisorDenMax);
      const out = [];
      for (const a of dividends) for (const b of divisors) {
        const answer = divideDisplay(a, b);
        if (answer.num / answer.den > range.cap) continue;
        out.push({ a, b, answer });
      }
      return out;
    }
    case 'ratio': {
      const dividends = [
        ...properFractions(RATIO_RULES.denMin, RATIO_RULES.denMax),
        ...mixedFractions(1, RATIO_RULES.mixedWholeMax, RATIO_RULES.denMin, RATIO_RULES.denMax),
      ];
      const divisors = properFractions(RATIO_RULES.denMin, RATIO_RULES.denMax);
      const out = [];
      for (const a of dividends) for (const b of divisors) {
        const answer = divideDisplay(a, b);
        if (answer.num <= answer.den) continue; // 앞의 수가 뒤의 수보다 커야 "몇 배"가 1보다 크다
        if (answer.num / answer.den > RATIO_RULES.answerMax) continue;
        if (answer.den > RATIO_RULES.answerDenMax) continue;
        out.push({ a, b, answer });
      }
      return out;
    }
    default:
      throw new Error(`알 수 없는 범위 종류: ${range.kind}`);
  }
}

const contextById = new Map(CONTEXTS.map((c) => [c.id, c]));
const enumerators = new Map(
  CONTEXTS.map((c) => [
    c.id,
    memoize(() =>
      pairsFor(c.range).map(({ a, b, answer }) => ({
        type: TYPE,
        group: c.group,
        contextId: c.id,
        contextName: c.name,
        rangeKind: c.range.kind, // 'count' | 'rate' | 'ratio' — 힌트 선택에 쓴다
        key: `${TYPE}${c.id}|${fractionText(a)}÷${fractionText(b)}`,
        text: fill(c.template, { a, b }), // 평문 (로그·테스트용)
        segments: fillSegments(c.template, { a, b }), // 화면용: 문자열과 Fraction 조각. 분수는 세로로 그린다

        dividend: a,
        divisor: b,
        answer,
        answerUnit: c.answerUnit,
      })),
    ),
  ]),
);

export function getContext(id) {
  const c = contextById.get(id);
  if (!c) throw new Error(`알 수 없는 문장제 맥락: ${id}`);
  return c;
}

/** 맥락 하나의 전수 문항 목록 (캐시) */
export function enumerateContext(id) {
  getContext(id);
  return enumerators.get(id)();
}

export function wordProblemSpaceSizes() {
  const sizes = {};
  for (const c of CONTEXTS) sizes[c.id] = enumerateContext(c.id).length;
  return sizes;
}

/** 특정 맥락에서 최근 큐에 없는 문항 하나 */
export function pickFromContext(id, { rng = createRng(), recent = null } = {}) {
  const all = enumerateContext(id);
  const candidates = recent ? all.filter((p) => !recent.has(p.key)) : all;
  const pool = candidates.length ? candidates : all;
  const problem = rng.pick(pool);
  if (recent) recent.push(problem.key);
  return problem;
}

/** 그룹(1 또는 2)에서 맥락을 고르게 뽑고, 그 맥락에서 문항 하나를 뽑는다. buildDelivery 가 쓴다. */
export function generateWordProblem(group, { rng = createRng(), recent = null } = {}) {
  const ids = group === 1 ? GROUP_1_IDS : group === 2 ? GROUP_2_IDS : null;
  if (!ids) throw new Error(`알 수 없는 문장제 그룹: ${group}`);
  const id = rng.pick(ids);
  return pickFromContext(id, { rng, recent });
}

export { CONTEXTS, GROUP_1_IDS, GROUP_2_IDS, TIME_DENOMINATORS } from './contexts.js';
export { makeRational };
