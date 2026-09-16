import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
const schools = JSON.parse(readFileSync(new URL('../data/schools.json', import.meta.url), 'utf8'));
async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST && !process.argv.includes('--production'))
    throw Error('운영 seed는 --production으로 명시해 주세요.');
  initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'demo-magic-courier' });
  const db = getFirestore();
  for (const school of schools) {
    await db.runTransaction(async (tx) => {
      const ref = db.doc('schools/' + school.id);
      if (!(await tx.get(ref)).exists)
        tx.set(ref, { ...school, total: 0, weeks: {}, participants: 0 });
    });
  }
  console.log('샘플 학교 준비 완료. 기존 배송 기록은 유지했습니다.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
