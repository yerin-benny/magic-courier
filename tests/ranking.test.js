// 학교 랭킹 반영 판정 (spec 9-1). 날짜 경계는 한국 시간 기준이다.

import { describe, it, expect } from 'vitest';
import {
  RANKING_RULES,
  RANK_REASON,
  judgeDelivery,
  dayKeyOf,
  weekKeyOf,
  rolloverDaily,
} from '../src/game/ranking.js';

describe('규칙 값', () => {
  it('배송 1건 최소 소요 시간은 45초다', () => {
    expect(RANKING_RULES.minDeliverySeconds).toBe(45);
  });

  it('하루 상한은 두지 않는다 (2026-09-16 사용자 확정)', () => {
    expect(RANKING_RULES.dailyLimit).toBeNull();
  });
});

describe('judgeDelivery', () => {
  const ok = { accurateBonus: true, elapsedSeconds: 120, todayCount: 0 };

  it('정확 배송 보너스 + 45초 이상이면 반영한다', () => {
    const v = judgeDelivery(ok);
    expect(v.counted).toBe(true);
    expect(v.reason).toBe(RANK_REASON.OK);
  });

  it('첫 시도 정답 3개를 못 채우면 반영하지 않는다', () => {
    const v = judgeDelivery({ ...ok, accurateBonus: false });
    expect(v.counted).toBe(false);
    expect(v.reason).toBe(RANK_REASON.NOT_ACCURATE);
  });

  it('45초 미만이면 반영하지 않는다', () => {
    expect(judgeDelivery({ ...ok, elapsedSeconds: 44.9 }).reason).toBe(RANK_REASON.TOO_FAST);
    expect(judgeDelivery({ ...ok, elapsedSeconds: 45 }).counted).toBe(true);
  });

  it('소요 시간을 모르면(undefined) 반영하지 않는다', () => {
    expect(judgeDelivery({ ...ok, elapsedSeconds: undefined }).counted).toBe(false);
  });

  it('상한이 없으면 아무리 많이 해도 계속 반영한다', () => {
    expect(judgeDelivery({ ...ok, todayCount: 500 }).counted).toBe(true);
  });

  it('상한 숫자를 넣으면 그때부터 막힌다', () => {
    const rules = { dailyLimit: 20 };
    expect(judgeDelivery({ ...ok, todayCount: 19, rules }).counted).toBe(true);
    const over = judgeDelivery({ ...ok, todayCount: 20, rules });
    expect(over.counted).toBe(false);
    expect(over.reason).toBe(RANK_REASON.DAILY_LIMIT);
  });

  it('반영되지 않아도 문구에 부정적인 말을 쓰지 않는다', () => {
    for (const reason of Object.values(RANK_REASON)) {
      const v = judgeDelivery({ ...ok, accurateBonus: reason === RANK_REASON.OK });
      expect(v.message.length).toBeGreaterThan(0);
      expect(v.message).not.toMatch(/실패|못했|안 됐|틀렸/);
    }
  });
});

describe('dayKeyOf — 한국 시간 기준', () => {
  it('UTC 자정 직후도 한국에서는 같은 날 오전이다', () => {
    expect(dayKeyOf(new Date('2026-09-16T00:30:00Z'))).toBe('2026-09-16');
  });

  it('한국 시간으로 날이 바뀌면 키가 바뀐다', () => {
    expect(dayKeyOf(new Date('2026-09-15T14:59:00Z'))).toBe('2026-09-15'); // KST 23:59
    expect(dayKeyOf(new Date('2026-09-15T15:00:00Z'))).toBe('2026-09-16'); // KST 00:00
  });
});

describe('weekKeyOf — ISO 주, 월요일 시작', () => {
  it('같은 주의 월요일과 일요일은 같은 키다', () => {
    const monday = weekKeyOf(new Date('2026-09-14T03:00:00Z'));
    const sunday = weekKeyOf(new Date('2026-09-20T03:00:00Z'));
    expect(monday).toBe(sunday);
  });

  it('주가 바뀌면 키가 바뀐다', () => {
    expect(weekKeyOf(new Date('2026-09-20T03:00:00Z'))).not.toBe(weekKeyOf(new Date('2026-09-21T03:00:00Z')));
  });

  it('키 모양은 YYYY-Www 다', () => {
    expect(weekKeyOf(new Date('2026-09-16T03:00:00Z'))).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('1월 1일이 목요일인 해의 1월 1일은 그해 1주다', () => {
    expect(weekKeyOf(new Date('2026-01-01T03:00:00Z'))).toBe('2026-W01');
  });

  it('한국 시간 기준으로 주를 자른다', () => {
    // UTC 로는 아직 일요일이지만 한국은 이미 월요일 = 다음 주
    expect(weekKeyOf(new Date('2026-09-20T15:00:00Z'))).toBe(weekKeyOf(new Date('2026-09-21T03:00:00Z')));
  });
});

describe('rolloverDaily', () => {
  const now = new Date('2026-09-16T03:00:00Z');

  it('날이 같으면 건수를 유지한다', () => {
    expect(rolloverDaily({ date: '2026-09-16', count: 7 }, now)).toEqual({ date: '2026-09-16', count: 7 });
  });

  it('날이 바뀌면 0으로 되돌린다', () => {
    expect(rolloverDaily({ date: '2026-09-15', count: 7 }, now)).toEqual({ date: '2026-09-16', count: 0 });
  });

  it('처음이면 오늘 날짜로 시작한다', () => {
    expect(rolloverDaily(null, now)).toEqual({ date: '2026-09-16', count: 0 });
  });
});
