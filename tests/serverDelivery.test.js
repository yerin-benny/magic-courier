// 배송 소요 시간 측정과 서버 판정 왕복 (STEP 11).
// Firebase 는 부르지 않는다. 서버 어댑터 자리에 가짜 어댑터를 끼워 흐름만 확인한다.

import { describe, it, expect } from 'vitest';
import { createDeliverySession } from '../src/game/deliverySession.js';
import { createGameState } from '../src/game/gameState.js';
import { createLocalStorageAdapter, createMemoryStorage } from '../src/storage/LocalStorageAdapter.js';
import { login, SCHOOLS } from '../src/game/auth.js';
import { createRng } from '../src/core/random.js';
import { rationalToFraction } from '../src/core/fraction.js';
import { RANK_REASON } from '../src/game/ranking.js';
import { applyDeliveryStats, applyRankingVerdict, createStudentDoc } from '../src/game/studentDoc.js';

const newStorage = () => createLocalStorageAdapter(createMemoryStorage());

/** 정답을 그대로 입력하는 값 (auth.test.js 와 같은 방식) */
function answerInput(problem) {
  const f = rationalToFraction(problem.answer);
  const base = { whole: f.whole ? String(f.whole) : '', num: f.num ? String(f.num) : '', den: f.num ? String(f.den) : '' };
  if (problem.type === 'E') return { ...base, recNum: String(problem.reciprocal.num), recDen: String(problem.reciprocal.den) };
  return base;
}

/** 시계를 손으로 돌리는 가짜 clock */
function fakeClock(start = 0) {
  let t = start;
  const clock = () => t;
  clock.advance = (seconds) => {
    t += seconds * 1000;
  };
  return clock;
}

function solveAll(session) {
  while (!session.isComplete) {
    session.submit(answerInput(session.current()));
    session.advance();
  }
}

describe('배송 소요 시간', () => {
  it('세션을 연 순간부터 잰다', () => {
    const clock = fakeClock();
    const session = createDeliverySession({ rng: createRng(1), clock });
    clock.advance(60);
    expect(session.elapsedSeconds()).toBe(60);
  });

  it('마지막 문제를 넘긴 시각에서 멈춘다', () => {
    const clock = fakeClock();
    const session = createDeliverySession({ rng: createRng(1), clock });
    clock.advance(50);
    solveAll(session);
    clock.advance(600); // 성공 화면을 오래 보고 있어도 소요 시간은 늘지 않는다
    expect(session.elapsedSeconds()).toBe(50);
    expect(session.summary().elapsedSeconds).toBe(50);
  });
});

describe('로컬 판정 (서버가 없을 때)', () => {
  async function playDelivery({ seconds, rng = 1 }) {
    const st = newStorage();
    const { doc } = await login(st, { schoolId: SCHOOLS[0].id, nickname: '별빛', pin: '1234' });
    const g = createGameState({ rng: createRng(rng), storage: st });
    g.loadStudent(doc, []);
    g.startRound();
    const clock = fakeClock();
    g.openDelivery({ clock });
    clock.advance(seconds);
    solveAll(g.session);
    const summary = g.session.summary();
    g.completeDelivery(summary);
    return { g, doc, summary };
  }

  it('45초 이상 + 정확 배송이면 당일 반영 건수가 오른다', async () => {
    const { g } = await playDelivery({ seconds: 90 });
    expect(g.lastVerdict.counted).toBe(true);
    expect(g.student.ranking.count).toBe(1);
    expect(g.student.totals.rankedDeliveries).toBe(1);
  });

  it('45초 미만이면 개인 기록만 남고 랭킹에는 반영되지 않는다', async () => {
    const { g } = await playDelivery({ seconds: 10 });
    expect(g.lastVerdict.reason).toBe(RANK_REASON.TOO_FAST);
    expect(g.student.ranking.count).toBe(0);
    expect(g.student.totals.deliveries).toBe(1); // 개인 기록·스탬프는 그대로
    expect(g.student.visited.length).toBe(1);
  });
});

describe('서버 판정으로 덮어쓰기', () => {
  /** startDelivery / submitDelivery 를 갖춘 가짜 서버 어댑터 */
  function serverStorage(verdict) {
    const base = newStorage();
    const calls = { started: 0, submitted: null };
    return {
      ...base,
      kind: 'firestore',
      async startDelivery() {
        calls.started += 1;
        return 'delivery-1';
      },
      async submitDelivery(payload) {
        calls.submitted = payload;
        return verdict;
      },
      calls,
    };
  }

  async function play(storage, seconds) {
    const { doc } = await login(newStorage(), { schoolId: SCHOOLS[0].id, nickname: '별빛', pin: '1234' });
    const g = createGameState({ rng: createRng(7), storage });
    g.loadStudent(doc, []);
    g.startRound();
    const clock = fakeClock();
    g.openDelivery({ clock });
    await Promise.resolve(); // startDelivery 가 티켓을 채울 틈을 준다
    clock.advance(seconds);
    solveAll(g.session);
    const summary = g.session.summary();
    g.completeDelivery(summary);
    return { g, summary };
  }

  it('배송을 열면 서버에 시작을 등록하고 티켓을 받는다', async () => {
    const st = serverStorage({ counted: true, reason: RANK_REASON.OK, message: '반영' });
    const { g } = await play(st, 90);
    expect(st.calls.started).toBe(1);
    expect(g.deliveryTicket).toBe('delivery-1');
  });

  it('서버가 반영하지 않기로 하면 로컬에서 올렸던 건수를 되돌린다', async () => {
    const st = serverStorage({ counted: false, reason: RANK_REASON.TOO_FAST, message: '천천히' });
    const { g, summary } = await play(st, 90);
    expect(g.student.ranking.count).toBe(1); // 로컬 예측은 반영
    const verdict = await g.reportDelivery(summary);
    expect(verdict.counted).toBe(false);
    expect(g.student.ranking.count).toBe(0); // 서버 판정으로 되돌아감
    expect(g.student.totals.rankedDeliveries).toBe(0);
    expect(st.calls.submitted.deliveryId).toBe('delivery-1');
    expect(st.calls.submitted.firstTryCount).toBe(summary.firstTryCount);
  });

  it('서버가 반영하기로 하면 두 번 세지 않는다', async () => {
    const st = serverStorage({ counted: true, reason: RANK_REASON.OK, message: '반영' });
    const { g, summary } = await play(st, 90);
    await g.reportDelivery(summary);
    expect(g.student.ranking.count).toBe(1);
  });

  it('서버 호출이 실패해도 개인 기록은 그대로 남는다', async () => {
    const st = serverStorage(null);
    st.submitDelivery = async () => {
      throw new Error('network');
    };
    const { g, summary } = await play(st, 90);
    const verdict = await g.reportDelivery(summary);
    expect(verdict.counted).toBe(true); // 로컬 예측 유지
    expect(g.student.totals.deliveries).toBe(1);
  });
});

describe('applyRankingVerdict', () => {
  const now = new Date('2026-09-16T03:00:00Z');

  it('날이 바뀌면 당일 건수를 0부터 다시 센다', () => {
    const doc = createStudentDoc({ schoolId: 'x', nickname: '별빛', pinHash: 'h', now });
    doc.ranking = { date: '2026-09-15', count: 12 };
    applyRankingVerdict(doc, { counted: true, reason: 'ok' }, now);
    expect(doc.ranking).toEqual({ date: '2026-09-16', count: 1 });
  });

  it('통계 반영은 랭킹 판정과 무관하게 항상 쌓인다', () => {
    const doc = createStudentDoc({ schoolId: 'x', nickname: '별빛', pinHash: 'h', now });
    const summary = {
      total: 5,
      firstTryCount: 1,
      accurateBonus: false,
      elapsedSeconds: 5,
      results: [{ type: 'A', firstTry: true }, { type: 'B', firstTry: false }],
    };
    const verdict = applyDeliveryStats(doc, summary, now);
    expect(verdict.counted).toBe(false);
    expect(doc.typeStats.A.solved).toBe(1);
    expect(doc.typeStats.B.solved).toBe(1);
    expect(doc.firstTryRate).toBeCloseTo(0.5);
  });
});
