// Firebase 설정 (STEP 11). 값은 코드에 박지 않고 Vite 환경 변수(.env.local)에서 읽는다.
// .env.example 을 복사해 .env.local 로 만들고 값을 채우면 그때부터 Firestore 모드로 돈다.
// 값이 하나라도 비면 앱은 지금까지처럼 LocalStorageAdapter 로 돈다.
//
// 웹 앱 설정(apiKey 등)은 비밀이 아니다. 브라우저에 그대로 내려가는 공개 식별자이고,
// 실제 방어는 App Check + 보안 규칙 + Cloud Functions 판정이 한다 (spec 9-1).

const env = import.meta.env ?? {};

export const firebaseConfig = Object.freeze({
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
});

/** App Check (reCAPTCHA v3) 사이트 키. 없으면 App Check 없이 붙는다(개발용). */
export const recaptchaSiteKey = env.VITE_RECAPTCHA_SITE_KEY ?? '';

/** Cloud Functions 리전. 기본은 서울. */
export const functionsRegion = env.VITE_FIREBASE_REGION || 'asia-northeast3';

/** 로컬 에뮬레이터에 붙을지 (VITE_USE_EMULATOR=1) */
export const useEmulator = String(env.VITE_USE_EMULATOR ?? '') === '1';

/** 설정이 다 채워졌는가. 하나라도 비면 로컬 저장으로 돈다. */
export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}
