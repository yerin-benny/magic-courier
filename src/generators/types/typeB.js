// 유형 B — 분모가 같은 (진분수)÷(진분수), 나누어떨어지지 않는 경우
//
// 확정 조건 (문항 공간 1142, 3부 1139 대비 +0.3%)
//   분모 d: 5~25
//   분자 a: 1~(d-1), 나누는 분자 b: 2~12 (b < d)
//   a를 b로 나눈 나머지가 0이 아님. a < b 허용 (답이 진분수)
//   두 분수 모두 기약
//   답 a/b (기약하면 분모가 자연히 12 이하가 된다)
//
// 1부 본문의 "답의 분모 9 이하"는 b 상한 12 제한(3부 1차 검수) 이전 문구로 본다.
// 답의 분모를 9 이하로 다시 좁히려면 ANSWER_DEN_MAX를 9로 바꾸면 된다 (문항 공간 944).
//
// 필드: dividend, divisor (표시용, 분모 같음), answer (Rational)

import { gcd, makeFraction, makeRational } from '../../core/fraction.js';
import { divisionKey, memoize } from '../common.js';

export const TYPE = 'B';
export const RULES = Object.freeze({ denMin: 5, denMax: 25, divisorNumMin: 2, divisorNumMax: 12, answerDenMax: 12 });

export const enumerate = memoize(() => {
  const out = [];
  for (let d = RULES.denMin; d <= RULES.denMax; d++) {
    for (let a = 1; a < d; a++) {
      if (gcd(a, d) !== 1) continue;
      for (let b = RULES.divisorNumMin; b <= Math.min(RULES.divisorNumMax, d - 1); b++) {
        if (gcd(b, d) !== 1) continue;
        if (a % b === 0) continue;
        const answer = makeRational(a, b);
        if (answer.den > RULES.answerDenMax) continue;
        const dividend = makeFraction({ num: a, den: d });
        const divisor = makeFraction({ num: b, den: d });
        out.push({ type: TYPE, key: divisionKey(TYPE, dividend, divisor), dividend, divisor, answer });
      }
    }
  }
  return out;
});
