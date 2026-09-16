// Cloud Functions (STEP 11). 학교 랭킹에 관한 판정은 전부 여기서 한다 (spec 9-1).
//
// 왜 서버가 판정하는가
//   학교 랭킹은 한 명이 학교 전체를 부풀리고 다른 학교를 자극한다.
//   클라이언트가 "배송 1건 완료"를 스스로 올리면 콘솔 한 줄로 조작된다.
//
// 문서 나눔
//   students/{uid}              학생 본인이 읽고 쓴다. 게임 진행 상태.
//   students/{uid}/state/recent 최근 60문항 제외 큐.
//   students/{uid}/deliveries/* 배송 시작 시각. 서버만 쓴다. 45초 판정의 기준.
//   credentials/{uid}           PIN 해시, 학교 id, 당일 반영 건수. 서버만 읽고 쓴다.
//   schools/{schoolId}          학교별 주간·누적 배송량. 서버만 쓴다.
//   aggregates/ranking          화면이 읽는 집계 문서 하나 (spec 9-3).
//
// 모든 callable 은 App Check 를 요구한다.

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { setGlobalOptions } from 'firebase-functions/v2';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { judgeDelivery, dayKeyOf, weekKeyOf, RANK_REASON } from './lib/ranking.js';

initializeApp();
const db = getFirestore();

setGlobalOptions({ region: 'asia-northeast3', maxInstances: 10 });

const schools = JSON.parse(readFileSync(new URL('./lib/schools.json', import.meta.url), 'utf8')).schools;
const SCHOOL_BY_ID = Object.fromEntries(schools.map((s) => [s.id, s]));

/** 배송 1건의 문제 수 (일반 5, 특별 7). spec 3장 */
const DELIVERY_SIZES = [5, 7];
const ACCURATE_BONUS_MIN = 3;
/** 집계 문서 수동 갱신 쿨다운 (분). spec 9-3 */
const REFRESH_COOLDOWN_MINUTES = 30;
/** 집계 문서에 담는 학교 수 상한. 문서 1MB 를 넘기지 않기 위한 안전선. */
const TABLE_LIMIT = 1000;

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/** 클라이언트가 보낸 PIN 해시를 서버 페퍼로 한 번 더 해싱한다. 원본을 저장하지 않는다. */
const serverPinHash = (clientHash) => sha256(`${clientHash}:${process.env.PIN_PEPPER ?? ''}`);

const normalizeNickname = (nickname) => String(nickname ?? '').trim().toLowerCase();

function requireAuth(request) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다');
  return uid;
}

// ---------------------------------------------------------------- 로그인

/**
 * 학교 + 닉네임 + PIN 으로 로그인하고 커스텀 토큰을 발급한다.
 * 학생 문서(students/{uid})는 만들지 않는다. 문서 모양은 클라이언트(studentDoc.js)가 갖고 있고,
 * 여기서 한 벌 더 만들면 두 곳이 어긋난다. 로그인 직후 클라이언트가 만들어 저장한다.
 *
 * 입력  { schoolId, nickname, pinHash }
 * 출력  { status: 'ok' | 'created', token, uid, studentId }
 *       { status: 'wrongPin' | 'invalidSchool' | 'invalidNickname', message }
 */
export const loginStudent = onCall({ enforceAppCheck: true }, async (request) => {
  const { schoolId, nickname, pinHash } = request.data ?? {};
  if (!SCHOOL_BY_ID[schoolId]) return { status: 'invalidSchool', message: '학교를 목록에서 골라 주세요.' };
  const nick = String(nickname ?? '').trim();
  // 길이는 클라이언트(nicknameFilter.js)와 같은 2~8자로 맞춘다. 욕설 필터는 클라이언트에만 둔다
  // (닉네임은 어디에도 공개되지 않아 서버까지 막을 필요가 없다).
  if (nick.length < 2 || nick.length > 8) return { status: 'invalidNickname', message: '닉네임은 2~8글자로 지어 주세요.' };
  if (!/^[0-9a-f]{64}$/.test(String(pinHash ?? ''))) throw new HttpsError('invalid-argument', '비밀번호 형식이 올바르지 않습니다');

  const studentId = `${schoolId}:${normalizeNickname(nick)}`;
  const uid = sha256(studentId);
  const ref = db.collection('credentials').doc(uid);
  const snap = await ref.get();
  const hash = serverPinHash(pinHash);

  let status;
  if (snap.exists) {
    if (snap.data().pinHash !== hash) return { status: 'wrongPin', message: '비밀번호가 달라요. 다시 확인해 주세요.' };
    status = 'ok';
    await ref.update({ lastLoginAt: FieldValue.serverTimestamp() });
  } else {
    status = 'created';
    await ref.set({
      studentId,
      schoolId,
      nickname: nick,
      pinHash: hash,
      rankDate: null,
      rankCount: 0,
      countedEver: false,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });
  }

  const token = await getAuth().createCustomToken(uid, { schoolId });
  return { status, token, uid, studentId };
});

// ---------------------------------------------------------------- 배송 판정

/**
 * 배송 시작을 등록한다. 시작 시각은 서버 시계로 찍는다.
 * 클라이언트가 보낸 경과 시간은 믿지 않는다.
 *
 * 출력 { deliveryId }
 */
export const startDelivery = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = requireAuth(request);
  const col = db.collection('students').doc(uid).collection('deliveries');

  // 짧은 시간에 배송을 무더기로 여는 것을 막는다. 정상 플레이는 배송 1건에 최소 45초다.
  const since = new Date(Date.now() - 60 * 1000);
  const recent = await col.where('startedAt', '>', since).count().get();
  if (recent.data().count >= 3) throw new HttpsError('resource-exhausted', '잠시 뒤에 다시 시작해 주세요');

  const ref = col.doc();
  await ref.set({
    startedAt: FieldValue.serverTimestamp(),
    deliveryIndex: Number(request.data?.deliveryIndex ?? 0),
    status: 'open',
  });
  return { deliveryId: ref.id };
});

/**
 * 배송 완료를 판정하고, 반영 대상이면 학교 배송량을 올린다.
 *
 * 입력  { deliveryId, accurateBonus, firstTryCount, total }
 * 출력  { verdict: { counted, reason, message } }
 */
export const completeDelivery = onCall({ enforceAppCheck: true }, async (request) => {
  const uid = requireAuth(request);
  const { deliveryId, firstTryCount, total } = request.data ?? {};
  if (!deliveryId) throw new HttpsError('invalid-argument', '배송 id 가 없습니다');
  if (!DELIVERY_SIZES.includes(Number(total))) throw new HttpsError('invalid-argument', '배송 문제 수가 올바르지 않습니다');
  const solvedFirstTry = Number(firstTryCount);
  if (!Number.isInteger(solvedFirstTry) || solvedFirstTry < 0 || solvedFirstTry > Number(total)) {
    throw new HttpsError('invalid-argument', '첫 시도 정답 수가 올바르지 않습니다');
  }
  // 보너스 여부는 클라이언트 말이 아니라 첫 시도 정답 수로 서버가 다시 계산한다.
  const accurateBonus = solvedFirstTry >= ACCURATE_BONUS_MIN;

  const deliveryRef = db.collection('students').doc(uid).collection('deliveries').doc(deliveryId);
  const credRef = db.collection('credentials').doc(uid);
  const studentRef = db.collection('students').doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const [deliverySnap, credSnap] = await Promise.all([tx.get(deliveryRef), tx.get(credRef)]);
    if (!deliverySnap.exists) throw new HttpsError('not-found', '배송 기록이 없습니다');
    const delivery = deliverySnap.data();
    if (delivery.status !== 'open') throw new HttpsError('failed-precondition', '이미 처리된 배송입니다');
    if (!credSnap.exists) throw new HttpsError('failed-precondition', '계정 정보가 없습니다');
    const cred = credSnap.data();

    const now = new Date();
    const startedAt = delivery.startedAt?.toDate?.() ?? now;
    const elapsedSeconds = (now.getTime() - startedAt.getTime()) / 1000;

    const today = dayKeyOf(now);
    const todayCount = cred.rankDate === today ? cred.rankCount ?? 0 : 0;
    const verdict = judgeDelivery({ accurateBonus, elapsedSeconds, todayCount });

    // 트랜잭션은 읽기를 모두 끝낸 뒤에 써야 한다. 학교 문서 읽기를 여기서 미리 한다.
    const week = weekKeyOf(now);
    const schoolRef = verdict.counted ? db.collection('schools').doc(cred.schoolId) : null;
    const schoolSnap = schoolRef ? await tx.get(schoolRef) : null;

    tx.update(deliveryRef, {
      status: 'done',
      finishedAt: FieldValue.serverTimestamp(),
      elapsedSeconds,
      firstTryCount: solvedFirstTry,
      total: Number(total),
      counted: verdict.counted,
      reason: verdict.reason,
    });

    const nextCount = todayCount + (verdict.counted ? 1 : 0);
    tx.update(credRef, { rankDate: today, rankCount: nextCount, countedEver: cred.countedEver || verdict.counted });
    // 학생 문서의 ranking 은 서버만 쓴다 (보안 규칙에서 클라이언트 쓰기를 막는다)
    tx.set(
      studentRef,
      {
        ranking: { date: today, count: nextCount },
        lastRankVerdict: { counted: verdict.counted, reason: verdict.reason, at: now.toISOString() },
      },
      { merge: true },
    );

    if (verdict.counted) {
      const school = SCHOOL_BY_ID[cred.schoolId];
      const prev = schoolSnap.exists ? schoolSnap.data() : null;
      const weekly = prev && prev.weekKey === week ? (prev.weekly ?? 0) + 1 : 1;
      const newStudent = !cred.countedEver;
      tx.set(
        schoolRef,
        {
          schoolId: cred.schoolId,
          name: school?.name ?? cred.schoolId,
          region: school?.region ?? '',
          weekKey: week,
          weekly,
          total: (prev?.total ?? 0) + 1,
          students: (prev?.students ?? 0) + (newStudent ? 1 : 0),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return verdict;
  });

  return { verdict: result };
});

// ---------------------------------------------------------------- 집계 문서

/**
 * 학교 문서를 모아 집계 문서 하나로 만든다 (spec 9-3).
 * 화면은 이 문서 하나만 읽는다. 학교 전체를 매번 정렬해 읽지 않는다.
 */
async function buildRankingSummary() {
  const week = weekKeyOf(new Date());
  const snap = await db.collection('schools').get();
  const rows = snap.docs.map((d) => {
    const s = d.data();
    const weekly = s.weekKey === week ? (s.weekly ?? 0) : 0; // 주가 바뀌었으면 0으로 보여 준다
    const students = s.students ?? 0;
    return {
      schoolId: s.schoolId ?? d.id,
      name: s.name ?? d.id,
      region: s.region ?? '',
      weekly,
      total: s.total ?? 0,
      students,
      average: students ? Math.round(((s.total ?? 0) / students) * 10) / 10 : 0,
    };
  });

  rows.sort((a, b) => b.weekly - a.weekly || b.total - a.total || a.name.localeCompare(b.name, 'ko'));
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });

  const summary = {
    weekKey: week,
    schoolCount: rows.length,
    top: rows.slice(0, 10),
    table: rows.slice(0, TABLE_LIMIT),
    updatedAt: FieldValue.serverTimestamp(),
    updatedAtIso: new Date().toISOString(),
  };
  await db.collection('aggregates').doc('ranking').set(summary);
  return { schoolCount: rows.length, weekKey: week };
}

/** 1시간마다 자동 갱신 */
export const refreshRankingSummaryScheduled = onSchedule(
  { schedule: 'every 60 minutes', timeZone: 'Asia/Seoul' },
  async () => {
    const res = await buildRankingSummary();
    logger.info('랭킹 집계 갱신', res);
  },
);

/** 수동 갱신. 30분 쿨다운을 서버가 본다. */
export const refreshRankingSummary = onCall({ enforceAppCheck: true }, async (request) => {
  requireAuth(request);
  const ref = db.collection('aggregates').doc('ranking');
  const snap = await ref.get();
  if (snap.exists) {
    const updatedAt = snap.data().updatedAt?.toDate?.();
    if (updatedAt) {
      const minutes = (Date.now() - updatedAt.getTime()) / 60000;
      if (minutes < REFRESH_COOLDOWN_MINUTES) {
        return { refreshed: false, waitMinutes: Math.ceil(REFRESH_COOLDOWN_MINUTES - minutes) };
      }
    }
  }
  const res = await buildRankingSummary();
  return { refreshed: true, ...res };
});

export { RANK_REASON };
