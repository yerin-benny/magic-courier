// 배송 1건(5문제, 특별 배송 7문제)의 진행 상태. DOM을 모른다.
//
// 규칙 (spec 5장, 7장)
//   - 약분필요: 오답이 아니다. 시도 횟수를 차감하지 않고 첫 시도 정답 자격을 유지한다.
//   - 오답 1회: 힌트를 주고 재도전. 배송은 유지된다. 실패로 되돌리지 않는다.
//   - 첫 시도 정답 별가루 3, 재시도 정답 별가루 1.
//   - 5문제 중 첫 시도 정답 3개 이상이면 "정확 배송 보너스" (랭킹 반영 조건).
//     못 채워도 개인 기록은 정상 적립된다.

import { GRADE, REDUCE_MESSAGE, gradeAnswer, gradeTypeE } from '../core/grade.js';
import { createRng } from '../core/random.js';
import { buildDelivery, createRecentQueue } from '../generators/index.js';
import { hintFor } from './hints.js';

export const STARDUST_FIRST_TRY = 3;
export const STARDUST_RETRY = 1;
export const ACCURATE_BONUS_MIN = 3;

export function createDeliverySession({ deliveryIndex = 0, special = false, rng = createRng(), recent = createRecentQueue(), problems = null, clock = () => Date.now() } = {}) {
  const list = problems ?? buildDelivery(deliveryIndex, { special, rng, recent });
  const attempts = list.map(() => 0); // 문제별 오답 횟수
  const results = list.map(() => null); // 문제별 { firstTry, stardust }
  let index = 0;
  // 배송 소요 시간. 45초 미만이면 학교 랭킹에 반영하지 않는다 (spec 9-1).
  // 최종 판정은 서버가 서버 시각으로 하고, 이 값은 화면 표시용이다.
  const startedAt = clock();
  let finishedAt = null;

  const session = {
    get problems() {
      return list;
    },
    get index() {
      return index;
    },
    get total() {
      return list.length;
    },
    get isComplete() {
      return index >= list.length;
    },
    current() {
      return list[index] ?? null;
    },
    attemptsOfCurrent() {
      return attempts[index] ?? 0;
    },

    /**
     * 현재 문제에 답을 제출한다.
     * 반환 status: 'rejected' | 'needsReduce' | 'wrong' | 'correct'
     */
    submit(values) {
      const problem = list[index];
      if (!problem) throw new Error('이미 끝난 배송입니다');
      if (results[index]) throw new Error('이미 맞힌 문제입니다. advance()를 먼저 호출하세요');

      const res = problem.type === 'E' ? gradeTypeE(values, problem) : gradeAnswer(values, problem.answer);
      const status = res.status;

      if (status === GRADE.REJECTED) {
        const reason = res.reason ?? res.result?.reason ?? (res.reciprocal === GRADE.REJECTED ? 'reciprocal' : 'unknown');
        return { status, reason };
      }
      if (status === GRADE.NEEDS_REDUCE) {
        return { status, message: REDUCE_MESSAGE };
      }
      if (status === GRADE.WRONG) {
        attempts[index] += 1;
        return { status, attempts: attempts[index], hint: hintFor(problem) };
      }
      const firstTry = attempts[index] === 0;
      const stardust = firstTry ? STARDUST_FIRST_TRY : STARDUST_RETRY;
      results[index] = { type: problem.type, key: problem.key, firstTry, stardust, attempts: attempts[index] };
      return { status, firstTry, stardust };
    },

    /** 다음 문제로. 마지막 문제였다면 isComplete 가 true 가 된다. */
    advance() {
      if (!results[index]) throw new Error('현재 문제를 맞힌 뒤에 넘어갈 수 있습니다');
      index += 1;
      if (session.isComplete && finishedAt === null) finishedAt = clock();
      return session.isComplete;
    },

    get startedAt() {
      return startedAt;
    },

    /** 시작부터 지금(완료했다면 완료 시각)까지 걸린 초 */
    elapsedSeconds() {
      return Math.max(0, ((finishedAt ?? clock()) - startedAt) / 1000);
    },

    summary() {
      const done = results.filter(Boolean);
      const firstTryCount = done.filter((r) => r.firstTry).length;
      const stardust = done.reduce((s, r) => s + r.stardust, 0);
      return {
        total: list.length,
        solved: done.length,
        firstTryCount,
        stardust,
        accurateBonus: firstTryCount >= ACCURATE_BONUS_MIN,
        startedAt,
        finishedAt: finishedAt ?? clock(),
        elapsedSeconds: session.elapsedSeconds(),
        results: results.slice(),
      };
    },
  };

  return session;
}
