// 유형 C — 분모가 다른 (진분수)÷(진분수)
//
// 확정 조건 (문항 공간 12824 정확히 재현)
//   두 분수 모두 기약 진분수, 분모 2~25, 두 분모는 서로 다름
//   답의 분모 39 이하, 답 10 이하
//   답이 1이 되는 경우 배제 (기약·분모 다름 조건에서는 자동으로 생기지 않는다)
//
// 필드: dividend, divisor (표시용), answer (Rational)
// 유형 E와 G가 이 조건을 재사용한다.

import { makeRational } from '../../core/fraction.js';
import { divisionKey, divideDisplay, memoize, properFractions } from '../common.js';

export const TYPE = 'C';
export const RULES = Object.freeze({ denMin: 2, denMax: 25, answerDenMax: 39, answerMax: 10 });

/** 조건을 만족하는 (dividend, divisor, answer) 조합을 만든다. 다른 유형이 옵션을 바꿔 재사용한다. */
export function enumerateDivisions({ divisorNumMin = 1 } = {}) {
  const fractions = properFractions(RULES.denMin, RULES.denMax);
  const divisors = fractions.filter((f) => f.num >= divisorNumMin);
  const out = [];
  const one = makeRational(1, 1);
  for (const dividend of fractions) {
    for (const divisor of divisors) {
      if (dividend.den === divisor.den) continue;
      const answer = divideDisplay(dividend, divisor);
      if (answer.den > RULES.answerDenMax) continue;
      if (answer.num / answer.den > RULES.answerMax) continue;
      if (answer.num === one.num && answer.den === one.den) continue;
      out.push({ dividend, divisor, answer });
    }
  }
  return out;
}

export const enumerate = memoize(() =>
  enumerateDivisions().map(({ dividend, divisor, answer }) => ({
    type: TYPE,
    key: divisionKey(TYPE, dividend, divisor),
    dividend,
    divisor,
    answer,
  })),
);
