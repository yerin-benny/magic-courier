// 9. 회차 완료 화면 — 세계일주 완료. 회차 보상(3-3)은 2차 개발이라 지금은 넣지 않는다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { getCountry } from '../../data/countries.js';
import { renderFlag } from '../components/flagView.js';

export function renderRoundCompleteScreen(root, params, nav) {
  if (!gameState.isRoundComplete) {
    nav.go('map');
    return;
  }
  const number = gameState.roundNumber;
  const countries = gameState.route.countries.map(getCountry);

  const screen = el('section', 'screen screen--round');
  screen.append(el('h2', 'screen__heading', `세계일주 ${number}회차 완료!`));
  const card = el('div', 'card');
  card.append(el('p', null, '이번 회차에 다녀온 나라'));
  const list = el('ul', 'stamp-list');
  for (const c of countries) {
    const li = el('li', 'stamp-list__item');
    li.append(renderFlag(c, { size: 'sm' }), el('span', null, c.name));
    list.append(li);
  }
  card.append(list);
  card.append(el('p', 'success__note', `여권 스탬프 ${gameState.visited.length}개 · 누적 배송 ${gameState.totals.deliveries}건 · 별가루 ${gameState.totals.stardust}`));
  screen.append(card);

  screen.append(button('다음 회차 시작', 'btn btn--primary btn--big', () => {
    gameState.finishRound();
    nav.go('map');
  }));
  root.append(screen);
}
