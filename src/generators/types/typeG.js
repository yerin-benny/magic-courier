// 유형 G — 역연산: □ × c/d = e/f 에서 □ 구하기
//
// 문제를 먼저 만들지 않는다. 답 □를 먼저 정하고 c/d를 곱해 e/f를 만든다 (3부 1차 검수).
//
// 확정 조건 (문항 공간 2054, 3부 2101 대비 -2.2%)
//   답 □ = p/q: 기약, 분모 q 1~12, 값 3 이하, 1 배제
//   곱하는 수 c/d: 기약 진분수, 분모 2~12
//   곱 e/f = □ × c/d 를 기약한 것: 진분수여야 하고 분모 39 이하 (유형 C의 답 분모 상한과 같다)
//
// 3부 예시: 답의 분모 ≤ 12, 답 ≤ 3, 곱하는 수의 분모 ≤ 11, 곱의 분모 ≤ 27. 모두 위 조건 안이다.
//
// 필드: multiplier (표시용 c/d), product (표시용 e/f, 기약), answer (Rational = □)

import { gcd, makeRational, multiply, rationalToFraction } from '../../core/fraction.js';
import { fill, fillSegments, fractionText } from '../../core/josa.js';

const SENTENCE_TEMPLATE = '어떤 수에 {m:을/를} 곱했더니 {p:이/가} 되었습니다. 어떤 수는 얼마일까요?';
import { memoize, properFractions } from '../common.js';

export const TYPE = 'G';
export const RULES = Object.freeze({
  answerDenMax: 12, answerMax: 3,
  multiplierDenMin: 2, multiplierDenMax: 12,
  productDenMax: 39,
});

/** 답 후보 목록: 기약 p/q, q ≤ 12, 값 ≤ 3, 1 제외 */
function answerCandidates() {
  const out = [];
  for (let q = 1; q <= RULES.answerDenMax; q++) {
    for (let p = 1; p <= RULES.answerMax * q; p++) {
      if (gcd(p, q) !== 1) continue;
      if (p === q) continue;
      out.push(makeRational(p, q));
    }
  }
  return out;
}

export const enumerate = memoize(() => {
  const multipliers = properFractions(RULES.multiplierDenMin, RULES.multiplierDenMax);
  const out = [];
  for (const answer of answerCandidates()) {
    for (const multiplier of multipliers) {
      const product = multiply(answer, multiplier);
      if (product.num >= product.den) continue; // 곱은 진분수
      if (product.den > RULES.productDenMax) continue;
      const productDisplay = rationalToFraction(product, { mixed: false });
      out.push({
        type: TYPE,
        key: `${TYPE}|□×${fractionText(multiplier)}=${fractionText(productDisplay)}`,
        multiplier,
        product: productDisplay,
        answer,
      });
    }
  }
  return out;
});

/** 문장형 문제 평문 (로그·테스트용). 조사는 josa 규칙으로 확정한다. "을(를)" 병기를 쓰지 않는다. */
export function sentence(problem) {
  return fill(SENTENCE_TEMPLATE, { m: problem.multiplier, p: problem.product });
}

/** 문장형 문제 화면용 조각. 분수 조각은 renderSegments 가 세로 분수로 그린다. */
export function sentenceSegments(problem) {
  return fillSegments(SENTENCE_TEMPLATE, { m: problem.multiplier, p: problem.product });
}

/** 식 형태 텍스트. □ × c/d = e/f */
export function equation(problem) {
  return `□ × ${fractionText(problem.multiplier)} = ${fractionText(problem.product)}`;
}
