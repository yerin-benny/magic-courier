// 유형 A — 분모가 같은 (진분수)÷(진분수), 나누어떨어지는 경우
//
// 확정 조건 (3부 검수 반영, 문항 공간 565 정확히 재현)
//   분모 d: 5~40
//   나누는 분자 b: 1~(d-1), 몫 k: 2~8, b×k < d
//   문제: (b×k)/d ÷ b/d,  답: 자연수 k
//   두 분수 모두 기약 (gcd(bk, d) = 1, gcd(b, d) = 1)
//
// 1부 본문의 "몫 2~9"로 세면 603이 되어 3부 수치와 어긋난다. 3부 예시의 답도 최대 8이다.
//
// 필드: dividend, divisor (표시용, 분모 같음), answer (Rational)

import { gcd, makeFraction, makeRational } from '../../core/fraction.js';
import { divisionKey, memoize } from '../common.js';

export const TYPE = 'A';
export const RULES = Object.freeze({ denMin: 5, denMax: 40, quotientMin: 2, quotientMax: 8 });

export const enumerate = memoize(() => {
  const out = [];
  for (let d = RULES.denMin; d <= RULES.denMax; d++) {
    for (let b = 1; b < d; b++) {
      if (gcd(b, d) !== 1) continue;
      for (let k = RULES.quotientMin; k <= RULES.quotientMax; k++) {
        const a = b * k;
        if (a >= d) break;
        if (gcd(a, d) !== 1) continue;
        const dividend = makeFraction({ num: a, den: d });
        const divisor = makeFraction({ num: b, den: d });
        out.push({
          type: TYPE,
          key: divisionKey(TYPE, dividend, divisor),
          dividend,
          divisor,
          answer: makeRational(k, 1),
        });
      }
    }
  }
  return out;
});
