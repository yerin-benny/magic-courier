// 표시용 분수를 DOM으로 그린다. 대분수는 자연수부 + 세로 분수, 자연수는 숫자만.
// 텍스트는 전부 코드로 렌더링한다 (이미지 안에 글자 없음).

import { isFraction } from '../../core/fraction.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** 표시용 Fraction → <span class="frac"> */
export function renderFraction(f) {
  if (!isFraction(f)) throw new TypeError('표시용 Fraction이 필요합니다');
  const root = el('span', 'frac');
  if (f.num === 0) {
    root.append(el('span', 'frac__whole', String(f.whole)));
    return root;
  }
  if (f.whole > 0) root.append(el('span', 'frac__whole', String(f.whole)));
  const stack = el('span', 'frac__stack');
  stack.append(el('span', 'frac__num', String(f.num)));
  stack.append(el('span', 'frac__den', String(f.den)));
  root.append(stack);
  return root;
}

/** 빈칸 □/□ (유형 E의 역수 자리) */
export function renderBlankFraction() {
  const root = el('span', 'frac');
  const stack = el('span', 'frac__stack');
  stack.append(el('span', 'frac__num', '□'));
  stack.append(el('span', 'frac__den', '□'));
  root.append(stack);
  return root;
}

/** 연산 기호 */
export function renderOp(symbol) {
  return el('span', 'frac-op', symbol);
}

/**
 * 문장 조각 배열(josa.fillSegments 결과)을 DOM으로.
 * 문자열은 글자로, Fraction·숫자는 세로 분수로 그린다. 문장제와 유형 G 문장에 쓴다.
 */
export function renderSegments(segments) {
  const root = el('span', 'sentence');
  for (const s of segments) {
    if (typeof s === 'string') {
      root.append(document.createTextNode(s));
    } else if (typeof s === 'number') {
      root.append(el('span', 'frac', String(s)));
    } else {
      const f = renderFraction(s);
      f.classList.add('frac--inline');
      root.append(f);
    }
  }
  return root;
}
