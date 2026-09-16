// 현재 활성화된 저장 어댑터를 한 곳에서 고른다. 화면과 게임 로직은 여기서만 import 한다.
//   .env.local 에 Firebase 설정이 있으면: FirestoreAdapter (학교 랭킹·서버 판정)
//   설정이 없으면: localStorage 위의 LocalStorageAdapter
//   localStorage 를 쓸 수 없는 환경(테스트, 사생활 보호 모드 등): 메모리 저장소
//
// 설정이 비어 있어도 앱은 그대로 돈다. 랭킹 화면만 "인터넷 연결이 필요해요"로 바뀐다.

import { createLocalStorageAdapter, createMemoryStorage } from './LocalStorageAdapter.js';
import { createFirestoreAdapter } from './FirestoreAdapter.js';
import { isFirebaseConfigured } from '../config/firebase.js';

function pickStore() {
  try {
    const ls = globalThis.localStorage;
    if (!ls) return createMemoryStorage();
    const probe = '__mc_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return createMemoryStorage();
  }
}

const deviceStore = pickStore();

export const storage = isFirebaseConfigured()
  ? createFirestoreAdapter({ deviceStore })
  : createLocalStorageAdapter(deviceStore);

