// 3. 캐릭터 선택 — 마법 배달부 4종, 성별 구분 없음. 빗자루 선택은 2차.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { getAsset } from '../../../assets/manifest.js';

export const CHARACTERS = Object.freeze([
  { id: 1, name: '깃털 모자' },
  { id: 2, name: '고글 모자' },
  { id: 3, name: '후드 망토' },
  { id: 4, name: '리본 베레' },
]);

export function renderCharacterScreen(root, params, nav) {
  if (!gameState.student) {
    nav.go('login');
    return;
  }
  const screen = el('section', 'screen screen--character');
  screen.append(el('h2', 'screen__heading', '나의 마법 배달부'));
  screen.append(el('p', 'subtitle', '함께 세계를 돌 배달부를 골라 주세요'));

  let chosen = gameState.student.characterId ?? null;
  const grid = el('div', 'choice-grid');
  const cards = CHARACTERS.map((c) => {
    const card = button('', `choice${chosen === c.id ? ' is-chosen' : ''}`);
    const url = getAsset(`characters.side-${c.id}`);
    if (url) {
      const img = el('img', 'choice__img');
      img.src = url;
      img.alt = '';
      img.draggable = false;
      card.append(img);
    } else {
      card.append(el('div', 'choice__img choice__img--placeholder'));
    }
    card.append(el('span', 'choice__name', c.name));
    card.addEventListener('click', () => {
      chosen = c.id;
      cards.forEach((x, i) => x.classList.toggle('is-chosen', CHARACTERS[i].id === chosen));
      next.disabled = false;
    });
    grid.append(card);
    return card;
  });
  screen.append(grid);

  const next = button('이 배달부로 정하기', 'btn btn--primary btn--big', async () => {
    gameState.student.characterId = chosen;
    await gameState.persist();
    nav.go('map');
  });
  next.disabled = !chosen;
  screen.append(next);
  root.append(screen);
}
