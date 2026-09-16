import { describe, it, expect } from 'vitest';
import {
  generate,
  generateWord,
  deliveryProblems,
  composition,
  grade,
  Type,
} from '../core/problems';
import { fraction, div, gcd, equal, parseAnswer, particle } from '../core/rational';
import { seeded } from '../core/random';
import { createRoute } from '../core/route';
import { countries } from '../data/countries';
import { wordTemplates } from '../data/words';
describe('유리수와 채점', () => {
  it('정확한 연산과 자연수·가분수·대분수 동치', () => {
    expect(div(fraction(2, 3), fraction(4, 5))).toEqual(fraction(5, 6));
    expect(parseAnswer({ whole: '2' }).value).toEqual(fraction(2));
    expect(parseAnswer({ whole: '1', n: '3', d: '2' }).value).toEqual(fraction(5, 2));
    expect(() => parseAnswer({ n: '1', d: '0' })).toThrow();
    expect(() => parseAnswer({ n: '1' })).toThrow();
  });
  it('미약분과 실제 오답 구분, 역수 입력 검증', () => {
    const p = { ...generate('C', seeded(7)), answer: fraction(1, 2) };
    expect(grade(p, { n: '2', d: '4' })).toBe('simplify');
    expect(grade(p, { n: '1', d: '3' })).toBe('wrong');
    const e = generate('E', seeded(8));
    expect(
      grade(e, {
        n: String(e.answer.n),
        d: String(e.answer.d),
        reciprocalN: String(e.right.d),
        reciprocalD: String(e.right.n),
      }),
    ).toBe('correct');
  });
  it('조사', () => {
    expect([1, 2, 3, 4, 5].map(particle)).toEqual(['과', '와', '과', '와', '와']);
  });
});
describe('문제 생성 속성: 유형별 2,000개', () => {
  for (const type of 'ABCDEFG'.split('') as Type[])
    it(type, () => {
      const r = seeded(322 + type.charCodeAt(0));
      let proper = false,
        mixed = false;
      for (let i = 0; i < 2000; i++) {
        const p = generate(type, r),
          a = p.left,
          b = p.right,
          ans = p.answer;
        expect(gcd(a.n, a.d)).toBe(1);
        expect(gcd(b.n, b.d)).toBe(1);
        expect(equal(div(a, b), ans)).toBe(true);
        if (type === 'A') {
          expect(a.d).toBe(b.d);
          expect(a.d).toBeGreaterThanOrEqual(5);
          expect(a.d).toBeLessThanOrEqual(40);
          expect(a.n).toBeLessThan(a.d);
          expect(ans.d).toBe(1);
          expect(ans.n).toBeGreaterThanOrEqual(2);
          expect(ans.n).toBeLessThanOrEqual(8);
        }
        if (type === 'B') {
          expect(a.d).toBe(b.d);
          expect(a.d).toBeGreaterThanOrEqual(5);
          expect(a.d).toBeLessThanOrEqual(25);
          expect(a.n).toBeLessThan(a.d);
          expect(b.n).toBeLessThan(b.d);
          expect(b.n).toBeLessThanOrEqual(12);
          expect(ans.d).toBeGreaterThan(1);
          expect(ans.d).toBeLessThanOrEqual(12);
        }
        if (type === 'C' || type === 'E') {
          expect(a.n).toBeLessThan(a.d);
          expect(b.n).toBeLessThan(b.d);
          expect(a.d).not.toBe(b.d);
          expect(Math.max(a.d, b.d)).toBeLessThanOrEqual(25);
          expect(ans.d).toBeLessThanOrEqual(39);
          expect(ans.n).toBeLessThanOrEqual(ans.d * 10);
          expect(ans.n).not.toBe(ans.d);
          if (type === 'E') expect(b.n).toBeGreaterThanOrEqual(2);
        }
        if (type === 'D') {
          expect(a.d).toBe(1);
          expect(a.n).toBeGreaterThanOrEqual(2);
          expect(a.n).toBeLessThanOrEqual(24);
          expect(b.d).toBeLessThanOrEqual(30);
          expect(b.n).toBeLessThan(b.d);
          expect(a.n % b.n).toBe(0);
          expect(b.n).not.toBe(a.n);
          expect(ans.d).toBe(1);
          expect(ans.n).toBeLessThanOrEqual(60);
        }
        if (type === 'F') {
          expect(Math.floor(a.n / a.d)).toBeGreaterThanOrEqual(1);
          expect(Math.floor(a.n / a.d)).toBeLessThanOrEqual(5);
          expect(a.d).toBeLessThanOrEqual(12);
          expect(ans.n).toBeLessThanOrEqual(ans.d * 15);
          expect(ans.d).toBeLessThanOrEqual(15);
          expect(ans.n).not.toBe(ans.d);
          proper ||= b.n < b.d;
          mixed ||= b.n > b.d;
        }
      }
      if (type === 'F') {
        expect(proper).toBe(true);
        expect(mixed).toBe(true);
      }
    });
  it('퇴화 RNG에서도 최근 60문항 재출제 없음', () => {
    for (const t of 'ABCDEFG'.split('') as Type[]) {
      const recent: string[] = [];
      for (let i = 0; i < 80; i++) {
        const p = generate(t, () => 0, recent);
        expect(recent).not.toContain(p.key);
        recent.push(p.key);
        if (recent.length > 60) recent.shift();
      }
    }
  });
  it('배송 20문제의 구성', () => {
    expect(composition.flat().filter((x) => x === 'A')).toHaveLength(3);
    expect([0, 1, 2, 3].flatMap((i) => deliveryProblems(i, 10 + i, []).problems)).toHaveLength(20);
  });
});
describe('문장제', () => {
  it('20개 맥락의 단위·자연수·시간 분모·긴 밧줄 조건', () => {
    expect(wordTemplates).toHaveLength(20);
    for (const w of wordTemplates)
      for (let i = 0; i < 60; i++) {
        const p = generateWord(w, seeded(i * 31 + w.id));
        expect(p.word?.text).not.toMatch(/undefined|NaN|칸를|병를|장를/);
        expect(p.word?.unit).toBe(w.unit);
        if (w.group === 1) expect(p.answer.d).toBe(1);
        if (w.time) expect([2, 3, 4, 6, 12]).toContain(p.right.d);
        if (w.id === 18) expect(p.answer.n).toBeGreaterThan(p.answer.d);
      }
  });
});
describe('경로와 여권', () => {
  it('60개 목적지 및 4개국 대륙 분산, 결정론', () => {
    expect(countries).toHaveLength(60);
    expect(new Set(countries.map((c) => c.id)).size).toBe(60);
    expect(countries.every((c) => c.intro.length >= 20)).toBe(true);
    expect(createRoute([], 17)).toEqual(createRoute([], 17));
    expect(
      new Set(createRoute([], 17).map((id) => countries.find((c) => c.id === id)!.continent)).size,
    ).toBe(4);
  });
  it('15회차 동안 미방문 우선, 8회차에 첫 여권 완성', () => {
    let visited: string[] = [];
    for (let i = 0; i < 15; i++) {
      const route = createRoute(visited, i);
      expect(route.every((id) => !visited.includes(id))).toBe(true);
      visited = [...visited, ...route];
      if (i === 7) expect(visited.length).toBe(32);
    }
    expect(new Set(visited).size).toBe(60);
    expect(createRoute(visited, 99)).toHaveLength(4);
  });
  it('미방문 1개면 반드시 포함', () => {
    const route = createRoute(
      countries.slice(1).map((c) => c.id),
      4,
    );
    expect(route).toContain(countries[0].id);
    expect(new Set(route).size).toBe(4);
  });
});
