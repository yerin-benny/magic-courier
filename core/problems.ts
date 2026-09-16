import { Fraction, fraction, gcd, div, mul, equal, parseAnswer, AnswerInput } from './rational';
import { RNG, int, seeded } from './random';
import { wordTemplates, WordTemplate } from '../data/words';

export type Type = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
export type Problem = {
  id: string;
  type: Type;
  left: Fraction;
  right: Fraction;
  answer: Fraction;
  key: string;
  difficulty: { level: number; display: 'mixed' | 'fraction'; divisorMixed?: boolean };
  word?: { templateId: number; title: string; text: string; unit: string };
};
export type PublicProblem = Omit<Problem, 'answer' | 'key'>;

const reduced = (x: Fraction) => gcd(x.n, x.d) === 1;
const value = (x: Fraction) => x.n / x.d;
const problemKey = (type: Type, left: Fraction, right: Fraction) =>
  `${type}|${left.n}/${left.d}÷${right.n}/${right.d}`;

function makeProblem(
  type: Type,
  left: Fraction,
  right: Fraction,
  answer = div(left, right),
): Problem {
  return {
    id: '',
    type,
    left,
    right,
    answer,
    key: problemKey(type, left, right),
    difficulty: {
      level: 'ABCDEFG'.indexOf(type) + 1,
      display: answer.n > answer.d ? 'mixed' : 'fraction',
      ...(type === 'F' ? { divisorMixed: right.n > right.d } : {}),
    },
  };
}

function properFractions(minD: number, maxD: number, minN = 1) {
  const out: Fraction[] = [];
  for (let d = minD; d <= maxD; d++)
    for (let n = minN; n < d; n++) if (gcd(n, d) === 1) out.push({ n, d });
  return out;
}

function mixedFractions(minW: number, maxW: number, minD: number, maxD: number) {
  const out: Fraction[] = [];
  for (let w = minW; w <= maxW; w++)
    for (const part of properFractions(minD, maxD)) out.push({ n: w * part.d + part.n, d: part.d });
  return out;
}

// Claude 시안의 생성 규칙을 현재 데이터 모양에 맞춰 옮긴 전수 열거 후보군이다.
// 생성 후 폐기하는 재시도 루프가 없어 모든 RNG에서 최근 60문항 제외가 보장된다.
const pools = new Map<Type, Problem[]>();
function enumerate(type: Type): Problem[] {
  const out: Problem[] = [];
  if (type === 'A') {
    for (let d = 5; d <= 40; d++)
      for (let b = 1; b < d; b++) {
        if (gcd(b, d) !== 1) continue;
        for (let k = 2; k <= 8 && b * k < d; k++) {
          if (gcd(b * k, d) === 1) out.push(makeProblem(type, { n: b * k, d }, { n: b, d }));
        }
      }
  } else if (type === 'B') {
    for (let d = 5; d <= 25; d++)
      for (let a = 1; a < d; a++) {
        if (gcd(a, d) !== 1) continue;
        for (let b = 2; b <= Math.min(12, d - 1); b++) {
          if (gcd(b, d) !== 1 || a % b === 0) continue;
          const answer = fraction(a, b);
          if (answer.d <= 12) out.push(makeProblem(type, { n: a, d }, { n: b, d }, answer));
        }
      }
  } else if (type === 'C' || type === 'E') {
    const dividends = properFractions(2, 25);
    const divisors = properFractions(2, 25, type === 'E' ? 2 : 1);
    for (const left of dividends)
      for (const right of divisors) {
        if (left.d === right.d) continue;
        const answer = div(left, right);
        if (answer.d <= 39 && value(answer) <= 10 && !equal(answer, fraction(1)))
          out.push(makeProblem(type, left, right, answer));
      }
  } else if (type === 'D') {
    for (let n = 2; n <= 24; n++)
      for (let d = 2; d <= 30; d++)
        for (let b = 1; b < d; b++) {
          if (n % b || b === n || gcd(b, d) !== 1) continue;
          const answer = fraction((n / b) * d);
          if (answer.n <= 60) out.push(makeProblem(type, fraction(n), { n: b, d }, answer));
        }
  } else if (type === 'F') {
    const dividends = mixedFractions(1, 5, 2, 12);
    const divisors = [...properFractions(2, 12), ...mixedFractions(1, 3, 2, 12)];
    for (const left of dividends)
      for (const right of divisors) {
        const answer = div(left, right);
        if (value(answer) <= 15 && answer.d <= 15 && !equal(answer, fraction(1)))
          out.push(makeProblem(type, left, right, answer));
      }
  } else {
    const multipliers = properFractions(2, 12);
    const answers: Fraction[] = [];
    for (let d = 1; d <= 12; d++)
      for (let n = 1; n <= 3 * d; n++) if (gcd(n, d) === 1 && n !== d) answers.push({ n, d });
    for (const answer of answers)
      for (const right of multipliers) {
        const left = mul(answer, right);
        if (left.n < left.d && left.d <= 39) out.push(makeProblem(type, left, right, answer));
      }
  }
  return out;
}

function pool(type: Type) {
  if (!pools.has(type)) {
    const items = enumerate(type);
    if (items.length < 61) throw Error(`불충분한 후보군 ${type}`);
    pools.set(type, items);
  }
  return pools.get(type)!;
}

function pick<T extends { key: string }>(items: readonly T[], r: RNG, recent: readonly string[]) {
  const excluded = new Set(recent);
  const start = int(r, 0, items.length - 1);
  for (let offset = 0; offset < items.length; offset++) {
    const item = items[(start + offset) % items.length];
    if (!excluded.has(item.key)) return item;
  }
  throw Error('문제 후보군이 부족해요.');
}

export function generate(
  type: Type,
  r: RNG,
  recent: readonly string[] = [],
  id = 'question',
): Problem {
  return { ...pick(pool(type), r, recent), id };
}

const wordPools = new Map<number, Problem[]>();
const wholeFractions = (min: number, max: number) =>
  Array.from({ length: max - min + 1 }, (_, i) => fraction(min + i));

function enumerateWord(template: WordTemplate) {
  const pairs: { left: Fraction; right: Fraction; answer: Fraction }[] = [];
  if (template.group === 1) {
    const dividends = [...wholeFractions(2, 9), ...mixedFractions(1, 4, 2, 9)];
    const divisors = properFractions(2, 9);
    for (const left of dividends)
      for (const right of divisors) {
        const answer = div(left, right);
        if (answer.d === 1 && answer.n >= 2 && answer.n <= 30) pairs.push({ left, right, answer });
      }
  } else if (template.id >= 18) {
    const dividends = [...properFractions(2, 12), ...mixedFractions(1, 4, 2, 12)];
    const divisors = properFractions(2, 12);
    for (const left of dividends)
      for (const right of divisors) {
        const answer = div(left, right);
        if (value(answer) > 1 && value(answer) <= 10 && answer.d <= 12)
          pairs.push({ left, right, answer });
      }
  } else {
    const ranges: Record<number, [number, number, number]> = {
      11: [2, 20, 60],
      12: [2, 24, 60],
      13: [2, 20, 48],
      14: [2, 12, 30],
      15: [10, 90, 99],
      16: [2, 12, 30],
      17: [2, 20, 40],
    };
    const [min, max, cap] = ranges[template.id];
    const divisors = template.time
      ? [2, 3, 4, 6, 12].flatMap((d) =>
          Array.from({ length: d - 1 }, (_, i) => ({ n: i + 1, d })).filter(reduced),
        )
      : properFractions(2, 9);
    for (const left of wholeFractions(min, max))
      for (const right of divisors) {
        const answer = div(left, right);
        if (value(answer) <= cap) pairs.push({ left, right, answer });
      }
  }
  return pairs.map(({ left, right, answer }) => ({
    ...makeProblem(template.group === 1 ? 'A' : 'C', left, right, answer),
    key: `W${template.id}|${left.n}/${left.d}÷${right.n}/${right.d}`,
    word: {
      templateId: template.id,
      title: template.title,
      text: template.render(left, right),
      unit: template.unit,
    },
  }));
}

export function generateWord(
  template: WordTemplate,
  r: RNG,
  recent: readonly string[] = [],
  id = 'word',
): Problem {
  if (!wordPools.has(template.id)) wordPools.set(template.id, enumerateWord(template));
  return { ...pick(wordPools.get(template.id)!, r, recent), id };
}

export const composition: readonly (readonly (Type | 1 | 2)[])[] = [
  ['A', 'B', 'D', 'G', 1],
  ['A', 'C', 'E', 'F', 2],
  ['B', 'C', 'D', 'G', 1],
  ['A', 'E', 'F', 'C', 2],
];

export function deliveryProblems(index: number, seed: number, recent: readonly string[]) {
  const r = seeded(seed),
    queue = [...recent],
    problems: Problem[] = [];
  for (const [i, t] of composition[index % 4].entries()) {
    const id = `q${i}-${seed}`;
    const templates = typeof t === 'number' ? wordTemplates.filter((w) => w.group === t) : [];
    const p =
      typeof t === 'number'
        ? generateWord(templates[int(r, 0, templates.length - 1)], r, queue, id)
        : generate(t, r, queue, id);
    problems.push(p);
    queue.push(p.key);
    if (queue.length > 60) queue.shift();
  }
  return { problems, recent: queue };
}

export function publicProblem(p: Problem): PublicProblem {
  const { answer, key, ...rest } = p;
  void answer;
  void key;
  return rest;
}

export function grade(p: Problem, input: AnswerInput): 'correct' | 'simplify' | 'wrong' {
  const parsed = parseAnswer(input);
  if (
    p.type === 'E' &&
    (!/^\d{1,4}$/.test(input.reciprocalN ?? '') ||
      !/^\d{1,4}$/.test(input.reciprocalD ?? '') ||
      Number(input.reciprocalD) === 0)
  )
    throw Error('역수의 분자와 분모도 입력해요.');
  if (
    p.type === 'E' &&
    (Number(input.reciprocalN) !== p.right.d || Number(input.reciprocalD) !== p.right.n)
  )
    return 'wrong';
  if (!equal(parsed.value, p.answer)) return 'wrong';
  return parsed.reduced ? 'correct' : 'simplify';
}

export function hint(p: PublicProblem, attempt: number) {
  if (p.type === 'G')
    return attempt < 2
      ? '빈칸은 결과를 곱한 수로 나누어 구해요.'
      : '오른쪽 결과에 곱한 분수의 역수를 곱해 보세요.';
  if (p.type === 'A' || p.type === 'B')
    return '분모가 같으면 분자끼리 나누어 보세요. 나누어떨어지지 않으면 분수로 나타내요.';
  if (p.type === 'F') return '대분수를 가분수로 바꾼 뒤, 나누는 분수를 뒤집어 곱해요.';
  return attempt < 2
    ? '나누는 분수의 분자와 분모를 바꾸어 곱해요.'
    : '분자끼리, 분모끼리 곱하고 공통 약수로 줄여 보세요.';
}
