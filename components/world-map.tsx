'use client';

import { useState } from 'react';
import { assets } from '../data/assets';
import { country } from '../data/countries';

const continentLabels = [
  { name: '북아메리카', x: 190, y: 104 },
  { name: '남아메리카', x: 305, y: 286 },
  { name: '유럽', x: 474, y: 84 },
  { name: '아프리카', x: 492, y: 226 },
  { name: '아시아', x: 655, y: 118 },
  { name: '오세아니아', x: 782, y: 302 },
  { name: '남극', x: 450, y: 394 },
] as const;

export function WorldMap({
  route,
  leg,
  origin = 'KR',
  character,
}: {
  route: string[];
  leg: number;
  origin?: string;
  character: string;
}) {
  const xy = (id: string) => {
    const c = country(id);
    return [((c.lon + 180) / 360) * 900, ((85 - c.lat) / 170) * 420] as const;
  };
  const ids = [origin, ...route];
  const points = ids.map(xy);
  const currentPoint = Math.min(leg + 1, route.length);
  const defaultSelectedId = route[Math.min(leg, route.length - 1)] ?? origin;
  const [selectedId, setSelectedId] = useState(defaultSelectedId);
  const [showCapital, setShowCapital] = useState(false);
  const activeSelectedId = ids.includes(selectedId) ? selectedId : defaultSelectedId;
  const selectedCountry = country(activeSelectedId);
  const latitude = `${selectedCountry.lat >= 0 ? '북위' : '남위'} ${Math.abs(selectedCountry.lat).toFixed(1)}°`;
  const longitude = `${selectedCountry.lon >= 0 ? '동경' : '서경'} ${Math.abs(selectedCountry.lon).toFixed(1)}°`;
  const hemisphere = `${selectedCountry.lat >= 0 ? '북반구' : '남반구'} · ${selectedCountry.lon >= 0 ? '동반구' : '서반구'}`;
  const courierPoint = Math.min(leg, route.length);
  const [courierX, courierY] = points[courierPoint];
  const [nextX] = points[Math.min(courierPoint + 1, points.length - 1)];
  const courierIndex = Math.max(
    0,
    assets.characters.findIndex((item) => item.id === character),
  );
  const courierName = assets.characters[courierIndex].name;
  const spriteWidth = 62;
  const spriteHeight = 102;
  const spriteX = courierX > 850 ? -66 : courierX < 50 ? 4 : -31;
  const spriteY = courierY < 105 ? 12 : -100;
  const facingLeft = nextX < courierX;
  const selectCountry = (id: string) => {
    setSelectedId(id);
    setShowCapital(false);
  };

  return (
    <div className="world-map">
      <div className="map-canvas">
        <svg
          viewBox="0 0 900 440"
          role="img"
          aria-label="이번 세계일주 목적지 지도. 나라 표시를 누르면 대륙, 수도, 위치 정보를 확인할 수 있어요."
        >
          <defs>
            <filter id="map-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow
                dx="0"
                dy="3"
                stdDeviation="3"
                floodColor="#5f5570"
                floodOpacity=".24"
              />
            </filter>
            <pattern id="map-grid" width="75" height="70" patternUnits="userSpaceOnUse">
              <path d="M75 0H0V70" fill="none" stroke="#7ba0af" strokeOpacity=".13" />
            </pattern>
            <clipPath id="map-courier-crop" clipPathUnits="userSpaceOnUse">
              <rect x={spriteX} y={spriteY} width={spriteWidth} height={spriteHeight} rx="4" />
            </clipPath>
          </defs>
          <rect width="900" height="440" fill="#cfe9f6" fillOpacity=".45" />
          <rect width="900" height="440" fill="url(#map-grid)" />
          <image href={assets.map} width="900" height="440" opacity=".82" />
          <line
            className="map-equator"
            x1="25"
            y1="210"
            x2="875"
            y2="210"
            vectorEffect="non-scaling-stroke"
          />
          <text className="map-equator-label" x="32" y="201">
            적도 0°
          </text>
          {continentLabels.map((label) => (
            <text className="map-continent-label" x={label.x} y={label.y} key={label.name}>
              {label.name}
            </text>
          ))}
          <g className="map-compass" aria-label="지도 방향">
            <circle cx="54" cy="52" r="24" />
            <path d="M54 30L60 53L54 49L48 53Z" />
            <text x="54" y="25">
              북
            </text>
            <text x="54" y="84">
              남
            </text>
            <text x="22" y="57">
              서
            </text>
            <text x="82" y="57">
              동
            </text>
          </g>
          <polyline
            points={points.map((point) => point.join(',')).join(' ')}
            fill="none"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity=".88"
          />
          <polyline
            points={points.map((point) => point.join(',')).join(' ')}
            fill="none"
            stroke="#e9a83a"
            strokeWidth="4"
            strokeDasharray="8 9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {points.map(([x, y], index) => {
            const active = index === currentPoint;
            const visited = index <= leg;
            const label = index === 0 ? '대한민국' : country(ids[index]).name;
            return (
              <g
                className={`map-country-node ${ids[index] === activeSelectedId ? 'selected' : ''}`}
                key={`${ids[index]}-${index}`}
                filter="url(#map-shadow)"
                role="button"
                tabIndex={0}
                aria-label={`${label} 지리 정보 보기`}
                onClick={() => selectCountry(ids[index])}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectCountry(ids[index]);
                  }
                }}
              >
                {ids[index] === activeSelectedId && (
                  <circle className="map-selection-ring" cx={x} cy={y} r={active ? 25 : 21} />
                )}
                {active && <circle cx={x} cy={y} r="22" fill="#ffd36a" opacity=".38" />}
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 15 : 12}
                  fill={visited ? '#6b5b95' : active ? '#f1b64e' : '#fffaf1'}
                  stroke="white"
                  strokeWidth="4"
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="800"
                  fill={visited || active ? 'white' : '#65567d'}
                >
                  {index === 0 ? '출' : index}
                </text>
                <text
                  x={x}
                  y={y - (active ? 25 : 21)}
                  textAnchor="middle"
                  fontSize={active ? 14 : 12}
                  fontWeight="800"
                  fill="#4e4370"
                  stroke="white"
                  strokeWidth="4"
                  paintOrder="stroke"
                  strokeLinejoin="round"
                >
                  {label}
                </text>
              </g>
            );
          })}
          <g
            className="map-courier"
            transform={`translate(${courierX} ${courierY})`}
            pointerEvents="none"
          >
            <title>{`${courierName}의 현재 위치`}</title>
            <ellipse
              className="map-courier-glow"
              cx="0"
              cy={spriteY < 0 ? 1 : 108}
              rx="28"
              ry="8"
            />
            <g className="map-courier-float">
              <circle className="map-courier-spark one" cx={spriteX - 3} cy={spriteY + 50} r="3" />
              <circle className="map-courier-spark two" cx={spriteX + 5} cy={spriteY + 64} r="2" />
              <g clipPath="url(#map-courier-crop)">
                <g
                  transform={
                    facingLeft ? `translate(${spriteX * 2 + spriteWidth} 0) scale(-1 1)` : undefined
                  }
                >
                  <image
                    className="map-courier-sprite"
                    href={assets.flyingCharacters}
                    x={spriteX - courierIndex * spriteWidth}
                    y={spriteY}
                    width={spriteWidth * 4}
                    height={spriteHeight}
                    preserveAspectRatio="none"
                  />
                </g>
              </g>
            </g>
          </g>
          <text x="26" y="418" fontSize="11" fill="#55717e" fontWeight="600">
            학습용 위치 개요 · 국경을 나타내지 않아요
          </text>
        </svg>
        <span className="map-note">나라 표시를 눌러 지리 정보를 살펴봐요!</span>
      </div>
      <section className="geography-peek" aria-live="polite">
        <div className="geography-peek-heading">
          <span>
            <small>세계지리 돋보기</small>
            <strong>이번 여행 나라를 하나씩 눌러 보세요</strong>
          </span>
          <div className="geography-country-tabs" aria-label="지리 정보를 볼 나라 선택">
            {ids.map((id, index) => {
              const item = country(id);
              return (
                <button
                  type="button"
                  className={id === activeSelectedId ? 'active' : ''}
                  aria-pressed={id === activeSelectedId}
                  onClick={() => selectCountry(id)}
                  key={`${id}-geo-${index}`}
                >
                  {index === 0 ? '출발' : index}
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="geography-country-card">
          <div className="geography-identity">
            <img src={assets.flags[activeSelectedId].src} alt={`${selectedCountry.name} 국기`} />
            <span>
              <small>{selectedCountry.continent}</small>
              <strong>{selectedCountry.name}</strong>
            </span>
          </div>
          <div className="geography-location">
            <span>
              <small>지구에서</small>
              <strong>{hemisphere}</strong>
            </span>
            <span>
              <small>위치 좌표</small>
              <strong>
                {latitude} · {longitude}
              </strong>
            </span>
          </div>
          <div className="geography-story">
            <p>{selectedCountry.intro}</p>
            <button type="button" onClick={() => setShowCapital((shown) => !shown)}>
              {showCapital ? `수도는 ${selectedCountry.capital}` : '수도 맞혀 보기'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
