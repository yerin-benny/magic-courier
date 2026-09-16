// 문제 생성기 공통 계층.
//
//   - 유형 A~G 생성기 레지스트리
//   - 최근 60문항 제외 큐 (전체 기준)
//   - 배송별 고정 구성(deliveryPlans)에 따라 5문제(특별 배송 7문제)를 뽑는다
//
// 문장제(그룹 1, 2)는 wordProblems/ 의 generateWordProblem 이 기본으로 붙어 있다.
// 테스트에서 다른 생성기를 쓰고 싶으면 wordProblemGenerator 로 주입한다.

import { createRng } from '../core/random.js';
import * as A from './types/typeA.js';
import * as B from './types/typeB.js';
import * as C from './types/typeC.js';
import * as D from './types/typeD.js';
import * as E from './types/typeE.js';
import * as F from './types/typeF.js';
import * as G from './types/typeG.js';
import { createRecentQueue } from './recentQueue.js';
import { isWordSlot, planFor } from './deliveryPlans.js';
import { generateWordProblem } from './wordProblems/index.js';

export const GENERATORS = Object.freeze({ A, B, C, D, E, F, G });
export const TYPES = Object.freeze(Object.keys(GENERATORS));

/** 유형별 문항 공간 크기 */
export function problemSpaceSizes() {
  const sizes = {};
  for (const t of TYPES) sizes[t] = GENERATORS[t].enumerate().length;
  return sizes;
}

/**
 * 유형 하나에서 최근 큐에 없는 문항을 무작위로 고른다.
 * 큐가 유형 전체를 덮는 일은 없지만(최소 430 > 60), 만약 남는 게 없으면 큐를 무시한다.
 */
export function pickProblem(type, { rng = createRng(), recent = null } = {}) {
  const gen = GENERATORS[type];
  if (!gen) throw new Error(`알 수 없는 유형: ${type}`);
  const all = gen.enumerate();
  const candidates = recent ? all.filter((p) => !recent.has(p.key)) : all;
  const pool = candidates.length ? candidates : all;
  const problem = rng.pick(pool);
  if (recent) recent.push(problem.key);
  return problem;
}

/**
 * 배송 1건의 문제 목록을 만든다.
 *   deliveryIndex   회차 안의 배송 순번 0~3
 *   special         특별 배송이면 A, F 를 덧붙여 7문제
 *   wordProblemGenerator(group, { rng, recent })  → 문장제 문항. 기본은 generateWordProblem
 */
export function buildDelivery(deliveryIndex, { special = false, rng = createRng(), recent = createRecentQueue(), wordProblemGenerator = generateWordProblem } = {}) {
  const slots = planFor(deliveryIndex, { special });
  return slots.map((slot) => {
    if (isWordSlot(slot)) {
      return wordProblemGenerator(slot.word, { rng, recent });
    }
    return pickProblem(slot, { rng, recent });
  });
}

export { createRecentQueue } from './recentQueue.js';
export { generateWordProblem, enumerateContext, wordProblemSpaceSizes, CONTEXTS } from './wordProblems/index.js';
export { DELIVERY_PLANS, SPECIAL_EXTRA, planFor, isWordSlot } from './deliveryPlans.js';
