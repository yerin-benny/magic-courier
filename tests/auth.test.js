// 로그인·저장 (로컬 단계) 테스트: 닉네임 필터, PIN 해시, 저장 어댑터, 로그인 흐름, 학생 문서·gameState 왕복.
import { describe, it, expect } from 'vitest';
import { validateNickname, looksLikeRealName, normalizeNickname } from '../src/data/nicknameFilter.js';
import { hashPin, isValidPin, sha256Hex } from '../src/core/hash.js';
import { createLocalStorageAdapter, createMemoryStorage } from '../src/storage/LocalStorageAdapter.js';
import { studentIdOf } from '../src/storage/StorageAdapter.js';
import { login, resumeSession, logout, SCHOOLS } from '../src/game/auth.js';
import { createStudentDoc, isOnboarded, accuracyByType, applyDeliveryStats, postOfficeName, refreshDerived, PROBLEM_TYPES } from '../src/game/studentDoc.js';
import { shortSchoolName } from '../src/data/schools.js';
import { createGameState } from '../src/game/gameState.js';
import { createRng } from '../src/core/random.js';
import { createDeliverySession } from '../src/game/deliverySession.js';
import { rationalToFraction } from '../src/core/fraction.js';

const newStorage = () => createLocalStorageAdapter(createMemoryStorage());

describe('닉네임 필터', () => {
  it('정상 닉네임', () => {
    for (const n of ['별빛', '구름배달부', 'star7', '하늘12', 'ㅋㅋ별']) expect(validateNickname(n).ok, n).toBe(true);
  });

  it('길이·문자·숫자만·자모만', () => {
    expect(validateNickname('').reason).toBe('empty');
    expect(validateNickname('가').reason).toBe('length');
    expect(validateNickname('아홉글자넘는닉네임이다').reason).toBe('length');
    expect(validateNickname('별 빛').reason).toBe('chars');
    expect(validateNickname('별빛!').reason).toBe('chars');
    expect(validateNickname('1234').reason).toBe('digits');
    expect(validateNickname('ㅋㅋㅋ').reason).toBe('jamo');
  });

  it('욕설 포함 금지', () => {
    expect(validateNickname('시발새').reason).toBe('banned');
    expect(validateNickname('fuckyou').reason).toBe('banned');
    expect(validateNickname('개새끼2').reason).toBe('banned');
  });

  it('실명형 패턴: 흔한 성씨 + 두 글자', () => {
    expect(looksLikeRealName('김민준')).toBe(true);
    expect(looksLikeRealName('박서연')).toBe(true);
    expect(looksLikeRealName('별빛이')).toBe(false); // 흔한 성씨 아님
    expect(looksLikeRealName('김민준이')).toBe(false); // 네 글자
    expect(looksLikeRealName('김밥')).toBe(false); // 두 글자
    expect(validateNickname('이지은').reason).toBe('realName');
    expect(validateNickname('이지은짱').ok).toBe(true);
  });

  it('정규화', () => {
    expect(normalizeNickname('  Star7 ')).toBe('star7');
  });
});

describe('PIN 해시', () => {
  it('숫자 4자리만 유효', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('12345')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
    expect(isValidPin('')).toBe(false);
  });

  it('SHA-256 이고 학교·닉네임이 솔트로 들어간다', async () => {
    const a = await hashPin({ schoolId: 's1', nickname: '별빛', pin: '1234' });
    const b = await hashPin({ schoolId: 's2', nickname: '별빛', pin: '1234' });
    const c = await hashPin({ schoolId: 's1', nickname: '별빛', pin: '1234' });
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
    expect(a).toBe(c);
    expect(a).not.toContain('1234');
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('잘못된 PIN 은 예외', async () => {
    await expect(hashPin({ schoolId: 's', nickname: 'n', pin: '12' })).rejects.toThrow();
  });
});

describe('LocalStorageAdapter (메모리 저장소 위)', () => {
  it('학생 문서·최근 큐·세션을 저장하고 되찾는다', async () => {
    const st = newStorage();
    expect(await st.loadStudent('x')).toBeNull();
    await st.saveStudent({ id: 'a:b', nickname: 'b' });
    expect(await st.loadStudent('a:b')).toEqual({ id: 'a:b', nickname: 'b' });
    expect(await st.loadRecentProblemKeys('a:b')).toEqual([]);
    await st.saveRecentProblemKeys('a:b', ['k1', 'k2']);
    expect(await st.loadRecentProblemKeys('a:b')).toEqual(['k1', 'k2']);
    expect(await st.loadSessionStudentId()).toBeNull();
    await st.saveSessionStudentId('a:b');
    expect(await st.loadSessionStudentId()).toBe('a:b');
    await st.saveSessionStudentId(null);
    expect(await st.loadSessionStudentId()).toBeNull();
    await expect(st.saveStudent({})).rejects.toThrow();
  });

  it('깨진 JSON 은 null 로 본다', async () => {
    const store = createMemoryStorage();
    store.setItem('mc:student:bad', '{not json');
    const st = createLocalStorageAdapter(store);
    expect(await st.loadStudent('bad')).toBeNull();
  });
});

describe('로그인 흐름', () => {
  const school = SCHOOLS[0].id;

  it('학교 목록은 임시 20개, 자유 입력 학교는 거부', async () => {
    expect(SCHOOLS.length).toBe(20);
    const res = await login(newStorage(), { schoolId: '별빛초', nickname: '별빛', pin: '1234' });
    expect(res.status).toBe('invalidSchool');
  });

  it('새 계정 → created, 같은 PIN 으로 다시 → ok, 다른 PIN → wrongPin', async () => {
    const st = newStorage();
    const created = await login(st, { schoolId: school, nickname: '별빛', pin: '1234' });
    expect(created.status).toBe('created');
    expect(created.doc.id).toBe(studentIdOf(school, '별빛'));
    expect(created.doc.pinHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(created.doc)).not.toContain('1234');
    const again = await login(st, { schoolId: school, nickname: ' 별빛 ', pin: '1234' });
    expect(again.status).toBe('ok');
    expect(again.doc.id).toBe(created.doc.id);
    const wrong = await login(st, { schoolId: school, nickname: '별빛', pin: '0000' });
    expect(wrong.status).toBe('wrongPin');
  });

  it('닉네임·PIN 검사 실패', async () => {
    const st = newStorage();
    expect((await login(st, { schoolId: school, nickname: '김민준', pin: '1234' })).status).toBe('invalidNickname');
    expect((await login(st, { schoolId: school, nickname: '별빛', pin: '12' })).status).toBe('invalidPin');
  });

  it('세션 복원과 로그아웃', async () => {
    const st = newStorage();
    expect(await resumeSession(st)).toBeNull();
    await login(st, { schoolId: school, nickname: '별빛', pin: '1234' });
    expect((await resumeSession(st)).nickname).toBe('별빛');
    await logout(st);
    expect(await resumeSession(st)).toBeNull();
  });
});

describe('학생 문서', () => {
  it('spec 10장 필드가 있고 유형별 정답률은 A~G 전부(문장제 포함)', () => {
    const doc = createStudentDoc({ schoolId: 's', nickname: '별빛', pinHash: 'h' });
    for (const k of ['id', 'schoolId', 'nickname', 'pinHash', 'characterId', 'items', 'equipped', 'postOffice', 'roundsCompleted', 'route', 'visited', 'totals', 'typeStats', 'firstTryRate', 'ranking', 'lastDeliveryAt']) {
      expect(doc, k).toHaveProperty(k);
    }
    expect(Object.keys(doc.typeStats)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'W']);
    expect(isOnboarded(doc)).toBe(false);
    doc.characterId = 2;
    expect(isOnboarded(doc)).toBe(true); // 고를 것은 캐릭터 하나뿐이다 (출발 지역 선택 없앰)
  });

  it('배송 결과가 유형별 통계·첫 시도 정답률·랭킹 건수·마지막 시각에 반영된다', () => {
    const doc = createStudentDoc({ schoolId: 's', nickname: '별빛', pinHash: 'h' });
    const summary = {
      total: 5, stardust: 11, accurateBonus: true,
      results: [
        { type: 'A', firstTry: true }, { type: 'B', firstTry: false }, { type: 'D', firstTry: true }, { type: 'G', firstTry: true }, { type: 'W', firstTry: false },
      ],
    };
    applyDeliveryStats(doc, summary, new Date('2026-09-16T10:00:00Z'));
    expect(doc.typeStats.A).toEqual({ solved: 1, firstTry: 1 });
    expect(doc.typeStats.B).toEqual({ solved: 1, firstTry: 0 });
    expect(doc.firstTryRate).toBeCloseTo(3 / 5);
    expect(doc.ranking).toEqual({ date: '2026-09-16', count: 1 });
    expect(doc.lastDeliveryAt).toBe('2026-09-16T10:00:00.000Z');
    const acc = accuracyByType(doc);
    expect(acc.A).toBe(1);
    expect(acc.B).toBe(0);
    expect(acc.C).toBeNull();
    applyDeliveryStats(doc, { ...summary, accurateBonus: false }, new Date('2026-09-17T01:00:00Z'));
    expect(doc.ranking).toEqual({ date: '2026-09-17', count: 0 });
  });
});

describe('gameState 와 저장 계층', () => {
  function answerInput(problem) {
    const f = rationalToFraction(problem.answer);
    const base = { whole: f.whole ? String(f.whole) : '', num: f.num ? String(f.num) : '', den: f.num ? String(f.den) : '' };
    if (problem.type === 'E') return { ...base, recNum: String(problem.reciprocal.num), recDen: String(problem.reciprocal.den) };
    return base;
  }

  it('배송을 마치면 학생 문서가 저장되고, 새 gameState 에 복원하면 이어진다', async () => {
    const st = newStorage();
    const { doc } = await login(st, { schoolId: SCHOOLS[1].id, nickname: '구름', pin: '4321' });
    const g = createGameState({ rng: createRng(1), storage: st });
    g.loadStudent(doc, []);
    g.startRound();
    const session = createDeliverySession({ deliveryIndex: g.deliveryIndex, rng: g.rng, recent: g.recent });
    while (!session.isComplete) { session.submit(answerInput(session.current())); session.advance(); }
    const arrived = g.completeDelivery(session.summary());
    await g.persist();

    const saved = await st.loadStudent(doc.id);
    expect(saved.visited).toEqual([arrived]);
    expect(saved.route.position).toBe(1);
    expect(saved.totals.deliveries).toBe(1);
    expect(saved.typeStats.A.solved).toBe(1);
    expect(saved.typeStats.W.solved).toBe(1);
    const keys = await st.loadRecentProblemKeys(doc.id);
    expect(keys.length).toBe(5);

    const g2 = createGameState({ rng: createRng(2), storage: st });
    g2.loadStudent(saved, keys);
    expect(g2.visited).toEqual([arrived]);
    expect(g2.currentLocation()).toBe(arrived);
    expect(g2.deliveryIndex).toBe(1);
    expect(g2.recent.size).toBe(5);
    expect(g2.roundNumber).toBe(1);
  });

  it('로그인 전(게스트)에는 저장하지 않고 동작만 한다', async () => {
    const st = newStorage();
    const g = createGameState({ rng: createRng(3), storage: st });
    g.startRound();
    await g.persist();
    expect(st.loadSessionStudentId()).resolves.toBeNull();
    expect(g.characterId).toBe(1);
  });
});

describe('나의 마법 우체국', () => {
  it('학교 이름으로 자동으로 만들어진다 (고르는 화면 없음)', () => {
    expect(shortSchoolName('해운대초등학교')).toBe('해운대초');
    expect(postOfficeName('busan-haeundae')).toBe('해운대초 마법 우체국');
  });

  it('모르는 학교면 이름만 남는다', () => {
    expect(postOfficeName('없는학교')).toBe('마법 우체국');
  });

  it('로그인하면 학교 이름이 우체국 이름에 들어간다', async () => {
    const st = newStorage();
    const school = SCHOOLS[0];
    const { doc } = await login(st, { schoolId: school.id, nickname: '구름', pin: '1111' });
    expect(doc.postOffice).toBe(`${shortSchoolName(school.name)} 마법 우체국`);
  });

  it('예전 이름으로 저장된 문서도 열면 새 이름이 된다', () => {
    const doc = createStudentDoc({ schoolId: 'busan-haeundae', nickname: '구름', pinHash: 'h' });
    doc.postOffice = '부산 구름 마법 우체국'; // 예전 형식
    refreshDerived(doc);
    expect(doc.postOffice).toBe('해운대초 마법 우체국');
  });
});
