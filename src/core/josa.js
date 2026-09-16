// 한국어 조사 처리.
// "8/9을(를)" 같은 병기 표기를 쓰지 않는다. 앞 숫자의 한자음 받침에 따라 조사를 확정한다.
//
// 규칙
//   - 자연수: 마지막으로 읽히는 음절의 받침으로 결정 (1 일, 3 삼, 6 육, 7 칠, 8 팔, 10 십 → 받침 있음)
//   - 분수 a/b: "b분의 a"로 읽으므로 분자 a의 받침을 따른다 (8/9 → "구분의 팔" → 을)
//   - 대분수 n과 a/b: 마지막은 역시 분자 a. 연결어는 n의 받침으로 (1과, 2와, 3과, 4와, 5와, 6과, 7과, 8과, 9와)
//   - ㄹ 받침 뒤의 "으로/로"는 "로" (일로, 칠로, 팔로)

import { hasBatchimNumber, isFraction } from './fraction.js';

const PAIRS = {
  '을/를': ['을', '를'],
  '이/가': ['이', '가'],
  '은/는': ['은', '는'],
  '과/와': ['과', '와'],
  '으로/로': ['으로', '로'],
  '아/야': ['아', '야'],
  '이나/나': ['이나', '나'],
  '이라고/라고': ['이라고', '라고'],
};

/** 숫자 n의 한자음 마지막 받침이 ㄹ인지 (으로/로 판정용). 1, 7, 8 로 끝날 때. */
function endsWithRieul(n) {
  // 10, 100처럼 단위(십, 백, 천, 만)로 끝나면 ㄹ 받침이 아니다
  if (n === 0 || n % 10 === 0) return false;
  return [1, 7, 8].includes(n % 10);
}

/** 표시용 분수(또는 자연수)가 어떤 숫자로 끝나는지. 조사 결정에 쓰는 숫자를 돌려준다. */
function lastReadNumber(value) {
  if (typeof value === 'number') return value;
  if (isFraction(value)) {
    return value.num === 0 ? value.whole : value.num;
  }
  throw new TypeError('숫자 또는 표시용 Fraction만 가능합니다');
}

/** value 뒤에 붙을 조사를 돌려준다. type은 '을/를' 같은 쌍 이름. */
export function josa(value, type) {
  const pair = PAIRS[type];
  if (!pair) throw new Error(`알 수 없는 조사 쌍: ${type}`);
  const n = lastReadNumber(value);
  const batchim = hasBatchimNumber(n);
  if (type === '으로/로' && batchim && endsWithRieul(n)) return '로';
  return batchim ? pair[0] : pair[1];
}

/** 한글 낱말의 마지막 글자에 받침이 있는지. 마지막 글자가 한글이 아니면(숫자·영문) 받침 없음으로 본다. */
export function hasBatchimWord(word) {
  const s = String(word).trim();
  if (!s) return false;
  const code = s.charCodeAt(s.length - 1);
  if (code < 0xac00 || code > 0xd7a3) {
    // 숫자로 끝나면 한자음 규칙
    const digit = s[s.length - 1];
    if (/\d/.test(digit)) return hasBatchimNumber(Number(s.match(/\d+$/)[0]));
    return false;
  }
  return (code - 0xac00) % 28 !== 0;
}

/** 낱말 뒤에 붙을 조사. josa()와 같은 쌍 이름을 쓴다. "케이크를", "꿀단지를", "편지를", "빗자루를", "목도리를" */
export function josaWord(word, type) {
  const pair = PAIRS[type];
  if (!pair) throw new Error(`알 수 없는 조사 쌍: ${type}`);
  const batchim = hasBatchimWord(word);
  if (type === '으로/로' && batchim) {
    const code = String(word).trim().charCodeAt(String(word).trim().length - 1);
    if ((code - 0xac00) % 28 === 8) return '로'; // ㄹ 받침
  }
  return batchim ? pair[0] : pair[1];
}

/** 낱말 + 조사 */
export function wordWithJosa(word, type) {
  return `${word}${josaWord(word, type)}`;
}

/** 대분수 연결어. 1과, 2와, 3과, 4와, 5와, 6과, 7과, 8과, 9와 */
export function mixedConnector(whole) {
  return hasBatchimNumber(whole) ? '과' : '와';
}

/** 표시용 분수 → 문자열. "2와 1/3", "3과 1/2", "7/3", "5". 대분수 연결어는 받침 규칙으로. */
export function fractionText(value) {
  if (typeof value === 'number') return String(value);
  if (!isFraction(value)) throw new TypeError('숫자 또는 표시용 Fraction만 가능합니다');
  if (value.num === 0) return String(value.whole);
  const frac = `${value.num}/${value.den}`;
  if (value.whole === 0) return frac;
  return `${value.whole}${mixedConnector(value.whole)} ${frac}`;
}

/** 표시용 분수를 문자열로 만들고 조사를 붙인다. "8/9를", "2와 1/3을", "5를" */
export function fractionWithJosa(value, type) {
  return `${fractionText(value)}${josa(value, type)}`;
}

/**
 * 템플릿 안의 {값:조사} 자리를 채운다.
 * 예: fill('어떤 수에 {a:을/를} 곱했더니 {b:이/가} 되었습니다', { a, b })
 * 조사 없이 {a}만 쓰면 값만 넣는다.
 */
export function fill(template, values) {
  return template.replace(/\{(\w+)(?::([^}]+))?\}/g, (_, key, type) => {
    if (!(key in values)) throw new Error(`템플릿 값이 없습니다: ${key}`);
    const v = values[key];
    return type ? fractionWithJosa(v, type) : fractionText(v);
  });
}

/**
 * fill 과 같은 템플릿을 "조각 배열"로 만든다. 화면에서 분수를 세로 분수로 그리기 위해서다.
 *   문자열 조각은 그대로 글자로, 값 조각(표시용 Fraction 또는 숫자)은 세로 분수로 렌더링한다.
 *   조사는 값 뒤의 문자열 조각 앞에 붙는다.
 * 예: fillSegments('어떤 수에 {a:을/를} 곱했더니', { a }) → ['어떤 수에 ', a, '을 곱했더니']
 */
export function fillSegments(template, values) {
  const segments = [];
  let pending = '';
  const re = /\{(\w+)(?::([^}]+))?\}/g;
  let last = 0;
  let m;
  while ((m = re.exec(template)) !== null) {
    const [whole, key, type] = m;
    if (!(key in values)) throw new Error(`템플릿 값이 없습니다: ${key}`);
    pending += template.slice(last, m.index);
    if (pending) segments.push(pending);
    const v = values[key];
    segments.push(v);
    pending = type ? josa(v, type) : '';
    last = m.index + whole.length;
  }
  pending += template.slice(last);
  if (pending) segments.push(pending);
  return segments;
}

/** 조각 배열을 평문으로. fill 결과와 같다. */
export function segmentsToText(segments) {
  return segments.map((s) => (typeof s === 'string' ? s : fractionText(s))).join('');
}
