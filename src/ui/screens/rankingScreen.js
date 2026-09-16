// 12. 학교 랭킹 화면 (spec 9-2, 9-3).
//
//   - 집계 문서 하나만 읽는다. 학교 문서를 전부 정렬해 읽지 않는다.
//   - 학교명만 보여 준다. 개인 닉네임은 어디에도 내지 않는다 (spec 8-3).
//   - 평균 배송 랭킹은 2차 개발이라 값만 표에 두고 정렬 기준으로는 쓰지 않는다.
//   - Firebase 설정이 없으면(로컬 모드) 랭킹 대신 안내를 보여 준다. 앱은 그대로 돈다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { storage } from '../../storage/index.js';
import { SCHOOL_BY_ID } from '../../game/auth.js';

const TABS = [
  { id: 'weekly', label: '이번 주', field: 'weekly', unit: '건' },
  { id: 'total', label: '누적', field: 'total', unit: '건' },
];

/** 갱신 시각을 "방금 전 / 12분 전 / 3시간 전"으로 */
function agoText(iso) {
  if (!iso) return '';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  return `${Math.floor(minutes / 60)}시간 전`;
}

export function renderRankingScreen(root, params, nav) {
  const screen = el('section', 'screen screen--ranking');
  const head = el('div', 'page-head');
  const headText = el('div');
  headText.append(el('h2', 'page-head__title', '학교 배송량'));
  headText.append(el('p', 'page-head__sub', '우리 학교 배달부들이 함께 쌓은 배송량이에요'));
  head.append(headText);
  screen.append(head);

  const mySchoolId = gameState.student?.schoolId ?? null;
  const body = el('div', 'ranking__body');
  screen.append(body);
  // 화면 이동은 상단 내비에 있다 (2026-09-16 개편)
  root.append(screen);

  // 로컬 저장소면 랭킹을 열 수 없다. 어댑터 종류는 렌더 시점에 본다.
  if (storage.kind !== 'firestore') {
    const card = el('div', 'card');
    card.append(el('p', null, '학교 배송량은 인터넷에 연결되면 열려요.'));
    card.append(el('p', 'success__note', '지금 푼 배송과 여권 스탬프는 이 컴퓨터에 그대로 남아 있어요.'));
    body.append(card);
    return;
  }

  let tab = TABS[0];
  let summary = null;

  function draw() {
    body.replaceChildren();

    if (!summary) {
      body.append(el('p', 'ranking__loading', '배송량을 세어 오는 중이에요…'));
      return;
    }

    // ---- 탭 ----
    const tabs = el('div', 'ranking__tabs');
    for (const t of TABS) {
      const b = button(t.label, `btn btn--sm${t.id === tab.id ? ' btn--primary' : ''}`, () => {
        tab = t;
        draw();
      });
      tabs.append(b);
    }
    body.append(tabs);

    const rows = [...(summary.table ?? [])].sort((a, b) => b[tab.field] - a[tab.field] || a.name.localeCompare(b.name, 'ko'));

    // ---- 우리 학교 ----
    const mine = rows.findIndex((r) => r.schoolId === mySchoolId);
    if (mine >= 0) {
      const r = rows[mine];
      const card = el('div', 'card ranking__mine');
      card.append(el('div', 'ranking__mine-label', '우리 학교'));
      card.append(el('div', 'ranking__mine-name', r.name));
      card.append(el('div', 'ranking__mine-stat', `${mine + 1}위 · ${r[tab.field]}${tab.unit}`));
      body.append(card);
    } else if (mySchoolId) {
      const card = el('div', 'card ranking__mine');
      card.append(el('div', 'ranking__mine-name', SCHOOL_BY_ID[mySchoolId]?.name ?? '우리 학교'));
      card.append(el('div', 'ranking__mine-stat', '아직 첫 배송을 기다리고 있어요'));
      body.append(card);
    }

    // ---- 순위표 ----
    const card = el('div', 'card');
    const list = el('ol', 'ranking__list');
    for (const [i, r] of rows.slice(0, 10).entries()) {
      const li = el('li', `ranking__row${r.schoolId === mySchoolId ? ' ranking__row--mine' : ''}`);
      li.append(el('span', 'ranking__rank', `${i + 1}`));
      li.append(el('span', 'ranking__name', r.name));
      li.append(el('span', 'ranking__count', `${r[tab.field]}${tab.unit}`));
      list.append(li);
    }
    card.append(list);
    if (!rows.length) card.append(el('p', 'success__note', '아직 배송량이 없어요. 첫 배송의 주인공이 되어 보세요!'));
    card.append(el('p', 'success__note', `전국 ${summary.schoolCount ?? 0}개 학교 · ${agoText(summary.updatedAtIso)} 기준`));
    body.append(card);

    // ---- 수동 갱신 (서버가 30분 쿨다운을 본다) ----
    const refresh = button('새로고침', 'btn btn--sm', async () => {
      refresh.disabled = true;
      refresh.textContent = '세는 중…';
      /** 안내를 잠깐 보여 준 뒤 버튼을 되돌린다. 눌러도 아무 일이 없는 상태로 두지 않는다. */
      const restore = (message) => {
        refresh.textContent = message;
        setTimeout(() => {
          refresh.textContent = '새로고침';
          refresh.disabled = false;
        }, 2500);
      };
      try {
        const res = await storage.requestRankingRefresh();
        if (res && res.refreshed === false) {
          restore(`${res.waitMinutes}분 뒤에 다시`);
          return;
        }
        summary = await storage.loadRankingSummary();
        draw();
      } catch {
        restore('잠시 뒤에 다시');
      }
    });
    body.append(refresh);
  }

  draw();
  storage
    .loadRankingSummary()
    .then((data) => {
      summary = data ?? { schoolCount: 0, table: [], top: [] };
      draw();
    })
    .catch(() => {
      summary = { schoolCount: 0, table: [], top: [] };
      draw();
    });
}
