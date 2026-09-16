// 학생 문서 (spec 10장). 저장 계층에 그대로 실리는 평범한 객체다.
//
// 필드
//   id, schoolId, nickname, nicknameNormalized, pinHash
//   characterId (1~4), items (보유 꾸미기 아이템 id 목록), equipped (슬롯별 착용)
//   postOffice (나의 마법 우체국 이름. 학교 이름으로 자동으로 만든다. 예: "해운대초 마법 우체국")
//   roundsCompleted, route ({ countries, position, startedAt } 또는 null),
//   visited (방문 국가 id 순서),
//   totals { problems, deliveries, stardust, stardustSpent, accurateDeliveries, rankedDeliveries }
//   typeStats { A..G, W: { solved, firstTry } }   유형별 정답률 = firstTry / solved (A~G 전부)
//   firstTryRate (전체 첫 시도 정답률, 0~1)
//   ranking { date: 'YYYY-MM-DD', count }         당일 랭킹 반영 건수 (KST 기준, 서버가 최종 판정)
//   lastRankVerdict { reason, counted, at }        마지막 배송의 랭킹 반영 결과
//   lastDeliveryAt (ISO 문자열 또는 null)
//   pendingPassport
//   createdAt, updatedAt
//   version (문서 형식 버전)

import { studentIdOf } from '../storage/StorageAdapter.js';
import { normalizeNickname } from '../data/nicknameFilter.js';
import { judgeDelivery, rolloverDaily } from './ranking.js';
import { SLOT_IDS, STARTER_ITEM_ID } from '../data/decorItems.js';
import { SCHOOL_BY_ID, shortSchoolName } from '../data/schools.js';

export const DOC_VERSION = 1;
export const PROBLEM_TYPES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'W']);

export function emptyTypeStats() {
  return Object.fromEntries(PROBLEM_TYPES.map((t) => [t, { solved: 0, firstTry: 0 }]));
}

/**
 * 나의 마법 우체국 이름. 학교 이름에서 만든다. 예: "해운대초 마법 우체국".
 * 고르는 화면은 없다 (2026-09-16 출발 지역 선택 삭제). 학교를 이미 골랐으니 그것으로 정한다.
 * 모르는 학교면 "마법 우체국".
 */
export function postOfficeName(schoolId) {
  const school = SCHOOL_BY_ID[schoolId];
  const short = school ? shortSchoolName(school.name) : '';
  return short ? `${short} 마법 우체국` : '마법 우체국';
}

/**
 * 우체국 이름은 학교에서 나오는 값이라 저장본을 열 때마다 다시 만든다.
 * 예전 저장본(지역 + 닉네임으로 만들던 이름)도 이 자리에서 새 이름으로 바뀐다.
 */
export function refreshDerived(doc) {
  if (!doc) return doc;
  doc.postOffice = postOfficeName(doc.schoolId);
  return doc;
}

export function createStudentDoc({ schoolId, nickname, pinHash, now = new Date() }) {
  const nicknameNormalized = normalizeNickname(nickname);
  return {
    version: DOC_VERSION,
    id: studentIdOf(schoolId, nicknameNormalized),
    schoolId,
    nickname: String(nickname).trim(),
    nicknameNormalized,
    pinHash,
    characterId: null,
    items: [STARTER_ITEM_ID], // 꾸미기 아이템. 빗자루 하나는 처음부터 준다
    equipped: { ...Object.fromEntries(SLOT_IDS.map((slot) => [slot, null])), broom: STARTER_ITEM_ID },
    postOffice: postOfficeName(schoolId),
    roundsCompleted: 0,
    route: null,
    visited: [],
    totals: { problems: 0, deliveries: 0, stardust: 0, stardustSpent: 0, accurateDeliveries: 0, rankedDeliveries: 0 },
    typeStats: emptyTypeStats(),
    firstTryRate: 0,
    ranking: { date: null, count: 0 },
    lastDeliveryAt: null,
    pendingPassport: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * 온보딩이 끝났는가. 고를 것은 캐릭터 하나뿐이다.
 * [변경 2026-09-16] 사용자 요청으로 출발 지역 선택 화면을 없앴다.
 * 우체국 이름은 학교의 지역에서 자동으로 만든다.
 */
export function isOnboarded(doc) {
  return !!doc && !!doc.characterId;
}

/** 유형별 정답률(첫 시도 기준). solved 가 0이면 null */
export function accuracyByType(doc) {
  const out = {};
  for (const t of PROBLEM_TYPES) {
    const s = doc.typeStats?.[t] ?? { solved: 0, firstTry: 0 };
    out[t] = s.solved ? s.firstTry / s.solved : null;
  }
  return out;
}

/** 배송 결과(세션 summary)를 통계 필드에 더한다. gameState.completeDelivery 가 부른다. */
export function applyDeliveryStats(doc, summary, now = new Date()) {
  for (const r of summary.results) {
    if (!r) continue;
    const t = doc.typeStats[r.type] ?? (doc.typeStats[r.type] = { solved: 0, firstTry: 0 });
    t.solved += 1;
    if (r.firstTry) t.firstTry += 1;
  }
  const solved = PROBLEM_TYPES.reduce((s, t) => s + (doc.typeStats[t]?.solved ?? 0), 0);
  const firstTry = PROBLEM_TYPES.reduce((s, t) => s + (doc.typeStats[t]?.firstTry ?? 0), 0);
  doc.firstTryRate = solved ? firstTry / solved : 0;

  doc.ranking = rolloverDaily(doc.ranking, now);
  doc.lastDeliveryAt = now.toISOString();
  doc.updatedAt = now.toISOString();

  // 랭킹 반영 여부는 서버(Cloud Functions)가 정한다. 여기서 내는 값은 화면에 바로 보여 주기
  // 위한 예측이고, 서버 응답이 오면 applyRankingVerdict 가 덮어쓴다.
  const verdict = judgeDelivery({
    accurateBonus: summary.accurateBonus,
    elapsedSeconds: summary.elapsedSeconds ?? Infinity,
    todayCount: doc.ranking.count,
  });
  applyRankingVerdict(doc, verdict, now);
  return verdict;
}

/**
 * 랭킹 판정 결과를 문서에 반영한다.
 * 같은 배송을 서버 응답으로 다시 반영할 때 두 번 세지 않도록, 이전 예측과 다를 때만 조정한다.
 */
export function applyRankingVerdict(doc, verdict, now = new Date(), previous = null) {
  doc.ranking = rolloverDaily(doc.ranking, now);
  const was = previous?.counted ?? false;
  const delta = (verdict.counted ? 1 : 0) - (was ? 1 : 0);
  if (delta !== 0) {
    doc.ranking.count = Math.max(0, doc.ranking.count + delta);
    doc.totals.rankedDeliveries = Math.max(0, (doc.totals.rankedDeliveries ?? 0) + delta);
  }
  doc.lastRankVerdict = { reason: verdict.reason, counted: verdict.counted, at: now.toISOString() };
  doc.updatedAt = now.toISOString();
  return doc.lastRankVerdict;
}
