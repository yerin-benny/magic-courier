// 6. 배송 의뢰 화면 — 출발지·목적지·물건, 해결할 문제 수, 배송 시작.

import { el, button } from '../dom.js';
import { composeRequest } from '../../data/deliveryRequests.js';
import { gameState } from '../../game/gameState.js';
import { getCountry } from '../../data/countries.js';
import { parcelFor } from '../../../assets/manifest.js';

export function renderRequestScreen(root, params, nav) {
  if (!gameState.currentDestination()) {
    nav.go('map');
    return;
  }
  // 의뢰문은 이 화면에 들어올 때 한 번 만든다. 뒤로 갔다 와도 같은 의뢰를 유지한다.
  if (!gameState.request) gameState.request = composeRequest(gameState.rng);
  // 세션을 여는 순간이 배송 시작 시각이다 (45초 판정의 기준, spec 9-1).
  gameState.openDelivery();
  const req = gameState.request;
  const session = gameState.session;
  const dest = getCountry(gameState.currentDestination());

  const screen = el('section', 'screen screen--request');
  screen.append(el('h2', 'screen__heading', '배송 의뢰가 도착했어요'));

  const card = el('div', 'card request');
  card.append(el('div', 'request__kind', req.kind.name));
  const parcelUrl = parcelFor(req.item);
  if (parcelUrl) {
    const img = el('img', 'request__parcel');
    img.src = parcelUrl;
    img.alt = '';
    img.draggable = false;
    card.append(img);
  }
  const rows = [
    ['배송 국가', dest.name],
    ['출발지', req.origin],
    ['목적지', req.destination],
    ['물건', req.item],
  ];
  const table = el('dl', 'request__rows');
  for (const [k, v] of rows) {
    table.append(el('dt', 'request__key', k), el('dd', 'request__value', v));
  }
  card.append(table);
  card.append(el('p', 'request__text', req.text));
  card.append(el('p', 'request__count', `해결할 문제: ${session.total}문제`));
  screen.append(card);

  screen.append(button('배송 시작', 'btn btn--primary btn--big', () => nav.go('problem')));
  root.append(screen);
}
