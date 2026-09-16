// 로그인·계정 생성 (spec 8장). DOM 없음.
//   학교 선택 + 닉네임 + PIN 4자리.
//   같은 학교·같은 닉네임 문서가 있으면 PIN 을 대조하고, 없으면 새로 만든다.
//
// login(storage, { schoolId, nickname, pin }) →
//   { status: 'ok' | 'created', doc }
//   { status: 'invalidSchool' | 'invalidNickname' | 'invalidPin' | 'wrongPin', message }

import { SCHOOLS as SCHOOL_LIST, SCHOOL_BY_ID as SCHOOL_MAP } from '../data/schools.js';
import { validateNickname, normalizeNickname } from '../data/nicknameFilter.js';
import { hashPin, isValidPin } from '../core/hash.js';
import { studentIdOf } from '../storage/StorageAdapter.js';
import { createStudentDoc } from './studentDoc.js';

// 학교 데이터는 src/data/schools.js 에 있다. 기존 호출부를 위해 여기서도 그대로 내보낸다.
export const SCHOOLS = SCHOOL_LIST;
export const SCHOOL_BY_ID = SCHOOL_MAP;

export const AUTH_MESSAGES = Object.freeze({
  invalidSchool: '학교를 목록에서 골라 주세요.',
  invalidPin: 'PIN 은 숫자 4자리예요.',
  wrongPin: 'PIN 이 달라요. 다시 확인해 주세요.',
});

export async function login(storage, { schoolId, nickname, pin }) {
  // 서버 저장소면 PIN 확인과 문서 생성은 Cloud Functions 가 한다 (spec 9-1).
  // 입력 형식 검사는 네트워크를 타기 전에 여기서 먼저 걸러 준다.
  if (storage?.login) {
    const pre = validateCredentials({ schoolId, nickname, pin });
    if (pre) return pre;
    return storage.login({ schoolId, nickname: validateNickname(nickname).nickname, pin });
  }
  if (!SCHOOL_BY_ID[schoolId]) return { status: 'invalidSchool', message: AUTH_MESSAGES.invalidSchool };
  const nick = validateNickname(nickname);
  if (!nick.ok) return { status: 'invalidNickname', message: nick.message, reason: nick.reason };
  if (!isValidPin(pin)) return { status: 'invalidPin', message: AUTH_MESSAGES.invalidPin };

  const id = studentIdOf(schoolId, normalizeNickname(nick.nickname));
  const pinHash = await hashPin({ schoolId, nickname: nick.nickname, pin });
  const existing = await storage.loadStudent(id);
  if (existing) {
    if (existing.pinHash !== pinHash) return { status: 'wrongPin', message: AUTH_MESSAGES.wrongPin };
    await storage.saveSessionStudentId(id);
    return { status: 'ok', doc: existing };
  }
  const doc = createStudentDoc({ schoolId, nickname: nick.nickname, pinHash });
  await storage.saveStudent(doc);
  await storage.saveSessionStudentId(id);
  return { status: 'created', doc };
}

/** 이 기기에 남은 로그인 정보로 학생 문서를 되찾는다. 없으면 null */
/** 형식 검사만 한다. 통과하면 null, 걸리면 login 과 같은 모양의 실패 객체를 돌려준다. */
function validateCredentials({ schoolId, nickname, pin }) {
  if (!SCHOOL_BY_ID[schoolId]) return { status: 'invalidSchool', message: AUTH_MESSAGES.invalidSchool };
  const nick = validateNickname(nickname);
  if (!nick.ok) return { status: 'invalidNickname', message: nick.message, reason: nick.reason };
  if (!isValidPin(pin)) return { status: 'invalidPin', message: AUTH_MESSAGES.invalidPin };
  return null;
}

export async function resumeSession(storage) {
  const id = await storage.loadSessionStudentId();
  if (!id) return null;
  return storage.loadStudent(id);
}

export async function logout(storage) {
  if (storage?.logout) return storage.logout();
  await storage.saveSessionStudentId(null);
}
