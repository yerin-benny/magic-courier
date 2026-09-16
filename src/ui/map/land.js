// 세계지도 육지 층. Natural Earth 1:110m 국가 경계(world-atlas, 퍼블릭 도메인/ISC)를
// topojson-client 로 풀어 projection.js 와 같은 정거원통도법으로 SVG path 를 만든다.
// 지도를 직접 그리지 않는다. 출처는 docs/THIRD_PARTY.md.
//
// renderLand({ classById })  classById: { [numericId]: 'is-visited' | 'is-route' ... } 로 나라별 강조

import * as topojson from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import { project } from './projection.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

let cachedFeatures = null;

/** GeoJSON feature 목록 (캐시) */
export function landFeatures() {
  if (!cachedFeatures) cachedFeatures = topojson.feature(world, world.objects.countries).features;
  return cachedFeatures;
}

/**
 * 위경도 링 하나 → "M x,y L x,y ... Z"
 * 경도가 ±180° 를 넘어가는 구간(러시아 추코트카, 남극)에서는 선이 지도를 가로지르므로
 * 그 지점에서 path 를 끊어 새 조각으로 시작한다.
 */
function ringToPath(ring) {
  let d = '';
  let prevLon = null;
  ring.forEach(([lon, lat], i) => {
    const { x, y } = project(clampLat(lat), clampLon(lon));
    const jump = prevLon !== null && Math.abs(lon - prevLon) > 180;
    d += `${i === 0 || jump ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    prevLon = lon;
  });
  return d + 'Z';
}

const clampLat = (v) => Math.max(-90, Math.min(90, v));
const clampLon = (v) => Math.max(-180, Math.min(180, v));

/** feature 하나의 path d 속성 */
export function featurePath(feature) {
  const g = feature.geometry;
  if (!g) return '';
  if (g.type === 'Polygon') return g.coordinates.map(ringToPath).join('');
  if (g.type === 'MultiPolygon') return g.coordinates.map((poly) => poly.map(ringToPath).join('')).join('');
  return '';
}

export function renderLand({ classById = {} } = {}) {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'map__land');
  for (const f of landFeatures()) {
    const d = featurePath(f);
    if (!d) continue;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    const extra = classById[Number(f.id)];
    path.setAttribute('class', `map__country${extra ? ` ${extra}` : ''}`);
    path.dataset.id = String(f.id);
    group.append(path);
  }
  return group;
}
