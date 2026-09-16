// Firestore 저장 어댑터 (STEP 11). StorageAdapter 인터페이스를 그대로 구현하고,
// 서버 판정이 필요한 세 가지를 더 갖는다: login, startDelivery, submitDelivery.
//
// 설계 요점
//   - Firebase 모듈은 필요할 때 동적 import 한다. 설정이 없으면 이 파일은 아무것도 불러오지 않고,
//     테스트와 로컬 모드는 Firebase 를 건드리지 않는다.
//   - 로그인은 학교·닉네임·PIN 이라 Firebase Auth 의 기본 제공자를 쓸 수 없다.
//     Cloud Functions 가 PIN 을 확인하고 커스텀 토큰을 발급하면 signInWithCustomToken 으로 붙는다.
//     그래야 보안 규칙에서 "내 문서만 쓴다"를 auth.uid 로 강제할 수 있다.
//   - 학생 문서 id 는 로컬과 달리 auth uid 다. 원래 id(`학교:닉네임`)는 문서 안에 studentId 로 남는다.
//   - ranking·lastRankVerdict 는 서버 소유 필드다. 클라이언트 저장에서 빼고 보낸다
//     (보안 규칙도 같은 내용을 막는다).

import { firebaseConfig, recaptchaSiteKey, functionsRegion, useEmulator } from '../config/firebase.js';
import { SESSION_KEY } from './StorageAdapter.js';
import { hashPin } from '../core/hash.js';
import { createStudentDoc } from '../game/studentDoc.js';

/** 서버가 관리하는 필드. 클라이언트 쓰기에서 제외한다. */
const SERVER_OWNED = ['ranking', 'lastRankVerdict'];

let sdk = null; // 한 번만 초기화한다

async function ensureSdk() {
  if (sdk) return sdk;
  const [{ initializeApp }, auth, firestore, functions] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
    import('firebase/functions'),
  ]);

  const app = initializeApp(firebaseConfig);

  // App Check (reCAPTCHA v3) — spec 9-1 필수 방어. 키가 없으면 건너뛴다(개발용).
  if (recaptchaSiteKey) {
    const { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  const authInstance = auth.getAuth(app);
  const db = firestore.getFirestore(app);
  const fns = functions.getFunctions(app, functionsRegion);

  if (useEmulator) {
    auth.connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
    firestore.connectFirestoreEmulator(db, '127.0.0.1', 8080);
    functions.connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  }

  sdk = { app, auth, authInstance, firestore, db, functions, fns };
  return sdk;
}

/** 로그인 상태가 확정될 때까지 한 번 기다린다 (새로고침 직후 currentUser 가 null 인 구간) */
function waitForAuth({ auth, authInstance }) {
  if (authInstance.currentUser) return Promise.resolve(authInstance.currentUser);
  return new Promise((resolve) => {
    const off = auth.onAuthStateChanged(authInstance, (user) => {
      off();
      resolve(user);
    });
  });
}

export function createFirestoreAdapter({ deviceStore = null } = {}) {
  const device = deviceStore ?? globalThis.localStorage ?? null;
  const readDevice = (k) => {
    try {
      const raw = device?.getItem(k);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const writeDevice = (k, v) => {
    try {
      if (v === null) device?.removeItem(k);
      else device?.setItem(k, JSON.stringify(v));
    } catch {
      /* 사생활 보호 모드 등: 기기 기억은 포기하고 진행한다 */
    }
  };

  async function call(name, payload) {
    const s = await ensureSdk();
    const fn = s.functions.httpsCallable(s.fns, name);
    const res = await fn(payload);
    return res.data;
  }

  async function currentUid() {
    const s = await ensureSdk();
    const user = await waitForAuth(s);
    return user?.uid ?? null;
  }

  return {
    kind: 'firestore',

    // ---- 로그인 (서버 판정) ----
    /** auth.login 이 어댑터에 이 메서드가 있으면 여기로 넘긴다. 반환 모양은 로컬 login 과 같다. */
    async login({ schoolId, nickname, pin }) {
      const s = await ensureSdk();
      const pinHash = await hashPin({ schoolId, nickname, pin });
      const data = await call('loginStudent', { schoolId, nickname, pinHash });
      if (data.status !== 'ok' && data.status !== 'created') return data; // wrongPin 등
      await s.auth.signInWithCustomToken(s.authInstance, data.token);

      // 학생 문서의 모양은 클라이언트(studentDoc.js)만 안다. 서버는 자격 증명만 갖고 있으므로
      // 처음 로그인이면 여기서 문서를 만들어 저장한다.
      let doc = await this.loadStudent(data.studentId);
      if (!doc) {
        doc = createStudentDoc({ schoolId, nickname, pinHash });
        await this.saveStudent(doc);
      }
      writeDevice(SESSION_KEY, doc.id);
      return { status: data.status, doc };
    },

    async logout() {
      const s = await ensureSdk();
      await s.auth.signOut(s.authInstance);
      writeDevice(SESSION_KEY, null);
    },

    // ---- 학생 문서 ----
    async loadStudent() {
      const s = await ensureSdk();
      const uid = await currentUid();
      if (!uid) return null;
      const snap = await s.firestore.getDoc(s.firestore.doc(s.db, 'students', uid));
      return snap.exists() ? snap.data() : null;
    },

    async saveStudent(doc) {
      const s = await ensureSdk();
      const uid = await currentUid();
      if (!uid) return; // 로그인이 풀렸으면 조용히 건너뛴다. 다음 로그인 때 서버 값을 받는다
      const payload = { ...doc };
      for (const f of SERVER_OWNED) delete payload[f];
      await s.firestore.setDoc(s.firestore.doc(s.db, 'students', uid), payload, { merge: true });
    },

    async loadRecentProblemKeys() {
      const s = await ensureSdk();
      const uid = await currentUid();
      if (!uid) return [];
      const snap = await s.firestore.getDoc(s.firestore.doc(s.db, 'students', uid, 'state', 'recent'));
      return snap.exists() ? snap.data().keys ?? [] : [];
    },

    async saveRecentProblemKeys(studentId, keys) {
      const s = await ensureSdk();
      const uid = await currentUid();
      if (!uid) return;
      await s.firestore.setDoc(s.firestore.doc(s.db, 'students', uid, 'state', 'recent'), { keys });
    },

    async loadSessionStudentId() {
      const uid = await currentUid();
      return uid ? readDevice(SESSION_KEY) : null;
    },

    async saveSessionStudentId(studentId) {
      writeDevice(SESSION_KEY, studentId ?? null);
    },

    // ---- 배송 판정 (서버) ----
    /** 배송 시작을 서버에 등록하고 배송 id 를 받는다. 45초 판정의 기준 시각은 서버가 찍는다. */
    async startDelivery({ deliveryIndex }) {
      const data = await call('startDelivery', { deliveryIndex });
      return data?.deliveryId ?? null;
    },

    /** 배송 완료를 서버에 알리고 학교 랭킹 반영 여부를 받는다. */
    async submitDelivery({ deliveryId, accurateBonus, firstTryCount, total }) {
      const data = await call('completeDelivery', { deliveryId, accurateBonus, firstTryCount, total });
      return data?.verdict ?? null;
    },

    // ---- 학교·랭킹 ----
    async loadSchool(schoolId) {
      const s = await ensureSdk();
      const snap = await s.firestore.getDoc(s.firestore.doc(s.db, 'schools', schoolId));
      return snap.exists() ? snap.data() : null;
    },

    /** 집계 문서 하나만 읽는다. 학교 문서를 전부 정렬해 읽지 않는다 (spec 9-3). */
    async loadRankingSummary() {
      const s = await ensureSdk();
      const snap = await s.firestore.getDoc(s.firestore.doc(s.db, 'aggregates', 'ranking'));
      return snap.exists() ? snap.data() : null;
    },

    /** 수동 갱신 요청. 서버가 30분 쿨다운을 본다. */
    async requestRankingRefresh() {
      return call('refreshRankingSummary', {});
    },
  };
}
