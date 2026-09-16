// 난수 유틸. 모든 무작위 선택은 여기서 만든 rng를 통해서만 한다.
// 테스트와 검증 스크립트에서 시드를 고정해 같은 결과를 재현하기 위해서다.

/** mulberry32. 시드가 같으면 같은 수열을 낸다. */
export function createRng(seed = Date.now() >>> 0) {
  let a = seed >>> 0;
  function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    /** [0, 1) 실수 */
    next,
    /** min 이상 max 이하 정수 */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** 배열에서 하나 */
    pick(arr) {
      if (!arr.length) throw new RangeError('빈 배열에서 고를 수 없습니다');
      return arr[Math.floor(next() * arr.length)];
    },
    /** 확률 p로 true */
    chance(p) {
      return next() < p;
    },
  };
}
