// 채점 규칙 3종 테스트 (spec 5장). 약분필요와 자연수 답 경계 사례에 집중한다.
import { describe, it, expect } from 'vitest';
import { gradeAnswer, gradeTypeE, parseInput, GRADE, REDUCE_MESSAGE } from '../src/core/grade.js';
import { makeRational, makeFraction } from '../src/core/fraction.js';

const r = (n, d = 1) => makeRational(n, d);
const input = (whole, num, den) => ({ whole, num, den });

describe('정답 판정', () => {
  it('기약 진분수', () => {
    expect(gradeAnswer(input('', '3', '4'), r(3, 4)).status).toBe(GRADE.CORRECT);
  });

  it('자연수 칸에 0을 명시해도 정답', () => {
    expect(gradeAnswer(input('0', '3', '4'), r(3, 4)).status).toBe(GRADE.CORRECT);
  });

  it('숫자 타입 입력도 받는다', () => {
    expect(gradeAnswer(input(2, 1, 3), r(7, 3)).status).toBe(GRADE.CORRECT);
  });

  it('공백이 섞인 문자열도 받는다', () => {
    expect(gradeAnswer(input(' 2 ', ' 1', '3 '), r(7, 3)).status).toBe(GRADE.CORRECT);
  });

  it('정답을 표시용 Fraction으로 줘도 된다', () => {
    expect(gradeAnswer(input('', '6', '7'), makeFraction({ num: 6, den: 7 })).status).toBe(GRADE.CORRECT);
    expect(gradeAnswer(input('', '6', '7'), makeFraction({ num: 12, den: 14 })).status).toBe(GRADE.CORRECT);
  });
});

describe('5-2 가분수와 대분수는 같은 답', () => {
  it('7/3 과 2와 1/3 둘 다 정답', () => {
    expect(gradeAnswer(input('', '7', '3'), r(7, 3)).status).toBe(GRADE.CORRECT);
    expect(gradeAnswer(input('2', '1', '3'), r(7, 3)).status).toBe(GRADE.CORRECT);
  });

  it('3부 예시: 5와 1/4, 21/4', () => {
    expect(gradeAnswer(input('5', '1', '4'), r(21, 4)).status).toBe(GRADE.CORRECT);
    expect(gradeAnswer(input('', '21', '4'), r(21, 4)).status).toBe(GRADE.CORRECT);
  });

  it('자연수부를 잘못 나눈 대분수 (1과 4/3 = 7/3)는 값은 맞으나 정리 필요', () => {
    const res = gradeAnswer(input('1', '4', '3'), r(7, 3));
    expect(res.status).toBe(GRADE.NEEDS_REDUCE);
  });
});

describe('5-1 약분이 덜 된 답은 오답이 아니다', () => {
  it('6/8 (정답 3/4) → 약분필요', () => {
    const res = gradeAnswer(input('', '6', '8'), r(3, 4));
    expect(res.status).toBe(GRADE.NEEDS_REDUCE);
    expect(res.reason).toBe('notReduced');
  });

  it('대분수의 분수부가 약분 안 됨: 2와 2/4 (정답 5/2)', () => {
    expect(gradeAnswer(input('2', '2', '4'), r(5, 2)).status).toBe(GRADE.NEEDS_REDUCE);
  });

  it('가분수가 약분 안 됨: 14/4 (정답 7/2)', () => {
    expect(gradeAnswer(input('', '14', '4'), r(7, 2)).status).toBe(GRADE.NEEDS_REDUCE);
  });

  it('답이 자연수인데 분수 칸으로 6/3 → 약분필요 (오답 아님)', () => {
    expect(gradeAnswer(input('', '6', '3'), r(2)).status).toBe(GRADE.NEEDS_REDUCE);
  });

  it('답이 자연수인데 2/1로 입력 → 기약이므로 정답', () => {
    expect(gradeAnswer(input('', '2', '1'), r(2)).status).toBe(GRADE.CORRECT);
  });

  it('대분수 형태로 자연수: 1과 3/3 (= 2) → 약분필요', () => {
    expect(gradeAnswer(input('1', '3', '3'), r(2)).status).toBe(GRADE.NEEDS_REDUCE);
  });

  it('자연수 2를 2, 0/5 로 입력 → 약분필요 (분수 칸을 비우면 된다)', () => {
    const res = gradeAnswer(input('2', '0', '5'), r(2));
    expect(res.status).toBe(GRADE.NEEDS_REDUCE);
    expect(res.reason).toBe('zeroNumerator');
  });

  it('값이 다르면 약분 여부와 무관하게 오답', () => {
    expect(gradeAnswer(input('', '6', '9'), r(3, 4)).status).toBe(GRADE.WRONG);
  });

  it('안내 문구가 spec 문장과 같다', () => {
    expect(REDUCE_MESSAGE).toBe('거의 다 왔어요. 더 간단히 줄일 수 있어요.');
  });
});

describe('5-3 자연수 답', () => {
  it('자연수 칸만 채우면 정답', () => {
    expect(gradeAnswer(input('56', '', ''), r(56)).status).toBe(GRADE.CORRECT);
    expect(gradeAnswer(input('4', null, undefined), r(4)).status).toBe(GRADE.CORRECT);
  });

  it('자연수 칸만 채웠는데 답이 분수면 오답', () => {
    expect(gradeAnswer(input('2', '', ''), r(7, 3)).status).toBe(GRADE.WRONG);
  });

  it('자연수 칸만 채웠는데 값이 다르면 오답', () => {
    expect(gradeAnswer(input('5', '', ''), r(4)).status).toBe(GRADE.WRONG);
  });

  it('자연수 답에 분모 1을 요구하지 않는다: 56 과 56/1 둘 다 정답', () => {
    expect(gradeAnswer(input('56', '', ''), r(56)).status).toBe(GRADE.CORRECT);
    expect(gradeAnswer(input('', '56', '1'), r(56)).status).toBe(GRADE.CORRECT);
    expect(gradeAnswer(input('56', '0', '1'), r(56)).status).toBe(GRADE.NEEDS_REDUCE);
  });

  it('자연수 0도 자연수 칸만으로 판정', () => {
    expect(gradeAnswer(input('0', '', ''), r(0)).status).toBe(GRADE.CORRECT);
    expect(gradeAnswer(input('0', '', ''), r(1)).status).toBe(GRADE.WRONG);
  });
});

describe('오답', () => {
  it('값이 다르면 오답', () => {
    expect(gradeAnswer(input('', '3', '5'), r(3, 4)).status).toBe(GRADE.WRONG);
    expect(gradeAnswer(input('1', '1', '3'), r(7, 3)).status).toBe(GRADE.WRONG);
  });

  it('분자 분모를 뒤집어 쓰면 오답', () => {
    expect(gradeAnswer(input('', '4', '3'), r(3, 4)).status).toBe(GRADE.WRONG);
  });
});

describe('입력 거부 (오답으로 세지 않는다)', () => {
  it('분모 0', () => {
    const res = gradeAnswer(input('', '3', '0'), r(3, 4));
    expect(res.status).toBe(GRADE.REJECTED);
    expect(res.reason).toBe('zeroDenominator');
  });

  it('분모 0인데 자연수부가 있어도 거부', () => {
    expect(gradeAnswer(input('2', '1', '0'), r(2)).status).toBe(GRADE.REJECTED);
  });

  it('전부 비어 있음', () => {
    expect(gradeAnswer(input('', '', ''), r(3, 4)).reason).toBe('empty');
    expect(gradeAnswer({}, r(3, 4)).status).toBe(GRADE.REJECTED);
  });

  it('분자만 또는 분모만 채움', () => {
    expect(gradeAnswer(input('', '3', ''), r(3, 4)).reason).toBe('incompleteFraction');
    expect(gradeAnswer(input('', '', '4'), r(3, 4)).reason).toBe('incompleteFraction');
    expect(gradeAnswer(input('2', '', '4'), r(3, 4)).reason).toBe('incompleteFraction');
  });

  it('숫자가 아닌 입력', () => {
    expect(gradeAnswer(input('', 'a', '4'), r(3, 4)).reason).toBe('notNumber');
    expect(gradeAnswer(input('', '-3', '4'), r(3, 4)).reason).toBe('notNumber');
    expect(gradeAnswer(input('', '1.5', '4'), r(3, 4)).reason).toBe('notNumber');
    expect(gradeAnswer(input('', 1.5, 4), r(3, 4)).reason).toBe('notNumber');
    expect(gradeAnswer(input('', '3', '4 5'), r(3, 4)).reason).toBe('notNumber');
  });
});

describe('parseInput', () => {
  it('자연수만 → wholeOnly', () => {
    const p = parseInput(input('7', '', ''));
    expect(p.ok).toBe(true);
    expect(p.wholeOnly).toBe(true);
    expect(p.fraction).toEqual({ kind: 'fraction', whole: 7, num: 0, den: 1 });
  });

  it('표시용 분수는 약분되지 않은 채로 온다', () => {
    const p = parseInput(input('', '6', '8'));
    expect(p.fraction).toEqual({ kind: 'fraction', whole: 0, num: 6, den: 8 });
  });
});

describe('유형 E 채점 (역수 2칸 + 결과 3칸)', () => {
  // 1/12 ÷ 11/24 = 1/12 × 24/11 = 2/11
  const problem = { divisor: makeFraction({ num: 11, den: 24 }), answer: makeRational(2, 11) };
  const e = (recNum, recDen, whole, num, den) => ({ recNum, recDen, whole, num, den });

  it('역수와 결과가 모두 맞으면 정답', () => {
    expect(gradeTypeE(e('24', '11', '', '2', '11'), problem).status).toBe(GRADE.CORRECT);
  });

  it('역수가 틀리면 결과가 맞아도 오답', () => {
    const r = gradeTypeE(e('11', '24', '', '2', '11'), problem);
    expect(r.reciprocal).toBe(GRADE.WRONG);
    expect(r.status).toBe(GRADE.WRONG);
  });

  it('역수는 약분 없이 그대로 뒤집은 값만 인정한다', () => {
    const p2 = { divisor: makeFraction({ num: 2, den: 6 }), answer: makeRational(1, 1) };
    expect(gradeTypeE(e('6', '2', '1', '', ''), p2).reciprocal).toBe(GRADE.CORRECT);
    expect(gradeTypeE(e('3', '1', '1', '', ''), p2).reciprocal).toBe(GRADE.WRONG);
  });

  it('결과가 약분 덜 됐으면 약분필요', () => {
    expect(gradeTypeE(e('24', '11', '', '4', '22'), problem).status).toBe(GRADE.NEEDS_REDUCE);
  });

  it('역수 칸이 비었거나 분모 0이면 입력 거부', () => {
    expect(gradeTypeE(e('', '', '', '2', '11'), problem).status).toBe(GRADE.REJECTED);
    expect(gradeTypeE(e('24', '0', '', '2', '11'), problem).status).toBe(GRADE.REJECTED);
    expect(gradeTypeE(e('24', '11', '', '', ''), problem).status).toBe(GRADE.REJECTED);
  });
});
