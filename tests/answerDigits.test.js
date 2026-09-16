// 입력 칸 자릿수 제한(자연수부·분모 2자리, 분자 3자리)에 모든 문항의 정답이 들어와야 한다.
// 대분수 표기 기준이다. 가분수 표기는 분자가 세 자리를 넘을 수 있어 대분수로 입력하게 한다.
import { describe, it, expect } from 'vitest';
import { rationalToFraction } from '../src/core/fraction.js';
import { GENERATORS, TYPES, CONTEXTS, enumerateContext } from '../src/generators/index.js';
import { MAX_DIGITS, MAX_NUM_DIGITS } from '../src/ui/components/inputModel.js';

const limit = 10 ** MAX_DIGITS - 1;
const numLimit = 10 ** MAX_NUM_DIGITS - 1;

function fits(problem) {
  const f = rationalToFraction(problem.answer); // 대분수 표시
  return f.whole <= limit && f.num <= numLimit && f.den <= limit;
}

describe('정답 자릿수 (대분수 표기)', () => {
  for (const t of TYPES) {
    it(`유형 ${t}: 자연수부·분모 ${limit} 이하, 분자 ${numLimit} 이하`, () => {
      for (const p of GENERATORS[t].enumerate()) {
        expect(fits(p), p.key).toBe(true);
        if (t === 'E') {
          expect(p.reciprocal.num).toBeLessThanOrEqual(limit);
          expect(p.reciprocal.den).toBeLessThanOrEqual(limit);
        }
      }
    });
  }

  it('문장제 20맥락 전부', () => {
    for (const c of CONTEXTS) {
      for (const p of enumerateContext(c.id)) expect(fits(p), p.key).toBe(true);
    }
  });

  it('대분수 표기의 분자는 실제로 두 자리 안이다 (분자 3자리는 가분수 입력을 위한 여유)', () => {
    for (const t of TYPES) {
      for (const p of GENERATORS[t].enumerate()) expect(rationalToFraction(p.answer).num).toBeLessThanOrEqual(limit);
    }
  });
});
