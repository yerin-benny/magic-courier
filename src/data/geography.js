// 세계지리 거들기 (6학년 2학기 사회 "세계의 여러 나라" 와 맞물리는 부분).
//
// 왜 넣는가
//   [추가 2026-09-16] 사용자(담임) 요청. 같은 시기에 세계지리를 배우니 나라를 지날 때
//   위치 정보를 같이 보게 한다.
//
// 지키는 선
//   지리를 "문제로 내지" 않는다 (spec 13장). 누르면 보이는 설명까지만이다.
//   중심 목적은 분수의 나눗셈 복습이고, 지리는 배송지에 붙는 덤이다.
//
// 좌표는 countries.js 의 수도 위경도를 그대로 쓴다. 나라 전체가 아니라 수도 기준이라는 뜻이다.

import { COUNTRIES, CONTINENTS, START_COUNTRY_ID, getCountry } from './countries.js';

const R_KM = 6371; // 지구 반지름
const toRad = (deg) => (deg * Math.PI) / 180;

/** 위도 → "북위 37.6°" / "남위 33.9°" / "적도 0°" */
export function formatLatitude(lat) {
  const v = Math.abs(lat).toFixed(1);
  if (Math.abs(lat) < 0.05) return '적도 0°';
  return `${lat > 0 ? '북위' : '남위'} ${v}°`;
}

/** 경도 → "동경 127.0°" / "서경 58.4°" / "본초자오선 0°" */
export function formatLongitude(lon) {
  const v = Math.abs(lon).toFixed(1);
  if (Math.abs(lon) < 0.05) return '본초자오선 0°';
  return `${lon > 0 ? '동경' : '서경'} ${v}°`;
}

/** 반구. 적도·본초자오선 위면 그렇게 말한다. */
export function hemispheres(lat, lon) {
  const ns = Math.abs(lat) < 0.05 ? '적도 위' : lat > 0 ? '북반구' : '남반구';
  const ew = Math.abs(lon) < 0.05 ? '본초자오선 위' : lon > 0 ? '동반구' : '서반구';
  return { ns, ew, text: `${ns} · ${ew}` };
}

/** 두 지점의 대권 거리(km). 지구를 공으로 보고 잰 가장 짧은 거리다. */
export function distanceKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** 12,345 → "12,345" */
export function formatKm(km) {
  return km.toLocaleString('ko-KR');
}

const COMPASS = ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽'];

/** a 에서 b 를 보는 방향 (8방위). 같은 자리면 null. */
export function directionLabel(a, b) {
  if (a.lat === b.lat && a.lon === b.lon) return null;
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lon - a.lon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  const idx = Math.round(((deg % 360) + 360) / 45) % 8;
  return COMPASS[idx];
}

/** 출발 나라(대한민국)에서 본 거리와 방향 */
export function fromHome(country) {
  const home = getCountry(START_COUNTRY_ID);
  if (country.id === home.id) return null;
  return {
    home,
    km: distanceKm(home, country),
    direction: directionLabel(home, country),
  };
}

/** 나라 하나의 지리 카드에 들어갈 값들을 한 번에 만든다 */
export function geographyOf(countryId) {
  const country = getCountry(countryId);
  return {
    country,
    continent: CONTINENTS[country.continent],
    hemisphere: hemispheres(country.lat, country.lon),
    latitude: formatLatitude(country.lat),
    longitude: formatLongitude(country.lon),
    home: fromHome(country),
  };
}

/** 대륙별 방문 진행 (여권 화면). order 순서로 돌려준다. */
export function continentProgress(visitedIds) {
  const visited = new Set(visitedIds);
  const buckets = new Map();
  for (const c of COUNTRIES) {
    const key = c.continent;
    if (!buckets.has(key)) buckets.set(key, { continent: CONTINENTS[key], total: 0, visited: 0 });
    const b = buckets.get(key);
    b.total += 1;
    if (visited.has(c.id)) b.visited += 1;
  }
  return [...buckets.values()].sort((a, b) => a.continent.order - b.continent.order);
}

/**
 * 지도에 얹을 대륙 이름 위치 (위경도). 나라 좌표가 아니라 글자를 놓기 좋은 자리다.
 * 러시아·튀르키예를 아시아로 분류한 것과 별개로, 글자는 지도에서 읽기 좋은 곳에 둔다.
 */
export const CONTINENT_LABELS = Object.freeze([
  { name: '아시아', lat: 45, lon: 95 },
  { name: '유럽', lat: 56, lon: 18 },
  { name: '아프리카', lat: 2, lon: 21 },
  { name: '북아메리카', lat: 48, lon: -100 },
  { name: '남아메리카', lat: -14, lon: -60 },
  { name: '오세아니아', lat: -25, lon: 134 },
  { name: '남극', lat: -80, lon: 20 },
]);

/** 지도에 얹을 대양 이름. 6학년 사회의 "대륙과 대양"과 맞춘다. */
export const OCEAN_LABELS = Object.freeze([
  { name: '태평양', lat: 0, lon: -150 },
  { name: '태평양', lat: 10, lon: 165 },
  { name: '대서양', lat: 10, lon: -35 },
  { name: '인도양', lat: -25, lon: 78 },
  { name: '북극해', lat: 78, lon: -50 },
  { name: '남극해', lat: -62, lon: -120 },
]);
