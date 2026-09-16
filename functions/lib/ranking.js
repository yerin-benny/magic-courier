// 이 파일은 자동 복사본이다. 고치지 말 것. 원본: src/game/ranking.js
// 다시 만들려면: npm run sync:functions
// 학교 랭킹 반영 판정 규칙 (spec 9-1). DOM 도 Firebase 도 모르는 순수 함수다.
//
// 이 파일이 규칙의 원본이다. Cloud Functions 는 배포 경계가 달라 같은 파일을 import 할 수
// 없으므로 `npm run sync:ranking` 이 functions/lib/ranking.js 로 복사하고,
// `npm run verify:ranking` 이 두 파일이 어긋나지 않았는지 확인한다.
//
// 판정은 최종적으로 서버(Cloud Functions)가 한다. 클라이언트는 같은 함수를 화면 표시용으로만
// 미리 돌려 보고, 서버가 돌려준 결과가 오면 그것으로 덮어쓴다.
//
// 날짜 경계는 한국 시간(KST, UTC+9) 기준이다. UTC 로 자르면 아침 9시 이전에 푼 배송이
// 전날로 잡힌다.

export const KST_OFFSET_MINUTES = 9 * 60;

/**
 * 랭킹 반영 규칙.
 *   minDeliverySeconds  배송 1건 최소 소요 시간. 미만이면 랭킹 미반영 (개인 기록은 유지)
 *   dailyLimit          학생 1명당 하루 랭킹 반영 상한. null 이면 무제한
 *
 * [확정 2026-09-16] 사용자 결정으로 하루 상한을 두지 않는다(null).
 * spec 9-1 의 20~30건 조항은 한 학생이 학교 순위를 혼자 부풀리는 것을 막기 위한 것이라
 * 판정 장치는 그대로 두고 기본값만 무제한으로 둔다. 숫자를 넣으면 바로 켜진다.
 */
export const RANKING_RULES = Object.freeze({
  minDeliverySeconds: 45,
  dailyLimit: null,
});

export const RANK_REASON = Object.freeze({
  OK: 'ok',
  NOT_ACCURATE: 'notAccurate',
  TOO_FAST: 'tooFast',
  DAILY_LIMIT: 'dailyLimit',
});

/** 학생에게 보여 줄 문구. 못 채운 경우에도 부정적으로 쓰지 않는다 (spec 7장). */
export const RANK_MESSAGES = Object.freeze({
  [RANK_REASON.OK]: '학교 배송량에 더했어요!',
  [RANK_REASON.NOT_ACCURATE]: '개인 기록에 담았어요. 첫 시도 정답 3개를 채우면 학교 배송량에도 더해져요.',
  [RANK_REASON.TOO_FAST]: '개인 기록에 담았어요. 천천히 푼 배송만 학교 배송량에 더해져요.',
  [RANK_REASON.DAILY_LIMIT]: '오늘 학교 배송량은 가득 찼어요. 개인 기록과 세계여행은 그대로 이어져요.',
});

/** Date → KST 기준 연·월·일 */
function kstDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return new Date(d.getTime() + KST_OFFSET_MINUTES * 60 * 1000);
}

/** KST 기준 'YYYY-MM-DD'. 하루 상한을 세는 단위다. */
export function dayKeyOf(date = new Date()) {
  return kstDate(date).toISOString().slice(0, 10);
}

/**
 * KST 기준 ISO 주 키 'YYYY-Www' (월요일 시작). 주간 배송량을 비우는 단위다.
 * 연말연시에 12월 31일이 다음 해 1주가 되는 ISO 규칙을 그대로 따른다.
 */
export function weekKeyOf(date = new Date()) {
  const d = kstDate(date);
  d.setUTCHours(0, 0, 0, 0);
  // ISO 주: 목요일이 속한 해가 그 주의 해다
  const day = d.getUTCDay() || 7; // 월=1 … 일=7
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const yearStart = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * 배송 1건이 학교 랭킹에 반영되는지 판정한다.
 *
 * @param {Object} p
 * @param {boolean} p.accurateBonus   5문제 중 첫 시도 정답 3개 이상 (spec 7장)
 * @param {number}  p.elapsedSeconds  배송 시작부터 완료까지 걸린 시간(초)
 * @param {number}  p.todayCount      오늘 이미 반영된 건수
 * @param {Object}  [p.rules]         RANKING_RULES 를 덮어쓸 값
 * @returns {{ counted: boolean, reason: string, message: string }}
 */
export function judgeDelivery({ accurateBonus, elapsedSeconds, todayCount = 0, rules = RANKING_RULES }) {
  const { minDeliverySeconds, dailyLimit } = { ...RANKING_RULES, ...rules };
  let reason = RANK_REASON.OK;
  if (!accurateBonus) reason = RANK_REASON.NOT_ACCURATE;
  else if (!(elapsedSeconds >= minDeliverySeconds)) reason = RANK_REASON.TOO_FAST;
  else if (dailyLimit !== null && dailyLimit !== undefined && todayCount >= dailyLimit) reason = RANK_REASON.DAILY_LIMIT;
  return { counted: reason === RANK_REASON.OK, reason, message: RANK_MESSAGES[reason] };
}

/** 하루가 바뀌었으면 당일 건수를 0으로 되돌린 새 값을 돌려준다. */
export function rolloverDaily(ranking, now = new Date()) {
  const today = dayKeyOf(now);
  if (!ranking || ranking.date !== today) return { date: today, count: 0 };
  return { date: ranking.date, count: ranking.count };
}
