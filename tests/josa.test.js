// 조사 처리 테스트. "을(를)" 병기가 절대 나오지 않아야 한다.
import { describe, it, expect } from 'vitest';
import { josa, mixedConnector, fractionText, fractionWithJosa, fill, fillSegments, segmentsToText } from '../src/core/josa.js';
import { makeFraction, makeWhole } from '../src/core/fraction.js';

describe('대분수 연결어 1과 2와 3과 4와 5와 6과 7과 8과 9와', () => {
  it('3부 규칙 그대로', () => {
    const expected = ['', '과', '와', '과', '와', '와', '과', '과', '과', '와'];
    for (let n = 1; n <= 9; n++) expect(mixedConnector(n)).toBe(expected[n]);
  });

  it('두 자리 자연수부도 처리한다: 10과, 12와, 13과', () => {
    expect(mixedConnector(10)).toBe('과');
    expect(mixedConnector(12)).toBe('와');
    expect(mixedConnector(13)).toBe('과');
  });
});

describe('fractionText', () => {
  it('3부 예시 표기와 같다', () => {
    expect(fractionText(makeFraction({ whole: 5, num: 1, den: 4 }))).toBe('5와 1/4');
    expect(fractionText(makeFraction({ whole: 1, num: 2, den: 3 }))).toBe('1과 2/3');
    expect(fractionText(makeFraction({ whole: 3, num: 3, den: 19 }))).toBe('3과 3/19');
    expect(fractionText(makeFraction({ whole: 2, num: 16, den: 17 }))).toBe('2와 16/17');
    expect(fractionText(makeFraction({ whole: 13, num: 13, den: 14 }))).toBe('13과 13/14');
  });

  it('진분수, 가분수, 자연수', () => {
    expect(fractionText(makeFraction({ num: 6, den: 7 }))).toBe('6/7');
    expect(fractionText(makeFraction({ num: 7, den: 3 }))).toBe('7/3');
    expect(fractionText(makeWhole(56))).toBe('56');
    expect(fractionText(4)).toBe('4');
  });
});

describe('josa: 분수는 분자의 받침을 따른다', () => {
  it('을/를', () => {
    expect(josa(makeFraction({ num: 8, den: 9 }), '을/를')).toBe('을'); // 구분의 팔을
    expect(josa(makeFraction({ num: 4, den: 7 }), '을/를')).toBe('를'); // 칠분의 사를
    expect(josa(makeFraction({ num: 1, den: 5 }), '을/를')).toBe('을'); // 오분의 일을
    expect(josa(makeFraction({ num: 3, den: 10 }), '을/를')).toBe('을'); // 십분의 삼을
  });

  it('이/가', () => {
    expect(josa(makeFraction({ num: 2, den: 9 }), '이/가')).toBe('가');
    expect(josa(makeFraction({ num: 5, den: 7 }), '이/가')).toBe('가');
    expect(josa(makeFraction({ num: 13, den: 14 }), '이/가')).toBe('이');
    expect(josa(makeFraction({ num: 7, den: 25 }), '이/가')).toBe('이');
  });

  it('대분수도 분자로 결정한다: 2와 1/3을, 1과 2/5를', () => {
    expect(josa(makeFraction({ whole: 2, num: 1, den: 3 }), '을/를')).toBe('을');
    expect(josa(makeFraction({ whole: 1, num: 2, den: 5 }), '을/를')).toBe('를');
  });

  it('자연수', () => {
    expect(josa(4, '을/를')).toBe('를');
    expect(josa(56, '이/가')).toBe('이');
    expect(josa(makeWhole(8), '은/는')).toBe('은');
    expect(josa(20, '은/는')).toBe('은');
  });

  it('으로/로: ㄹ 받침 뒤에는 로', () => {
    expect(josa(1, '으로/로')).toBe('로'); // 일로
    expect(josa(7, '으로/로')).toBe('로'); // 칠로
    expect(josa(8, '으로/로')).toBe('로'); // 팔로
    expect(josa(3, '으로/로')).toBe('으로'); // 삼으로
    expect(josa(6, '으로/로')).toBe('으로'); // 육으로
    expect(josa(10, '으로/로')).toBe('으로'); // 십으로
    expect(josa(2, '으로/로')).toBe('로'); // 이로
  });

  it('알 수 없는 조사 쌍은 예외', () => {
    expect(() => josa(1, '이랑/랑')).toThrow();
  });
});

describe('fractionWithJosa / fill', () => {
  it('유형 G 문장이 병기 없이 나온다', () => {
    const a = makeFraction({ num: 8, den: 9 });
    const b = makeFraction({ num: 2, den: 9 });
    const text = fill('어떤 수에 {a:을/를} 곱했더니 {b:이/가} 되었습니다. 어떤 수는 얼마일까요?', { a, b });
    expect(text).toBe('어떤 수에 8/9을 곱했더니 2/9가 되었습니다. 어떤 수는 얼마일까요?');
    expect(text).not.toMatch(/\(를\)|\(가\)|\(을\)|\(이\)/);
  });

  it('3부 유형 G 예시 열 개의 조사', () => {
    const cases = [
      [[4, 7], [5, 7], '4/7를', '5/7가'], // 칠분의 사를
      [[8, 11], [9, 11], '8/11을', '9/11가'],
      [[1, 5], [7, 25], '1/5을', '7/25이'],
      [[3, 10], [7, 8], '3/10을', '7/8이'],
      [[3, 7], [13, 14], '3/7을', '13/14이'],
      [[1, 10], [1, 16], '1/10을', '1/16이'],
      [[4, 9], [5, 27], '4/9를', '5/27가'],
      [[3, 4], [5, 16], '3/4을', '5/16가'],
      [[1, 5], [3, 8], '1/5을', '3/8이'],
    ];
    for (const [[an, ad], [bn, bd], ea, eb] of cases) {
      expect(fractionWithJosa(makeFraction({ num: an, den: ad }), '을/를')).toBe(ea);
      expect(fractionWithJosa(makeFraction({ num: bn, den: bd }), '이/가')).toBe(eb);
    }
  });

  it('조사 없는 자리와 자연수', () => {
    expect(fill('{n:을/를} {k}개씩', { n: makeWhole(6), k: 3 })).toBe('6을 3개씩');
    expect(fill('{f} m', { f: makeFraction({ whole: 2, num: 3, den: 4 }) })).toBe('2와 3/4 m');
  });

  it('템플릿 값이 없으면 예외', () => {
    expect(() => fill('{x:을/를}', {})).toThrow();
  });
});

describe('fillSegments (화면용 조각)', () => {

  it('문자열과 분수 조각으로 나뉘고 조사는 뒤 문자열에 붙는다', () => {
    const a = makeFraction({ num: 3, den: 11 });
    const b = makeFraction({ num: 5, den: 33 });
    const seg = fillSegments('어떤 수에 {a:을/를} 곱했더니 {b:이/가} 되었습니다.', { a, b });
    expect(seg).toEqual(['어떤 수에 ', a, '을 곱했더니 ', b, '가 되었습니다.']);
    expect(segmentsToText(seg)).toBe('어떤 수에 3/11을 곱했더니 5/33가 되었습니다.');
  });

  it('fill 과 같은 평문이 된다 (단위 뒤 조사, 앞뒤 순서 바뀐 자리)', () => {
    const a = makeWhole(16);
    const b = makeFraction({ num: 7, den: 8 });
    const t = '페인트 {b} L로 벽 {a} m²를 칠했습니다.';
    expect(segmentsToText(fillSegments(t, { a, b }))).toBe(fill(t, { a, b }));
    expect(fillSegments(t, { a, b })[1]).toBe(b);
  });

  it('값이 없으면 예외', () => {
    expect(() => fillSegments('{x}', {})).toThrow();
  });
});
