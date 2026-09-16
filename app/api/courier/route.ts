import { NextRequest, NextResponse } from 'next/server';
import { localService, newToken } from '../../../server/local';
import { hash, UserError } from '../../../server/service';
import { Command } from '../../../server/models';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  try {
    if (process.env.NEXT_PUBLIC_BACKEND === 'firebase')
      return NextResponse.json({ error: 'Firebase 연결을 사용해 주세요.' }, { status: 404 });
    const origin = req.headers.get('origin');
    if (!origin || new URL(origin).host !== req.headers.get('host'))
      return NextResponse.json({ error: '요청 출처를 확인할 수 없어요.' }, { status: 403 });
    if (Number(req.headers.get('content-length') ?? 0) > 16000)
      return NextResponse.json({ error: '요청이 너무 커요.' }, { status: 413 });
    const bodyText = await req.text();
    if (bodyText.length > 16000)
      return NextResponse.json({ error: '요청이 너무 커요.' }, { status: 413 });
    const body = JSON.parse(bodyText);
    const service = localService();
    if (body.command === 'login') {
      const uid = await service.authenticate(body.data ?? {}, 'local-browser'),
        token = newToken();
      await service.store.run(async (tx) =>
        tx.set('authSessions/' + hash(token), { uid, expiresAt: Date.now() + 7 * 86400000 }),
      );
      const res = NextResponse.json(await service.execute(uid, 'state'));
      res.cookies.set('courier_session', token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 7 * 86400,
      });
      return res;
    }
    const token = req.cookies.get('courier_session')?.value ?? '',
      session = await service.store.run((tx) =>
        tx.get<{ uid: string; expiresAt: number }>('authSessions/' + hash(token)),
      );
    if (!session || session.expiresAt < Date.now())
      return NextResponse.json({ error: '다시 로그인해 주세요.' }, { status: 401 });
    if (body.command === 'logout') {
      await service.store.run(async (tx) =>
        tx.set('authSessions/' + hash(token), { ...session, expiresAt: 0 }),
      );
      const res = NextResponse.json({ ok: true });
      res.cookies.delete('courier_session');
      return res;
    }
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
    if (!allowed.includes(body.command)) throw new UserError('알 수 없는 요청이에요.');
    if (body.command === 'leaderboard') {
      const aggregate = (await service.execute(session.uid, 'leaderboard')) as {
        updatedAt: number;
      };
      if (Date.now() - aggregate.updatedAt >= 3600000) await service.refresh(true);
    }
    return NextResponse.json(await service.execute(session.uid, body.command, body.data ?? {}), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof UserError ? e.message : '연결이 잠시 어려워요. 다시 시도해 주세요.' },
      { status: e instanceof UserError ? 400 : 500 },
    );
  }
}
