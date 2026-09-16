// 유형 A~G 생성기 테스트. 전수 열거 결과 전체를 검사한다.
import { describe, it, expect } from 'vitest';
import { gcd, isReduced, rationalEquals, makeRational, divide, multiply } from '../src/core/fraction.js';
import * as A from '../src/generators/types/typeA.js';
import * as B from '../src/generators/types/typeB.js';
import * as C from '../src/generators/types/typeC.js';
import * as D from '../src/generators/types/typeD.js';
import * as E from '../src/generators/types/typeE.js';
import * as F from '../src/generators/types/typeF.js';
import * as G from '../src/generators/types/typeG.js';

const isProper = (f) => f.whole === 0 && f.num < f.den;
const value = (r) => r.num / r.den;
const uniqueKeys = (list) => new Set(list.map((p) => p.key)).size === list.length;

function expectDivisionConsistent(p) {
  // 표시된 두 수를 실제로 나눈 값이 answer와 같다
  expect(rationalEquals(divide(p.dividend, p.divisor), p.answer)).toBe(true);
}

describe('유형 A', () => {
  const all = A.enumerate();

  it('문항 공간이 3부 확정값 565와 같다', () => {
    expect(all.length).toBe(565);
  });

  it('모든 문항: 분모 5~40, 분모 같음, 두 분수 기약, 답 자연수 2~8', () => {
    for (const p of all) {
      expect(p.dividend.den).toBe(p.divisor.den);
      expect(p.dividend.den).toBeGreaterThanOrEqual(5);
      expect(p.dividend.den).toBeLessThanOrEqual(40);
      expect(isProper(p.dividend)).toBe(true);
      expect(isProper(p.divisor)).toBe(true);
      expect(isReduced(p.dividend)).toBe(true);
      expect(isReduced(p.divisor)).toBe(true);
      expect(p.answer.den).toBe(1);
      expect(p.answer.num).toBeGreaterThanOrEqual(2);
      expect(p.answer.num).toBeLessThanOrEqual(8);
      expectDivisionConsistent(p);
    }
    expect(uniqueKeys(all)).toBe(true);
  });

  it('3부 예시가 문항 공간에 있다: 35/38 ÷ 7/38, 7/39 ÷ 1/39, 32/37 ÷ 8/37', () => {
    const keys = new Set(all.map((p) => p.key));
    expect(keys.has('A|35/38÷7/38')).toBe(true);
    expect(keys.has('A|7/39÷1/39')).toBe(true);
    expect(keys.has('A|32/37÷8/37')).toBe(true);
  });

  it('16/36 ÷ 2/36 같은 약분 가능 문항은 없다', () => {
    expect(all.some((p) => p.key === 'A|16/36÷2/36')).toBe(false);
  });
});

describe('유형 B', () => {
  const all = B.enumerate();

  it('문항 공간이 3부 확정값 1139의 ±5% 안이다', () => {
    expect(all.length).toBe(1142);
    expect(Math.abs(all.length - 1139) / 1139).toBeLessThan(0.05);
  });

  it('모든 문항: 분모 5~25 같음, 나누는 분자 2~12, 나누어떨어지지 않음, 두 분수 기약, 답 분모 12 이하', () => {
    for (const p of all) {
      expect(p.dividend.den).toBe(p.divisor.den);
      expect(p.dividend.den).toBeGreaterThanOrEqual(5);
      expect(p.dividend.den).toBeLessThanOrEqual(25);
      expect(p.divisor.num).toBeGreaterThanOrEqual(2);
      expect(p.divisor.num).toBeLessThanOrEqual(12);
      expect(p.dividend.num % p.divisor.num).not.toBe(0);
      expect(isReduced(p.dividend)).toBe(true);
      expect(isReduced(p.divisor)).toBe(true);
      expect(p.answer.den).toBeGreaterThan(1);
      expect(p.answer.den).toBeLessThanOrEqual(12);
      expectDivisionConsistent(p);
    }
    expect(uniqueKeys(all)).toBe(true);
  });

  it('a < b 문항(답이 진분수)이 포함된다: 1/17 ÷ 5/17, 2/23 ÷ 6/23', () => {
    const keys = new Set(all.map((p) => p.key));
    expect(keys.has('B|1/17÷5/17')).toBe(true);
    expect(keys.has('B|2/23÷6/23')).toBe(true);
    expect(keys.has('B|21/25÷4/25')).toBe(true);
  });
});

describe('유형 C', () => {
  const all = C.enumerate();

  it('문항 공간이 3부 확정값 12824와 같다', () => {
    expect(all.length).toBe(12824);
  });

  it('모든 문항: 기약 진분수, 분모 2~25 서로 다름, 답 분모 39 이하, 답 10 이하, 답 1 아님', () => {
    for (const p of all) {
      expect(isProper(p.dividend)).toBe(true);
      expect(isProper(p.divisor)).toBe(true);
      expect(isReduced(p.dividend)).toBe(true);
      expect(isReduced(p.divisor)).toBe(true);
      expect(p.dividend.den).not.toBe(p.divisor.den);
      expect(p.dividend.den).toBeGreaterThanOrEqual(2);
      expect(p.dividend.den).toBeLessThanOrEqual(25);
      expect(p.divisor.den).toBeLessThanOrEqual(25);
      expect(p.answer.den).toBeLessThanOrEqual(39);
      expect(value(p.answer)).toBeLessThanOrEqual(10);
      expect(rationalEquals(p.answer, makeRational(1, 1))).toBe(false);
      expectDivisionConsistent(p);
    }
    expect(uniqueKeys(all)).toBe(true);
  });

  it('3부 예시: 8/13 ÷ 3/16 = 3과 11/39, 1/21 ÷ 5/14 = 2/15', () => {
    const byKey = new Map(all.map((p) => [p.key, p]));
    expect(rationalEquals(byKey.get('C|8/13÷3/16').answer, makeRational(128, 39))).toBe(true);
    expect(rationalEquals(byKey.get('C|1/21÷5/14').answer, makeRational(2, 15))).toBe(true);
  });
});

describe('유형 D', () => {
  const all = D.enumerate();

  it('문항 공간이 3부 확정값 430과 같다', () => {
    expect(all.length).toBe(430);
  });

  it('모든 문항: 자연수 2~24, 나누는 분수 기약 진분수(분모 2~30), 분자가 자연수의 약수이고 자연수와 다름, 답 자연수 60 이하', () => {
    for (const p of all) {
      const n = p.dividend.whole;
      expect(p.dividend.num).toBe(0);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(24);
      expect(isProper(p.divisor)).toBe(true);
      expect(isReduced(p.divisor)).toBe(true);
      expect(p.divisor.den).toBeLessThanOrEqual(30);
      expect(n % p.divisor.num).toBe(0);
      expect(p.divisor.num).not.toBe(n);
      expect(p.answer.den).toBe(1);
      expect(p.answer.num).toBeLessThanOrEqual(60);
      expectDivisionConsistent(p);
    }
    expect(uniqueKeys(all)).toBe(true);
  });

  it('답이 자연수가 아닌 문항이 하나도 없다', () => {
    expect(all.every((p) => p.answer.den === 1)).toBe(true);
  });

  it('3부 예시: 22 ÷ 11/23 = 46, 6 ÷ 3/29 = 58', () => {
    const byKey = new Map(all.map((p) => [p.key, p]));
    expect(byKey.get('D|22÷11/23').answer.num).toBe(46);
    expect(byKey.get('D|6÷3/29').answer.num).toBe(58);
  });
});

describe('유형 E', () => {
  const all = E.enumerate();

  it('유형 C 문항 중 나누는 분자가 1인 것만 뺀 크기다', () => {
    const cWithoutOne = C.enumerate().filter((p) => p.divisor.num >= 2).length;
    expect(all.length).toBe(cWithoutOne);
    expect(all.length).toBeLessThan(12824);
  });

  it('역수 칸의 분모가 1이 되는 경우가 없다', () => {
    for (const p of all) {
      expect(p.divisor.num).toBeGreaterThanOrEqual(2);
      expect(p.reciprocal.num).toBe(p.divisor.den);
      expect(p.reciprocal.den).toBe(p.divisor.num);
      expect(p.reciprocal.den).toBeGreaterThanOrEqual(2);
      // 역수를 곱한 값이 answer와 같다
      expect(rationalEquals(multiply(p.dividend, p.reciprocal), p.answer)).toBe(true);
    }
    expect(uniqueKeys(all)).toBe(true);
  });

  it('3부 예시: 1/12 ÷ 11/24 → 빈칸 24/11, 답 2/11', () => {
    const p = all.find((x) => x.key === 'E|1/12÷11/24');
    expect(p.reciprocal).toMatchObject({ num: 24, den: 11 });
    expect(rationalEquals(p.answer, makeRational(2, 11))).toBe(true);
  });
});

describe('유형 F', () => {
  const all = F.enumerate();

  it('문항 공간이 3부 확정값 8163의 ±5% 안이다', () => {
    expect(all.length).toBe(8028);
    expect(Math.abs(all.length - 8163) / 8163).toBeLessThan(0.05);
  });

  it('모든 문항: 대분수 자연수부 1~5, 분모 2~12 기약, 나누는 수는 진분수 또는 대분수, 답 15 이하, 답 1 아님', () => {
    for (const p of all) {
      expect(p.dividend.whole).toBeGreaterThanOrEqual(1);
      expect(p.dividend.whole).toBeLessThanOrEqual(5);
      expect(p.dividend.den).toBeLessThanOrEqual(12);
      expect(p.dividend.num).toBeLessThan(p.dividend.den);
      expect(isReduced(p.dividend)).toBe(true);
      expect(p.divisor.num).toBeLessThan(p.divisor.den);
      expect(isReduced(p.divisor)).toBe(true);
      expect(p.divisor.den).toBeLessThanOrEqual(12);
      expect(value(p.answer)).toBeLessThanOrEqual(15);
      expect(p.answer.den).toBeLessThanOrEqual(15);
      expect(rationalEquals(p.answer, makeRational(1, 1))).toBe(false);
      expectDivisionConsistent(p);
    }
    expect(uniqueKeys(all)).toBe(true);
  });

  it('(대분수)÷(진분수)와 (대분수)÷(대분수)가 둘 다 있다', () => {
    expect(all.some((p) => p.divisor.whole === 0)).toBe(true);
    expect(all.some((p) => p.divisor.whole >= 1)).toBe(true);
  });

  it('같은 수끼리 나누는 문항이 없다', () => {
    expect(all.some((p) => p.dividend.whole === p.divisor.whole && p.dividend.num === p.divisor.num && p.dividend.den === p.divisor.den)).toBe(false);
  });

  it('3부 예시: 3과 8/9 ÷ 1과 1/4 = 3과 1/9, 5와 4/7 ÷ 2/5 = 13과 13/14', () => {
    const byKey = new Map(all.map((p) => [p.key, p]));
    expect(rationalEquals(byKey.get('F|3과 8/9÷1과 1/4').answer, makeRational(28, 9))).toBe(true);
    expect(rationalEquals(byKey.get('F|5와 4/7÷2/5').answer, makeRational(195, 14))).toBe(true);
  });
});

describe('유형 G', () => {
  const all = G.enumerate();

  it('문항 공간이 3부 확정값 2101의 ±5% 안이다', () => {
    expect(all.length).toBe(2054);
    expect(Math.abs(all.length - 2101) / 2101).toBeLessThan(0.05);
  });

  it('모든 문항: 답 × 곱하는 수 = 곱, 곱은 기약 진분수(분모 39 이하), 답 분모 12 이하, 답 3 이하, 답 1 아님', () => {
    for (const p of all) {
      expect(rationalEquals(multiply(p.answer, p.multiplier), makeRational(p.product.num, p.product.den))).toBe(true);
      expect(isProper(p.product)).toBe(true);
      expect(isReduced(p.product)).toBe(true);
      expect(p.product.den).toBeLessThanOrEqual(39);
      expect(isProper(p.multiplier)).toBe(true);
      expect(isReduced(p.multiplier)).toBe(true);
      expect(p.multiplier.den).toBeLessThanOrEqual(12);
      expect(p.answer.den).toBeLessThanOrEqual(12);
      expect(value(p.answer)).toBeLessThanOrEqual(3);
      expect(rationalEquals(p.answer, makeRational(1, 1))).toBe(false);
      expect(gcd(p.answer.num, p.answer.den)).toBe(1);
    }
    expect(uniqueKeys(all)).toBe(true);
  });

  it('3부 예시: □ × 8/9 = 2/9 → 1/4, □ × 3/10 = 7/8 → 2와 11/12', () => {
    const byKey = new Map(all.map((p) => [p.key, p]));
    expect(rationalEquals(byKey.get('G|□×8/9=2/9').answer, makeRational(1, 4))).toBe(true);
    expect(rationalEquals(byKey.get('G|□×3/10=7/8').answer, makeRational(35, 12))).toBe(true);
  });

  it('문장형 텍스트에 을(를) 병기가 없다', () => {
    const p = all.find((x) => x.key === 'G|□×8/9=2/9');
    expect(G.sentence(p)).toBe('어떤 수에 8/9을 곱했더니 2/9가 되었습니다. 어떤 수는 얼마일까요?');
    expect(G.equation(p)).toBe('□ × 8/9 = 2/9');
    for (const q of all.slice(0, 200)) expect(G.sentence(q)).not.toMatch(/\(/);
  });
});
