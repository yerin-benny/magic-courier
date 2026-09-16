// 7. 문제 풀이 화면 — 상단 진행도, 중앙 문제, 하단 3칸 입력과 키패드.
//
// 정답 연출: 캐릭터가 목적지로 한 칸 접근한다. 0.4초 이내. 연타(확인·Enter)하면 즉시 다음 문제.
// 오답 1회: 힌트를 띄우고 재도전. 배송은 유지된다.
// 약분필요: 오답 처리하지 않고 안내 문구만 띄운 뒤 다시 입력받는다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { GRADE } from '../../core/grade.js';
import { createFractionInput } from '../components/fractionInput.js';
import { renderProblem } from '../components/problemView.js';
import { getAsset, parcelFor } from '../../../assets/manifest.js';

export const CELEBRATE_MS = 380; // 정답 연출 시간 (0.4초 이내)

export function renderProblemScreen(root, params, nav) {
  const session = gameState.session;
  if (!session) {
    nav.go('request');
    return undefined;
  }

  const screen = el('section', 'screen screen--problem');

  // ---- 나가기 ----
  // 수업 중에 갑자기 멈춰야 할 때가 있다. 나가도 푼 문제는 그대로 남고,
  // 지도에서 "이어서 배달하기"를 누르면 같은 배송의 같은 문제부터 이어진다.
  const exit = el('div', 'problem-exit');
  exit.append(
    button('지도로 나가기', 'btn btn--sm problem-exit__btn', () => nav.go('map')),
  );
  exit.append(el('span', 'problem-exit__note', '푼 문제는 그대로 남아요'));
  screen.append(exit);

  // ---- 상단 진행도 ----
  const header = el('header', 'progress');
  const dots = el('div', 'progress__dots');
  const dotEls = [];
  for (let i = 0; i < session.total; i++) {
    const d = el('span', 'progress__dot');
    dots.append(d);
    dotEls.push(d);
  }
  const label = el('span', 'progress__label');
  header.append(dots, label);

  // ---- 캐릭터 이동 트랙 ----
  const track = el('div', 'track');
  const path = el('div', 'track__path');
  const courier = el('div', 'courier');
  courier.setAttribute('aria-label', '마법 배달부');
  const sideUrl = getAsset(`characters.side-${gameState.characterId}`);
  if (sideUrl) {
    const img = el('img');
    img.src = sideUrl;
    img.alt = '';
    img.draggable = false;
    courier.append(img);
  } else {
    courier.classList.add('courier--placeholder');
  }
  const goal = el('div', 'track__goal');
  const parcelUrl = parcelFor(gameState.request?.item ?? '');
  if (parcelUrl) {
    const p = el('img');
    p.src = parcelUrl;
    p.alt = '';
    p.draggable = false;
    goal.append(p);
  }
  goal.append(el('span', null, gameState.request?.destination ?? '목적지'));
  track.append(path, courier, goal);

  // ---- 문제 ----
  const problemArea = el('div', 'problem-area card');
  const hintBox = el('div', 'hint');
  hintBox.hidden = true;

  // ---- 입력 ----
  const inputHost = el('div', 'input-host');

  screen.append(header, track, problemArea, hintBox, inputHost);
  root.append(screen);

  let input = null;
  let celebrating = false;
  let timer = null;

  function setCourierStep(step, { instant = false } = {}) {
    if (instant) courier.classList.add('courier--instant');
    // 왼쪽 끝에서 목적지(오른쪽 소포) 바로 앞까지 total 칸으로 나눠 간다
    courier.style.left = `calc(${(step / session.total) * 100}% - ${(step / session.total) * 170}px)`;
    if (instant) {
      courier.offsetWidth; // 강제 리플로우로 전환 없이 위치 반영
      courier.classList.remove('courier--instant');
    }
  }

  function renderProgress() {
    dotEls.forEach((d, i) => {
      d.classList.toggle('is-done', i < session.index);
      d.classList.toggle('is-current', i === session.index);
    });
    label.textContent = `${Math.min(session.index + 1, session.total)} / ${session.total}`;
  }

  function loadProblem() {
    const problem = session.current();
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
