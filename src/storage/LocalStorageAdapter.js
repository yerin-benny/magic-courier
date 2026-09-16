// 키-값 저장소(localStorage 또는 그와 같은 모양의 객체) 위에 StorageAdapter 를 구현한다.
// 브라우저에서는 window.localStorage, 테스트에서는 Map 기반 MemoryStorage 를 넘긴다.
// Firebase 전환 후에도 개발용으로 남긴다.

import { STUDENT_KEY_PREFIX, RECENT_KEY_PREFIX, SESSION_KEY } from './StorageAdapter.js';

/** localStorage 와 같은 인터페이스의 메모리 저장소 (테스트·localStorage 불가 환경용) */
export function createMemoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
  };
}

export function createLocalStorageAdapter(store) {
  const read = (k) => {
    const raw = store.getItem(k);
    if (raw === null || raw === undefined) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const write = (k, v) => store.setItem(k, JSON.stringify(v));

  return {
    kind: 'local',
    async loadStudent(studentId) {
      return read(STUDENT_KEY_PREFIX + studentId);
    },
    async saveStudent(doc) {
      if (!doc?.id) throw new Error('학생 문서에 id 가 없습니다');
      write(STUDENT_KEY_PREFIX + doc.id, doc);
    },
    async loadRecentProblemKeys(studentId) {
      return read(RECENT_KEY_PREFIX + studentId) ?? [];
    },
    async saveRecentProblemKeys(studentId, keys) {
      write(RECENT_KEY_PREFIX + studentId, keys);
    },
    async loadSessionStudentId() {
      return read(SESSION_KEY);
    },
    async saveSessionStudentId(studentId) {
      if (studentId) write(SESSION_KEY, studentId);
      else store.removeItem(SESSION_KEY);
    },
    async loadSchool() {
      return null; // STEP 11
    },
    async loadRankingSummary() {
      return null; // STEP 11
    },
  };
}
