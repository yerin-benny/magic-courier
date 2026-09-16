import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { Store, Transaction } from './store';
import {
  Aggregate,
  Command,
  Delivery,
  SchoolStats,
  Student,
  View,
  PublicDelivery,
  RankRow,
} from './models';
import { deliveryProblems, grade, publicProblem, Type } from '../core/problems';
import { createRoute } from '../core/route';
import { AnswerInput } from '../core/rational';
import { SampleSchoolRepository, SchoolRepository } from '../data/schools';
import { assets } from '../data/assets';
import { shopItem } from '../data/items';
const scrypt = promisify(scryptCallback);
export class UserError extends Error {}
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
export function dayKey(now: number) {
  return new Date(now + 9 * 3600000).toISOString().slice(0, 10);
}
export function weekKey(now: number) {
  const d = new Date(now + 9 * 3600000);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export function validateNickname(value: unknown): string {
  if (typeof value !== 'string') throw new UserError('닉네임을 입력해요.');
  const n = value.normalize('NFKC').trim().toLowerCase();
  if (!/^[가-힣a-z0-9]{2,12}$/.test(n))
    throw new UserError('닉네임은 한글·영문·숫자 2~12자로 정해요.');
  if (
    /(바보|멍청|씨발|시발|병신|개새|fuck|shit|admin|관리자|선생님)/i.test(n) ||
    /^[김이박최정강조윤장임한오서신권황안송류홍유전고문양손배백허남심노하곽성차주우구민진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉사부][가-힣]{1,2}$/.test(
      n,
    )
  )
    throw new UserError('실명 대신 나만의 별명을 정해 주세요.');
  return n;
}
type Credential = { uid: string; salt: string; digest: string; version: 1 };
type Limit = { count: number; resetAt: number };
export class CourierService {
  constructor(
    public store: Store,
    private pepper: string,
    private now = () => Date.now(),
    private cap = 25,
    private schoolRepo: SchoolRepository = new SampleSchoolRepository(),
  ) {}
  async authenticate(data: Record<string, unknown>, ip: string): Promise<string> {
    const schoolId = String(data.schoolId ?? ''),
      nickname = validateNickname(data.nickname),
      pin = String(data.pin ?? '');
    if (!/^\d{4}$/.test(pin)) throw new UserError('PIN은 숫자 4자리예요.');
    const school = await this.schoolRepo.get(schoolId);
    if (!school) throw new UserError('목록에서 학교를 골라 주세요.');
    const key = hash(schoolId + ':' + nickname),
      now = this.now();
    const limited = await this.store.run(async (tx) => {
      const paths = [`rateLimits/account-${key}`, `rateLimits/ip-${hash(ip)}`];
      const vals = await Promise.all(paths.map((p) => tx.get<Limit>(p)));
      if (vals.some((v, i) => v && v.resetAt > now && v.count >= (i === 0 ? 5 : 30))) return true;
      paths.forEach((p, i) => {
        const v = vals[i];
        tx.set(p, {
          count: v && v.resetAt > now ? v.count + 1 : 1,
          resetAt: v && v.resetAt > now ? v.resetAt : now + 15 * 60000,
        });
      });
      return false;
    });
    if (limited) throw new UserError('로그인 시도가 많아요. 15분 뒤 다시 시도해 주세요.');
    const existing = await this.store.run((tx) => tx.get<Credential>('credentials/' + key));
    const salt = existing?.salt ?? randomBytes(16).toString('hex');
    const digest = ((await scrypt(pin + this.pepper, salt, 64)) as Buffer).toString('hex');
    if (
      existing &&
      !timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(existing.digest, 'hex'))
    )
      throw new UserError('학교, 닉네임 또는 PIN을 다시 확인해 주세요.');
    return this.store.run(async (tx) => {
      const current = await tx.get<Credential>('credentials/' + key);
      if (current) {
        if (current.salt !== salt || current.digest !== digest)
          throw new UserError('다시 로그인해 주세요.');
        return current.uid;
      }
      const uid = randomUUID(),
        schoolPath = 'schools/' + schoolId,
        stats = await tx.get<SchoolStats>(schoolPath);
      const student: Student = {
        id: uid,
        schoolId,
        nickname,
        character: '',
        region: '',
        round: 1,
        route: createRoute([], randomBytes(4).readUInt32LE()),
        leg: 0,
        visited: [],
        dust: 0,
        ownedItems: [],
        equippedItems: {},
        totalProblems: 0,
        totalDeliveries: 0,
        firstCorrect: 0,
        stats: Object.fromEntries(
          'ABCDEFG'.split('').map((t) => [t, { total: 0, first: 0 }]),
        ) as Student['stats'],
        recent: [],
        activeSession: null,
        lastSession: null,
        rankingDay: '',
        rankingCount: 0,
        lastCompletedAt: null,
      };
      tx.set('students/' + uid, student);
      tx.set('credentials/' + key, { uid, salt, digest, version: 1 });
      tx.set(
        schoolPath,
        stats
          ? { ...stats, participants: stats.participants + 1 }
          : { ...school, total: 0, weeks: {}, participants: 1 },
      );
      return uid;
    });
  }
  private publicStudent(s: Student): Student {
    return {
      ...s,
      ownedItems: s.ownedItems ?? [],
      equippedItems: s.equippedItems ?? {},
      recent: [],
      rankingCap: this.cap,
    };
  }
  private publicDelivery(d: Delivery | null | undefined): PublicDelivery | null {
    if (!d) return null;
    const { problems, history, ...rest } = d;
    void history;
    return { ...rest, problem: d.index < 5 ? publicProblem(problems[d.index]) : null };
  }
  private async view(tx: Transaction, s: Student): Promise<View> {
    const active = s.activeSession
        ? await tx.get<Delivery>('deliverySessions/' + s.activeSession)
        : null,
      last = s.lastSession ? await tx.get<Delivery>('deliverySessions/' + s.lastSession) : null;
    return {
      student: this.publicStudent(s),
      delivery: this.publicDelivery(active),
      lastDelivery: this.publicDelivery(last),
    };
  }
  async execute(
    uid: string,
    command: Command,
    data: Record<string, unknown> = {},
  ): Promise<unknown> {
    if (command === 'refreshLeaderboard') return this.refresh(false);
    return this.store.run(async (tx) => {
      const s = await tx.get<Student>('students/' + uid);
      if (!s) throw new UserError('다시 로그인해 주세요.');
      s.ownedItems ??= [];
      s.equippedItems ??= {};
      const now = this.now();
      if (command === 'leaderboard')
        return (
          (await tx.get<Aggregate>('leaderboardAggregates/current')) ?? {
            weekKey: weekKey(now),
            updatedAt: 0,
            totalSchools: 0,
            top10: [],
            allTimeTop10: [],
            schools: {},
          }
        );
      if (command === 'setup') {
        const c = String(data.character ?? '');
        if (!assets.characters.some((a) => a.id === c))
          throw new UserError('캐릭터를 골라 주세요.');
        s.character = c;
        s.region = '대한민국';
        tx.set('students/' + uid, s);
      }
      if (command === 'buyItem') {
        const item = shopItem(String(data.itemId ?? ''));
        if (!item) throw new UserError('아이템을 다시 골라 주세요.');
        if (s.ownedItems.includes(item.id)) throw new UserError('이미 가지고 있는 아이템이에요.');
        if (s.dust < item.price)
          throw new UserError(`별가루가 ${item.price - s.dust}개 더 필요해요.`);
        s.dust -= item.price;
        s.ownedItems.push(item.id);
        s.equippedItems[item.slot] = item.id;
        tx.set('students/' + uid, s);
      }
      if (command === 'equipItem') {
        const item = shopItem(String(data.itemId ?? ''));
        if (!item || !s.ownedItems.includes(item.id))
          throw new UserError('먼저 아이템을 구입해 주세요.');
        s.equippedItems[item.slot] = item.id;
        tx.set('students/' + uid, s);
      }
      if (command === 'nextRound') {
        if (s.leg !== 4 || s.activeSession) throw new UserError('먼저 이번 회차의 배송을 마쳐요.');
        s.origin = s.route[3];
        s.round++;
        s.leg = 0;
        s.route = createRoute(s.visited, randomBytes(4).readUInt32LE());
        tx.set('students/' + uid, s);
      }
      if (command === 'start') {
        if (!s.character) throw new UserError('캐릭터를 먼저 골라요.');
        if (s.leg >= 4) throw new UserError('다음 세계일주를 시작해요.');
        if (!s.activeSession) {
          const id = randomUUID(),
            generated = deliveryProblems(s.leg, randomBytes(4).readUInt32LE(), s.recent);
          const d: Delivery = {
            id,
            owner: uid,
            destination: s.route[s.leg],
            createdAt: now,
            problems: generated.problems.map((p) => ({ ...p, id: randomUUID() })),
            index: 0,
            attempts: [0, 0, 0, 0, 0],
            history: [],
            completedAt: null,
            ranked: false,
            bonusReason: '',
            dust: 0,
          };
          s.activeSession = id;
          s.recent = generated.recent;
          tx.set('deliverySessions/' + id, d);
          tx.set('students/' + uid, s);
          return {
            student: this.publicStudent(s),
            delivery: this.publicDelivery(d),
            lastDelivery: null,
          };
        }
      }
      if (command === 'answer' || command === 'finish') {
        const sessionId = String(data.sessionId ?? '');
        const d = await tx.get<Delivery>('deliverySessions/' + sessionId);
        if (!d || d.owner !== uid) throw new UserError('배송 정보를 확인할 수 없어요.');
        if (d.completedAt !== null) return this.view(tx, s);
        if (s.activeSession !== d.id) throw new UserError('현재 배송이 아니에요.');
        if (command === 'answer') {
          const requestId = String(data.requestId ?? '');
          if (!/^[a-zA-Z0-9-]{8,80}$/.test(requestId))
            throw new UserError('요청 정보를 다시 확인해 주세요.');
          if (d.history.some((h) => h.requestId === requestId))
            return {
              ...(await this.view(tx, s)),
              feedback: d.history.find((h) => h.requestId === requestId)!.result,
            };
          if (d.index >= 5 || data.problemId !== d.problems[d.index].id)
            throw new UserError('현재 문제를 다시 확인해 주세요.');
          if (d.history.length >= 500)
            throw new UserError('시도가 많아요. 잠시 쉬고 선생님께 도움을 요청해요.');
          const p = d.problems[d.index];
          let result: ReturnType<typeof grade>;
          const input = data.input as AnswerInput;
          if (
            !input ||
            typeof input !== 'object' ||
            Object.values(input).some((v) => typeof v !== 'string')
          )
            throw new UserError('답을 다시 입력해 주세요.');
          try {
            result = grade(p, input);
          } catch (e) {
            throw new UserError((e as Error).message);
          }
          const first = d.attempts[d.index] === 0;
          d.history.push({
            requestId,
            problemId: p.id,
            at: now,
            result,
            input: input as Record<string, string>,
            first,
          });
          if (result === 'wrong') d.attempts[d.index]++;
          if (result === 'correct') {
            const reward = first ? 3 : 1;
            d.dust += reward;
            s.dust += reward;
            s.totalProblems++;
            s.stats[p.type].total++;
            if (first) {
              s.firstCorrect++;
              s.stats[p.type].first++;
            }
            d.index++;
          }
          tx.set('deliverySessions/' + d.id, d);
          tx.set('students/' + uid, s);
          return {
            student: this.publicStudent(s),
            delivery: this.publicDelivery(d),
            lastDelivery: null,
            feedback: result,
          };
        }
        if (d.index !== 5 || d.problems.length !== 5)
          throw new UserError('다섯 문제를 먼저 마쳐요.');
        let firstCount = 0;
        for (const p of d.problems) {
          const rows = d.history.filter((h) => h.problemId === p.id),
            correct = rows.find((h) => h.result === 'correct');
          if (!correct || grade(p, correct.input) !== 'correct')
            throw new UserError('정답 기록을 확인할 수 없어요.');
          const wrongBefore = rows
            .slice(0, rows.indexOf(correct))
            .some((h) => h.result === 'wrong');
          if (correct.first !== !wrongBefore) throw new UserError('시도 기록을 확인할 수 없어요.');
          if (!wrongBefore) firstCount++;
        }
        const day = dayKey(now);
        if (s.rankingDay !== day) {
          s.rankingDay = day;
          s.rankingCount = 0;
        }
        const eligible = firstCount >= 3 && now - d.createdAt >= 45000 && s.rankingCount < this.cap;
        const stats = eligible ? await tx.get<SchoolStats>('schools/' + s.schoolId) : undefined;
        d.ranked = eligible;
        d.bonusReason = eligible
          ? '정확 배송 보너스! 학교 배송량에 1건을 더했어요.'
          : firstCount < 3
            ? '정확 배송 보너스는 첫 도전에 3문제 이상 맞히면 받을 수 있어요.'
            : now - d.createdAt < 45000
              ? '정확 배송 보너스는 45초 이상 차근차근 풀면 받을 수 있어요.'
              : '오늘의 정확 배송 보너스를 모두 받았어요. 내 여행은 계속할 수 있어요.';
        d.completedAt = now;
        s.totalDeliveries++;
        s.lastCompletedAt = now;
        if (!s.visited.includes(d.destination)) s.visited.push(d.destination);
        s.leg++;
        s.activeSession = null;
        s.lastSession = d.id;
        if (s.leg === 4) s.dust += 10;
        if (eligible && stats) {
          s.rankingCount++;
          stats.total++;
          const week = weekKey(now);
          stats.weeks[week] = (stats.weeks[week] ?? 0) + 1;
          tx.set('schools/' + s.schoolId, stats);
        }
        tx.set('deliverySessions/' + d.id, d);
        tx.set('students/' + uid, s);
        return {
          student: this.publicStudent(s),
          delivery: null,
          lastDelivery: this.publicDelivery(d),
        };
      }
      return this.view(tx, s);
    });
  }
  async refresh(scheduled: boolean): Promise<Aggregate> {
    return this.store.run(async (tx) => {
      const now = this.now(),
        old = await tx.get<Aggregate>('leaderboardAggregates/current');
      if (!scheduled && old && now - old.updatedAt < 30 * 60000) return old;
      const rows = await tx.list<SchoolStats>('schools'),
        week = weekKey(now);
      const ranked: RankRow[] = rows.map((s) => ({
        id: s.id,
        name: s.name,
        weekly: s.weeks[week] ?? 0,
        total: s.total,
        weeklyRank: 0,
        totalRank: 0,
      }));
      const weekly = [...ranked].sort((a, b) => b.weekly - a.weekly || a.id.localeCompare(b.id)),
        all = [...ranked].sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
      weekly.forEach(
        (r, i) =>
          (r.weeklyRank =
            i && r.weekly === weekly[i - 1].weekly ? weekly[i - 1].weeklyRank : i + 1),
      );
      all.forEach(
        (r, i) => (r.totalRank = i && r.total === all[i - 1].total ? all[i - 1].totalRank : i + 1),
      );
      const aggregate = {
        weekKey: week,
        updatedAt: now,
        totalSchools: ranked.length,
        top10: weekly.slice(0, 10),
        allTimeTop10: all.slice(0, 10),
        schools: Object.fromEntries(ranked.map((r) => [r.id, r])),
      };
      tx.set('leaderboardAggregates/current', aggregate);
      return aggregate;
    });
  }
}
