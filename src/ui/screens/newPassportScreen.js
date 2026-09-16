// 새 여권 수여 연출 — 여권 한 권(30개국)이 완성됐을 때 한 번 보여 준다.
// 표지 이미지는 manifest 의 passport.cover 가 null 이면 CSS 플레이스홀더를 쓴다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { PASSPORT_BOOKS } from '../../game/passport.js';
import { getAsset } from '../../../assets/manifest.js';

export function renderNewPassportScreen(root, params, nav) {
  const completed = gameState.pendingPassport;
  if (!completed) {
    nav.go('map');
    return;
  }
  const isLast = completed >= PASSPORT_BOOKS;

  const screen = el('section', 'screen screen--new-passport');
  screen.append(el('h2', 'screen__heading', `여권 ${completed}권 완성!`));

  const cover = el('div', 'passport-cover');
  const coverUrl = getAsset('passport.cover');
  if (coverUrl) {
    cover.style.backgroundImage = `url(${coverUrl})`;
    cover.classList.add('passport-cover--image');
  }
  cover.append(el('span', 'passport-cover__label', isLast ? '전설의 마법 배달부' : `여권 ${completed + 1}권`));
  screen.append(cover);

  screen.append(el('p', 'subtitle', isLast
    ? '60개국을 모두 다녀왔어요. 이제 세계 어디든 다시 갈 수 있어요.'
    : `30개국 스탬프를 다 모았어요. 새 여권 ${completed + 1}권을 받았어요.`));

  const next = gameState.isRoundComplete ? 'roundComplete' : 'map';
  screen.append(button('계속하기', 'btn btn--primary btn--big', () => {
    gameState.acknowledgePassport();
    nav.go(next);
  }));
  root.append(screen);
}
