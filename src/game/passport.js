// 여권 (spec 3장, 11장 10번). DOM 없음.
//   여권 1권 = 스탬프 30개 = 방문 순서 1~30번째 국가
//   여권 2권 = 나머지 30개국 = 31~60번째
//   60개국을 다 돌면 방문 목록은 더 늘지 않으므로 여권은 2권으로 끝난다. 이후는 회차만 누적된다.

export const PASSPORT_SIZE = 30;
export const PASSPORT_BOOKS = 2;

/** 방문 순서 배열 → 여권 목록 [{ number, stamps: string[], size, complete }] */
export function passportBooks(visited) {
  const books = [];
  for (let b = 0; b < PASSPORT_BOOKS; b++) {
    const stamps = visited.slice(b * PASSPORT_SIZE, (b + 1) * PASSPORT_SIZE);
    books.push({ number: b + 1, stamps, size: PASSPORT_SIZE, complete: stamps.length >= PASSPORT_SIZE });
  }
  return books;
}

/** 지금 스탬프를 찍고 있는 여권 번호 (1 또는 2). 다 채웠으면 마지막 권. */
export function currentBookNumber(visited) {
  if (visited.length >= PASSPORT_SIZE * PASSPORT_BOOKS) return PASSPORT_BOOKS;
  return Math.floor(visited.length / PASSPORT_SIZE) + 1;
}

/** 방문 수가 before → after 로 늘면서 여권 한 권이 막 완성됐는가 (새 여권 수여 연출 조건) */
export function bookJustCompleted(before, after) {
  for (let b = 1; b < PASSPORT_BOOKS; b++) {
    const line = b * PASSPORT_SIZE;
    if (before < line && after >= line) return b; // 완성된 권 번호
  }
  if (before < PASSPORT_SIZE * PASSPORT_BOOKS && after >= PASSPORT_SIZE * PASSPORT_BOOKS) return PASSPORT_BOOKS;
  return 0;
}
