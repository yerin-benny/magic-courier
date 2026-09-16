// 유형 E — (분수)÷(분수)를 분수의 곱셈으로 나타내기 (빈칸형)
//
//   a/b ÷ c/d = a/b × □/□   → 역수 칸 d/c 를 채우고, 이어서 계산 결과까지 입력한다.
//   수 범위는 유형 C와 같다. 나누는 분자 c는 2 이상 (역수 칸이 d/1 형태가 되면 안 된다)
//
// 필드: dividend, divisor (표시용), reciprocal (표시용 d/c, 약분 안 함), answer (Rational)
// 채점: 역수 칸은 reciprocal의 분자·분모와 정확히 일치해야 한다 (약분한 역수는 절차가 아니다).
//       계산 결과 칸은 gradeAnswer로 answer와 비교한다.

import { makeFraction } from '../../core/fraction.js';
import { divisionKey, memoize } from '../common.js';
import { enumerateDivisions } from './typeC.js';

export const TYPE = 'E';
export const RULES = Object.freeze({ divisorNumMin: 2 });

export const enumerate = memoize(() =>
  enumerateDivisions({ divisorNumMin: RULES.divisorNumMin }).map(({ dividend, divisor, answer }) => ({
    type: TYPE,
    key: divisionKey(TYPE, dividend, divisor),
    dividend,
    divisor,
    reciprocal: makeFraction({ num: divisor.den, den: divisor.num }),
    answer,
  })),
);
