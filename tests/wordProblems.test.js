// 문장제 20맥락 테스트 (spec 4-3).
import { describe, it, expect } from 'vitest';
import { gcd, rationalEquals, divide } from '../src/core/fraction.js';
import { createRng } from '../src/core/random.js';
import { createRecentQueue } from '../src/generators/recentQueue.js';
import {
  CONTEXTS, GROUP_1_IDS, GROUP_2_IDS, TIME_DENOMINATORS,
  enumerateContext, generateWordProblem, pickFromContext, wordProblemSpaceSizes, COUNT_RULES,
} from '../src/generators/wordProblems/index.js';

const value = (r) => r.num / r.den;
const isReducedFrac = (f) => f.num === 0 || gcd(f.num, f.den) === 1;

describe('맥락 데이터', () => {
  it('20맥락, 그룹 1이 1~10, 그룹 2가 11~20', () => {
    expect(CONTEXTS.length).toBe(20);
    expect(GROUP_1_IDS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(GROUP_2_IDS).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('모든 맥락에 문항이 60개 넘게 있다', () => {
    const sizes = wordProblemSpaceSizes();
    for (const c of CONTEXTS) expect(sizes[c.id]).toBeGreaterThan(60);
  });
});

describe('그룹 1: 답이 반드시 자연수', () => {
  for (const id of GROUP_1_IDS) {
    it(`맥락 ${id}: 전수 문항의 답이 자연수 2~30, 앞의 수는 자연수 2~9 또는 대분수 1~4, 뒤의 수는 분모 2~9 진분수`, () => {
      for (const p of enumerateContext(id)) {
        expect(p.group).toBe(1);
        expect(p.answer.den).toBe(1);
        expect(p.answer.num).toBeGreaterThanOrEqual(COUNT_RULES.answerMin);
        expect(p.answer.num).toBeLessThanOrEqual(COUNT_RULES.answerMax);
        const a = p.dividend;
        if (a.num === 0) {
          expect(a.whole).toBeGreaterThanOrEqual(2);
          expect(a.whole).toBeLessThanOrEqual(9);
        } else {
          expect(a.whole).toBeGreaterThanOrEqual(1);
          expect(a.whole).toBeLessThanOrEqual(4);
          expect(a.den).toBeLessThanOrEqual(9);
          expect(isReducedFrac(a)).toBe(true);
        }
        expect(p.divisor.whole).toBe(0);
        expect(p.divisor.den).toBeGreaterThanOrEqual(2);
        expect(p.divisor.den).toBeLessThanOrEqual(9);
        expect(isReducedFrac(p.divisor)).toBe(true);
        expect(rationalEquals(divide(p.dividend, p.divisor), p.answer)).toBe(true);
      }
    });
  }
});

describe('그룹 2: 연속량·단위량·배 비교', () => {
  it('시간 맥락(11, 13, 14, 15, 16)의 분수 분모는 2, 3, 4, 6, 12 뿐', () => {
    for (const id of [11, 13, 14, 15, 16]) {
      for (const p of enumerateContext(id)) {
        expect(TIME_DENOMINATORS).toContain(p.divisor.den);
        expect(isReducedFrac(p.divisor)).toBe(true);
      }
    }
  });

  it('11~17은 자연수 ÷ 진분수 구조이고 답이 상한 안이다', () => {
    const caps = { 11: 60, 12: 60, 13: 48, 14: 30, 15: 99, 16: 30, 17: 40 };
    for (const id of [11, 12, 13, 14, 15, 16, 17]) {
      const all = enumerateContext(id);
      let fractionAnswers = 0;
      for (const p of all) {
        expect(p.dividend.num).toBe(0);
        expect(p.divisor.whole).toBe(0);
        expect(p.divisor.num).toBeLessThan(p.divisor.den);
        expect(value(p.answer)).toBeLessThanOrEqual(caps[id]);
        expect(value(p.answer)).toBeGreaterThanOrEqual(1);
        if (p.answer.den !== 1) fractionAnswers++;
      }
      // 답이 분수인 문항도 섞여 있어야 한다 (그룹 2의 존재 이유)
      expect(fractionAnswers).toBeGreaterThan(0);
    }
  });

  it('18~20은 분수 ÷ 분수이고 앞의 수가 더 커서 답이 1보다 크다', () => {
    for (const id of [18, 19, 20]) {
      for (const p of enumerateContext(id)) {
        expect(p.divisor.whole).toBe(0);
        expect(value(p.answer)).toBeGreaterThan(1);
        expect(value(p.answer)).toBeLessThanOrEqual(10);
        expect(p.answer.den).toBeLessThanOrEqual(12);
        expect(p.dividend.den).toBeLessThanOrEqual(12);
        expect(p.divisor.den).toBeLessThanOrEqual(12);
        expect(isReducedFrac(p.dividend)).toBe(true);
        expect(isReducedFrac(p.divisor)).toBe(true);
      }
    }
  });
});

describe('문장 텍스트', () => {
  it('을(를), 이(가) 병기가 없고 단위 표기가 통일돼 있다', () => {
    for (const c of CONTEXTS) {
      for (const p of enumerateContext(c.id).slice(0, 50)) {
        expect(p.text).not.toMatch(/\(를\)|\(가\)|\(을\)|\(이\)/);
        expect(p.text).not.toMatch(/리터|킬로그램|미터|센티|킬로미터|제곱미터/);
        expect(p.text).toContain(p.text.includes('?') ? '?' : '');
      }
    }
  });

  it('숫자 표기에 대분수 연결어가 들어간다 (예: 2와 1/2)', () => {
    const p = enumerateContext(3).find((x) => x.dividend.whole >= 1 && x.dividend.num > 0);
    expect(p.text).toMatch(/\d(과|와) \d+\/\d+ kg/);
  });

  it('키에 맥락 번호가 들어가 다른 맥락의 같은 수와 구분된다', () => {
    const a = enumerateContext(2)[0];
    const b = enumerateContext(6)[0];
    expect(a.key.startsWith('W2|')).toBe(true);
    expect(b.key.startsWith('W6|')).toBe(true);
    expect(a.key).not.toBe(b.key);
  });
});

describe('뽑기', () => {
  it('generateWordProblem은 그룹에 맞는 맥락에서만 뽑는다', () => {
    const rng = createRng(11);
    for (let i = 0; i < 100; i++) {
      expect(GROUP_1_IDS).toContain(generateWordProblem(1, { rng }).contextId);
      expect(GROUP_2_IDS).toContain(generateWordProblem(2, { rng }).contextId);
    }
  });

  it('알 수 없는 그룹·맥락은 예외', () => {
    expect(() => generateWordProblem(3)).toThrow();
    expect(() => pickFromContext(99)).toThrow();
  });

  it('최근 큐를 존중한다', () => {
    const recent = createRecentQueue();
    const rng = createRng(5);
    const keys = new Set();
    for (let i = 0; i < 60; i++) keys.add(pickFromContext(14, { rng, recent }).key);
    expect(keys.size).toBe(60);
  });
});

describe('화면용 조각 (segments)', () => {
  it('모든 문항에 segments 가 있고 평문과 일치하며 분수 조각이 들어 있다', async () => {
    const { segmentsToText } = await import('../src/core/josa.js');
    for (const c of CONTEXTS) {
      for (const p of enumerateContext(c.id).slice(0, 30)) {
        expect(segmentsToText(p.segments)).toBe(p.text);
        expect(p.segments.some((s) => typeof s === 'object' && s.kind === 'fraction')).toBe(true);
        // 나누는 수(진분수)는 항상 조각으로 들어간다
        expect(p.segments).toContain(p.divisor);
      }
    }
  });
});
