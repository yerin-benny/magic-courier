// 분수 답 입력 컴포넌트 (spec 6장). 화면 안 키패드 + 물리 키보드 동시 지원.
//
//   createFractionInput(container, { layout, onSubmit })
//     layout   'answer' (자연수/분자/분모 3칸) | 'reciprocal' (역수 2칸 + 결과 3칸, 유형 E)
//     onSubmit(values)  values = { whole, num, den } 또는 { recNum, recDen, whole, num, den } (문자열)
//   반환: { model, setMessage(text, kind), clear(), lock(), unlock(), focus(), destroy() }
//
// 세 칸은 항상 노출한다. 대분수 토글은 없다.
// 칸은 readonly + inputmode="none" 이라 모바일에서 시스템 키보드가 뜨지 않는다.
// 물리 키보드는 컨테이너의 keydown 으로 받는다 (전자칠판·데스크톱).

import { createInputModel } from './inputModel.js';
import '../../styles/fractionInput.css';

const KEYPAD_ROWS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['clear', '0', 'backspace'],
  ['next', 'submit'],
];

const KEY_LABEL = {
  clear: '지우기',
  backspace: '←',
  next: '다음',
  submit: '확인',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createFractionInput(container, { layout = 'answer', onSubmit = () => {} } = {}) {
  const root = el('div', `fraction-input fraction-input--${layout}`);
  root.tabIndex = 0; // 물리 키보드 포커스용

  const cellEls = new Map();

  const model = createInputModel({
    layout,
    onChange: render,
    onSubmit: (values) => onSubmit(values),
  });

  // ---- 칸 영역 ----
  function buildCell(cell) {
    const wrap = el('label', `fi-cell fi-cell--${cell.id}`);
    const input = el('input', 'fi-cell__input');
    input.type = 'text';
    input.readOnly = true;
    input.inputMode = 'none';
    input.setAttribute('aria-label', cell.label);
    input.autocomplete = 'off';
    const caption = el('span', 'fi-cell__label', cell.label);
    wrap.append(input, caption);
    // 칸을 누르면 그 칸으로 포커스
    wrap.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      model.focus(cell.id);
      root.focus();
    });
    cellEls.set(cell.id, input);
    return wrap;
  }

  function buildFractionBlock(wholeId, numId, denId) {
    const block = el('div', 'fi-fraction');
    if (wholeId) block.append(buildCell(model.cells.find((c) => c.id === wholeId)));
    const stack = el('div', 'fi-fraction__stack');
    stack.append(buildCell(model.cells.find((c) => c.id === numId)));
    stack.append(el('div', 'fi-fraction__bar'));
    stack.append(buildCell(model.cells.find((c) => c.id === denId)));
    block.append(stack);
    return block;
  }

  const cellsArea = el('div', 'fi-cells');
  if (layout === 'reciprocal') {
    // a/b × [역수] = [결과]
    cellsArea.append(el('span', 'fi-op', '×'));
    cellsArea.append(buildFractionBlock(null, 'recNum', 'recDen'));
    cellsArea.append(el('span', 'fi-op', '='));
    cellsArea.append(buildFractionBlock('whole', 'num', 'den'));
  } else {
    cellsArea.append(buildFractionBlock('whole', 'num', 'den'));
  }

  // ---- 안내 메시지 ----
  const message = el('div', 'fi-message');
  message.setAttribute('role', 'status');
  message.setAttribute('aria-live', 'polite');

  // ---- 키패드 ----
  const keypad = el('div', 'fi-keypad');
  for (const row of KEYPAD_ROWS) {
    const rowEl = el('div', 'fi-keypad__row');
    for (const key of row) {
      const btn = el('button', `fi-key fi-key--${/^\d$/.test(key) ? 'digit' : key}`, KEY_LABEL[key] ?? key);
      btn.type = 'button';
      btn.dataset.key = key;
      // pointerdown 으로 처리해 터치 지연을 없애고 포커스가 버튼으로 빠지지 않게 한다
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pressKey(key);
        root.focus();
      });
      rowEl.append(btn);
    }
    keypad.append(rowEl);
  }

  function pressKey(key) {
    if (/^\d$/.test(key)) return model.type(key);
    if (key === 'clear') return model.clear();
    if (key === 'backspace') return model.backspace();
    if (key === 'next') return model.next();
    if (key === 'submit') return model.submit();
    return undefined;
  }

  // ---- 물리 키보드 ----
  function onKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (model.handleKey(e.key)) e.preventDefault();
  }
  root.addEventListener('keydown', onKeyDown);

  // ---- 렌더 ----
  function render() {
    const values = model.values();
    for (const cell of model.cells) {
      const input = cellEls.get(cell.id);
      input.value = values[cell.id];
      input.classList.toggle('is-focused', model.focusId === cell.id);
    }
    root.classList.toggle('is-locked', model.locked);
  }

  root.append(cellsArea, message, keypad);
  container.append(root);
  render();

  return {
    model,
    element: root,
    /** kind: 'info' | 'reduce' | 'wrong' | 'correct' */
    setMessage(text, kind = 'info') {
      message.textContent = text ?? '';
      message.className = `fi-message${text ? ` fi-message--${kind}` : ''}`;
    },
    clear() {
      model.clear();
    },
    lock() {
      model.lock();
      render();
    },
    unlock() {
      model.unlock();
      render();
    },
    focus() {
      root.focus();
    },
    destroy() {
      root.removeEventListener('keydown', onKeyDown);
      root.remove();
    },
  };
}
