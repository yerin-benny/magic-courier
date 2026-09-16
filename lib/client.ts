import type { Command, View, Aggregate } from '../server/models';
let firebaseReady:
  | Promise<{
      auth: import('firebase/auth').Auth;
      functions: import('firebase/functions').Functions;
    }>
  | undefined;
async function firebase() {
  if (!firebaseReady)
    firebaseReady = (async () => {
      const { initializeApp, getApps } = await import('firebase/app'),
        { getAuth, connectAuthEmulator } = await import('firebase/auth'),
        { getFunctions, connectFunctionsEmulator } = await import('firebase/functions'),
        { initializeAppCheck, ReCaptchaV3Provider } = await import('firebase/app-check');
      const app =
        getApps()[0] ??
        initializeApp({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        });
      const auth = getAuth(app),
        functions = getFunctions(app, 'asia-northeast3');
      if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFunctionsEmulator(functions, '127.0.0.1', 5001);
      } else {
        if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) throw Error('App Check 설정이 필요해요.');
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true,
        });
      }
      await auth.authStateReady();
      return { auth, functions };
    })();
  return firebaseReady;
}
export async function api<T = View>(
  command: Command | 'login' | 'logout',
  data: Record<string, unknown> = {},
): Promise<T> {
  if (process.env.NEXT_PUBLIC_BACKEND === 'firebase') {
    const { auth, functions } = await firebase();
    const { httpsCallable } = await import('firebase/functions');
    if (command === 'logout') {
      await (await import('firebase/auth')).signOut(auth);
      return { ok: true } as T;
    }
    if (command === 'login') {
      const response = await httpsCallable(functions, 'courierLogin')(data);
      await (
        await import('firebase/auth')
      ).signInWithCustomToken(auth, (response.data as { token: string }).token);
      return api<T>('state');
    }
    if (!auth.currentUser) throw Error('다시 로그인해 주세요.');
    return (await httpsCallable(functions, 'courierCommand')({ command, data })).data as T;
  }
  const response = await fetch('/api/courier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, data }),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error ?? '연결을 확인해 주세요.');
  return result as T;
}
export type { View, Aggregate };
