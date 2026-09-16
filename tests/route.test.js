// 회차 경로 추첨 규칙 테스트 (spec 3-1).
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/random.js';
import { COUNTRIES, COUNTRY_BY_ID } from '../src/data/countries.js';
import { drawRoute, COUNTRIES_PER_ROUND } from '../src/game/route.js';
import { createGameState } from '../src/game/gameState.js';
import { project, MAP_WIDTH, MAP_HEIGHT } from '../src/ui/map/projection.js';

const continentOf = (id) => COUNTRY_BY_ID[id].continent;
const idsOf = (continent) => COUNTRIES.filter((c) => c.continent === continent).map((c) => c.id);

describe('drawRoute', () => {
  it('4개국을 뽑고 서로 다르다', () => {
    const { route } = drawRoute([], { rng: createRng(1) });
    expect(route.length).toBe(COUNTRIES_PER_ROUND);
    expect(new Set(route).size).toBe(4);
  });

  it('미방문 국가가 충분하면 4개국은 서로 다른 대륙이고 전부 미방문이다', () => {
    const rng = createRng(2);
    for (let i = 0; i < 300; i++) {
      const visited = COUNTRIES.slice(0, 20).map((c) => c.id); // 아시아 14 + 유럽 6
      const { route, releasedContinentRule, filledFromVisited } = drawRoute(visited, { rng });
      expect(new Set(route.map(continentOf)).size).toBe(4);
      for (const id of route) expect(visited).not.toContain(id);
      expect(releasedContinentRule).toBe(false);
      expect(filledFromVisited).toBe(0);
    }
  });

  it('미방문 국가가 한 대륙에만 남으면 대륙 중복 금지를 풀고 미방문에서 뽑는다', () => {
    // 아프리카 12개국만 미방문
    const visited = COUNTRIES.filter((c) => c.continent !== 'africa').map((c) => c.id);
    const { route, releasedContinentRule, filledFromVisited } = drawRoute(visited, { rng: createRng(3) });
    expect(releasedContinentRule).toBe(true);
    expect(filledFromVisited).toBe(0);
    for (const id of route) expect(continentOf(id)).toBe('africa');
  });

  it('미방문이 4개 미만이면 나머지는 방문국에서 채운다', () => {
    const unvisited = ['FJ', 'AQ'];
    const visited = COUNTRIES.map((c) => c.id).filter((id) => !unvisited.includes(id));
    const { route, filledFromVisited } = drawRoute(visited, { rng: createRng(4) });
    expect(route.slice(0, 2).sort()).toEqual(['AQ', 'FJ']);
    expect(filledFromVisited).toBe(2);
    expect(new Set(route).size).toBe(4);
    // 채울 때도 대륙은 되도록 다르게: 오세아니아·특별 다음이라 나머지 둘은 다른 대륙
    expect(new Set(route.map(continentOf)).size).toBe(4);
  });

  it('60개국을 다 돌면 방문국에서만 뽑고 대륙은 서로 다르다', () => {
    const all = COUNTRIES.map((c) => c.id);
    const { route, filledFromVisited } = drawRoute(all, { rng: createRng(5) });
    expect(filledFromVisited).toBe(4);
    expect(new Set(route.map(continentOf)).size).toBe(4);
  });

  it('exclude 로 직전 국가를 뺄 수 있다', () => {
    const all = COUNTRIES.map((c) => c.id);
    const rng = createRng(6);
    for (let i = 0; i < 100; i++) {
      const { route } = drawRoute(all, { rng, exclude: ['KR'] });
      expect(route).not.toContain('KR');
    }
  });

  it('8회차면 여권 1권(30개국)이 채워지고 15회차면 60개국 전부다', () => {
    const rng = createRng(7);
    const visited = new Set();
    for (let round = 1; round <= 15; round++) {
      for (const id of drawRoute(visited, { rng }).route) visited.add(id);
      if (round === 7) expect(visited.size).toBe(28);
      if (round === 8) expect(visited.size).toBe(32);
    }
    expect(visited.size).toBe(60);
  });

  it('시드가 같으면 같은 경로', () => {
    expect(drawRoute([], { rng: createRng(8) }).route).toEqual(drawRoute([], { rng: createRng(8) }).route);
  });

  it('특별 지역(남극)과 오세아니아도 뽑힌다', () => {
    const rng = createRng(9);
    const seen = new Set();
    for (let i = 0; i < 200; i++) for (const id of drawRoute([], { rng }).route) seen.add(continentOf(id));
    expect(seen.has('special')).toBe(true);
    expect(seen.has('oceania')).toBe(true);
  });
});

describe('gameState 회차 흐름', () => {
  it('startRound → 배송 4건 → isRoundComplete → finishRound', () => {
    const g = createGameState({ rng: createRng(10) });
    expect(g.roundNumber).toBe(0);
    expect(g.currentLocation()).toBe('KR');
    expect(g.currentDestination()).toBeNull();
    g.startRound();
    expect(g.roundNumber).toBe(1);
    expect(g.route.countries.length).toBe(4);
    expect(g.deliveryIndex).toBe(0);
    expect(() => g.startRound()).toThrow();

    const summary = { total: 5, stardust: 15, accurateBonus: true };
    const arrived = [];
    for (let i = 0; i < 4; i++) {
      expect(g.deliveryIndex).toBe(i);
      const dest = g.currentDestination();
      expect(g.completeDelivery(summary)).toBe(dest);
      arrived.push(dest);
      expect(g.currentLocation()).toBe(dest);
    }
    expect(g.isRoundComplete).toBe(true);
    expect(g.currentDestination()).toBeNull();
    expect(() => g.completeDelivery(summary)).toThrow();
    expect(g.visited).toEqual(arrived);
    expect(g.totals).toEqual({ problems: 20, deliveries: 4, stardust: 60, accurateDeliveries: 4 });

    g.finishRound();
    expect(g.roundsCompleted).toBe(1);
    expect(g.route).toBeNull();
    expect(g.currentLocation()).toBe(arrived[3]);
    g.startRound();
    expect(g.roundNumber).toBe(2);
    for (const id of g.route.countries) expect(arrived).not.toContain(id);
  });

  it('회차가 끝나기 전 finishRound 는 예외', () => {
    const g = createGameState({ rng: createRng(11) });
    g.startRound();
    expect(() => g.finishRound()).toThrow();
  });
});

describe('지도 투영', () => {
  it('정거원통도법: 서울은 오른쪽 위, 남극은 아래', () => {
    const seoul = project(37.57, 126.98);
    expect(seoul.x).toBeGreaterThan(MAP_WIDTH / 2);
    expect(seoul.y).toBeLessThan(MAP_HEIGHT / 2);
    const aq = project(-62.22, -58.79);
    expect(aq.y).toBeGreaterThan(MAP_HEIGHT * 0.8);
    expect(project(0, 0)).toEqual({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
    expect(project(90, -180)).toEqual({ x: 0, y: 0 });
  });

  it('범위 밖은 예외', () => {
    expect(() => project(91, 0)).toThrow();
    expect(() => project(0, 181)).toThrow();
  });
});
