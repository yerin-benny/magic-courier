// 5. 세계지도 메인 — 이번 회차 경로 4개국, 현재 위치, 배송 시작 버튼.
//
// 육지 층은 Natural Earth 1:110m(world-atlas)을 land.js 가 그린다. 지도를 직접 그리지 않는다.
// 마커·경로는 수도 위경도를 같은 투영으로 옮긴 좌표다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { balanceOf, friendOf, ownsItem } from '../../game/shop.js';
import { getItem, itemsOfSlot } from '../../data/decorItems.js';
import { COUNTRIES, CONTINENTS, getCountry } from '../../data/countries.js';
import { project, MAP_WIDTH, MAP_HEIGHT } from '../map/projection.js';
import { COUNTRIES_PER_ROUND } from '../../game/route.js';
import { renderFlag } from '../components/flagView.js';
import { renderGeographyPanel } from '../components/geographyPanel.js';
import { wordWithJosa } from '../../core/josa.js';
import { renderLand } from '../map/land.js';
import { CONTINENT_LABELS, OCEAN_LABELS } from '../../data/geography.js';
import { getAsset } from '../../../assets/manifest.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

// 지도 바깥 여백. 투영 좌표는 0~1000 × 0~500 인데, 경도 ±180 근처 나라(피지·뉴질랜드)의
// 마커·이름표·캐릭터가 그 밖으로 삐져나가 잘렸다. viewBox 를 넓혀 바다로 채운다.
const PAD_X = 60;
const PAD_Y = 30;

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** 장식 구름: 타원 몇 개를 겹친 덩어리 */
function cloud(x, y, scale = 1) {
  const g = svg('g', { class: 'map__cloud', transform: `translate(${x} ${y}) scale(${scale})` });
  for (const [cx, cy, r] of [[0, 0, 16], [18, -6, 20], [38, 0, 15], [20, 8, 14]]) g.append(svg('circle', { cx, cy, r }));
  return g;
}

export function renderMapScreen(root, params, nav) {
  if (!gameState.student) {
    nav.go('login');
    return;
  }
  if (!gameState.route || gameState.isRoundComplete) gameState.startRound();
  const route = gameState.route;
  const locationId = gameState.currentLocation();
  const visited = new Set(gameState.visited);

  const screen = el('section', 'screen screen--map');

  // ---- 지도 ----
  const frame = el('div', 'map card');
  const map = svg('svg', {
    viewBox: `${-PAD_X} ${-PAD_Y} ${MAP_WIDTH + PAD_X * 2} ${MAP_HEIGHT + PAD_Y * 2}`,
    class: 'map__svg',
    role: 'img',
    'aria-label': '세계지도',
  });

  const defs = svg('defs');
  const grad = svg('linearGradient', { id: 'seaGradient', x1: 0, y1: 0, x2: 0, y2: 1 });
  grad.append(svg('stop', { offset: '0%', 'stop-color': '#DCEBF8' }));
  grad.append(svg('stop', { offset: '100%', 'stop-color': '#BBD6EE' }));
  defs.append(grad);
  map.append(defs);
  map.append(svg('rect', { x: -PAD_X, y: -PAD_Y, width: MAP_WIDTH + PAD_X * 2, height: MAP_HEIGHT + PAD_Y * 2, class: 'map__sea' }));
  map.append(cloud(60, 60, 1.1), cloud(880, 40, 0.9), cloud(420, 430, 1), cloud(720, 400, 0.8));

  // ---- 위도·경도 기준선 (6학년 사회 "세계의 여러 나라") ----
  // 적도와 본초자오선은 위치를 말할 때 기준이 되는 선이다. 얇게 깔고 이름을 붙여 둔다.
  const grid = svg('g', { class: 'map__grid' });
  const equatorY = project(0, 0).y;
  const meridianX = project(0, 0).x;
  grid.append(svg('line', { x1: 0, y1: equatorY, x2: MAP_WIDTH, y2: equatorY, class: 'map__line' }));
  grid.append(svg('line', { x1: meridianX, y1: 0, x2: meridianX, y2: MAP_HEIGHT, class: 'map__line' }));
  const equatorLabel = svg('text', { x: 8, y: equatorY - 6, class: 'map__line-label' });
  equatorLabel.textContent = '적도 0°';
  const meridianLabel = svg('text', { x: meridianX + 6, y: 14, class: 'map__line-label' });
  meridianLabel.textContent = '본초자오선 0°';
  grid.append(equatorLabel, meridianLabel);
  map.append(grid);

  // 육지: 방문한 나라와 이번 경로의 나라를 색으로 구분한다
  const classById = {};
  for (const c of COUNTRIES) {
    if (!c.numeric) continue;
    if (visited.has(c.id)) classById[c.numeric] = 'is-visited';
    if (route.countries.includes(c.id)) classById[c.numeric] = `${classById[c.numeric] ? `${classById[c.numeric]} ` : ''}is-route`;
  }
  map.append(renderLand({ classById }));

  // ---- 대륙·대양 이름 ----
  const places = svg('g', { class: 'map__places' });
  for (const l of CONTINENT_LABELS) {
    const { x, y } = project(l.lat, l.lon);
    const t = svg('text', { x, y, 'text-anchor': 'middle', class: 'map__continent' });
    t.textContent = l.name;
    places.append(t);
  }
  for (const l of OCEAN_LABELS) {
    const { x, y } = project(l.lat, l.lon);
    const t = svg('text', { x, y, 'text-anchor': 'middle', class: 'map__ocean' });
    t.textContent = l.name;
    places.append(t);
  }
  map.append(places);

  // 모든 국가 점
  const dots = svg('g', { class: 'map__dots' });
  for (const country of COUNTRIES) {
    const { x, y } = project(country.lat, country.lon);
    dots.append(svg('circle', { cx: x, cy: y, r: 4, class: `map__dot${visited.has(country.id) ? ' is-visited' : ''}` }));
  }
  map.append(dots);

  // 경로선: 지나온 구간(실선) + 남은 구간(점선). 흰 테두리를 깔아 육지 위에서도 잘 보이게 한다
  const toPoint = (id) => { const c = getCountry(id); return project(c.lat, c.lon); };
  const donePts = [route.startedAt, ...route.countries.slice(0, route.position)].map(toPoint);
  const nextPts = [locationId, ...route.countries.slice(route.position)].map(toPoint);
  const pointsAttr = (pts) => pts.map((p) => `${p.x},${p.y}`).join(' ');
  if (donePts.length > 1) {
    map.append(svg('polyline', { points: pointsAttr(donePts), class: 'map__route-outline' }));
    map.append(svg('polyline', { points: pointsAttr(donePts), class: 'map__route map__route--done' }));
  }
  if (nextPts.length > 1) {
    map.append(svg('polyline', { points: pointsAttr(nextPts), class: 'map__route-outline' }));
    map.append(svg('polyline', { points: pointsAttr(nextPts), class: 'map__route' }));
  }

  // 경로 마커 1~4 (스티커)
  route.countries.forEach((id, i) => {
    const c = getCountry(id);
    const { x, y } = project(c.lat, c.lon);
    const g = svg('g', { class: `map__marker${i < route.position ? ' is-done' : ''}${i === route.position ? ' is-next' : ''}`, transform: `translate(${x} ${y})` });
    g.append(svg('circle', { r: 14 }));
    const t = svg('text', { 'text-anchor': 'middle', dy: 6, class: 'map__marker-no' });
    t.textContent = String(i + 1);
    g.append(t);
    const label = svg('text', { 'text-anchor': 'middle', dy: -20, class: 'map__label' });
    label.textContent = c.name;
    g.append(label);
    map.append(g);
  });

  // 현재 위치의 캐릭터 (측면 비행 포즈). 자산이 없으면 도형 플레이스홀더
  const here = toPoint(locationId);
  const destinationId = gameState.currentDestination();
  // 캐릭터 그림은 오른쪽을 보고 난다. 다음 배송지가 화면 왼쪽이면 좌우를 뒤집어 가는 쪽을 보게 한다.
  // 경도가 아니라 그려진 경로선과 같은 화면 좌표로 비교해야 선과 방향이 어긋나지 않는다.
  const goingWest = destinationId ? toPoint(destinationId).x < here.x : false;
  const courier = svg('g', { class: 'map__courier', transform: `translate(${here.x} ${here.y})` });
  courier.append(svg('ellipse', { cx: 0, cy: 6, rx: 14, ry: 5, class: 'map__courier-shadow' }));
  const sideUrl = getAsset(`characters.side-${gameState.characterId}`);
  if (sideUrl) {
    const img = svg('image', { x: -36, y: -66, width: 72, height: 72, class: 'map__courier-img', preserveAspectRatio: 'xMidYMid meet' });
    img.setAttribute('href', sideUrl);
    img.setAttributeNS(XLINK_NS, 'xlink:href', sideUrl);
    // 가운데를 기준으로 좌우 반전. x 범위가 -36~36 이라 뒤집어도 자리는 그대로다.
    if (goingWest) img.setAttribute('transform', 'scale(-1 1)');
    courier.append(img);
  } else {
    courier.append(svg('circle', { r: 9, cy: -6, class: 'map__courier-body' }));
    courier.append(svg('polygon', { points: '-8,-14 8,-14 0,-26', class: 'map__courier-hat' }));
  }
  // 데리고 다니는 동물 친구가 있으면 옆에서 같이 난다 (꾸미기, spec 화면 11)
  const friend = friendOf(gameState.student);
  const friendUrl = friend ? getAsset(friend.asset) : null;
  if (friendUrl) {
    // 동물 그림은 몸통이 원본 시트 배경(크림)과 같은 색이라 뒤에 같은 색 판을 깔아야 온전해 보인다.
    // 친구는 배달부 뒤쪽에서 따라오므로, 방향을 뒤집으면 반대편으로 옮긴다.
    const side = goingWest ? -1 : 1;
    const fg = svg('g', { class: 'map__friend' });
    fg.append(svg('circle', { cx: 37 * side, cy: -31, r: 21, class: 'map__friend-plate' }));
    // scale(-1 1) 이면 x 18~56 이 -56~-18 로 옮겨 가므로 위치와 반전이 한 번에 된다
    const fimg = svg('image', { x: 18, y: -50, width: 38, height: 38, preserveAspectRatio: 'xMidYMid meet' });
    if (goingWest) fimg.setAttribute('transform', 'scale(-1 1)');
    fimg.setAttribute('href', friendUrl);
    fimg.setAttributeNS(XLINK_NS, 'xlink:href', friendUrl);
    fg.append(fimg);
    courier.append(fg);
  }
  map.append(courier);

  // ---- 나침반 ----
  const compass = svg('g', { class: 'map__compass', transform: `translate(${-PAD_X + 44} ${-PAD_Y + 52})` });
  compass.append(svg('circle', { r: 21, class: 'map__compass-plate' }));
  compass.append(svg('polygon', { points: '0,-16 5,0 0,4 -5,0', class: 'map__compass-n' }));
  compass.append(svg('polygon', { points: '0,16 5,0 0,-4 -5,0', class: 'map__compass-s' }));
  for (const [label, dx, dy] of [['북', 0, -26], ['남', 0, 32], ['동', 28, 4], ['서', -28, 4]]) {
    const t = svg('text', { x: dx, y: dy, 'text-anchor': 'middle', class: 'map__compass-label' });
    t.textContent = label;
    compass.append(t);
  }
  map.append(compass);

  frame.append(map);

  // ===== 화면 구성 =====
  // 넓은 화면에서는 왼쪽에 지도, 오른쪽에 "다음 목적지"와 출발 버튼을 둔다.
  // 지도만 크게 띄워 두면 다음에 무엇을 해야 하는지가 스크롤 아래로 밀린다.
  const head = el('div', 'page-head');
  const headText = el('div');
  headText.append(el('h2', 'page-head__title', `${gameState.roundNumber}번째 세계일주`));
  headText.append(el('p', 'page-head__sub', '오늘의 구름길을 따라 네 나라에 마법 소포를 전해요'));
  head.append(headText);
  head.append(el('div', 'pill pill--amber', `${route.position} / ${COUNTRIES_PER_ROUND}개국 도착`));
  screen.append(head);

  const layout = el('div', 'map-layout');

  // ---- 왼쪽: 지도 + 경로 목록 ----
  const mapPanel = el('div', 'card panel');
  mapPanel.append(el('h3', 'panel__title', '여행 경로'));
  mapPanel.append(frame);

  // 지도와 나라 목록은 붙여 두면 지도 아래쪽에 겹쳐 보인다. 사이에 작은 머리글을 넣어 떼어 놓는다.
  const listHead = el('div', 'panel__subhead');
  listHead.append(el('h4', 'panel__subtitle', '이번 회차에 갈 나라'));
  listHead.append(el('span', 'panel__subhint', '순서대로 배달해요'));
  mapPanel.append(listHead);

  const list = el('ol', 'route-list');
  route.countries.forEach((id, i) => {
    const c = getCountry(id);
    const li = el('li', `route-list__item${i < route.position ? ' is-done' : ''}${i === route.position ? ' is-next' : ''}`);
    li.append(el('span', 'route-list__no', String(i + 1)));
    li.append(renderFlag(c, { size: 'sm' }));
    const text = el('span', 'route-list__text');
    text.append(el('strong', null, c.name), el('span', 'route-list__continent', CONTINENTS[c.continent].name));
    li.append(text);
    if (i < route.position) li.append(el('span', 'route-list__status', '도착'));
    if (i === route.position) li.append(el('span', 'route-list__status route-list__status--next', '다음'));
    list.append(li);
  });
  mapPanel.append(list);
  // 지리 둘러보기는 지도 바로 아래에 둔다. 눌러야 열리고, 안 눌러도 배송에는 지장이 없다.
  // 칩 번호는 회차 경로의 실제 순번이다. 지금 있는 나라가 경로에 없을 때만 앞에 따로 붙인다.
  const geoEntries = [];
  if (!route.countries.includes(locationId)) {
    geoEntries.push({ id: locationId, label: `지금 ${getCountry(locationId).name}` });
  }
  route.countries.forEach((id, i) => {
    const mark = i < route.position ? '도착' : `${i + 1}`;
    geoEntries.push({ id, label: `${mark} ${getCountry(id).name}` });
  });
  mapPanel.append(renderGeographyPanel(geoEntries, gameState.currentDestination() ?? locationId));
  layout.append(mapPanel);

  // ---- 오른쪽: 다음 목적지 + 출발 ----
  const dest = getCountry(gameState.currentDestination());
  const next = el('div', 'card panel panel--next');
  next.append(el('div', 'panel__eyebrow', '다음 목적지'));
  next.append(renderFlag(dest, { size: 'lg' }));
  next.append(el('div', 'next__name', dest.name));
  next.append(el('div', 'next__meta', CONTINENTS[dest.continent].name));

  // 문제를 풀다가 지도로 나온 경우에는 "이어서"로 바꿔 같은 자리로 돌려보낸다
  const session = gameState.session;
  const inProgress = !!session && !session.isComplete;
  const resumeScreen = session ? (session.isComplete ? 'success' : 'problem') : 'request';

  // 수도·현재 위치·이번 배송을 같은 줄 모양으로 늘어놓고, 그 아래 나라 소개를 붙인다.
  const rows = el('dl', 'info-rows');
  rows.append(el('dt', null, '수도'), el('dd', null, dest.capital));
  rows.append(el('dt', null, '지금 있는 곳'), el('dd', null, getCountry(locationId).name));
  rows.append(
    el('dt', null, '이번 배송'),
    el('dd', null, inProgress ? `분수 문제 ${session.index} / ${session.total} 푸는 중` : '분수 문제 5개'),
  );
  next.append(rows);
  next.append(el('p', 'next__intro', dest.intro));

  next.append(
    button(
      inProgress ? '이어서 배달하기' : `${wordWithJosa(dest.name, '으로/로')} 배송 시작`,
      'btn btn--primary btn--big next__go',
      () => nav.go(resumeScreen),
    ),
  );
  // 오른쪽 기둥 = 나와 내 진행 (다음 목적지 · 빗자루 · 누적 기록).
  // 왼쪽은 여행지 정보(지도·나라 목록·지리)라서, 오른쪽에 하나만 두면 아래가 크게 빈다.
  const side = el('div', 'map-side');
  side.append(next, renderBroomCard(nav), renderRecordCard());
  layout.append(side);
  screen.append(layout);

  root.append(screen);
}

/** 누적 기록 카드 (좁은 기둥에 맞춰 줄로 세운다) */
function renderRecordCard() {
  const card = el('div', 'card panel');
  card.append(el('div', 'panel__eyebrow', '나의 기록'));
  const rows = el('dl', 'info-rows');
  rows.append(el('dt', null, '모은 스탬프'), el('dd', null, `${gameState.visited.length} / ${COUNTRIES.length}개국`));
  rows.append(el('dt', null, '완료한 배송'), el('dd', null, `${gameState.totals.deliveries}건`));
  rows.append(el('dt', null, '모은 별가루'), el('dd', null, `✦ ${gameState.totals.stardust}`));
  card.append(rows);
  return card;
}

/** 지금 타는 빗자루와 다음 단계 (꾸미기로 가는 입구) */
function renderBroomCard(nav) {
  const doc = gameState.student;
  const brooms = itemsOfSlot('broom');
  const current = getItem(doc?.equipped?.broom) ?? brooms[0];
  const stage = brooms.findIndex((b) => b.id === current.id) + 1;

  const card = el('div', 'card broom-card');

  const figure = el('div', 'broom-card__figure');
  const url = getAsset(current.asset);
  if (url) {
    const img = el('img');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    figure.append(img);
  }
  figure.append(el('span', 'broom-card__stage', `${stage}단계`));
  card.append(figure);

  const info = el('div', 'broom-card__info');
  info.append(el('div', 'broom-card__label', '지금 타는 빗자루'));
  info.append(el('div', 'broom-card__name', current.name));
  const dots = el('div', 'broom-card__dots');
  brooms.forEach((b, i) => {
    const d = el('span', `broom-card__dot${i < stage ? ' is-on' : ''}${ownsItem(doc, b.id) ? ' is-own' : ''}`, String(i + 1));
    d.title = b.name;
    dots.append(d);
  });
  info.append(dots);
  card.append(info);

  // 다음 단계까지 얼마나 남았는지 별가루로 알려 준다
  const nextBroom = brooms.find((b) => !ownsItem(doc, b.id));
  const aside = el('div', 'broom-card__aside');
  const note = el('div', 'broom-card__aside-note');
  if (nextBroom) {
    const short = Math.max(0, nextBroom.price - balanceOf(doc));
    note.append(el('div', 'broom-card__aside-label', '다음 빗자루까지'));
    note.append(el('div', 'broom-card__aside-value', short ? `✦ ${short}` : '지금 살 수 있어요'));
  } else {
    note.append(el('div', 'broom-card__aside-label', '빗자루를 모두 모았어요'));
  }
  aside.append(note);
  aside.append(button('꾸미기로 가기', 'btn btn--sm', () => nav.go('shop')));
  card.append(aside);
  return card;
}
