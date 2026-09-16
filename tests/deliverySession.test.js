// 배송 1건 루프 로직 테스트 (spec 5장, 7장).
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/random.js';
import { rationalToFraction, makeFraction, makeRational } from '../src/core/fraction.js';
import { createRecentQueue } from '../src/generators/index.js';
import { createDeliverySession, STARDUST_FIRST_TRY, STARDUST_RETRY } from '../src/game/deliverySession.js';
import { hintFor, HINTS } from '../src/game/hints.js';

/** 정답을 3칸 입력값으로 */
function answerInput(problem) {
  const f = rationalToFraction(problem.answer);
  const base = { whole: f.whole ? String(f.whole) : '', num: f.num ? String(f.num) : '', den: f.num ? String(f.den) : '' };
  if (problem.type === 'E') return { ...base, recNum: String(problem.reciprocal.num), recDen: String(problem.reciprocal.den) };
  return base;
}

/** 값은 같지만 약분 안 된 입력 */
function unreducedInput(problem) {
  const f = rationalToFraction(problem.answer, { mixed: false });
  const base = { whole: '', num: String(f.num * 2), den: String(f.den * 2) };
  if (problem.type === 'E') return { ...base, recNum: String(problem.reciprocal.num), recDen: String(problem.reciprocal.den) };
  return base;
}

describe('배송 세션 구성', () => {
  it('배송 1은 A, B, D, G, 문장제 5문제', () => {
    const s = createDeliverySession({ deliveryIndex: 0, rng: createRng(1) });
    expect(s.total).toBe(5);
    expect(s.problems.map((p) => p.type)).toEqual(['A', 'B', 'D', 'G', 'W']);
    expect(s.index).toBe(0);
    expect(s.isComplete).toBe(false);
  });

  it('특별 배송은 7문제', () => {
    const s = createDeliverySession({ deliveryIndex: 1, special: true, rng: createRng(1) });
    expect(s.total).toBe(7);
  });
});

describe('채점과 별가루', () => {
  it('첫 시도 정답은 별가루 3', () => {
    const s = createDeliverySession({ deliveryIndex: 0, rng: createRng(2) });
    const res = s.submit(answerInput(s.current()));
    expect(res.status).toBe('correct');
    expect(res.firstTry).toBe(true);
    expect(res.stardust).toBe(STARDUST_FIRST_TRY);
  });

  it('오답 뒤 정답은 별가루 1, 힌트가 온다, 배송은 유지된다', () => {
    const s = createDeliverySession({ deliveryIndex: 0, rng: createRng(3) });
    const wrong = s.submit({ whole: '99', num: '', den: '' });
    expect(wrong.status).toBe('wrong');
    expect(wrong.attempts).toBe(1);
    expect(wrong.hint).toBe(hintFor(s.current()));
    expect(s.isComplete).toBe(false);
    const ok = s.submit(answerInput(s.current()));
    expect(ok.status).toBe('correct');
    expect(ok.firstTry).toBe(false);
    expect(ok.stardust).toBe(STARDUST_RETRY);
  });

  it('약분필요는 시도를 차감하지 않고 첫 시도 자격을 유지한다', () => {
    const s = createDeliverySession({ deliveryIndex: 1, rng: createRng(4) });
    // 배송 2의 두 번째 문제는 유형 C (답이 분수)
    s.submit(answerInput(s.current()));
    s.advance();
    expect(s.current().type).toBe('C');
    const r = s.submit(unreducedInput(s.current()));
    expect(r.status).toBe('needsReduce');
    expect(r.message).toBe('거의 다 왔어요. 더 간단히 줄일 수 있어요.');
    expect(s.attemptsOfCurrent()).toBe(0);
    const ok = s.submit(answerInput(s.current()));
    expect(ok.firstTry).toBe(true);
    expect(ok.stardust).toBe(STARDUST_FIRST_TRY);
  });

  it('입력 거부는 시도를 차감하지 않는다', () => {
    const s = createDeliverySession({ deliveryIndex: 0, rng: createRng(5) });
    const r = s.submit({ whole: '', num: '3', den: '0' });
    expect(r.status).toBe('rejected');
    expect(r.reason).toBe('zeroDenominator');
    expect(s.attemptsOfCurrent()).toBe(0);
  });

  it('유형 E는 역수 칸까지 채점한다', () => {
    const s = createDeliverySession({ deliveryIndex: 1, rng: createRng(6) });
    s.submit(answerInput(s.current())); s.advance();
    s.submit(answerInput(s.current())); s.advance();
    expect(s.current().type).toBe('E');
    const bad = s.submit({ ...answerInput(s.current()), recNum: '1', recDen: '1' });
    expect(bad.status).toBe('wrong');
    expect(s.submit(answerInput(s.current())).status).toBe('correct');
  });

  it('맞힌 뒤 advance 없이 다시 제출하면 예외, 맞히기 전 advance 도 예외', () => {
    const s = createDeliverySession({ deliveryIndex: 0, rng: createRng(7) });
    expect(() => s.advance()).toThrow();
    s.submit(answerInput(s.current()));
    expect(() => s.submit(answerInput(s.current()))).toThrow();
  });
});

describe('배송 완료와 정확 배송 보너스', () => {
  function play(seed, wrongOn) {
    const s = createDeliverySession({ deliveryIndex: 2, rng: createRng(seed), recent: createRecentQueue() });
    while (!s.isComplete) {
      if (wrongOn.includes(s.index)) s.submit({ whole: '99', num: '', den: '' });
      s.submit(answerInput(s.current()));
      s.advance();
    }
    return s.summary();
  }

  it('전부 첫 시도 정답: 별가루 15, 보너스', () => {
    const sm = play(10, []);
    expect(sm.solved).toBe(5);
    expect(sm.firstTryCount).toBe(5);
    expect(sm.stardust).toBe(15);
    expect(sm.accurateBonus).toBe(true);
  });

  it('첫 시도 정답 3개면 보너스, 2개면 보너스 없음 (기록은 정상 적립)', () => {
    const three = play(11, [0, 1]);
    expect(three.firstTryCount).toBe(3);
    expect(three.accurateBonus).toBe(true);
    expect(three.stardust).toBe(3 * 3 + 2 * 1);
    const two = play(12, [0, 1, 2]);
    expect(two.firstTryCount).toBe(2);
    expect(two.accurateBonus).toBe(false);
    expect(two.solved).toBe(5);
    expect(two.stardust).toBe(2 * 3 + 3 * 1);
  });

  it('완료 후 제출하면 예외', () => {
    const s = createDeliverySession({ deliveryIndex: 0, rng: createRng(13) });
    while (!s.isComplete) { s.submit(answerInput(s.current())); s.advance(); }
    expect(() => s.submit({ whole: '1', num: '', den: '' })).toThrow();
    expect(s.current()).toBeNull();
  });
});

describe('힌트', () => {
  it('유형 A~G 전부 한 줄씩 있고 답을 담지 않는다', () => {
    for (const t of ['A', 'B', 'C', 'D', 'E', 'F', 'G']) {
      const h = hintFor({ type: t });
      expect(typeof h).toBe('string');
      expect(h.length).toBeGreaterThan(5);
      expect(h).not.toMatch(/\d+\/\d+/);
    }
  });

  it('문장제는 맥락 종류별로 다르다', () => {
    expect(hintFor({ type: 'W', rangeKind: 'count' })).toBe(HINTS.W_COUNT);
    expect(hintFor({ type: 'W', rangeKind: 'rate' })).toBe(HINTS.W_RATE);
    expect(hintFor({ type: 'W', rangeKind: 'ratio' })).toBe(HINTS.W_RATIO);
  });

  it('알 수 없는 유형은 예외', () => {
    expect(() => hintFor({ type: 'Z' })).toThrow();
  });
});

describe('직접 문항을 넣은 세션', () => {
  it('problems 를 주면 생성기를 거치지 않는다', () => {
    const p = { type: 'A', key: 'x', dividend: makeFraction({ num: 4, den: 5 }), divisor: makeFraction({ num: 1, den: 5 }), answer: makeRational(4, 1) };
    const s = createDeliverySession({ problems: [p] });
    expect(s.total).toBe(1);
    expect(s.submit({ whole: '4', num: '', den: '' }).status).toBe('correct');
    expect(s.advance()).toBe(true);
  });
});
