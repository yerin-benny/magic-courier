// 세계지리 표시용 계산 (6학년 사회 "세계의 여러 나라"). 문제로 내지 않고 보여 주기만 한다.

import { describe, it, expect } from 'vitest';
import {
  formatLatitude,
  formatLongitude,
  hemispheres,
  distanceKm,
  directionLabel,
  fromHome,
  geographyOf,
  continentProgress,
  CONTINENT_LABELS,
  OCEAN_LABELS,
} from '../src/data/geography.js';
import { COUNTRIES, CONTINENTS, getCountry } from '../src/data/countries.js';

describe('위도·경도 표기', () => {
  it('북위·남위·동경·서경을 한국어로 쓴다', () => {
    expect(formatLatitude(37.57)).toBe('북위 37.6°');
    expect(formatLatitude(-33.87)).toBe('남위 33.9°');
    expect(formatLongitude(126.98)).toBe('동경 127.0°');
    expect(formatLongitude(-58.38)).toBe('서경 58.4°');
  });

  it('0°는 적도와 본초자오선으로 쓴다', () => {
    expect(formatLatitude(0)).toBe('적도 0°');
    expect(formatLongitude(0)).toBe('본초자오선 0°');
  });
});

describe('반구', () => {
  it('서울은 북반구·동반구', () => {
    expect(hemispheres(37.57, 126.98).text).toBe('북반구 · 동반구');
  });

  it('부에노스아이레스는 남반구·서반구', () => {
    expect(hemispheres(-34.6, -58.38).text).toBe('남반구 · 서반구');
  });
});

describe('거리', () => {
  const seoul = { lat: 37.57, lon: 126.98 };

  it('서울-도쿄는 1,200km 안쪽이다', () => {
    const km = distanceKm(seoul, { lat: 35.68, lon: 139.69 });
    expect(km).toBeGreaterThan(1100);
    expect(km).toBeLessThan(1300);
  });

  it('서울-런던은 8,500~9,000km 쯤이다', () => {
    const km = distanceKm(seoul, { lat: 51.51, lon: -0.13 });
    expect(km).toBeGreaterThan(8500);
    expect(km).toBeLessThan(9000);
  });

  it('같은 자리는 0km', () => {
    expect(distanceKm(seoul, seoul)).toBe(0);
  });

  it('지구 위 어느 두 곳도 2만km를 넘지 않는다', () => {
    for (const c of COUNTRIES) {
      expect(distanceKm(seoul, c), c.name).toBeLessThanOrEqual(20100);
    }
  });
});

describe('방향', () => {
  const seoul = { lat: 37.57, lon: 126.98 };

  it('서울에서 도쿄는 동쪽 언저리다', () => {
    expect(directionLabel(seoul, { lat: 35.68, lon: 139.69 })).toMatch(/동쪽/);
  });

  it('서울에서 오스트레일리아는 남쪽 언저리다', () => {
    expect(directionLabel(seoul, { lat: -35.28, lon: 149.13 })).toMatch(/남/);
  });

  it('같은 자리면 방향이 없다', () => {
    expect(directionLabel(seoul, seoul)).toBeNull();
  });
});

describe('우리나라에서 본 값', () => {
  it('대한민국 자신은 거리 정보를 만들지 않는다', () => {
    expect(fromHome(getCountry('KR'))).toBeNull();
  });

  it('다른 나라는 거리와 방향이 나온다', () => {
    const f = fromHome(getCountry('BR'));
    expect(f.home.name).toBe('대한민국');
    expect(f.km).toBeGreaterThan(10000);
    expect(f.direction).toBeTruthy();
  });
});

describe('geographyOf', () => {
  it('60개국 모두 카드에 필요한 값이 채워진다', () => {
    for (const c of COUNTRIES) {
      const g = geographyOf(c.id);
      expect(g.continent, c.name).toBeTruthy();
      expect(g.latitude, c.name).toMatch(/[°]/);
      expect(g.longitude, c.name).toMatch(/[°]/);
      expect(g.hemisphere.text, c.name).toContain('·');
      expect(g.country.capital, c.name).toBeTruthy();
    }
  });
});

describe('대륙별 진행', () => {
  it('아무 데도 안 갔으면 전부 0이고 합은 60이다', () => {
    const rows = continentProgress([]);
    expect(rows.reduce((s, r) => s + r.total, 0)).toBe(COUNTRIES.length);
    expect(rows.every((r) => r.visited === 0)).toBe(true);
  });

  it('간 나라만 해당 대륙에서 올라간다', () => {
    const rows = continentProgress(['JP', 'BR']);
    const asia = rows.find((r) => r.continent.id === 'asia');
    const south = rows.find((r) => r.continent.id === 'southAmerica');
    expect(asia.visited).toBe(1);
    expect(south.visited).toBe(1);
    expect(rows.filter((r) => r.visited > 0).length).toBe(2);
  });

  it('대륙 순서(order)대로 나온다', () => {
    const rows = continentProgress([]);
    const orders = rows.map((r) => r.continent.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

describe('지도 글자 위치', () => {
  it('대륙 7개 이름이 있고 CONTINENTS 의 이름과 맞는다', () => {
    const names = new Set(Object.values(CONTINENTS).map((c) => c.name));
    names.add('남극'); // 특별 지역은 지도에 "남극"으로 쓴다
    for (const l of CONTINENT_LABELS) expect(names.has(l.name) || l.name === '남극', l.name).toBe(true);
    expect(CONTINENT_LABELS.length).toBe(7);
  });

  it('모든 글자 위치가 위경도 범위 안이다', () => {
    for (const l of [...CONTINENT_LABELS, ...OCEAN_LABELS]) {
      expect(Math.abs(l.lat), l.name).toBeLessThanOrEqual(90);
      expect(Math.abs(l.lon), l.name).toBeLessThanOrEqual(180);
    }
  });
});
