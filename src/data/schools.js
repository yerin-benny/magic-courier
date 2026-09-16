// 학교 목록 (spec 8-2). 자유 입력을 막고 이 고정 목록에서만 고르게 한다.
// 지금은 부산 초등학교 20개 임시 JSON 이고, 데이터 출처는 아직 미정이다.
//
// auth.js 와 studentDoc.js 가 둘 다 학교를 봐야 해서 데이터만 여기로 떼어 냈다
// (auth → studentDoc 순환 import 를 피하려는 목적).

import schoolsJson from './schools.json';

export const SCHOOLS = Object.freeze(schoolsJson.schools);
export const SCHOOL_BY_ID = Object.freeze(Object.fromEntries(SCHOOLS.map((s) => [s.id, s])));

/** "해운대초등학교" → "해운대초". 초등학교가 아니면 그대로 둔다. */
export function shortSchoolName(name) {
  return String(name ?? '').replace(/초등학교$/, '초');
}
