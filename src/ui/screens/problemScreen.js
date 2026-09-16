// 7. 문제 풀이 화면 — 문제와 키패드가 한 화면에 들어오게 좌우로 나눈다.
//
// [개편 2026-09-16] 세로 한 줄로 쌓으면 학교 PC(1366×768)에서 키패드가 접혀 스크롤해야 했다.
// 왼쪽에 문제, 오른쪽에 답 칸과 키패드를 둔다. 좁은 화면에서는 위아래로 접힌다.
//
// 진행도는 칸 다섯 개짜리 띠로 보여 주고, 캐릭터가 그 위를 한 칸씩 건너간다.
// (예전에는 따로 트랙을 뒀는데 세로 공간을 많이 먹어서 진행도 띠와 합쳤다.)
//
// 정답 연출: 캐릭터가 한 칸 나아간다. 0.4초 이내. 연타(확인·Enter)하면 즉시 다음 문제.
// 오답 1회: 힌트를 띄우고 재도전. 힌트는 틀린 뒤에만 나온다 (spec 7장).
// 약분필요: 오답 처리하지 않고 안내 문구만 띄운 뒤 다시 입력받는다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { GRADE } from '../../core/grade.js';
import { createFractionInput } from '../components/fractionInput.js';
import { renderProblem } from '../components/problemView.js';
import { getAsset } from '../../../assets/manifest.js';
import { STARDUST_FIRST_TRY, STARDUST_RETRY } from '../../game/deliverySession.js';
import { wordWithJosa } from '../../core/josa.js';

export const CELEBRATE_MS = 380; // 정답 연출 시간 (0.4초 이내)

/** 유형별 꼬리표와 한 줄 안내. 문제를 읽기 전에 무엇을 하는 시간인지 알려 준다. */
const TYPE_INFO = {
  A: { tag: '분수의 나눗셈', line: '차근차근 나누어 볼까요?' },
  B: { tag: '분수의 나눗셈', line: '나누어떨어지지 않아도 괜찮아요.' },
  C: { tag: '분모가 다른 나눗셈', line: '분모가 달라도 방법은 같아요.' },
  D: { tag: '자연수 ÷ 분수', line: '자연수를 분수로 나누어 볼까요?' },
  E: { tag: '곱셈으로 바꾸기', line: '나눗셈을 곱셈으로 바꿔 보세요.' },
  F: { tag: '대분수의 나눗셈', line: '대분수를 먼저 가분수로 바꿔 보세요.' },
  G: { tag: '빈칸 구하기', line: '어떤 수를 곱해야 할까요?' },
  W: { tag: '문장제', line: '문장을 읽고 식을 세워 보세요.' },
};

export function renderProblemScreen(root, params, nav) {
  const session = gameState.session;
  if (!session) {
    nav.go('request');
    return undefined;
  }

  const screen = el('section', 'screen screen--problem');

  // ---- 머리줄: 나가기 · 목적지 · 진행 수 ----
  // 수업 중에 갑자기 멈춰야 할 때가 있다. 나가도 푼 문제는 그대로 남고,
  // 지도에서 "이어서 배달하기"를 누르면 같은 배송의 같은 문제부터 이어진다.
  const head = el('div', 'pb-head');
  head.append(button('‹ 지도', 'pb-back', () => nav.go('map')));
  const destination = gameState.request?.destination ?? '목적지';
  head.append(el('div', 'pb-title', `${wordWithJosa(destination, '으로/로')} 가는 길`));
  const count = el('div', 'pb-count');
  head.append(count);
  screen.append(head);

  // ---- 진행도 띠 + 그 위를 건너가는 캐릭터 ----
  const steps = el('div', 'pb-steps');
  const stepEls = [];
  for (let i = 0; i < session.total; i += 1) {
    const s = el('span', 'pb-step', String(i + 1));
    steps.append(s);
    stepEls.push(s);
  }
  const courier = el('div', 'pb-courier');
  courier.setAttribute('aria-hidden', 'true');
  const sideUrl = getAsset(`characters.side-${gameState.characterId}`);
  if (sideUrl) {
    const img = el('img');
    img.src = sideUrl;
    img.alt = '';
    img.draggable = false;
    courier.append(img);
  } else {
    courier.classList.add('pb-courier--placeholder');
  }
  const stepsWrap = el('div', 'pb-steps-wrap');
  stepsWrap.append(courier, steps);
  screen.append(stepsWrap);

  // ---- 좌우 두 단 ----
  const layout = el('div', 'pb-layout');

  const problemCard = el('div', 'card pb-problem');
  const problemHead = el('div', 'pb-problem__head');
  const stepLabel = el('span', 'pb-problem__no');
  const typeTag = el('span', 'pb-problem__tag');
  problemHead.append(stepLabel, typeTag);
  const typeLine = el('h3', 'pb-problem__line');
  const problemArea = el('div', 'problem-area');
  const foot = el('div', 'pb-problem__foot');
  const reward = el('span', 'pb-reward', `✦ +${STARDUST_FIRST_TRY} · 다시 풀면 +${STARDUST_RETRY}`);
  foot.append(reward);
  const hintBox = el('div', 'hint');
  hintBox.hidden = true;
  problemCard.append(problemHead, typeLine, problemArea, foot, hintBox);

  const answerCard = el('div', 'card pb-answer');
  answerCard.append(el('div', 'pb-answer__title', '나의 답'));
  const inputHost = el('div', 'input-host');
  answerCard.append(inputHost);

  layout.append(problemCard, answerCard);
  screen.append(layout);
  root.append(screen);

  let input = null;
  let celebrating = false;
  let timer = null;

  /** 캐릭터를 진행도 띠의 step 번째 칸 위에 놓는다 */
  function setCourierStep(step, { instant = false } = {}) {
    if (instant) courier.classList.add('pb-courier--instant');
    const slot = Math.min(step, session.total - 1);
    const center = ((slot + 0.5) / session.total) * 100;
    courier.style.left = `${center}%`;
    if (instant) {
      courier.offsetWidth; // 강제 리플로우로 전환 없이 위치 반영
      courier.classList.remove('pb-courier--instant');
    }
  }

  function renderProgress() {
    stepEls.forEach((s, i) => {
      const done = i < session.index;
      s.classList.toggle('is-done', done);
      s.classList.toggle('is-current', i === session.index);
      s.textContent = done ? '✓' : String(i + 1);
    });
    count.textContent = `${Math.min(session.index + 1, session.total)} / ${session.total}`;
  }

  function loadProblem() {
    const problem = session.current();
    const info = TYPE_INFO[problem.type] ?? { tag: '분수의 나눗셈', line: '천천히 풀어 볼까요?' };
    stepLabel.textContent = `${session.index + 1}번째 발걸음`;
    typeTag.textContent = info.tag;
    typeLine.textContent = info.line;
    problemArea.replaceChildren(renderProblem(problem));
    hintBox.hidden = true;
    hintBox.textContent = '';
    if (input) input.destroy();
    input = createFractionInput(inputHost, {
      layout: problem.type === 'E' ? 'reciprocal' : 'answer',
      onSubmit: handleSubmit,
    });
    input.focus();
    renderProgress();
    celebrating = false;
  }

  function goNext() {
    if (timer) clearTimeout(timer);
    timer = null;
    const done = session.advance();
    if (done) {
      nav.go('success');
      return;
    }
    setCourierStep(session.index, { instant: true });
    loadProblem();
  }

  function handleSubmit(values) {
    if (celebrating) {
      // 연타: 연출을 건너뛰고 바로 다음 문제
      goNext();
      return;
    }
    const res = session.submit(values);
    switch (res.status) {
      case GRADE.REJECTED:
        input.setMessage(res.reason === 'zeroDenominator' ? '분모는 0이 될 수 없어요.' : '칸을 다시 확인해 주세요.', 'info');
        return;
      case GRADE.NEEDS_REDUCE:
        input.setMessage(res.message, 'reduce');
        return;
      case GRADE.WRONG:
        input.setMessage('다시 한번 생각해 볼까요?', 'wrong');
        hintBox.textContent = `힌트: ${res.hint}`;
        hintBox.hidden = false;
        input.clear();
        return;
      case GRADE.CORRECT: {
        celebrating = true;
        input.setMessage(`정답! 별가루 +${res.stardust}`, 'correct');
        setCourierStep(session.index + 1);
        timer = setTimeout(goNext, CELEBRATE_MS);
        return;
      }
      default:
        return;
    }
  }

  // 연타 스킵: 연출 중 Enter 를 누르면 바로 다음 문제.
  // 입력 컴포넌트 안에서 난 Enter 는 컴포넌트가 onSubmit 으로 처리하므로 여기서는 건드리지 않는다
  // (같은 키 한 번이 제출과 스킵을 동시에 일으키지 않게).
  function onKey(e) {
    if (!celebrating || e.key !== 'Enter') return;
    if (e.target instanceof Element && e.target.closest('.fraction-input')) return;
    e.preventDefault();
    goNext();
  }
  document.addEventListener('keydown', onKey);

  setCourierStep(0, { instant: true });
  loadProblem();

  return () => {
    document.removeEventListener('keydown', onKey);
    if (timer) clearTimeout(timer);
    if (input) input.destroy();
  };
}
