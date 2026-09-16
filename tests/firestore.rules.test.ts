import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-magic-courier',
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'students/alice'), { nickname: '구름우편' });
    await setDoc(doc(ctx.firestore(), 'students/bob'), { nickname: '별빛우편' });
    await setDoc(doc(ctx.firestore(), 'schools/sample'), { total: 0 });
    await setDoc(doc(ctx.firestore(), 'leaderboardAggregates/current'), { top10: [] });
    await setDoc(doc(ctx.firestore(), 'credentials/secret'), { digest: 'private' });
    await setDoc(doc(ctx.firestore(), 'deliverySessions/test'), { answer: 'private' });
  });
});
afterAll(async () => {
  await env.cleanup();
});
it('본인만 읽기, 학생 목록·타인 문서 불가', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertSucceeds(getDoc(doc(db, 'students/alice')));
  await assertFails(getDoc(doc(db, 'students/bob')));
  await assertFails(getDocs(collection(db, 'students')));
});
it('서버 확정 필드 직접 수정 차단', async () => {
  const db = env.authenticatedContext('alice').firestore();
  for (const path of [
    'students/alice',
    'schools/sample',
    'leaderboardAggregates/current',
    'deliverySessions/test',
  ])
    await assertFails(setDoc(doc(db, path), { dust: 999, total: 999 }));
});
it('PIN·정답·세션 비공개, 집계 공개 범위', async () => {
  const db = env.authenticatedContext('alice').firestore();
  await assertFails(getDoc(doc(db, 'credentials/secret')));
  await assertFails(getDoc(doc(db, 'deliverySessions/test')));
  await assertSucceeds(getDoc(doc(db, 'leaderboardAggregates/current')));
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'students/alice')));
  expect(true).toBe(true);
});
