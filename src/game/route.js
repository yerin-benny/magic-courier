// 회차 경로 생성 (spec 3-1). DOM 없음.
//
// 매 회차 4개국을 뽑는다. 완전 랜덤이 아니라 미방문 국가 우선이다.
//   1) 미방문 국가에서 먼저 뽑는다
//   2) 한 회차의 4개국은 서로 다른 대륙에서 뽑는다
//   3) 아직 안 뽑은 대륙에 미방문 국가가 남지 않으면 대륙 중복 금지를 풀고 뽑는다
//   4) 미방문 국가가 4개 미만이면 나머지는 방문국에서 채운다 (이때도 대륙은 되도록 다르게)
//
// 여권 2권(60개국)을 다 채운 뒤에는 방문 목록을 비우지 않고도 4)에 의해 방문국에서 계속 뽑힌다.
// 게임은 끝나지 않는다.

import { COUNTRIES } from '../data/countries.js';
import { createRng } from '../core/random.js';

export const COUNTRIES_PER_ROUND = 4;

/**
 * @param {Iterable<string>} visitedIds  이미 방문한 국가 id
 * @param {object} [opts]
 * @param {object} [opts.rng]
 * @param {string[]} [opts.exclude]  이번 회차에서 빼고 싶은 국가 (예: 직전 회차 마지막 국가)
 * @returns {{ route: string[], releasedContinentRule: boolean, filledFromVisited: number }}
 */
export function drawRoute(visitedIds, { rng = createRng(), exclude = [] } = {}) {
  const visited = new Set(visitedIds);
  const excluded = new Set(exclude);
  const route = [];
  const usedContinents = new Set();
  let releasedContinentRule = false;
  let filledFromVisited = 0;

  const notChosen = (x) => !route.includes(x.id) && !excluded.has(x.id);
  const unvisitedPool = () => COUNTRIES.filter((x) => !visited.has(x.id) && notChosen(x));
  const visitedPool = () => COUNTRIES.filter((x) => visited.has(x.id) && notChosen(x));

  while (route.length < COUNTRIES_PER_ROUND) {
    let pool = unvisitedPool();
    let fromVisited = false;
    if (pool.length === 0) {
      pool = visitedPool();
      fromVisited = true;
      if (pool.length === 0) {
        // 제외 목록 때문에 비었으면 제외를 무시한다 (60개국이라 실제로는 일어나지 않는다)
        pool = COUNTRIES.filter((x) => !route.includes(x.id));
      }
    }
    let candidates = pool.filter((x) => !usedContinents.has(x.continent));
    if (candidates.length === 0) {
      if (!fromVisited) releasedContinentRule = true;
      candidates = pool;
    }
    const pick = rng.pick(candidates);
    route.push(pick.id);
    usedContinents.add(pick.continent);
    if (fromVisited) filledFromVisited += 1;
  }

  return { route, releasedContinentRule, filledFromVisited };
}
