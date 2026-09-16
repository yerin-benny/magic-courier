// 배달부 카드 — 캐릭터와 지금 착용한 꾸미기 아이템을 한 장에 모아 보여 준다.
//
// 왜 겹쳐 입히지 않는가
//   캐릭터 측면 그림(characters.side-N)은 이미 모자·망토를 쓰고 빗자루를 타고 있는 완성된 그림이다.
//   그 위에 모자 그림을 얹으면 모자가 둘이 된다.
//   그래서 캐릭터는 그대로 두고, 착용한 물건은 옆 칸에 나란히 놓는다.
//   둘레에 둥글게 붙여도 봤는데 캐릭터 머리와 겹쳐서 칸 배치로 바꿨다.

import { el } from '../dom.js';
import { getAsset } from '../../../assets/manifest.js';
import { SLOTS } from '../../data/decorItems.js';
import { equippedItems } from '../../game/shop.js';

/**
 * @param {object} doc 학생 문서
 * @param {{ showEmpty?: boolean, name?: string, note?: string }} options
 *        showEmpty  빈 슬롯을 점선 자리로 보여 줄지 (꾸미기 화면에서 true)
 */
export function renderCourierCard(doc, { showEmpty = true, name = null, note = null } = {}) {
  const card = el('div', 'courier-card');

  const stage = el('div', 'courier-card__stage');
  const sideUrl = getAsset(`characters.side-${doc?.characterId ?? 1}`);
  if (sideUrl) {
    const img = el('img', 'courier-card__me');
    img.src = sideUrl;
    img.alt = '나의 마법 배달부';
    img.draggable = false;
    stage.append(img);
  } else {
    stage.append(el('div', 'courier-card__me courier-card__me--placeholder'));
  }

  const slots = el('div', 'courier-card__slots');
  const worn = equippedItems(doc);
  for (const [i, slot] of SLOTS.entries()) {
    const item = worn[i];
    if (!item && !showEmpty) continue;
    const spot = el('div', `courier-card__spot courier-card__spot--${slot.id}`);
    if (item) {
      const url = getAsset(item.asset);
      if (url) {
        const img = el('img', 'courier-card__item');
        img.src = url;
        img.alt = item.name;
        img.draggable = false;
        spot.append(img);
      } else {
        spot.append(el('span', 'courier-card__item-text', item.name));
      }
      spot.title = item.name;
    } else {
      spot.classList.add('courier-card__spot--empty');
      spot.append(el('span', 'courier-card__spot-label', slot.name));
    }
    slots.append(spot);
  }
  card.append(stage, slots);

  if (name) card.append(el('div', 'courier-card__name', name));
  if (note) card.append(el('div', 'courier-card__note', note));
  return card;
}

/** 지도에서 캐릭터 옆에 같이 나는 동물 친구. 없으면 null. */
export function friendImageUrl(item) {
  return item ? getAsset(item.asset) : null;
}
