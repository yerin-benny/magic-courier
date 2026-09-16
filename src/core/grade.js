// 채점 (spec 5장).
//
// gradeAnswer(input, answer) → { status, reason? }
//   status:
//     'correct'     값이 같고 정리된 형태
//     'needsReduce' 값은 같지만 약분이 덜 됐거나 형태가 정리되지 않음 (오답 아님, 재입력 유도)
//     'wrong'       값이 다름
//     'rejected'    입력 자체가 비정상 (분모 0, 칸 조합 불완전, 숫자 아님). 오답으로 세지 않는다.
//
// input: { whole, num, den } — 각 칸은 문자열('' 포함), 숫자, null, undefined 중 하나.
//        빈 칸은 '', null, undefined 로 본다.
// answer: 계산용 Rational (기약) 또는 표시용 Fraction.

import { isCanonical, isRational, makeFraction, rationalEquals, toRational } from './fraction.js';

export const GRADE = Object.freeze({
  CORRECT: 'correct',
  NEEDS_REDUCE: 'needsReduce',
  WRONG: 'wrong',
  REJECTED: 'rejected',
});

export const REDUCE_MESSAGE = '거의 다 왔어요. 더 간단히 줄일 수 있어요.';

function isEmpty(v) {
  return v === '' || v === null || v === undefined;
}

/** 칸 하나를 정수로 해석. 빈 칸은 null. 비정상은 NaN. */
function parseCell(v) {
  if (isEmpty(v)) return null;
  if (typeof v === 'number') return Number.isInteger(v) && v >= 0 ? v : NaN;
  if (typeof v !== 'string') return NaN;
  const s = v.trim();
  if (!/^\d+$/.test(s)) return NaN;
  return Number(s);
}

/**
 * 입력 세 칸을 표시용 Fraction으로 바꾼다.
 * 반환: { ok: true, fraction, wholeOnly } 또는 { ok: false, reason }
 * 허용 조합:
 *   자연수만            → 자연수 답
 *   분자+분모           → 진분수/가분수 (자연수 칸 비어 있으면 0)
 *   자연수+분자+분모    → 대분수
 * 거부: 분모 0, 분자·분모 중 하나만 채움, 전부 비어 있음, 숫자 아님
 */
export function parseInput(input) {
  const whole = parseCell(input?.whole);
  const num = parseCell(input?.num);
  const den = parseCell(input?.den);

  if ([whole, num, den].some(Number.isNaN)) {
    return { ok: false, reason: 'notNumber' };
  }
  if (whole === null && num === null && den === null) {
    return { ok: false, reason: 'empty' };
  }
  if ((num === null) !== (den === null)) {
    return { ok: false, reason: 'incompleteFraction' };
  }
  if (den === 0) {
    return { ok: false, reason: 'zeroDenominator' };
  }
  if (num === null) {
    // 자연수만 입력
    return { ok: true, fraction: makeFraction({ whole, num: 0, den: 1 }), wholeOnly: true };
  }
  return { ok: true, fraction: makeFraction({ whole: whole ?? 0, num, den }), wholeOnly: false };
}

/**
 * 유형 E 채점. 역수 칸 두 개 + 계산 결과 세 칸.
 *   input:   { recNum, recDen, whole, num, den }
 *   problem: { divisor, answer } (생성기 유형 E 문항)
 * 반환: { reciprocal: 'correct' | 'wrong' | 'rejected', result: gradeAnswer 결과, status }
 *   status는 둘을 합친 판정이다. 역수가 틀리면 결과와 무관하게 'wrong'.
 *   역수 칸은 나누는 분수를 그대로 뒤집은 값과 정확히 같아야 한다 (약분한 역수는 절차가 아니다).
 */
export function gradeTypeE(input, problem) {
  const recNum = parseCell(input?.recNum);
  const recDen = parseCell(input?.recDen);
  let reciprocal;
  if (Number.isNaN(recNum) || Number.isNaN(recDen)) reciprocal = GRADE.REJECTED;
  else if (recNum === null || recDen === null) reciprocal = GRADE.REJECTED;
  else if (recDen === 0) reciprocal = GRADE.REJECTED;
  else if (recNum === problem.divisor.den && recDen === problem.divisor.num) reciprocal = GRADE.CORRECT;
  else reciprocal = GRADE.WRONG;

  const result = gradeAnswer({ whole: input?.whole, num: input?.num, den: input?.den }, problem.answer);

  let status;
  if (reciprocal === GRADE.REJECTED || result.status === GRADE.REJECTED) status = GRADE.REJECTED;
  else if (reciprocal === GRADE.WRONG || result.status === GRADE.WRONG) status = GRADE.WRONG;
  else if (result.status === GRADE.NEEDS_REDUCE) status = GRADE.NEEDS_REDUCE;
  else status = GRADE.CORRECT;

  return { reciprocal, result, status };
}

export function gradeAnswer(input, answer) {
  const answerRational = isRational(answer) ? answer : toRational(answer);

  const parsed = parseInput(input);
  if (!parsed.ok) {
    return { status: GRADE.REJECTED, reason: parsed.reason };
  }

  const inputRational = toRational(parsed.fraction);
  if (!rationalEquals(inputRational, answerRational)) {
    return { status: GRADE.WRONG };
  }

  // 값이 같다. 형태가 정리됐는지 본다.
  if (parsed.wholeOnly) {
    // 자연수 칸만 채웠고 값이 같으면 답이 자연수인 것 (5-3)
    return { status: GRADE.CORRECT };
  }
  if (parsed.fraction.num === 0) {
    // 분자 0 (예: 2, 0/5) — 값은 맞지만 분수 칸을 헛되이 채운 형태
    return { status: GRADE.NEEDS_REDUCE, reason: 'zeroNumerator' };
  }
  if (!isCanonical(parsed.fraction)) {
    return { status: GRADE.NEEDS_REDUCE, reason: 'notReduced' };
  }
  return { status: GRADE.CORRECT };
}
