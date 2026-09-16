// 오답 1회 뒤에 보여 주는 힌트. 유형별 한 줄. 답을 알려주지 않고 절차만 상기시킨다.

const HINTS = Object.freeze({
  A: '분모가 같으니 분자끼리 나누어 보세요.',
  B: '분모가 같으니 분자끼리 나누어 보세요. 나누어떨어지지 않으면 분수로 나타내요.',
  C: '나누는 분수를 뒤집어서 곱해 보세요.',
  D: '자연수를 나누는 분수의 분자로 나눈 다음, 분모를 곱해 보세요.',
  E: '나누는 분수의 분자와 분모를 서로 바꾼 것이 역수예요. 그 역수를 곱해 보세요.',
  F: '대분수를 먼저 가분수로 바꾼 뒤, 나누는 분수를 뒤집어서 곱해 보세요.',
  G: '곱해서 나온 수를 곱한 수로 나누면 어떤 수가 나와요.',
  W_COUNT: '전체 양을 한 묶음의 양으로 나누는 식을 세워 보세요.',
  W_RATE: '전체 양을 걸린 시간이나 사용한 양으로 나누면 1만큼의 양이 나와요.',
  W_RATIO: '비교하는 양을 기준이 되는 양으로 나누어 보세요.',
});

export function hintFor(problem) {
  if (problem.type === 'W') {
    const kind = problem.rangeKind ?? (problem.group === 1 ? 'count' : problem.contextId >= 18 ? 'ratio' : 'rate');
    if (kind === 'count') return HINTS.W_COUNT;
    if (kind === 'ratio') return HINTS.W_RATIO;
    return HINTS.W_RATE;
  }
  const h = HINTS[problem.type];
  if (!h) throw new Error(`힌트가 없는 유형: ${problem.type}`);
  return h;
}

export { HINTS };
