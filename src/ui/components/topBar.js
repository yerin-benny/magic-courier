// 상단 내비게이션 — 로그인한 뒤의 화면에 항상 떠 있는 띠.
//
// 왜 두는가
//   화면마다 아래쪽에 "여권 보기 / 학교 배송량 / 꾸미기" 버튼을 따로 달아 두면
//   어디로 갈 수 있는지가 스크롤을 내려야 보이고, 화면마다 버튼 목록이 달라진다.
//   갈 수 있는 곳과 내 상태(별가루)를 한 줄에 고정해 두는 편이 낫다.
//
// 어디에 안 나오는가
//   시작·로그인·캐릭터 선택: 아직 고를 것이 하나뿐인 화면이다.
//   문제 풀이·배송 성공·회차 완료·새 여권: 문제와 연출에 집중해야 하는 화면이다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { getAsset } from '../../../assets/manifest.js';
import { balanceOf } from '../../game/shop.js';
import { logout } from '../../game/auth.js';
import { storage } from '../../storage/index.js';

const TABS = [
  { screen: 'map', label: '세계지도' },
  { screen: 'passport', label: '나의 여권' },
  { screen: 'shop', label: '꾸미기' },
  { screen: 'ranking', label: '학교 배송량' },
];

/** 이 화면들에서는 띠를 숨긴다 */
const HIDDEN_ON = new Set(['start', 'login', 'character', 'problem', 'request', 'success', 'roundComplete', 'newPassport']);

export function renderTopBar(host, screen, nav) {
  host.replaceChildren();
  const student = gameState.student;
  if (!student || HIDDEN_ON.has(screen)) {
    host.hidden = true;
    return;
  }
  host.hidden = false;

  const bar = el('div', 'topbar');

  // ---- 로고 ----
  const brand = el('div', 'topbar__brand');
  const mark = el('div', 'topbar__mark', '✦');
  brand.append(mark);
  const names = el('div');
  names.append(el('div', 'topbar__title', '마법 배달부'));
  names.append(el('div', 'topbar__sub', student.postOffice ?? '세계일주'));
  brand.append(names);
  bar.append(brand);

  // ---- 탭 ----
  const tabs = el('nav', 'topbar__tabs');
  tabs.setAttribute('aria-label', '화면 이동');
  for (const t of TABS) {
    const b = button(t.label, `topbar__tab${t.screen === screen ? ' is-active' : ''}`, () => {
      if (t.screen !== screen) nav.go(t.screen);
    });
    if (t.screen === screen) b.setAttribute('aria-current', 'page');
    tabs.append(b);
  }
  bar.append(tabs);

  // ---- 별가루·캐릭터·로그아웃 ----
  const side = el('div', 'topbar__side');

  const purse = el('div', 'topbar__purse');
  purse.title = '쓸 수 있는 별가루';
  purse.append(el('span', 'topbar__purse-mark', '✦'));
  purse.append(el('span', 'topbar__purse-amount', String(balanceOf(student))));
  side.append(purse);

  const faceUrl = getAsset(`characters.side-${student.characterId ?? 1}`);
  if (faceUrl) {
    const face = el('div', 'topbar__face');
    const img = el('img');
    img.src = faceUrl;
    img.alt = student.nickname;
    img.draggable = false;
    face.append(img);
    face.title = `${student.nickname} 배달부`;
    side.append(face);
  }

  side.append(
    button('나가기', 'topbar__exit', async () => {
      await logout(storage);
      gameState.unloadStudent();
      nav.go('start');
    }),
  );

  bar.append(side);
  host.append(bar);
}
