// 배송 의뢰문 조합 데이터 (spec 12장).
// 출발지 20종, 목적지 20종, 물건 20종을 랜덤 조합한다. 국가별로 따로 쓰지 않는다.
// 배송 종류는 데이터로만 정의한다. 연출 차이는 2차. 지금은 일반 배송만 동작한다.

import { wordWithJosa } from '../core/josa.js';

export const ORIGINS = Object.freeze([
  '달빛 우체국', '구름 제과점', '별똥별 관측소', '마법 도서관', '은하수 정거장',
  '무지개 온실', '잠자는 숲 오두막', '바람의 등대', '꿀벌 농장', '유리 공방',
  '달팽이 우편함', '종이배 부두', '안개 골목 찻집', '별가루 창고', '하늘 정원',
  '마법 학교 기숙사', '고양이 골목 빵집', '눈꽃 마을 회관', '호수 위 물방앗간', '모래시계 탑',
]);

export const DESTINATIONS = Object.freeze([
  '시장 광장의 분수대', '마을 회관 앞', '언덕 위 풍차', '항구의 등대지기 집', '학교 운동장',
  '성벽 위 망루', '강가의 낚시터', '산꼭대기 관측소', '광장의 시계탑', '도서관 열람실',
  '온천 여관', '극장 무대 뒤', '동물 병원', '기차역 대합실', '꽃시장 골목',
  '박물관 정문', '다리 아래 뱃집', '공원의 벤치', '등대 꼭대기', '마을 우체통',
]);

export const ITEMS = Object.freeze([
  '생일 케이크', '마법 물약 한 병', '밀랍 봉인 편지', '리본 꾸러미', '꿀단지',
  '별가루 봉지', '모자 상자', '새 빗자루', '따뜻한 목도리', '씨앗 주머니',
  '지도 두루마리', '은방울 목걸이', '초콜릿 상자', '노래하는 오르골', '유리 구슬',
  '깃털 펜 세트', '작은 화분', '손뜨개 장갑', '마법 열쇠', '그림 액자',
]);

/** 배송 종류 (spec 12장). 문제 수는 5문제로 고정하고 연출만 바꾼다. 특별 배송만 7문제. */
export const DELIVERY_KINDS = Object.freeze({
  normal: { id: 'normal', name: '일반 배송', problems: 5, enabled: true },
  night: { id: 'night', name: '야간 배송', problems: 5, enabled: false }, // 밤 배경 (2차)
  rain: { id: 'rain', name: '비 오는 날 배송', problems: 5, enabled: false }, // (2차)
  secret: { id: 'secret', name: '비밀 배송', problems: 5, enabled: false }, // 도착 후 내용물 공개 (2차)
  animal: { id: 'animal', name: '동물 친구 배송', problems: 5, enabled: false }, // (2차)
  special: { id: 'special', name: '특별 배송', problems: 7, enabled: false }, // 낮은 확률, A·F 추가 (2차 연출)
});

/** 출발지·목적지·물건을 랜덤 조합해 의뢰문을 만든다. */
export function composeRequest(rng, { kind = 'normal' } = {}) {
  const origin = rng.pick(ORIGINS);
  const destination = rng.pick(DESTINATIONS);
  const item = rng.pick(ITEMS);
  return {
    kind: DELIVERY_KINDS[kind] ?? DELIVERY_KINDS.normal,
    origin,
    destination,
    item,
    text: `${origin}에서 ${destination}까지 ${wordWithJosa(item, '을/를')} 배달해 주세요.`,
  };
}
