// 분수 표현 코어.
//
// 두 종류의 객체를 엄격히 구분한다.
//   - Fraction (표시용): { kind: 'fraction', whole, num, den }
//       화면에 보이는 그대로. 절대 자동 약분하지 않는다.
//       3부 검수에서 8/22가 4/11로 약분되어 "분모가 같은 유형"이 깨진 사고를 막기 위한 구조다.
//   - Rational (계산용): { kind: 'rational', num, den }
//       항상 기약 가분수 형태로 정규화된다. 값 비교와 사칙연산에만 쓴다.
//
// 표시 함수(formatFraction 등)는 Fraction만 받고 Rational이 들어오면 예외를 던진다.
// Rational을 화면에 보이려면 rationalToFraction으로 명시적으로 바꿔야 한다.

export function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    [a, b] = [b, a % b];
  }
  return a;
}

function assertNonNegInt(v, name) {
  if (!Number.isInteger(v) || v < 0) {
    throw new TypeError(`${name}: 0 이상의 정수여야 합니다 (${v})`);
  }
}

/** 표시용 분수를 만든다. 약분하지 않는다. whole은 대분수의 자연수부. */
export function makeFraction({ whole = 0, num, den }) {
  assertNonNegInt(whole, 'whole');
  assertNonNegInt(num, 'num');
  assertNonNegInt(den, 'den');
  if (den === 0) throw new RangeError('분모는 0이 될 수 없습니다');
  return { kind: 'fraction', whole, num, den };
}

/** 자연수를 표시용 분수로. num 0, den 1로 둔다. */
export function makeWhole(n) {
  assertNonNegInt(n, 'n');
  return { kind: 'fraction', whole: n, num: 0, den: 1 };
}

export function isFraction(f) {
  return !!f && f.kind === 'fraction';
}

export function isRational(r) {
  return !!r && r.kind === 'rational';
}

function assertFraction(f) {
  if (!isFraction(f)) {
    throw new TypeError('표시용 Fraction이 필요합니다. Rational은 rationalToFraction으로 먼저 바꾸세요.');
  }
}

/** 계산용 기약 유리수를 만든다. 항상 약분한다. */
export function makeRational(num, den) {
  if (!Number.isInteger(num) || !Number.isInteger(den)) {
    throw new TypeError('정수만 허용됩니다');
  }
  if (den === 0) throw new RangeError('분모는 0이 될 수 없습니다');
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const g = gcd(num, den) || 1;
  return { kind: 'rational', num: num / g, den: den / g };
}

/** 표시용 분수 → 계산용 유리수 (약분됨). */
export function toRational(f) {
  assertFraction(f);
  return makeRational(f.whole * f.den + f.num, f.den);
}

/** 대분수 표시 → 가분수 표시. 분모는 그대로 유지한다 (약분 없음). */
export function toImproper(f) {
  assertFraction(f);
  return { kind: 'fraction', whole: 0, num: f.whole * f.den + f.num, den: f.den };
}

/** 가분수 표시 → 대분수 표시. 분모는 그대로 유지한다 (약분 없음). */
export function toMixed(f) {
  assertFraction(f);
  const total = f.whole * f.den + f.num;
  return { kind: 'fraction', whole: Math.floor(total / f.den), num: total % f.den, den: f.den };
}

/** 계산용 유리수 → 표시용 대분수 (기약). 화면에 답을 보여줄 때 쓴다. */
export function rationalToFraction(r, { mixed = true } = {}) {
  if (!isRational(r)) throw new TypeError('Rational이 필요합니다');
  if (r.num < 0) throw new RangeError('음수는 표시하지 않습니다');
  const improper = { kind: 'fraction', whole: 0, num: r.num, den: r.den };
  return mixed ? toMixed(improper) : improper;
}

export function rationalEquals(a, b) {
  if (!isRational(a) || !isRational(b)) throw new TypeError('Rational이 필요합니다');
  return a.num === b.num && a.den === b.den;
}

export function isIntegerRational(r) {
  if (!isRational(r)) throw new TypeError('Rational이 필요합니다');
  return r.den === 1;
}

export function multiply(a, b) {
  const ra = isRational(a) ? a : toRational(a);
  const rb = isRational(b) ? b : toRational(b);
  return makeRational(ra.num * rb.num, ra.den * rb.den);
}

export function divide(a, b) {
  const ra = isRational(a) ? a : toRational(a);
  const rb = isRational(b) ? b : toRational(b);
  if (rb.num === 0) throw new RangeError('0으로 나눌 수 없습니다');
  return makeRational(ra.num * rb.den, ra.den * rb.num);
}

/** 표시용 분수가 기약인지. 분자·분모가 서로소인지만 본다. */
export function isReduced(f) {
  assertFraction(f);
  if (f.num === 0) return true;
  return gcd(f.num, f.den) === 1;
}

/**
 * 표시용 분수가 "정리된 형태"인지.
 * 기약이고, 대분수라면 분수부가 진분수여야 한다 (1과 5/3 은 정리 안 됨).
 * 가분수 자체(7/3)는 정리된 형태로 인정한다 (채점 규칙 5-2).
 */
export function isCanonical(f) {
  assertFraction(f);
  if (!isReduced(f)) return false;
  if (f.whole > 0 && f.num >= f.den) return false;
  return true;
}

/** 숫자를 한자음으로 읽었을 때 마지막 음절에 받침이 있는지. josa.js에서 재사용한다. */
export function hasBatchimNumber(n) {
  if (!Number.isInteger(n) || n < 0) throw new TypeError('0 이상의 정수만 가능합니다');
  if (n === 0) return true; // 영
  // 마지막 0이 아닌 자리의 읽기로 결정된다
  let pos = 0;
  while (n % 10 === 0) {
    n = Math.floor(n / 10);
    pos += 1;
  }
  if (pos === 0) {
    const digit = n % 10;
    // 일 삼 육 칠 팔 은 받침 있음, 이 사 오 구 는 없음
    return [1, 3, 6, 7, 8].includes(digit);
  }
  // 십(ㅂ) 백(ㄱ) 천(없음) 만(ㄴ) 십만(ㄴ) 백만(ㄴ) 천만(ㄴ) 억(ㄱ)
  const unitBatchim = [null, true, true, false, true, true, true, true, true];
  return unitBatchim[pos] ?? true;
}
