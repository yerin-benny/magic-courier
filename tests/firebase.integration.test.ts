import { it, expect } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Delivery, View } from '../server/models';
const enabled = !!process.env.FIREBASE_AUTH_EMULATOR_HOST && !!process.env.FIRESTORE_EMULATOR_HOST;
it.skipIf(!enabled)(
  '실제 callable → Custom Auth → Firestore 배송·중복 검증',
  async () => {
    const project = 'demo-magic-courier';
    if (!getApps().length) initializeApp({ projectId: project });
    async function call(name: string, data: unknown, token?: string) {
      const r = await fetch(`http://127.0.0.1:5001/${project}/asia-northeast3/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify({ data }),
      });
      const result = await r.json();
      if (!r.ok) throw Error(JSON.stringify(result));
      return result.result;
    }
    const login = await call('courierLogin', {
      schoolId: 'sample-seoul',
      nickname: '실험우편' + Date.now().toString(36).slice(-5),
      pin: '2468',
    });
    const auth = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=demo-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: login.token, returnSecureToken: true }),
      },
    ).then((r) => r.json());
    expect(auth.idToken).toBeTruthy();
    const cmd = (command: string, data: unknown = {}) =>
      call('courierCommand', { command, data }, auth.idToken) as Promise<View>;
    await cmd('setup', { character: 'sage' });
    const start = await cmd('start');
    const id = start.delivery!.id;
    const snap = await getFirestore()
      .doc('deliverySessions/' + id)
      .get();
    const d = snap.data() as Delivery;
    // Server-only clock fixture; the public function never accepts timestamps.
    await getFirestore()
      .doc('deliverySessions/' + id)
      .update({ createdAt: Date.now() - 46000 });
    for (const [i, p] of d.problems.entries())
      await cmd('answer', {
        sessionId: id,
        problemId: p.id,
        requestId: 'firebase-request-' + i,
        input: {
          n: String(p.answer.n),
          d: String(p.answer.d),
          ...(p.type === 'E'
            ? { reciprocalN: String(p.right.d), reciprocalD: String(p.right.n) }
            : {}),
        },
      });
    const first = await cmd('finish', { sessionId: id }),
      second = await cmd('finish', { sessionId: id });
    expect(first.student.totalDeliveries).toBe(1);
    expect(second.student.totalDeliveries).toBe(1);
    expect(first.lastDelivery!.ranked).toBe(true);
    expect(first.student.visited).toHaveLength(1);
    expect(
      (await getFirestore().doc('schools/sample-seoul').get()).data()!.total,
    ).toBeGreaterThanOrEqual(1);
    const unauth = await fetch(`http://127.0.0.1:5001/${project}/asia-northeast3/courierCommand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { command: 'state' } }),
    });
    expect(unauth.status).toBe(401);
  },
  60000,
);
