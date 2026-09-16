// 최근 N문항 제외 큐. 유형별이 아니라 전체 문항 기준 하나만 둔다.
//
// 저장 계층(StorageAdapter.loadRecentProblemKeys / saveRecentProblemKeys)에 키 배열로 남겨
// 다음 접속에도 유지된다. 이 모듈은 저장 방식을 모른다. toArray()로 꺼내 저장하고
// createRecentQueue(저장된 배열)로 복원한다.

export const RECENT_LIMIT = 60;

export function createRecentQueue(initialKeys = [], limit = RECENT_LIMIT) {
  const keys = initialKeys.slice(-limit);
  const set = new Set(keys);

  return {
    limit,
    has(key) {
      return set.has(key);
    },
    push(key) {
      if (set.has(key)) {
        // 이미 있으면 맨 뒤로 옮긴다
        keys.splice(keys.indexOf(key), 1);
      }
      keys.push(key);
      set.add(key);
      while (keys.length > limit) {
        set.delete(keys.shift());
      }
    },
    get size() {
      return keys.length;
    },
    toArray() {
      return keys.slice();
    },
  };
}
