// 별빛 상점 — 별가루로 꾸미기 아이템 사기·착용 (spec 화면 11).

import { describe, it, expect } from 'vitest';
import { ITEMS, ITEM_BY_ID, SLOTS, SLOT_IDS, STARTER_ITEM_ID, getItem, itemsOfSlot, totalPrice } from '../src/data/decorItems.js';
import { BUY_RESULT, balanceOf, buyItem, collectionProgress, ensureDecor, equippedItems, friendOf, isEquipped, ownsItem, toggleEquip } from '../src/game/shop.js';
import { createStudentDoc } from '../src/game/studentDoc.js';
import { getAsset } from '../assets/manifest.js';

const newDoc = (stardust = 0) => {
  const doc = createStudentDoc({ schoolId: 'busan-suyeong', nickname: '별빛', pinHash: 'h' });
  doc.totals.stardust = stardust;
  return doc;
};

describe('아이템 데이터', () => {
  it('빗자루 5 + 꾸미기 12 = 17종이다', () => {
    expect(ITEMS.length).toBe(17);
    expect(itemsOfSlot('broom').length).toBe(5);
    expect(itemsOfSlot('friend').length).toBe(4);
  });

  it('모든 아이템이 정해진 슬롯에 들어간다', () => {
    for (const item of ITEMS) expect(SLOT_IDS).toContain(item.slot);
    expect(SLOTS.length).toBe(6);
  });

  it('id 가 겹치지 않는다', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });

  it('모든 아이템에 실제 그림 자산이 있다', () => {
    for (const item of ITEMS) expect(getAsset(item.asset), item.id).toBeTruthy();
  });

  it('처음 주는 빗자루만 공짜고 나머지는 값이 있다', () => {
    for (const item of ITEMS) {
      if (item.id === STARTER_ITEM_ID) expect(item.price).toBe(0);
      else expect(item.price).toBeGreaterThan(0);
    }
  });

  it('가장 싼 물건은 한 회차(별가루 60) 안에 살 수 있다', () => {
    const cheapest = Math.min(...ITEMS.filter((i) => i.price > 0).map((i) => i.price));
    expect(cheapest).toBeLessThanOrEqual(60);
  });

  it('전부 모으려면 여권 2권(16회차, 960)보다 오래 걸린다', () => {
    expect(totalPrice()).toBeGreaterThan(960);
  });

  it('아이템은 외형 정보만 갖는다 (능력치·확률 필드 금지)', () => {
    for (const item of ITEMS) {
      expect(Object.keys(item).sort()).toEqual(['asset', 'id', 'name', 'price', 'slot']);
    }
  });
});

describe('새 학생', () => {
  it('나무 빗자루 하나를 가지고 시작한다', () => {
    const doc = newDoc();
    expect(ownsItem(doc, STARTER_ITEM_ID)).toBe(true);
    expect(isEquipped(doc, STARTER_ITEM_ID)).toBe(true);
    expect(balanceOf(doc)).toBe(0);
  });

  it('나머지 슬롯은 비어 있다', () => {
    const worn = equippedItems(newDoc());
    expect(worn[0]).toBe(getItem(STARTER_ITEM_ID));
    expect(worn.slice(1).every((x) => x === null)).toBe(true);
  });
});

describe('사기', () => {
  it('별가루가 모자라면 못 산다. 얼마나 모자란지 알려 준다', () => {
    const doc = newDoc(30);
    const res = buyItem(doc, 'item-1'); // 40
    expect(res.status).toBe(BUY_RESULT.NOT_ENOUGH);
    expect(res.shortBy).toBe(10);
    expect(ownsItem(doc, 'item-1')).toBe(false);
    expect(doc.totals.stardustSpent).toBe(0);
  });

  it('사면 잔액이 줄고 바로 착용된다', () => {
    const doc = newDoc(100);
    const res = buyItem(doc, 'item-1');
    expect(res.status).toBe(BUY_RESULT.OK);
    expect(balanceOf(doc)).toBe(60);
    expect(ownsItem(doc, 'item-1')).toBe(true);
    expect(isEquipped(doc, 'item-1')).toBe(true);
  });

  it('누적 별가루(기록)는 줄지 않는다', () => {
    const doc = newDoc(100);
    buyItem(doc, 'item-1');
    expect(doc.totals.stardust).toBe(100);
    expect(doc.totals.stardustSpent).toBe(40);
  });

  it('같은 물건을 두 번 사지 않는다', () => {
    const doc = newDoc(200);
    buyItem(doc, 'item-1');
    const again = buyItem(doc, 'item-1');
    expect(again.status).toBe(BUY_RESULT.ALREADY);
    expect(doc.totals.stardustSpent).toBe(40);
  });

  it('없는 물건은 살 수 없다', () => {
    expect(buyItem(newDoc(9999), 'item-99').status).toBe(BUY_RESULT.UNKNOWN);
  });

  it('잔액보다 많이 쓸 수 없다 (전부 사 보기)', () => {
    const doc = newDoc(totalPrice());
    for (const item of ITEMS) buyItem(doc, item.id);
    expect(balanceOf(doc)).toBe(0);
    expect(collectionProgress(doc, ITEMS)).toEqual({ owned: ITEMS.length, total: ITEMS.length });
  });
});

describe('착용', () => {
  it('같은 슬롯은 하나만 착용된다', () => {
    const doc = newDoc(200);
    buyItem(doc, 'item-1');
    buyItem(doc, 'item-2');
    expect(isEquipped(doc, 'item-2')).toBe(true);
    expect(isEquipped(doc, 'item-1')).toBe(false);
    toggleEquip(doc, 'item-1');
    expect(isEquipped(doc, 'item-1')).toBe(true);
    expect(isEquipped(doc, 'item-2')).toBe(false);
  });

  it('착용 중인 것을 다시 고르면 벗는다', () => {
    const doc = newDoc(200);
    buyItem(doc, 'item-7');
    toggleEquip(doc, 'item-7');
    expect(doc.equipped.pin).toBeNull();
  });

  it('빗자루는 벗을 수 없다', () => {
    const doc = newDoc();
    toggleEquip(doc, STARTER_ITEM_ID);
    expect(doc.equipped.broom).toBe(STARTER_ITEM_ID);
  });

  it('가지고 있지 않은 물건은 착용할 수 없다', () => {
    const doc = newDoc();
    toggleEquip(doc, 'item-9');
    expect(doc.equipped.friend).toBeNull();
  });

  it('동물 친구는 지도에 내보낼 수 있게 따로 꺼내 온다', () => {
    const doc = newDoc(200);
    expect(friendOf(doc)).toBeNull();
    buyItem(doc, 'item-10');
    expect(friendOf(doc)).toBe(ITEM_BY_ID['item-10']);
  });
});

describe('예전 저장본 채우기 (ensureDecor)', () => {
  it('꾸미기 필드가 없던 문서도 열린다', () => {
    const old = { totals: { stardust: 50 } };
    ensureDecor(old);
    expect(old.items).toEqual([STARTER_ITEM_ID]);
    expect(old.equipped.broom).toBe(STARTER_ITEM_ID);
    expect(old.equipped.friend).toBeNull();
    expect(old.totals.stardustSpent).toBe(0);
    expect(balanceOf(old)).toBe(50);
  });

  it('이미 있는 값을 덮어쓰지 않는다', () => {
    const doc = newDoc(300);
    buyItem(doc, 'item-3');
    ensureDecor(doc);
    expect(doc.equipped.cape).toBe('item-3');
    expect(doc.totals.stardustSpent).toBe(70);
  });

  it('잔액은 0 아래로 내려가지 않는다', () => {
    expect(balanceOf({ totals: { stardust: 10, stardustSpent: 40 } })).toBe(0);
  });
});
