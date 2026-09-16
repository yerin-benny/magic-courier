// 배송별 유형 구성 (spec 4-1). 고정 데이터다. 무작위 5개 뽑기를 쓰지 않는다.
//
// 한 회차 4배송 20문제에 일곱 유형이 두세 번씩 돌도록 배송마다 구성을 다르게 고정한다.
// 20문제 기준 A 3, B 2, C 3, D 2, E 2, F 2, G 2, 문장제 4.
//
// 슬롯 표기
//   'A'~'G'         해당 유형 생성기
//   { word: 1 }     문장제 그룹 1 (답이 자연수) — 배송 1, 3
//   { word: 2 }     문장제 그룹 2 (답이 분수여도 됨) — 배송 2, 4
//
// 특별 배송(7문제)은 해당 배송 구성 뒤에 A, F 를 하나씩 덧붙인다.

export const WORD_GROUP_1 = Object.freeze({ word: 1 });
export const WORD_GROUP_2 = Object.freeze({ word: 2 });

export const DELIVERY_PLANS = Object.freeze([
  Object.freeze(['A', 'B', 'D', 'G', WORD_GROUP_1]), // 배송 1
  Object.freeze(['A', 'C', 'E', 'F', WORD_GROUP_2]), // 배송 2
  Object.freeze(['B', 'C', 'D', 'G', WORD_GROUP_1]), // 배송 3
  Object.freeze(['A', 'E', 'F', 'C', WORD_GROUP_2]), // 배송 4
]);

export const SPECIAL_EXTRA = Object.freeze(['A', 'F']);

export const DELIVERIES_PER_ROUND = DELIVERY_PLANS.length; // 4
export const PROBLEMS_PER_DELIVERY = 5;
export const PROBLEMS_PER_SPECIAL_DELIVERY = PROBLEMS_PER_DELIVERY + SPECIAL_EXTRA.length; // 7

/** 회차 내 배송 순번(0~3)에 맞는 슬롯 목록. special이면 A, F 를 덧붙인다. */
export function planFor(deliveryIndex, { special = false } = {}) {
  const base = DELIVERY_PLANS[deliveryIndex % DELIVERIES_PER_ROUND];
  return special ? [...base, ...SPECIAL_EXTRA] : [...base];
}

export function isWordSlot(slot) {
  return typeof slot === 'object' && slot !== null && 'word' in slot;
}
