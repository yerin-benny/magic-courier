// 여권 로직, 자산 manifest, 지도 육지 데이터 테스트.
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/random.js';
import { COUNTRIES } from '../src/data/countries.js';
import { passportBooks, currentBookNumber, bookJustCompleted, PASSPORT_SIZE } from '../src/game/passport.js';
import { createGameState } from '../src/game/gameState.js';
import { manifest, getAsset } from '../assets/manifest.js';
import { landFeatures, featurePath } from '../src/ui/map/land.js';
import { MAP_WIDTH, MAP_HEIGHT } from '../src/ui/map/projection.js';

const ids = COUNTRIES.map((c) => c.id);

describe('여권', () => {
  it('1권은 1~30번째, 2권은 31~60번째 방문 국가', () => {
    const books = passportBooks(ids.slice(0, 45));
    expect(books.length).toBe(2);
    expect(books[0].stamps).toEqual(ids.slice(0, 30));
    expect(books[0].complete).toBe(true);
    expect(books[1].stamps).toEqual(ids.slice(30, 45));
    expect(books[1].complete).toBe(false);
    expect(PASSPORT_SIZE).toBe(30);
  });

  it('현재 권 번호', () => {
    expect(currentBookNumber([])).toBe(1);
    expect(currentBookNumber(ids.slice(0, 29))).toBe(1);
    expect(currentBookNumber(ids.slice(0, 30))).toBe(2);
    expect(currentBookNumber(ids.slice(0, 60))).toBe(2);
  });

  it('여권 완성 순간 판정: 29→30 이면 1권, 59→60 이면 2권, 그 외 0', () => {
    expect(bookJustCompleted(29, 30)).toBe(1);
    expect(bookJustCompleted(28, 32)).toBe(1);
    expect(bookJustCompleted(30, 31)).toBe(0);
    expect(bookJustCompleted(59, 60)).toBe(2);
    expect(bookJustCompleted(60, 60)).toBe(0);
    expect(bookJustCompleted(3, 4)).toBe(0);
  });

  it('gameState: 30번째 도착에서 pendingPassport 가 1이 되고 확인하면 0', () => {
    const g = createGameState({ rng: createRng(30) });
    const summary = { total: 5, stardust: 15, accurateBonus: true };
    let arrivals = 0;
    while (arrivals < 30) {
      g.startRound();
      for (let i = 0; i < 4; i++) {
        g.completeDelivery(summary);
        arrivals += 1;
        if (arrivals < 30) expect(g.pendingPassport).toBe(0);
        if (arrivals === 30) expect(g.pendingPassport).toBe(1);
      }
      g.finishRound();
    }
    g.acknowledgePassport();
    expect(g.pendingPassport).toBe(0);
    expect(g.visited.length).toBe(32);
    expect(g.roundsCompleted).toBe(8);
  });
});

describe('자산 manifest', () => {
  it('60개국 국기 SVG 가 전부 있고 flag.XX 키로 얻는다', () => {
    for (const c of COUNTRIES) {
      const url = getAsset(c.flagKey);
      expect(url, c.id).toBeTruthy();
      // 작은 SVG 는 Vite 가 data URI 로 인라인한다
      expect(url).toMatch(/\.svg$|^data:image\/svg\+xml/);
    }
    expect(Object.keys(manifest.flags).length).toBe(60);
  });

  it('없는 키는 null', () => {
    expect(getAsset('flag.XX')).toBeNull();
    expect(getAsset('passport.stamp-99')).toBeNull();
    expect(getAsset('nothing.here')).toBeNull();
  });

  it('원본 시트에서 자른 자산이 manifest 에 있다', () => {
    for (const key of ['backgrounds.sky', 'characters.side-1', 'characters.side-4', 'characters.front-sheet', 'passport.cover', 'passport.stamp-1', 'passport.stamp-6', 'parcels.parcel-1', 'parcels.parcel-8']) {
      expect(getAsset(key), key).toBeTruthy();
    }
  });
});

describe('지도 육지 데이터 (Natural Earth 1:110m)', () => {
  it('feature 가 100개 넘고 60개국 중 싱가포르만 빠져 있다', () => {
    const features = landFeatures();
    expect(features.length).toBeGreaterThan(100);
    const numericIds = new Set(features.map((f) => Number(f.id)));
    const missing = COUNTRIES.filter((c) => !numericIds.has(c.numeric)).map((c) => c.id);
    expect(missing).toEqual(['SG']);
  });

  it('path 좌표가 지도 범위 안이다', () => {
    for (const f of landFeatures()) {
      const d = featurePath(f);
      expect(d.length).toBeGreaterThan(0);
      const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
      for (let i = 0; i < nums.length; i += 2) {
        expect(nums[i]).toBeGreaterThanOrEqual(0);
        expect(nums[i]).toBeLessThanOrEqual(MAP_WIDTH);
        expect(nums[i + 1]).toBeGreaterThanOrEqual(0);
        expect(nums[i + 1]).toBeLessThanOrEqual(MAP_HEIGHT);
      }
    }
  });
});
