// 분수 코어 테스트. 표시용/계산용 분리가 핵심이다.
import { describe, it, expect } from 'vitest';
import {
  gcd, makeFraction, makeWhole, makeRational, toRational, toImproper, toMixed,
  rationalToFraction, rationalEquals, isIntegerRational, multiply, divide,
  isReduced, isCanonical, hasBatchimNumber,
} from '../src/core/fraction.js';

describe('gcd', () => {
  it('최대공약수', () => {
    expect(gcd(8, 22)).toBe(2);
    expect(gcd(7, 39)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
  });
});

describe('표시용 Fraction은 자동 약분되지 않는다', () => {
  it('8/22는 8/22 그대로 보관한다 (3부 검수 사고 재발 방지)', () => {
    const f = makeFraction({ num: 8, den: 22 });
    expect(f).toEqual({ kind: 'fraction', whole: 0, num: 8, den: 22 });
  });

  it('같은 분모 유형: 두 분수의 표시 분모가 같은 채로 남는다', () => {
    const a = makeFraction({ num: 8, den: 22 });
    const b = makeFraction({ num: 2, den: 22 });
    expect(a.den).toBe(b.den);
    // 계산용은 약분된다
    expect(toRational(a)).toEqual({ kind: 'rational', num: 4, den: 11 });
    expect(toRational(b)).toEqual({ kind: 'rational', num: 1, den: 11 });
  });

  it('분모 0, 음수, 정수 아님은 거부한다', () => {
    expect(() => makeFraction({ num: 1, den: 0 })).toThrow();
    expect(() => makeFraction({ num: -1, den: 3 })).toThrow();
    expect(() => makeFraction({ num: 1.5, den: 3 })).toThrow();
    expect(() => makeFraction({ whole: -1, num: 1, den: 3 })).toThrow();
  });

  it('makeWhole은 자연수를 표시용으로 만든다', () => {
    expect(makeWhole(5)).toEqual({ kind: 'fraction', whole: 5, num: 0, den: 1 });
  });
});

describe('계산용 Rational', () => {
  it('항상 기약이다', () => {
    expect(makeRational(6, 8)).toEqual({ kind: 'rational', num: 3, den: 4 });
    expect(makeRational(10, 5)).toEqual({ kind: 'rational', num: 2, den: 1 });
    expect(makeRational(0, 7)).toEqual({ kind: 'rational', num: 0, den: 1 });
  });

  it('분모 부호를 정규화한다', () => {
    expect(makeRational(3, -4)).toEqual({ kind: 'rational', num: -3, den: 4 });
  });

  it('rationalEquals는 값으로 비교한다', () => {
    expect(rationalEquals(makeRational(7, 3), toRational(makeFraction({ whole: 2, num: 1, den: 3 })))).toBe(true);
    expect(rationalEquals(makeRational(1, 2), makeRational(2, 3))).toBe(false);
  });

  it('isIntegerRational', () => {
    expect(isIntegerRational(makeRational(8, 2))).toBe(true);
    expect(isIntegerRational(makeRational(7, 2))).toBe(false);
  });
});

describe('대분수 ↔ 가분수 변환 (표시용, 분모 유지)', () => {
  it('2와 1/3 → 7/3', () => {
    expect(toImproper(makeFraction({ whole: 2, num: 1, den: 3 }))).toEqual({ kind: 'fraction', whole: 0, num: 7, den: 3 });
  });

  it('7/3 → 2와 1/3', () => {
    expect(toMixed(makeFraction({ num: 7, den: 3 }))).toEqual({ kind: 'fraction', whole: 2, num: 1, den: 3 });
  });

  it('변환해도 약분하지 않는다: 10/4 → 2와 2/4', () => {
    expect(toMixed(makeFraction({ num: 10, den: 4 }))).toEqual({ kind: 'fraction', whole: 2, num: 2, den: 4 });
  });

  it('진분수는 toMixed 해도 그대로', () => {
    expect(toMixed(makeFraction({ num: 2, den: 5 }))).toEqual({ kind: 'fraction', whole: 0, num: 2, den: 5 });
  });

  it('rationalToFraction은 기약 대분수를 만든다', () => {
    expect(rationalToFraction(makeRational(14, 4))).toEqual({ kind: 'fraction', whole: 3, num: 1, den: 2 });
    expect(rationalToFraction(makeRational(14, 4), { mixed: false })).toEqual({ kind: 'fraction', whole: 0, num: 7, den: 2 });
    expect(rationalToFraction(makeRational(6, 3))).toEqual({ kind: 'fraction', whole: 2, num: 0, den: 1 });
  });

  it('표시 함수에 Rational을 넣으면 예외', () => {
    expect(() => toMixed(makeRational(7, 3))).toThrow();
    expect(() => toImproper(makeRational(7, 3))).toThrow();
  });
});

describe('사칙연산 (계산용)', () => {
  it('나눗셈: 3부 예시', () => {
    // 15/19 ÷ 1/4 = 3과 3/19 = 60/19
    expect(divide(makeFraction({ num: 15, den: 19 }), makeFraction({ num: 1, den: 4 }))).toEqual(makeRational(60, 19));
    // 8/13 ÷ 3/16 = 128/39
    expect(divide(makeFraction({ num: 8, den: 13 }), makeFraction({ num: 3, den: 16 }))).toEqual(makeRational(128, 39));
    // 3과 8/9 ÷ 1과 1/4 = 3과 1/9 = 28/9
    expect(divide(makeFraction({ whole: 3, num: 8, den: 9 }), makeFraction({ whole: 1, num: 1, den: 4 }))).toEqual(makeRational(28, 9));
    // 4 ÷ 1/14 = 56
    expect(divide(makeWhole(4), makeFraction({ num: 1, den: 14 }))).toEqual(makeRational(56, 1));
  });

  it('곱셈: 유형 G 역연산 검증', () => {
    // 답 1/4 × 8/9 = 2/9
    expect(multiply(makeRational(1, 4), makeFraction({ num: 8, den: 9 }))).toEqual(makeRational(2, 9));
  });

  it('0으로 나누면 예외', () => {
    expect(() => divide(makeRational(1, 2), makeRational(0, 1))).toThrow();
  });
});

describe('기약·정리 판정', () => {
  it('isReduced', () => {
    expect(isReduced(makeFraction({ num: 6, den: 8 }))).toBe(false);
    expect(isReduced(makeFraction({ num: 3, den: 4 }))).toBe(true);
    expect(isReduced(makeFraction({ num: 7, den: 3 }))).toBe(true);
    expect(isReduced(makeWhole(3))).toBe(true);
  });

  it('isCanonical: 대분수의 분수부는 진분수여야 한다', () => {
    expect(isCanonical(makeFraction({ whole: 1, num: 5, den: 3 }))).toBe(false);
    expect(isCanonical(makeFraction({ whole: 2, num: 2, den: 3 }))).toBe(true);
    expect(isCanonical(makeFraction({ num: 7, den: 3 }))).toBe(true); // 가분수는 허용
    expect(isCanonical(makeFraction({ whole: 2, num: 2, den: 4 }))).toBe(false);
  });
});

describe('hasBatchimNumber (한자음 받침)', () => {
  it('1~9: 일 이 삼 사 오 육 칠 팔 구', () => {
    const expected = { 1: true, 2: false, 3: true, 4: false, 5: false, 6: true, 7: true, 8: true, 9: false };
    for (const [n, v] of Object.entries(expected)) expect(hasBatchimNumber(Number(n))).toBe(v);
  });

  it('10 십, 20 이십, 100 백, 1000 천, 10000 만, 0 영', () => {
    expect(hasBatchimNumber(10)).toBe(true);
    expect(hasBatchimNumber(20)).toBe(true);
    expect(hasBatchimNumber(100)).toBe(true);
    expect(hasBatchimNumber(1000)).toBe(false);
    expect(hasBatchimNumber(10000)).toBe(true);
    expect(hasBatchimNumber(0)).toBe(true);
  });

  it('두 자리 수는 일의 자리로 결정: 12 십이, 13 십삼, 56 오십육', () => {
    expect(hasBatchimNumber(12)).toBe(false);
    expect(hasBatchimNumber(13)).toBe(true);
    expect(hasBatchimNumber(56)).toBe(true);
    expect(hasBatchimNumber(39)).toBe(false);
  });
});
