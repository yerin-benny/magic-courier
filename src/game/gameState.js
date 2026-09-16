// 앱 실행 중 유지되는 게임 상태. 학생 문서(studentDoc)를 품고 있고, 바뀔 때마다 저장 계층에 쓴다.
//
// 회차 구조 (spec 3장)
//   startRound()         4개국 경로를 뽑아 새 회차를 연다
//   currentDestination() 이번 배송의 목적지 국가 id
//   completeDelivery()   배송 완료 → 도착, 방문 목록·통계 갱신, 다음 배송으로
//   isRoundComplete      4개국을 모두 돌았는가
//   finishRound()        회차 수를 올리고 경로를 비운다
//
// 계정 (STEP 9)
//   loadStudent(doc, recentKeys)  로그인한 학생 문서를 상태로 올린다
//   persist()                     학생 문서와 최근 큐를 저장한다 (변경 지점마다 자동 호출)
//   student                       현재 학생 문서 (없으면 null = 로그인 전)
//
// 학교 랭킹 (STEP 11)
//   openDelivery()       배송 세션을 열고, 서버가 있으면 시작 시각을 서버에 등록한다
//   reportDelivery()     완료한 배송을 서버에 보내 최종 반영 여부를 받아 온다
//   lastVerdict          마지막 배송의 랭킹 반영 결과 { counted, reason, message }

import { createRng } from '../core/random.js';
import { createRecentQueue } from '../generators/index.js';
import { START_COUNTRY_ID } from '../data/countries.js';
import { drawRoute, COUNTRIES_PER_ROUND } from './route.js';
import { bookJustCompleted } from './passport.js';
import { applyDeliveryStats, applyRankingVerdict, refreshDerived } from './studentDoc.js';
import { createDeliverySession } from './deliverySession.js';
import { judgeDelivery } from './ranking.js';
import { ensureDecor } from './shop.js';

export function createGameState({ rng = createRng(), storage = null } = {}) {
  const state = {
    rng,
    storage,
    student: null, // 학생 문서. 로그인 전에는 null
    recent: createRecentQueue(),
    request: null, // 현재 배송 의뢰
    session: null, // 현재 배송 세션
    deliveryTicket: null, // 서버가 발급한 배송 id (Firestore 모드에서만)
    lastVerdict: null, // 마지막 배송의 랭킹 반영 결과

    // ---- 학생 문서 필드에 대한 접근자 (로그인 전에는 게스트 값) ----
    _guest: { characterId: 1, visited: [], roundsCompleted: 0, route: null, totals: { problems: 0, deliveries: 0, stardust: 0, accurateDeliveries: 0 }, pendingPassport: 0 },
    get doc() {
      return this.student ?? this._guest;
    },
    get characterId() {
      return this.doc.characterId ?? 1;
    },
    set characterId(v) {
      this.doc.characterId = v;
    },
    get visited() {
      return this.doc.visited;
    },
    get roundsCompleted() {
      return this.doc.roundsCompleted;
    },
    get route() {
      return this.doc.route;
    },
    set route(v) {
      this.doc.route = v;
    },
    get totals() {
      return this.doc.totals;
    },
    get pendingPassport() {
      return this.doc.pendingPassport;
    },

    /** 회차 안의 배송 순번 0~3. 배송 구성(deliveryPlans)과 맞물린다. */
    get deliveryIndex() {
      return this.route ? this.route.position : 0;
    },
    get roundNumber() {
      return this.roundsCompleted + (this.route ? 1 : 0);
    },
    get isRoundComplete() {
      return !!this.route && this.route.position >= COUNTRIES_PER_ROUND;
    },

    // ---- 계정 ----
    loadStudent(doc, recentKeys = []) {
      this.student = refreshDerived(ensureDecor(doc)); // 예전 저장본의 빠진 필드·옛 우체국 이름을 맞춘다

      this.recent = createRecentQueue(recentKeys);
      this.request = null;
      this.session = null;
    },
    unloadStudent() {
      this.student = null;
      this.recent = createRecentQueue();
      this.request = null;
      this.session = null;
      this.deliveryTicket = null;
      this.lastVerdict = null;
    },
    async persist() {
      if (!this.storage || !this.student) return;
      this.student.updatedAt = new Date().toISOString();
      await this.storage.saveStudent(this.student);
      await this.storage.saveRecentProblemKeys(this.student.id, this.recent.toArray());
    },

    // ---- 회차 ----
    startRound() {
      if (this.route && !this.isRoundComplete) throw new Error('진행 중인 회차가 있습니다');
      const { route } = drawRoute(this.visited, { rng: this.rng });
      this.route = { countries: route, position: 0, startedAt: this.currentLocation() };
      this.request = null;
      this.session = null;
      this.persist();
      return this.route;
    },

    /** 지금 캐릭터가 있는 국가 id (마지막으로 도착한 곳, 처음엔 출발 국가) */
    currentLocation() {
      if (this.route && this.route.position > 0) return this.route.countries[this.route.position - 1];
      return this.visited.length ? this.visited[this.visited.length - 1] : START_COUNTRY_ID;
    },

    currentDestination() {
      if (!this.route || this.isRoundComplete) return null;
      return this.route.countries[this.route.position];
    },

    // ---- 배송 ----
    /**
     * 배송 세션을 연다. 이미 열려 있으면 그대로 둔다.
     * 서버 저장소라면 시작 시각을 서버에 등록해 45초 판정의 기준을 클라이언트에서 떼어 놓는다.
     */
    openDelivery(options = {}) {
      if (this.session) return this.session;
      this.session = createDeliverySession({
        deliveryIndex: this.deliveryIndex,
        rng: this.rng,
        recent: this.recent,
        ...options,
      });
      this.deliveryTicket = null;
      this.lastVerdict = null;
      if (this.storage?.startDelivery && this.student) {
        // 실패해도 배송은 그대로 진행한다. 티켓이 없으면 랭킹에만 반영되지 않는다.
        this.storage
          .startDelivery({ studentId: this.student.id, deliveryIndex: this.deliveryIndex })
          .then((ticket) => {
            this.deliveryTicket = ticket ?? null;
          })
          .catch(() => {
            this.deliveryTicket = null;
          });
      }
      return this.session;
    },

    /**
     * 완료한 배송을 서버에 보내 학교 랭킹 반영 여부를 최종 판정받는다.
     * 서버가 없거나(로컬 모드) 실패하면 로컬 예측 결과를 그대로 둔다.
     * 화면은 await 하지 않아도 되고, 결과가 오면 onVerdict 로 알려 준다.
     */
    async reportDelivery(summary, onVerdict = null) {
      const local = this.lastVerdict;
      if (!this.storage?.submitDelivery || !this.student || !this.deliveryTicket) return local;
      try {
        const verdict = await this.storage.submitDelivery({
          deliveryId: this.deliveryTicket,
          studentId: this.student.id,
          accurateBonus: summary.accurateBonus,
          firstTryCount: summary.firstTryCount,
          total: summary.total,
        });
        if (!verdict) return local;
        applyRankingVerdict(this.student, verdict, new Date(), local);
        this.lastVerdict = verdict;
        this.deliveryTicket = null;
        await this.persist();
        if (onVerdict) onVerdict(verdict);
        return verdict;
      } catch {
        return local; // 네트워크가 끊겨도 개인 기록은 이미 로컬에 남아 있다
      }
    },

    /** 배송 완료. 누적 기록과 유형별 통계에 반영하고 목적지 국가에 도착한다. 도착한 국가 id 를 돌려준다. */
    completeDelivery(summary) {
      const arrived = this.currentDestination();
      if (!arrived) throw new Error('진행 중인 배송이 없습니다');
      this.totals.problems += summary.total;
      this.totals.deliveries += 1;
      this.totals.stardust += summary.stardust;
      if (summary.accurateBonus) this.totals.accurateDeliveries += 1;
      // 랭킹 반영 여부는 우선 로컬에서 예측하고, reportDelivery 가 서버 판정으로 덮어쓴다.
      this.lastVerdict = this.student
        ? applyDeliveryStats(this.student, summary)
        : judgeDelivery({ accurateBonus: summary.accurateBonus, elapsedSeconds: summary.elapsedSeconds ?? Infinity });
      const before = this.visited.length;
      if (!this.visited.includes(arrived)) this.visited.push(arrived);
      const completedBook = bookJustCompleted(before, this.visited.length);
      if (completedBook) this.doc.pendingPassport = completedBook;
      this.route.position += 1;
      this.session = null;
      this.request = null;
      this.persist();
      return arrived;
    },

    /** 새 여권 수여 연출을 보여 줬다 */
    acknowledgePassport() {
      this.doc.pendingPassport = 0;
      this.persist();
    },

    finishRound() {
      if (!this.isRoundComplete) throw new Error('아직 회차가 끝나지 않았습니다');
      this.doc.roundsCompleted += 1;
      this.route = null;
      this.persist();
    },
  };
  return state;
}

// 앱 전역 상태. 저장 어댑터는 main.js 가 붙인다 (순환 import 방지).
export const gameState = createGameState();
