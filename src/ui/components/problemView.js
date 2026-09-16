// 문항 하나를 화면에 그린다. 유형별 표시 형태:
//   A~D, F:  a ÷ b = ?
//   E:       a ÷ b = a × □/□ = ?
//   G, W:    문장 (분수는 세로 분수)

import { renderFraction, renderBlankFraction, renderOp, renderSegments } from './fractionView.js';
import { sentenceSegments } from '../../generators/types/typeG.js';

export function renderProblem(problem) {
  const root = document.createElement('div');
  root.className = `problem problem--${problem.type}`;

  if (problem.type === 'W') {
    root.classList.add('problem--sentence');
    root.append(renderSegments(problem.segments));
    return root;
  }
  if (problem.type === 'G') {
    root.classList.add('problem--sentence');
    root.append(renderSegments(sentenceSegments(problem)));
    return root;
  }
  const q = document.createElement('span');
  q.className = 'problem__q';
  q.textContent = '?';
  if (problem.type === 'E') {
    root.append(
      renderFraction(problem.dividend), renderOp('÷'), renderFraction(problem.divisor), renderOp('='),
      renderFraction(problem.dividend), renderOp('×'), renderBlankFraction(), renderOp('='), q,
    );
    return root;
  }
  root.append(renderFraction(problem.dividend), renderOp('÷'), renderFraction(problem.divisor), renderOp('='), q);
  return root;
}
