// 저장 계층 인터페이스. 화면과 게임 로직은 이 인터페이스만 본다.
// 지금은 LocalStorageAdapter(브라우저)와 MemoryStorageAdapter(테스트)가 있고,
// STEP 11에서 FirestoreAdapter 를 같은 모양으로 추가한다.
//
// 모든 메서드는 Promise 를 돌려준다. localStorage 는 동기지만 Firestore 로 갈아끼울 때
// 호출부를 바꾸지 않기 위해서다.
//
// 학생 문서(StudentDoc)의 모양은 src/game/studentDoc.js 에 있다 (spec 10장).
// 학생 문서 id = `${schoolId}:${닉네임 정규화}`. 같은 학교의 같은 닉네임은 하나의 문서다.

/**
 * @typedef {Object} StorageAdapter
 * @property {(studentId: string) => Promise<object|null>} loadStudent            학생 문서
 * @property {(doc: object) => Promise<void>} saveStudent                          학생 문서 전체 저장
 * @property {(studentId: string) => Promise<string[]>} loadRecentProblemKeys     최근 60문항 제외 큐
 * @property {(studentId: string, keys: string[]) => Promise<void>} saveRecentProblemKeys
 * @property {() => Promise<string|null>} loadSessionStudentId                    이 기기에서 마지막으로 로그인한 학생
 * @property {(studentId: string|null) => Promise<void>} saveSessionStudentId
 * @property {(schoolId: string) => Promise<object|null>} loadSchool               학교 문서 (STEP 11)
 * @property {() => Promise<object|null>} loadRankingSummary                       집계 문서 하나 (STEP 11)
 */

export const STUDENT_KEY_PREFIX = 'mc:student:';
export const RECENT_KEY_PREFIX = 'mc:recent:';
export const SESSION_KEY = 'mc:session';

/** 학생 문서 id */
export function studentIdOf(schoolId, nicknameNormalized) {
  return `${schoolId}:${nicknameNormalized}`;
}
