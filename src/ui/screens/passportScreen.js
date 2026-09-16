// 10. 여권 — 30개국 스탬프판, 누적 기록.
// 스탬프 안쪽의 국가명과 국기는 코드로 렌더링한다. 이미지 안에 글자가 들어가지 않는다.
// 스탬프 테두리 이미지는 아직 없다. manifest 의 passport.stampFrame 이 null 이면 CSS 임시 테두리를 쓴다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { COUNTRIES, getCountry } from '../../data/countries.js';
import { passportBooks, currentBookNumber } from '../../game/passport.js';
import { renderFlag } from '../components/flagView.js';
import { continentProgress } from '../../data/geography.js';
import { getAsset } from '../../../assets/manifest.js';

export function renderPassportScreen(root, params, nav) {
  const books = passportBooks(gameState.visited);
  let shown = params.book ?? currentBookNumber(gameState.visited);

  const screen = el('section', 'screen screen--passport');
  const head = el('div', 'page-head');
  const headText = el('div');
  headText.append(el('h2', 'page-head__title', '나의 여권'));
  headText.append(el('p', 'page-head__sub', '도착한 나라마다 스탬프가 하나씩 찍혀요'));
  head.append(headText);
  head.append(el('div', 'pill pill--amber', `스탬프 ${gameState.visited.length} / ${COUNTRIES.length}개국`));
  screen.append(head);

  // ---- 권 선택 ----
  const tabs = el('div', 'passport-tabs');
  const tabButtons = books.map((b) => {
    const t = button(`여권 ${b.number}권 ${b.stamps.length}/${b.size}`, 'btn passport-tab', () => { shown = b.number; renderBook(); });
    t.disabled = b.number > currentBookNumber(gameState.visited);
    tabs.append(t);
    return t;
  });
  screen.append(tabs);

  // ---- 스탬프판 ----
  const board = el('div', 'passport card');
  screen.append(board);

  function renderBook() {
    const book = books[shown - 1];
    tabButtons.forEach((t, i) => t.classList.toggle('is-active', i === shown - 1));
    board.replaceChildren();
    board.append(el('div', 'passport__title', `여권 ${book.number}권${book.complete ? ' · 완성' : ''}`));
    const grid = el('div', 'stamp-grid');
    for (let i = 0; i < book.size; i++) {
      const id = book.stamps[i];
      if (id) {
        const c = getCountry(id);
        const stamp = el('div', `stamp stamp--filled stamp--${i % 2 ? 'sage' : 'amber'}`);
        // 스탬프 테두리 6종(원본 시트 6)을 돌아가며 쓴다. 없으면 CSS 임시 테두리
        const frame = getAsset(`passport.stamp-${(i % 6) + 1}`);
        if (frame) stamp.style.backgroundImage = `url(${frame})`;
        else stamp.classList.add('stamp--fallback');
        stamp.append(renderFlag(c, { size: 'sm' }));
        // 긴 이름(오스트레일리아, 남아프리카공화국)은 글자를 줄여 테두리 안에 넣는다
        stamp.append(el('span', `stamp__name${c.name.length > 5 ? ' stamp__name--long' : ''}`, c.name));
        stamp.append(el('span', 'stamp__no', String(i + 1)));
        grid.append(stamp);
      } else {
        const empty = el('div', 'stamp stamp--empty');
        empty.append(el('span', 'stamp__no', String(i + 1)));
        grid.append(empty);
      }
    }
    board.append(grid);
  }
  renderBook();

  // ---- 누적 기록 ----
  const t = gameState.totals;
  // 대륙별로 몇 나라를 다녀왔는지 (6학년 사회 "대륙과 대양"과 맞물린다)
  const byContinent = el('div', 'card continent-card');
  byContinent.append(el('h3', 'panel__title', '대륙별로 다녀온 나라'));
  const cgrid = el('div', 'continent-grid');
  for (const row of continentProgress(gameState.visited)) {
    const item = el('div', 'continent');
    item.append(el('div', 'continent__name', row.continent.name));
    const bar = el('div', 'continent__bar');
    const fill = el('div', 'continent__fill');
    fill.style.width = `${Math.round((row.visited / row.total) * 100)}%`;
    bar.append(fill);
    item.append(bar);
    item.append(el('div', 'continent__count', `${row.visited} / ${row.total}`));
    cgrid.append(item);
  }
  byContinent.append(cgrid);
  screen.append(byContinent);

  const stats = el('dl', 'passport-stats card');
  const rows = [
    ...(gameState.student?.postOffice ? [['나의 우체국', gameState.student.postOffice]] : []),
    ['누적 문제 수', `${t.problems}문제`],
    ['누적 배송 수', `${t.deliveries}건`],
    ['세계일주 회차 수', `${gameState.roundsCompleted}회`],
    ['방문 국가 수', `${gameState.visited.length}개국`],
  ];
  for (const [k, v] of rows) stats.append(el('dt', null, k), el('dd', null, v));
  screen.append(stats);

  // 화면 이동과 로그아웃은 상단 내비에 있다 (2026-09-16 개편). 여기서 또 늘어놓지 않는다.
  root.append(screen);
}
