// 별빛 상점 — 별가루로 꾸미기 아이템을 사고 착용한다. DOM 을 모른다.
//
// 별가루 (spec 7장)
//   totals.stardust      지금까지 모은 별가루. 기록이므로 줄어들지 않는다.
//   totals.stardustSpent 지금까지 쓴 별가루.
//   잔액 = stardust - stardustSpent
//
// 누적 기록과 지갑을 나눈 이유: 누적 별가루는 "얼마나 풀었나"를 보여 주는 기록이다.
// 물건을 살 때마다 그 숫자가 줄면 열심히 한 흔적이 사라진다.
//
// 산 물건은 doc.items 에, 슬롯별 착용은 doc.equipped 에 남는다 (spec 10장 "보유 아이템").

import { SLOT_IDS, STARTER_ITEM_ID, getItem } from '../data/decorItems.js';

export const BUY_RESULT = Object.freeze({
  OK: 'ok',
  ALREADY: 'already',
  NOT_ENOUGH: 'notEnough',
  UNKNOWN: 'unknown',
});

/**
 * 예전에 저장된 학생 문서에는 꾸미기 필드가 없다. 읽을 때 한 번 채워 준다.
 * 저장 형식을 올리는 대신 이렇게 두는 이유: 빠진 필드가 몇 개뿐이고 기본값이 분명하다.
 */
export function ensureDecor(doc) {
  if (!doc) return doc;
  if (!Array.isArray(doc.items)) doc.items = [];
  if (!doc.items.includes(STARTER_ITEM_ID)) doc.items.push(STARTER_ITEM_ID);
  if (!doc.equipped || typeof doc.equipped !== 'object') doc.equipped = {};
  for (const slot of SLOT_IDS) {
    if (!(slot in doc.equipped)) doc.equipped[slot] = null;
  }
  if (!doc.equipped.broom) doc.equipped.broom = STARTER_ITEM_ID;
  if (!doc.totals) doc.totals = {};
  if (typeof doc.totals.stardustSpent !== 'number') doc.totals.stardustSpent = 0;
  return doc;
}

/** 지금 쓸 수 있는 별가루 */
export function balanceOf(doc) {
  if (!doc?.totals) return 0;
  return Math.max(0, (doc.totals.stardust ?? 0) - (doc.totals.stardustSpent ?? 0));
}

export function ownsItem(doc, id) {
  return !!doc?.items?.includes(id);
}

export function isEquipped(doc, id) {
  const item = getItem(id);
  if (!item) return false;
  return doc?.equipped?.[item.slot] === id;
}

/**
 * 물건을 산다. 성공하면 바로 착용까지 한다 (산 물건이 안 보이면 산 느낌이 나지 않는다).
 * @returns {{ status: string, shortBy?: number, item?: object }}
 */
export function buyItem(doc, id) {
  const item = getItem(id);
  if (!item) return { status: BUY_RESULT.UNKNOWN };
  ensureDecor(doc);
  if (ownsItem(doc, id)) return { status: BUY_RESULT.ALREADY, item };
  const balance = balanceOf(doc);
  if (balance < item.price) return { status: BUY_RESULT.NOT_ENOUGH, shortBy: item.price - balance, item };

  doc.totals.stardustSpent = (doc.totals.stardustSpent ?? 0) + item.price;
  doc.items.push(id);
  doc.equipped[item.slot] = id;
  return { status: BUY_RESULT.OK, item };
}

/**
 * 착용하거나 벗는다. 이미 착용 중인 것을 다시 고르면 벗는다.
 * 빗자루는 벗을 수 없다. 빗자루 없이 나는 배달부는 없다.
 * @returns {string|null} 그 슬롯에 착용된 아이템 id
 */
export function toggleEquip(doc, id) {
  const item = getItem(id);
  if (!item || !ownsItem(doc, id)) return doc?.equipped?.[item?.slot] ?? null;
  ensureDecor(doc);
  const slot = item.slot;
  if (doc.equipped[slot] === id) {
    if (slot === 'broom') return id;
    doc.equipped[slot] = null;
  } else {
    doc.equipped[slot] = id;
  }
  return doc.equipped[slot];
}

/** 슬롯 순서대로 착용한 아이템. 비어 있으면 null 이 들어간다. */
export function equippedItems(doc) {
  ensureDecor(doc);
  return SLOT_IDS.map((slot) => getItem(doc.equipped[slot]));
}

/** 지금 데리고 다니는 동물 친구 (지도에서 옆에 같이 난다) */
export function friendOf(doc) {
  return getItem(doc?.equipped?.friend ?? null);
}

/** 모은 개수 / 전체 개수 */
export function collectionProgress(doc, allItems) {
  const owned = allItems.filter((i) => ownsItem(doc, i.id)).length;
  return { owned, total: allItems.length };
}
