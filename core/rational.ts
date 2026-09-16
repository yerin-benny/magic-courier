export type Fraction = { n: number; d: number };
export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
export function fraction(n: number, d = 1): Fraction {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(d) || d === 0)
    throw new Error('유효한 정수와 0이 아닌 분모가 필요해요.');
  const g = gcd(n, d);
  return { n: (n / g) * Math.sign(d), d: Math.abs(d) / g };
}
export function mul(a: Fraction, b: Fraction): Fraction {
  return fraction(a.n * b.n, a.d * b.d);
}
export function div(a: Fraction, b: Fraction): Fraction {
  if (!b.n) throw new Error('0으로 나눌 수 없어요.');
  return fraction(a.n * b.d, a.d * b.n);
}
export function equal(a: Fraction, b: Fraction) {
  return a.n * b.d === b.n * a.d;
}
export function mixed(a: Fraction) {
  return { whole: Math.floor(a.n / a.d), n: a.n % a.d, d: a.d };
}
export function format(a: Fraction): string {
  const m = mixed(a);
  return !m.n ? String(m.whole) : m.whole ? `${m.whole}와 ${m.n}/${m.d}` : `${m.n}/${m.d}`;
}
// Native Korean readings: 일/삼/육/칠/팔/영 end with a consonant; 십/백/천 also do.
export function particle(n: number) {
  const last = n % 10;
  return [0, 1, 3, 6, 7, 8].includes(last) ? '과' : '와';
}
export function spoken(a: Fraction) {
  const m = mixed(a);
  return m.whole && m.n
    ? `${m.whole}${particle(m.whole)} ${m.d}분의 ${m.n}`
    : m.n
      ? `${m.d}분의 ${m.n}`
      : String(m.whole);
}
export type AnswerInput = {
  whole?: string;
  n?: string;
  d?: string;
  reciprocalN?: string;
  reciprocalD?: string;
};
export function parseAnswer(input: AnswerInput): { value: Fraction; reduced: boolean } {
  const w = input.whole?.trim() ?? '',
    n = input.n?.trim() ?? '',
    d = input.d?.trim() ?? '';
  if ([w, n, d].some((v) => v !== '' && !/^\d{1,4}$/.test(v)))
    throw new Error('각 칸에는 0부터 9999까지의 정수를 입력해요.');
  if (!w && !n && !d) throw new Error('답을 입력해 주세요.');
  if (!n && !d) return { value: fraction(Number(w)), reduced: true };
  if (!n || !d || Number(d) === 0) throw new Error('분자와 0보다 큰 분모를 함께 입력해요.');
  return {
    value: fraction(Number(w) * Number(d) + Number(n), Number(d)),
    reduced: gcd(Number(n), Number(d)) === 1,
  };
}
