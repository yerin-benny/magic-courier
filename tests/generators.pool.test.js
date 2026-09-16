// 공통 계층 테스트: 최근 60문항 제외 큐, 배송 구성, 특별 배송.
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/random.js';
import {
  TYPES, problemSpaceSizes, pickProblem, buildDelivery, createRecentQueue,
  DELIVERY_PLANS, SPECIAL_EXTRA, planFor, isWordSlot,
} from '../src/generators/index.js';

describe('문항 공간 요약', () => {
  it('7유형 모두 60을 훨씬 넘는다 (큐가 유형을 덮을 수 없다)', () => {
    const sizes = problemSpaceSizes();
    expect(Object.keys(sizes)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);
    for (const t of TYPES) expect(sizes[t]).toBeGreaterThan(60 * 4);
  });
});

describe('최근 60문항 제외 큐', () => {
  it('60개까지만 기억하고 오래된 것부터 버린다', () => {
    const q = createRecentQueue();
    for (let i = 0; i < 70; i++) q.push(`k${i}`);
    expect(q.size).toBe(60);
    expect(q.has('k9')).toBe(false);
    expect(q.has('k10')).toBe(true);
    expect(q.has('k69')).toBe(true);
  });

  it('저장된 배열로 복원되고 toArray로 다시 꺼낼 수 있다', () => {
    const q = createRecentQueue(['a', 'b', 'c']);
    q.push('d');
    expect(q.toArray()).toEqual(['a', 'b', 'c', 'd']);
    const restored = createRecentQueue(q.toArray());
    expect(restored.has('a')).toBe(true);
  });

  it('같은 키를 다시 넣으면 맨 뒤로 간다', () => {
    const q = createRecentQueue(['a', 'b'], 2);
    q.push('a');
    q.push('c');
    expect(q.has('b')).toBe(false);
    expect(q.has('a')).toBe(true);
  });

  it('유형 전체 기준: 연속 60번 뽑으면 한 유형 안에서도 중복이 없다 (가장 작은 유형 D 포함)', () => {
    for (const t of TYPES) {
      const recent = createRecentQueue();
      const rng = createRng(42);
      const keys = new Set();
      for (let i = 0; i < 60; i++) keys.add(pickProblem(t, { rng, recent }).key);
      expect(keys.size).toBe(60);
    }
  });

  it('여러 유형을 섞어 뽑아도 큐는 하나다', () => {
    const recent = createRecentQueue();
    const rng = createRng(7);
    pickProblem('A', { rng, recent });
    pickProblem('D', { rng, recent });
    expect(recent.size).toBe(2);
    expect(recent.toArray()[0].startsWith('A|')).toBe(true);
    expect(recent.toArray()[1].startsWith('D|')).toBe(true);
  });

  it('시드가 같으면 같은 문항이 나온다', () => {
    const a = pickProblem('C', { rng: createRng(123) });
    const b = pickProblem('C', { rng: createRng(123) });
    expect(a.key).toBe(b.key);
  });

  it('알 수 없는 유형은 예외', () => {
    expect(() => pickProblem('Z')).toThrow();
  });
});

describe('배송 구성 (spec 4-1, 고정 데이터)', () => {
  it('배송 4건의 구성이 spec과 정확히 같다', () => {
    const asText = DELIVERY_PLANS.map((plan) => plan.map((s) => (isWordSlot(s) ? `W${s.word}` : s)));
    expect(asText).toEqual([
      ['A', 'B', 'D', 'G', 'W1'],
      ['A', 'C', 'E', 'F', 'W2'],
      ['B', 'C', 'D', 'G', 'W1'],
      ['A', 'E', 'F', 'C', 'W2'],
    ]);
  });

  it('한 회차 20문제 기준 A3 B2 C3 D2 E2 F2 G2 문장제4', () => {
    const count = {};
    for (const plan of DELIVERY_PLANS) for (const s of plan) {
      const k = isWordSlot(s) ? 'W' : s;
      count[k] = (count[k] || 0) + 1;
    }
    expect(count).toEqual({ A: 3, B: 2, C: 3, D: 2, E: 2, F: 2, G: 2, W: 4 });
  });

  it('배송 1, 3은 그룹 1, 배송 2, 4는 그룹 2 문장제', () => {
    expect(DELIVERY_PLANS[0][4]).toEqual({ word: 1 });
    expect(DELIVERY_PLANS[2][4]).toEqual({ word: 1 });
    expect(DELIVERY_PLANS[1][4]).toEqual({ word: 2 });
    expect(DELIVERY_PLANS[3][4]).toEqual({ word: 2 });
  });

  it('특별 배송은 뒤에 A, F 를 덧붙여 7문제', () => {
    expect(SPECIAL_EXTRA).toEqual(['A', 'F']);
    const plan = planFor(1, { special: true });
    expect(plan.length).toBe(7);
    expect(plan.slice(5)).toEqual(['A', 'F']);
    expect(planFor(1).length).toBe(5);
  });

  it('배송 순번은 4로 순환한다', () => {
    expect(planFor(4)).toEqual(planFor(0));
    expect(planFor(7)).toEqual(planFor(3));
  });
});

describe('buildDelivery', () => {
  // 문장제 자리를 채우는 임시 생성기. 키가 겹치지 않게 일련번호를 쓴다.
  let stubSeq = 0;
  const stubWord = (group, { recent }) => {
    const key = `W${group}|stub-${stubSeq++}`;
    recent.push(key);
    return { type: `W${group}`, key, answer: null };
  };

  it('구성 순서대로 5문제를 만든다', () => {
    const problems = buildDelivery(0, { rng: createRng(1), wordProblemGenerator: stubWord });
    expect(problems.map((p) => p.type)).toEqual(['A', 'B', 'D', 'G', 'W1']);
  });

  it('특별 배송은 7문제', () => {
    const problems = buildDelivery(3, { special: true, rng: createRng(1), wordProblemGenerator: stubWord });
    expect(problems.map((p) => p.type)).toEqual(['A', 'E', 'F', 'C', 'W2', 'A', 'F']);
  });

  it('생성기를 주입하지 않으면 실제 문장제가 붙는다 (그룹 1은 답이 자연수)', () => {
    const problems = buildDelivery(0, { rng: createRng(3) });
    const w = problems[4];
    expect(w.type).toBe('W');
    expect(w.group).toBe(1);
    expect(w.answer.den).toBe(1);
    expect(typeof w.text).toBe('string');
    const w2 = buildDelivery(1, { rng: createRng(3) })[4];
    expect(w2.group).toBe(2);
  });

  it('한 단원 분량(8회차 × 4배송 = 160문제)을 뽑아도 최근 60문항 안에서 중복이 없다', () => {
    const recent = createRecentQueue();
    const rng = createRng(2026);
    const seen = [];
    for (let round = 0; round < 8; round++) {
      for (let d = 0; d < 4; d++) {
        for (const p of buildDelivery(d, { rng, recent, wordProblemGenerator: stubWord })) seen.push(p.key);
      }
    }
    expect(seen.length).toBe(160);
    for (let i = 0; i < seen.length; i++) {
      const window = seen.slice(Math.max(0, i - 60), i);
      expect(window.includes(seen[i])).toBe(false);
    }
  });
});
