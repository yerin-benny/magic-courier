// 생성기 공통 도구.
//
// 모든 유형은 "전수 열거(enumerate)" 방식으로 만든다.
// 조건을 만족하는 문항 전체를 한 번 만들어 캐시해 두고, 그 안에서 무작위로 고른다.
// 이렇게 하면 (1) 문항 공간 크기를 정확히 셀 수 있고 (2) 생성 후 폐기·재생성 루프가 없고
// (3) 최근 60문항 제외 큐를 "남은 것 중에서 고르기"로 단순하게 구현할 수 있다.
//
// 문항 객체 공통 필드
//   type     'A'~'G'
//   key      중복 판정용 고유 문자열 (유형 + 표시 수 그대로)
//   answer   계산용 Rational (기약)
// 유형별 추가 필드는 각 파일 머리 주석 참고.

import { gcd, makeFraction, makeRational } from '../core/fraction.js';
import { fractionText } from '../core/josa.js';

/** dmin~dmax 분모의 진분수 목록 (표시용). irreducible이면 기약만. */
export function properFractions(dmin, dmax, { irreducible = true, numMin = 1 } = {}) {
  const out = [];
  for (let d = dmin; d <= dmax; d++) {
    for (let n = numMin; n < d; n++) {
      if (irreducible && gcd(n, d) !== 1) continue;
      out.push(makeFraction({ num: n, den: d }));
    }
  }
  return out;
}

/** 자연수부 wmin~wmax, 분모 dmin~dmax 의 대분수 목록 (분수부 기약 진분수). */
export function mixedFractions(wmin, wmax, dmin, dmax) {
  const out = [];
  for (let w = wmin; w <= wmax; w++) {
    for (let d = dmin; d <= dmax; d++) {
      for (let n = 1; n < d; n++) {
        if (gcd(n, d) !== 1) continue;
        out.push(makeFraction({ whole: w, num: n, den: d }));
      }
    }
  }
  return out;
}

/** 나눗셈 결과를 계산용 Rational로. 표시용 분수를 그대로 받는다. */
export function divideDisplay(a, b) {
  const an = a.whole * a.den + a.num;
  const bn = b.whole * b.den + b.num;
  return makeRational(an * b.den, a.den * bn);
}

/** 문항 키. 표시 수를 그대로 써서 8/22와 4/11이 다른 키가 되게 한다. */
export function divisionKey(type, dividend, divisor) {
  return `${type}|${fractionText(dividend)}÷${fractionText(divisor)}`;
}

/** 한 번만 열거하고 캐시한다. */
export function memoize(fn) {
  let cache;
  return () => {
    if (!cache) cache = Object.freeze(fn());
    return cache;
  };
}
