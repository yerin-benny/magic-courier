// 유형 D — (자연수)÷(진분수)
//
// 확정 조건 (문항 공간 430 정확히 재현)
//   자연수 n: 2~24
//   나누는 분수 b/c: 분모 c 2~30, 분자 b < c, 기약
//   b는 n의 약수 (답이 자연수), b ≠ n (답이 분모 그대로가 되어 패턴이 노출됨)
//   답 n×c÷b: 60 이하
//
// 1부 본문(n 2~18, c 2~28)으로 세면 471(비기약 포함) 또는 330(기약)이 되어 430과 어긋난다.
// 3부 예시에 22 ÷ 11/23, 6 ÷ 3/29 가 있으므로 n 24, c 30 상한이 원 생성기의 조건이다.
//
// 필드: dividend (표시용 자연수, num 0 den 1), divisor (표시용), answer (Rational, 정수)

import { gcd, makeFraction, makeRational, makeWhole } from '../../core/fraction.js';
import { divisionKey, memoize } from '../common.js';

export const TYPE = 'D';
export const RULES = Object.freeze({ wholeMin: 2, wholeMax: 24, denMin: 2, denMax: 30, answerMax: 60 });

export const enumerate = memoize(() => {
  const out = [];
  for (let n = RULES.wholeMin; n <= RULES.wholeMax; n++) {
    for (let c = RULES.denMin; c <= RULES.denMax; c++) {
      for (let b = 1; b < c; b++) {
        if (n % b !== 0) continue;
        if (b === n) continue;
        if (gcd(b, c) !== 1) continue;
        const q = (n / b) * c;
        if (q > RULES.answerMax) continue;
        const dividend = makeWhole(n);
        const divisor = makeFraction({ num: b, den: c });
        out.push({ type: TYPE, key: divisionKey(TYPE, dividend, divisor), dividend, divisor, answer: makeRational(q, 1) });
      }
    }
  }
  return out;
});
