// 1. 시작 화면 — 앱을 열면 처음 보는 화면.
//
//   - 이 기기에 로그인 기록이 있으면 "이어서 하기"를 먼저, 크게 보여 준다.
//     학교 컴퓨터에서 매번 학교·별명·PIN 을 다시 치게 하면 수업 시간이 거기서 다 간다.
//   - 이어서 할 때는 지금까지 모은 것(우체국 이름, 스탬프, 회차)을 같이 보여 준다.
//     "내 것"이 남아 있다는 것이 보여야 다시 들어온다.
//   - 처음이면 네 배달부 그림을 보여 주고 바로 등록으로 보낸다.

import { el, button } from '../dom.js';
import { getAsset } from '../../../assets/manifest.js';
import { gameState } from '../../game/gameState.js';
import { isOnboarded } from '../../game/studentDoc.js';
import { PASSPORT_SIZE } from '../../game/passport.js';

/** 하늘을 나는 배달부 네 명. 각자 다른 박자로 떠다닌다. */
function renderFlight() {
  const flight = el('div', 'start__flight');
  for (let i = 1; i <= 4; i += 1) {
    const url = getAsset(`characters.side-${i}`);
    if (!url) continue;
    const img = el('img', 'start__flier');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    flight.append(img);
  }
  return flight.children.length ? flight : null;
}

/** 이어서 하기 카드 — 지금까지 모은 것 */
function renderResume(student) {
  const card = el('div', 'card start__resume');

  const face = el('div', 'start__resume-face');
  const url = getAsset(`characters.side-${student.characterId ?? 1}`);
  if (url) {
    const img = el('img');
    img.src = url;
    img.alt = '';
    img.draggable = false;
    face.append(img);
  }
  card.append(face);

  const info = el('div', 'start__resume-info');
  info.append(el('div', 'start__resume-name', `${student.nickname} 배달부`));
  if (student.postOffice) info.append(el('div', 'start__resume-office', student.postOffice));

  const stamps = student.visited?.length ?? 0;
  const rounds = student.roundsCompleted ?? 0;
  const stats = el('div', 'start__resume-stats');
  stats.append(el('span', null, `여권 스탬프 ${stamps}개`));
  stats.append(el('span', null, `세계일주 ${rounds}회차`));
  info.append(stats);

  // 지금 여권 한 권을 얼마나 채웠는지
  const inBook = stamps % PASSPORT_SIZE;
  const bar = el('div', 'start__resume-bar');
  const fill = el('div', 'start__resume-bar-fill');
  fill.style.width = `${Math.round(((stamps >= PASSPORT_SIZE && inBook === 0 ? PASSPORT_SIZE : inBook) / PASSPORT_SIZE) * 100)}%`;
  bar.append(fill);
  info.append(bar);

  card.append(info);
  return card;
}

export function renderStartScreen(root, params, nav) {
  const screen = el('section', 'screen screen--start');
  screen.append(
    el('h1', 'title', '마법 배달부의 세계일주'),
    el('p', 'subtitle', '분수의 나눗셈을 풀어 세계 곳곳에 소포를 배달해요'),
  );

  const student = gameState.student;
  const actions = el('div', 'start__actions');

  if (student) {
    // 이어서 하는 학생에게는 나는 배달부 띠를, 처음 온 학생에게는 고를 수 있는 네 명을 보여 준다.
    const flight = renderFlight();
    if (flight) screen.append(flight);
    screen.append(renderResume(student));
    actions.append(
      button(`${student.nickname} 배달부로 이어서 하기`, 'btn btn--primary btn--big', () =>
        nav.go(isOnboarded(student) ? 'map' : 'character'),
      ),
    );
    actions.append(button('다른 배달부로 시작', 'btn', () => nav.go('login')));
  } else {
    // 처음 온 학생에게는 고를 수 있는 배달부를 먼저 보여 준다 (원본 시트 1, 글자 없는 그림)
    const sheet = getAsset('characters.front-sheet');
    if (sheet) {
      const card = el('div', 'card start__sheet');
      const img = el('img');
      img.src = sheet;
      img.alt = '마법 배달부 네 명';
      img.draggable = false;
      card.append(img);
      screen.append(card);
    }
    actions.append(button('세계여행 시작', 'btn btn--primary btn--big', () => nav.go('login')));
    screen.append(actions);
    screen.append(el('p', 'start__hint', '학교와 별명만 정하면 바로 시작해요'));
    root.append(screen);
    return;
  }

  screen.append(actions);
  root.append(screen);
}
