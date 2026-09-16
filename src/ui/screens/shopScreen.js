// 11. 꾸미기 — 별빛 상점 (spec 화면 11, 개발 2차 "빗자루·캐릭터 꾸미기").
//
//   - 별가루로 산다. 전부 외형 전용이고 문제·채점·보상에 영향을 주지 않는다.
//   - 산 물건은 바로 착용된다. 다시 누르면 벗는다 (빗자루는 벗을 수 없다).
//   - 누적 별가루는 기록이라 줄지 않는다. 잔액은 따로 센다 (game/shop.js).
//   - 못 사는 물건도 흐리게 보여 준다. "무엇을 향해 푸는지"가 보여야 모으는 재미가 생긴다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { getAsset } from '../../../assets/manifest.js';
import { SLOTS, ITEMS, itemsOfSlot } from '../../data/decorItems.js';
import { BUY_RESULT, balanceOf, buyItem, collectionProgress, isEquipped, ownsItem, toggleEquip } from '../../game/shop.js';
import { renderCourierCard } from '../components/courierCard.js';
import { wordWithJosa } from '../../core/josa.js';

export function renderShopScreen(root, params, nav) {
  const doc = gameState.student;
  if (!doc) {
    nav.go('login');
    return;
  }

  const screen = el('section', 'screen screen--shop');
  const head = el('div', 'page-head');
  const headText = el('div');
  headText.append(el('h2', 'page-head__title', '별빛 상점'));
  headText.append(el('p', 'page-head__sub', '문제를 풀어 모은 별가루로 배달부를 꾸며요'));
  head.append(headText);
  const progressPill = el('div', 'pill pill--amber');
  head.append(progressPill);
  screen.append(head);

  const body = el('div', 'shop__body');
  screen.append(body);
  // 화면 이동은 상단 내비에 있다 (2026-09-16 개편)
  root.append(screen);

  /** 산 뒤·착용한 뒤 화면을 다시 그린다. 상태는 학생 문서 한 곳에만 있다. */
  function draw(message = null) {
    body.replaceChildren();
    const { owned, total } = collectionProgress(doc, ITEMS);
    progressPill.textContent = `모은 물건 ${owned} / ${total}`;

    // ---- 지금 차림 ----
    const card = el('div', 'card shop__card');
    card.append(renderCourierCard(doc, { name: doc.postOffice ?? doc.nickname, note: '지금 차림' }));
    body.append(card);

    if (message) {
      const note = el('p', `shop__message${message.ok ? ' shop__message--ok' : ''}`, message.text);
      body.append(note);
    }

    // ---- 슬롯별 물건 ----
    for (const slot of SLOTS) {
      const section = el('div', 'card shop__section');
      const head = el('div', 'shop__section-head');
      head.append(el('h3', 'shop__section-title', slot.name));
      head.append(el('span', 'shop__section-hint', slot.hint));
      section.append(head);

      const grid = el('div', 'shop__grid');
      for (const item of itemsOfSlot(slot.id)) {
        grid.append(renderItem(item));
      }
      section.append(grid);
      body.append(section);
    }
  }

  function renderItem(item) {
    const has = ownsItem(doc, item.id);
    const worn = isEquipped(doc, item.id);
    const affordable = balanceOf(doc) >= item.price;

    const tile = el('div', `shop__item${worn ? ' shop__item--worn' : ''}${!has && !affordable ? ' shop__item--locked' : ''}`);
    const url = getAsset(item.asset);
    const figure = el('div', 'shop__item-figure');
    if (url) {
      const img = el('img', 'shop__item-img');
      img.src = url;
      img.alt = '';
      img.draggable = false;
      figure.append(img);
    }
    tile.append(figure);
    tile.append(el('div', 'shop__item-name', item.name));

    if (has) {
      tile.append(el('div', `badge badge--own${worn ? ' badge--worn' : ''}`, worn ? '착용 중' : '가진 물건'));
      tile.append(
        button(worn ? (item.slot === 'broom' ? '타는 중' : '벗기') : '착용', 'btn btn--sm', () => {
          if (worn && item.slot === 'broom') {
            draw({ ok: false, text: '빗자루는 하나는 타고 있어야 해요.' });
            return;
          }
          toggleEquip(doc, item.id);
          gameState.persist();
          draw();
        }),
      );
    } else {
      tile.append(el('div', 'shop__item-price', `✦ ${item.price}`));
      tile.append(
        button('사기', `btn btn--sm${affordable ? ' btn--primary' : ''}`, () => {
          const res = buyItem(doc, item.id);
          if (res.status === BUY_RESULT.OK) {
            gameState.persist();
            draw({ ok: true, text: `${wordWithJosa(item.name, '을/를')} 샀어요! 바로 착용했어요.` });
            return;
          }
          if (res.status === BUY_RESULT.NOT_ENOUGH) {
            draw({ ok: false, text: `별가루가 ${res.shortBy} 더 있으면 살 수 있어요.` });
          }
        }),
      );
    }
    return tile;
  }

  draw();
}
