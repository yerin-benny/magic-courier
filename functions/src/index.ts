import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret, defineInt } from 'firebase-functions/params';
import { CourierService, UserError } from '../../server/service';
import { FirestoreStore } from './firestore-store';
import type { Command } from '../../server/models';
initializeApp();
const pepper = defineSecret('PIN_PEPPER');
const dailyCap = defineInt('DAILY_RANKING_CAP', { default: 25 });
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const store = new FirestoreStore();
const options = {
  region: 'asia-northeast3',
  enforceAppCheck: !isEmulator,
  secrets: [pepper],
  maxInstances: 10,
};
export const courierLogin = onCall(options, async (request) => {
  try {
    const service = new CourierService(store, pepper.value(), () => Date.now(), dailyCap.value());
    const uid = await service.authenticate(request.data ?? {}, request.rawRequest.ip ?? 'unknown');
    return { token: await getAuth().createCustomToken(uid) };
  } catch (e) {
    if (e instanceof UserError) throw new HttpsError('invalid-argument', e.message);
    throw new HttpsError('internal', '로그인을 다시 시도해 주세요.');
  }
});
export const courierCommand = onCall(options, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', '로그인이 필요해요.');
  const allowed: Command[] = [
    'state',
    'setup',
    'start',
    'answer',
    'finish',
    'nextRound',
    'buyItem',
    'equipItem',
    'leaderboard',
    'refreshLeaderboard',
  ];
  if (!allowed.includes(request.data?.command))
    throw new HttpsError('invalid-argument', '알 수 없는 요청이에요.');
  try {
    return await new CourierService(
      store,
      pepper.value(),
      () => Date.now(),
      dailyCap.value(),
    ).execute(request.auth.uid, request.data.command, request.data.data ?? {});
  } catch (e) {
    if (e instanceof UserError) throw new HttpsError('invalid-argument', e.message);
    throw new HttpsError('internal', '요청을 다시 시도해 주세요.');
  }
});
export const refreshRankings = onSchedule(
  { schedule: '0 * * * *', timeZone: 'Asia/Seoul', region: 'asia-northeast3' },
  async () => {
    await new CourierService(store, 'unused').refresh(true);
  },
);
