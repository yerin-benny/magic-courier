import { beforeEach, describe, it, expect } from 'vitest';
import { CourierService, dayKey, weekKey, validateNickname } from '../server/service';
import { MemoryStore } from '../server/store';
import { Delivery, View, Student, SchoolStats } from '../server/models';
import { Problem } from '../core/problems';
let store: MemoryStore, service: CourierService, now: number, uid: string;
const answer = (p: Problem, multiple = 1) => ({
  n: String(p.answer.n * multiple),
  d: String(p.answer.d * multiple),
  ...(p.type === 'E' ? { reciprocalN: String(p.right.d), reciprocalD: String(p.right.n) } : {}),
});
beforeEach(async () => {
  store = new MemoryStore();
  now = Date.UTC(2026, 8, 15, 23);
  service = new CourierService(store, 'test-secret', () => now, 1);
  uid = await service.authenticate(
    { schoolId: 'sample-seoul', nickname: '우주우체통', pin: '1234' },
    '127.0.0.1',
  );
  await service.execute(uid, 'setup', { character: 'luna' });
});
async function start() {
  const v = (await service.execute(uid, 'start')) as View;
  return store.data['deliverySessions/' + v.delivery!.id] as Delivery;
}
async function solve(d: Delivery, wrong = 0) {
  for (let i = 0; i < 5; i++) {
    if (i < wrong)
      await service.execute(uid, 'answer', {
        sessionId: d.id,
        problemId: d.problems[i].id,
        requestId: `wrong-${i}-request`,
        input: { whole: '9999', reciprocalN: '1', reciprocalD: '1' },
      });
    await service.execute(uid, 'answer', {
      sessionId: d.id,
      problemId: d.problems[i].id,
      requestId: `correct-${i}-request`,
      input: answer(d.problems[i]),
    });
  }
}
describe('서버 권위와 트랜잭션', () => {
  it('가입·재로그인·PIN 원문 비저장·비밀번호 오류', async () => {
    expect(
      await service.authenticate(
        { schoolId: 'sample-seoul', nickname: '우주우체통', pin: '1234' },
        '127.0.0.1',
      ),
    ).toBe(uid);
    const credential = Object.entries(store.data).find(([key]) =>
      key.startsWith('credentials/'),
    )![1] as { digest: string; salt: string };
    expect(credential).not.toHaveProperty('pin');
    expect(credential.digest).toMatch(/^[a-f0-9]{128}$/);
    expect(credential.salt).toMatch(/^[a-f0-9]{32}$/);
    await expect(
      service.authenticate(
        { schoolId: 'sample-seoul', nickname: '우주우체통', pin: '9999' },
        '127.0.0.1',
      ),
    ).rejects.toThrow('확인');
    expect(() => validateNickname('김민수')).toThrow();
    expect(() => validateNickname('관리자')).toThrow();
  });
  it('로그인 반복 시 일시 잠금', async () => {
    for (let i = 0; i < 4; i++)
      await service
        .authenticate(
          { schoolId: 'sample-seoul', nickname: '우주우체통', pin: '0000' },
          '127.0.0.1',
        )
        .catch(() => {});
    await expect(
      service.authenticate(
        { schoolId: 'sample-seoul', nickname: '우주우체통', pin: '1234' },
        '127.0.0.1',
      ),
    ).rejects.toThrow('15분');
    now += 16 * 60000;
    expect(
      await service.authenticate(
        { schoolId: 'sample-seoul', nickname: '우주우체통', pin: '1234' },
        '127.0.0.1',
      ),
    ).toBe(uid);
  });
  it('정답·문제 seed·PIN은 공개 응답에서 제외', async () => {
    const v = (await service.execute(uid, 'start')) as View;
    expect(JSON.stringify(v)).not.toContain('"answer"');
    expect(JSON.stringify(v)).not.toContain('"digest"');
    expect(v.delivery).not.toHaveProperty('problems');
  });
  it('미약분, 잘못된 분모는 시도 차감하지 않고 3 별가루 유지', async () => {
    const d = await start(),
      p = d.problems[0];
    await expect(
      service.execute(uid, 'answer', {
        sessionId: d.id,
        problemId: p.id,
        requestId: 'invalid-denominator',
        input: { n: '1', d: '0' },
      }),
    ).rejects.toThrow();
    const partial = (await service.execute(uid, 'answer', {
      sessionId: d.id,
      problemId: p.id,
      requestId: 'simplify-request',
      input: answer(p, 2),
    })) as View;
    expect(partial.delivery!.attempts[0]).toBe(0);
    const v = (await service.execute(uid, 'answer', {
      sessionId: d.id,
      problemId: p.id,
      requestId: 'correct-request',
      input: answer(p),
    })) as View;
    expect(v.student.dust).toBe(3);
  });
  it('오답 후 보상 1, 중복 제출은 한 번만 반영', async () => {
    const d = await start(),
      p = d.problems[0];
    await service.execute(uid, 'answer', {
      sessionId: d.id,
      problemId: p.id,
      requestId: 'wrong-request-id',
      input: { whole: '9999' },
    });
    const data = {
      sessionId: d.id,
      problemId: p.id,
      requestId: 'correct-request-id',
      input: answer(p),
    };
    await Promise.all([service.execute(uid, 'answer', data), service.execute(uid, 'answer', data)]);
    const v = (await service.execute(uid, 'state')) as View;
    expect(v.student.dust).toBe(1);
    expect(v.delivery!.index).toBe(1);
  });
  it('45초·첫 시도 3개 이상·원자적 중복 완료·일일 상한', async () => {
    const d = await start();
    await solve(d, 2);
    now += 45000;
    const results = await Promise.all([
      service.execute(uid, 'finish', { sessionId: d.id }),
      service.execute(uid, 'finish', { sessionId: d.id }),
    ]);
    expect((results[0] as View).lastDelivery!.ranked).toBe(true);
    const s = store.data['students/' + uid] as Student;
    expect(s.totalDeliveries).toBe(1);
    expect(s.dust).toBe(11);
    const school = store.data['schools/sample-seoul'] as SchoolStats;
    expect(school.total).toBe(1);
    const d2 = await start();
    await solve(d2);
    now += 50000;
    const v = (await service.execute(uid, 'finish', { sessionId: d2.id })) as View;
    expect(v.lastDelivery!.ranked).toBe(false);
    expect(v.student.visited).toHaveLength(2);
    expect(v.student.totalDeliveries).toBe(2);
  });
  it('최소시간 미달도 개인 스탬프 유지', async () => {
    const d = await start();
    await solve(d);
    const v = (await service.execute(uid, 'finish', { sessionId: d.id })) as View;
    expect(v.lastDelivery!.ranked).toBe(false);
    expect(v.student.visited).toHaveLength(1);
  });
  it('첫 시도 2개만 정답이면 랭킹 제외', async () => {
    const d = await start();
    await solve(d, 3);
    now += 50000;
    const v = (await service.execute(uid, 'finish', { sessionId: d.id })) as View;
    expect(v.lastDelivery!.ranked).toBe(false);
    expect(v.student.totalDeliveries).toBe(1);
  });
  it('서버 완료·세션 소유·순서 우회 거절', async () => {
    const d = await start();
    await expect(service.execute(uid, 'finish', { sessionId: d.id })).rejects.toThrow();
    const other = await service.authenticate(
      { schoolId: 'sample-seoul', nickname: '구름봉투', pin: '4567' },
      'other',
    );
    await expect(service.execute(other, 'finish', { sessionId: d.id })).rejects.toThrow();
    await expect(
      service.execute(uid, 'answer', {
        sessionId: d.id,
        problemId: d.problems[3].id,
        requestId: 'out-of-order-request',
        input: answer(d.problems[3]),
      }),
    ).rejects.toThrow();
  });
  it('꾸미기 아이템 구매·별가루 차감·종류별 장착', async () => {
    const student = store.data['students/' + uid] as Student;
    student.dust = 30;
    let view = (await service.execute(uid, 'buyItem', { itemId: 'item-7' })) as View;
    expect(view.student.dust).toBe(22);
    expect(view.student.ownedItems).toEqual(['item-7']);
    expect(view.student.equippedItems.badge).toBe('item-7');
    await expect(service.execute(uid, 'buyItem', { itemId: 'item-7' })).rejects.toThrow('이미');
    view = (await service.execute(uid, 'buyItem', { itemId: 'item-8' })) as View;
    expect(view.student.dust).toBe(14);
    expect(view.student.equippedItems.badge).toBe('item-8');
    view = (await service.execute(uid, 'equipItem', { itemId: 'item-7' })) as View;
    expect(view.student.equippedItems.badge).toBe('item-7');
    await expect(service.execute(uid, 'buyItem', { itemId: 'item-9' })).rejects.toThrow('더 필요');
    await expect(service.execute(uid, 'equipItem', { itemId: 'item-9' })).rejects.toThrow('먼저');
  });
  it('4배송 후 회차 보상 10, 다음 경로 미방문', async () => {
    for (let i = 0; i < 4; i++) {
      const d = await start();
      await solve(d);
      await service.execute(uid, 'finish', { sessionId: d.id });
    }
    const v = (await service.execute(uid, 'state')) as View;
    expect(v.student.leg).toBe(4);
    expect(v.student.totalProblems).toBe(20);
    expect(v.student.dust).toBe(70);
    const next = (await service.execute(uid, 'nextRound')) as View;
    expect(next.student.round).toBe(2);
    expect(next.student.route.every((c) => !v.student.visited.includes(c))).toBe(true);
  });
  it('서울 주간·일일 경계와 집계 수동 쿨다운', async () => {
    expect(dayKey(Date.UTC(2026, 8, 20, 15))).toBe('2026-09-21');
    expect(weekKey(Date.UTC(2026, 8, 20, 14, 59))).toBe('2026-09-14');
    expect(weekKey(Date.UTC(2026, 8, 20, 15))).toBe('2026-09-21');
    const a = await service.refresh(false);
    now += 1000;
    expect((await service.refresh(false)).updatedAt).toBe(a.updatedAt);
    now += 1800000;
    expect((await service.refresh(false)).updatedAt).toBe(now);
    expect(JSON.stringify(a)).not.toContain('우주우체통');
  });
});
