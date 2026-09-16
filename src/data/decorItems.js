// 꾸미기 아이템 데이터 (spec 화면 11, 2차 개발 "빗자루·캐릭터 꾸미기").
// 별가루로 살 수 있는 것들이다. 전부 외형 전용이고 문제·채점·보상에 아무 영향을 주지 않는다.
// 게임 요소가 문제 풀이보다 앞서면 안 되므로, 여기에 능력치나 확률을 주는 물건을 넣지 않는다.
//
// 자산은 assets/manifest.js 의 brooms(5종), items(12종)이다. 원본 시트 3, 4.
// items 는 시트 순서 그대로: 모자 2 · 망토 2 · 가방 2 · 핀 2 · 동물 친구 4.
//
// 값 정하기
//   첫 시도 정답 1문제 = 별가루 3, 배송 1건(5문제) 최대 15, 한 회차(4배송) 최대 60.
//   가장 싼 물건을 40으로 두어 첫 회차 안에 하나는 살 수 있게 했고,
//   전부 모으려면 1540 별가루(약 26회차)가 든다. 여권 2권(16회차)보다 길게 잡았다.

export const SLOTS = Object.freeze([
  { id: 'broom', name: '빗자루', hint: '타고 다닐 빗자루예요' },
  { id: 'hat', name: '모자', hint: '머리에 쓸 모자예요' },
  { id: 'cape', name: '망토', hint: '어깨에 두를 망토예요' },
  { id: 'bag', name: '가방', hint: '물건을 담을 가방이에요' },
  { id: 'pin', name: '핀', hint: '가슴에 달 장식이에요' },
  { id: 'friend', name: '동물 친구', hint: '함께 날아갈 친구예요' },
]);

export const SLOT_IDS = Object.freeze(SLOTS.map((s) => s.id));

/** 처음부터 가지고 있는 물건. 빗자루가 없으면 날 수 없으니 하나는 준다. */
export const STARTER_ITEM_ID = 'broom-1';

export const ITEMS = Object.freeze([
  // ---- 빗자루 (단계별 낱장 PNG, 1단계에서 5단계로 갈수록 화려해진다) ----
  { id: 'broom-1', slot: 'broom', name: '나무 빗자루', asset: 'brooms.broom-1', price: 0 },
  { id: 'broom-2', slot: 'broom', name: '금빛 빗자루', asset: 'brooms.broom-2', price: 60 },
  { id: 'broom-3', slot: 'broom', name: '구름 빗자루', asset: 'brooms.broom-3', price: 120 },
  { id: 'broom-4', slot: 'broom', name: '초승달 빗자루', asset: 'brooms.broom-4', price: 200 },
  { id: 'broom-5', slot: 'broom', name: '별빛 빗자루', asset: 'brooms.broom-5', price: 320 },

  // ---- 모자 ----
  { id: 'item-1', slot: 'hat', name: '뾰족 마법사 모자', asset: 'items.item-1', price: 40 },
  { id: 'item-2', slot: 'hat', name: '동그란 배달 모자', asset: 'items.item-2', price: 40 },

  // ---- 망토 ----
  { id: 'item-3', slot: 'cape', name: '후드 망토', asset: 'items.item-3', price: 70 },
  { id: 'item-4', slot: 'cape', name: '브로치 망토', asset: 'items.item-4', price: 70 },

  // ---- 가방 ----
  { id: 'item-5', slot: 'bag', name: '가죽 배달 가방', asset: 'items.item-5', price: 70 },
  { id: 'item-6', slot: 'bag', name: '바구니 가방', asset: 'items.item-6', price: 70 },

  // ---- 핀 ----
  { id: 'item-7', slot: 'pin', name: '별 핀', asset: 'items.item-7', price: 40 },
  { id: 'item-8', slot: 'pin', name: '달 핀', asset: 'items.item-8', price: 40 },

  // ---- 동물 친구 (지도에서 옆에 같이 날아간다) ----
  { id: 'item-9', slot: 'friend', name: '부엉이 친구', asset: 'items.item-9', price: 100 },
  { id: 'item-10', slot: 'friend', name: '고양이 친구', asset: 'items.item-10', price: 100 },
  { id: 'item-11', slot: 'friend', name: '고슴도치 친구', asset: 'items.item-11', price: 100 },
  { id: 'item-12', slot: 'friend', name: '작은 새 친구', asset: 'items.item-12', price: 100 },
]);

export const ITEM_BY_ID = Object.freeze(Object.fromEntries(ITEMS.map((i) => [i.id, i])));

export function getItem(id) {
  return ITEM_BY_ID[id] ?? null;
}

export function itemsOfSlot(slotId) {
  return ITEMS.filter((i) => i.slot === slotId);
}

/** 전부 모으는 데 드는 별가루 */
export function totalPrice() {
  return ITEMS.reduce((sum, i) => sum + i.price, 0);
}
