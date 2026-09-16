// 유형 F — (대분수)÷(진분수), (대분수)÷(대분수)
//
// 확정 조건 (문항 공간 8028, 3부 8163 대비 -1.7%)
//   나누어지는 대분수: 자연수부 1~5, 분모 2~12, 분수부 기약 진분수
//   나누는 수: 진분수(자연수부 0) 또는 대분수(자연수부 1~3), 분모 2~12, 기약
//   답 15 이하, 답의 분모 15 이하, 답 1 배제 (같은 수끼리 나누기 금지)
//
// 1부 본문의 "분모 2~15, 답 15 이하"만으로 세면 14만 건이 넘어 3부 수치와 크게 어긋난다.
// 3부 예시의 분모는 모두 12 이하, 나누는 대분수의 자연수부는 2 이하, 답의 분모는 15 이하다.
// 위 조건이 예시와 수치를 동시에 만족하는 가장 단순한 조합이다.
//
// 필드: dividend (표시용 대분수), divisor (표시용 진분수 또는 대분수), answer (Rational)

import { divisionKey, divideDisplay, memoize, mixedFractions, properFractions } from '../common.js';

export const TYPE = 'F';
export const RULES = Object.freeze({
  wholeMin: 1, wholeMax: 5, denMin: 2, denMax: 12,
  divisorWholeMax: 3, divisorDenMin: 2, divisorDenMax: 12,
  answerMax: 15, answerDenMax: 15,
});

export const enumerate = memoize(() => {
  const dividends = mixedFractions(RULES.wholeMin, RULES.wholeMax, RULES.denMin, RULES.denMax);
  const divisors = [
    ...properFractions(RULES.divisorDenMin, RULES.divisorDenMax),
    ...mixedFractions(1, RULES.divisorWholeMax, RULES.divisorDenMin, RULES.divisorDenMax),
  ];
  const out = [];
  for (const dividend of dividends) {
    for (const divisor of divisors) {
      const answer = divideDisplay(dividend, divisor);
      if (answer.num / answer.den > RULES.answerMax) continue;
      if (answer.den > RULES.answerDenMax) continue;
      if (answer.num === 1 && answer.den === 1) continue;
      out.push({ type: TYPE, key: divisionKey(TYPE, dividend, divisor), dividend, divisor, answer });
    }
  }
  return out;
});
