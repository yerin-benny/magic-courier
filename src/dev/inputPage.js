// 개발용 페이지: 답 입력 컴포넌트를 실제 생성기 문항과 함께 단독 시험한다.
// npm run dev 후 /dev/input.html
//
// 시험 항목
//   - 유형 A~G, 문장제 문항을 뽑아 풀어 본다 (유형 E는 역수 배치)
//   - 채점 결과: 정답 / 약분필요(시도 차감 없음) / 오답 / 입력 거부
//   - 물리 키보드와 화면 키패드 동시 입력

import '../styles/fractionView.css';
import { createRng } from '../core/random.js';
import { GRADE, REDUCE_MESSAGE, gradeAnswer, gradeTypeE } from '../core/grade.js';
import { rationalToFraction } from '../core/fraction.js';
import { fractionText } from '../core/josa.js';
import { TYPES, pickProblem, generateWordProblem, createRecentQueue } from '../generators/index.js';
import { sentenceSegments as typeGSegments } from '../generators/types/typeG.js';
import { createFractionInput } from '../ui/components/fractionInput.js';
import { renderFraction, renderBlankFraction, renderOp, renderSegments } from '../ui/components/fractionView.js';

const rng = createRng();
const recent = createRecentQueue();

const app = document.getElementById('app');
app.innerHTML = `
  <style>
    .dev { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
    .dev h1 { font-size: 20px; margin: 0; }
    .dev__picker { display: flex; flex-wrap: wrap; gap: 6px; }
    .dev__picker button { padding: 8px 12px; border: 2px solid var(--brown); border-radius: 8px; background: #fff; font: inherit; cursor: pointer; }
    .dev__picker button.is-active { background: var(--amber); color: #fff; border-color: var(--amber); }
    .dev__problem { background: #fff; border-radius: 12px; padding: 20px; font-size: 26px; min-height: 60px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .dev__problem--word { font-size: 20px; line-height: 1.5; }
    .dev__status { display: flex; gap: 16px; font-size: 14px; color: var(--brown); flex-wrap: wrap; }
    .dev__log { font-size: 13px; color: var(--purple); background: #fff; border-radius: 8px; padding: 8px 12px; max-height: 140px; overflow: auto; }
  </style>
  <div class="dev">
    <h1>답 입력 컴포넌트 시험</h1>
    <div class="dev__picker" id="picker"></div>
    <div class="dev__problem" id="problem"></div>
    <div id="input"></div>
    <div class="dev__status">
      <span id="attempts">시도 0회</span>
      <span id="firstTry">첫 시도 정답 자격: 유지</span>
      <span id="answerPeek"></span>
    </div>
    <div class="dev__log" id="log"></div>
  </div>
`;

const pickerEl = document.getElementById('picker');
const problemEl = document.getElementById('problem');
const inputHost = document.getElementById('input');
const attemptsEl = document.getElementById('attempts');
const firstTryEl = document.getElementById('firstTry');
const peekEl = document.getElementById('answerPeek');
const logEl = document.getElementById('log');

let current = null;
let input = null;
let attempts = 0;
let firstTryEligible = true;
let showAnswer = false;

function log(text) {
  const line = document.createElement('div');
  line.textContent = `${new Date().toLocaleTimeString()} ${text}`;
  logEl.prepend(line);
}

function renderProblem(p) {
  problemEl.replaceChildren();
  problemEl.classList.toggle('dev__problem--word', p.type === 'W' || p.type === 'G');
  // 문장 안의 분수는 세로 분수로 그린다. 평문(p.text)을 그대로 쓰지 않는다.
  if (p.type === 'W') {
    problemEl.append(renderSegments(p.segments));
    return;
  }
  if (p.type === 'G') {
    problemEl.append(renderSegments(typeGSegments(p)));
    return;
  }
  if (p.type === 'E') {
    problemEl.append(renderFraction(p.dividend), renderOp('÷'), renderFraction(p.divisor), renderOp('='),
      renderFraction(p.dividend), renderOp('×'), renderBlankFraction(), renderOp('='), document.createTextNode('?'));
    return;
  }
  problemEl.append(renderFraction(p.dividend), renderOp('÷'), renderFraction(p.divisor), renderOp('='), document.createTextNode('?'));
}

function updateStatus() {
  attemptsEl.textContent = `시도 ${attempts}회`;
  firstTryEl.textContent = `첫 시도 정답 자격: ${firstTryEligible ? '유지' : '없음'}`;
  peekEl.textContent = showAnswer && current ? `정답: ${fractionText(rationalToFraction(current.answer))}${current.answerUnit ?? ''}` : '';
}

function load(kind) {
  current = kind === 'W1' ? generateWordProblem(1, { rng, recent })
    : kind === 'W2' ? generateWordProblem(2, { rng, recent })
    : pickProblem(kind, { rng, recent });
  attempts = 0;
  firstTryEligible = true;
  renderProblem(current);
  if (input) input.destroy();
  input = createFractionInput(inputHost, {
    layout: current.type === 'E' ? 'reciprocal' : 'answer',
    onSubmit: handleSubmit,
  });
  input.focus();
  updateStatus();
  log(`[${current.type}] ${current.key}`);
  for (const b of pickerEl.querySelectorAll('button')) b.classList.toggle('is-active', b.dataset.kind === kind);
}

function handleSubmit(values) {
  const res = current.type === 'E' ? gradeTypeE(values, current) : gradeAnswer(values, current.answer);
  const status = res.status;
  if (status === GRADE.REJECTED) {
    const reason = res.reason ?? res.result?.reason ?? (res.reciprocal === GRADE.REJECTED ? '역수 칸' : '');
    input.setMessage(reason === 'zeroDenominator' ? '분모는 0이 될 수 없어요.' : '칸을 다시 확인해 주세요.', 'info');
    log(`입력 거부 (${reason})`);
    return;
  }
  if (status === GRADE.NEEDS_REDUCE) {
    // 시도 차감 없음, 첫 시도 자격 유지
    input.setMessage(REDUCE_MESSAGE, 'reduce');
    log('약분필요 → 재입력 (시도 차감 없음)');
    return;
  }
  attempts += 1;
  if (status === GRADE.CORRECT) {
    input.setMessage(firstTryEligible ? '정답! 첫 시도 정답 (별가루 3)' : '정답! (별가루 1)', 'correct');
    input.lock();
    log(`정답 (시도 ${attempts}회)`);
  } else {
    firstTryEligible = false;
    input.setMessage('다시 한번 생각해 볼까요?', 'wrong');
    input.clear();
    log(`오답 (시도 ${attempts}회)`);
  }
  updateStatus();
}

for (const kind of [...TYPES, 'W1', 'W2']) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.kind = kind;
  b.textContent = kind === 'W1' ? '문장제 1' : kind === 'W2' ? '문장제 2' : `유형 ${kind}`;
  b.addEventListener('click', () => load(kind));
  pickerEl.append(b);
}
const peek = document.createElement('button');
peek.type = 'button';
peek.textContent = '정답 보기';
peek.addEventListener('click', () => { showAnswer = !showAnswer; updateStatus(); });
pickerEl.append(peek);

load('A');
