// 분수 입력 상태 모델. DOM을 모른다. 키패드·물리 키보드·터치가 모두 이 모델을 호출한다.
//
// 칸(cell) 목록을 순서대로 갖고 포커스 위치와 각 칸의 문자열 값을 관리한다.
//
// 포커스 이동 규칙 (STEP 5 제안, 확정 전)
//   - 칸이 최대 자릿수에 도달하면 자동으로 다음 칸으로 간다.
//   - 그 전에 넘어가려면 "다음" 키, "/" 키, 오른쪽 화살표, 또는 칸을 직접 누른다.
//   - 이렇게 하면 두 자리 수(예: 12 ÷ 3/13 = 52) 입력을 자동 이동이 끊지 않는다.
//
// 최대 자릿수
//   - 자연수부 2자리, 분모 2자리, 역수 칸 2자리: 모든 문항의 대분수 표기가 이 안에 들어오도록
//     생성기 상한을 맞춰 두었다 (tests/answerDigits.test.js 가 전수 확인).
//   - 분자 3자리: 가분수로 답할 때(115/12 = 9와 7/12) 분자가 세 자리가 될 수 있다.
//     분자가 네 자리를 넘는 가분수는 대분수로 입력해야 한다.
//
// 값 규칙
//   - 빈 칸에 0을 넣을 수 없다 (분모 0 차단, 자연수부·분자의 0도 의미가 없다).
//   - 이미 최대 자릿수인 칸에 숫자를 더 누르면 무시한다.
//   - 지우기(backspace): 칸에 값이 있으면 마지막 자리를 지우고, 비어 있으면 앞 칸으로 간다.

export const MAX_DIGITS = 2; // 자연수부·분모·역수 칸
export const MAX_NUM_DIGITS = 3; // 분자 칸

export const LAYOUTS = Object.freeze({
  // 유형 A~D, F, G, 문장제: 자연수 / 분자 / 분모
  answer: Object.freeze([
    { id: 'whole', label: '자연수', maxLen: MAX_DIGITS },
    { id: 'num', label: '분자', maxLen: MAX_NUM_DIGITS },
    { id: 'den', label: '분모', maxLen: MAX_DIGITS },
  ]),
  // 유형 E: 역수 칸 두 개 + 계산 결과 세 칸
  reciprocal: Object.freeze([
    { id: 'recNum', label: '역수 분자', maxLen: MAX_DIGITS },
    { id: 'recDen', label: '역수 분모', maxLen: MAX_DIGITS },
    { id: 'whole', label: '자연수', maxLen: MAX_DIGITS },
    { id: 'num', label: '분자', maxLen: MAX_NUM_DIGITS },
    { id: 'den', label: '분모', maxLen: MAX_DIGITS },
  ]),
});

export function createInputModel({ layout = 'answer', onChange = () => {}, onSubmit = () => {} } = {}) {
  const cells = LAYOUTS[layout];
  if (!cells) throw new Error(`알 수 없는 입력 배치: ${layout}`);

  const values = Object.fromEntries(cells.map((c) => [c.id, '']));
  let focusIndex = 0;
  let locked = false;

  function snapshot() {
    return { ...values };
  }

  function emit() {
    onChange({ values: snapshot(), focusIndex, focusId: cells[focusIndex].id });
  }

  function current() {
    return cells[focusIndex];
  }

  const model = {
    get cells() {
      return cells;
    },
    get focusIndex() {
      return focusIndex;
    },
    get focusId() {
      return cells[focusIndex].id;
    },
    get locked() {
      return locked;
    },
    values: snapshot,

    /** 숫자 한 자리 입력 */
    type(digit) {
      if (locked) return;
      const d = String(digit);
      if (!/^\d$/.test(d)) return;
      const cell = current();
      const cur = values[cell.id];
      if (cur === '' && d === '0') return; // 빈 칸에 0 금지 (분모 0 차단)
      if (cur.length >= cell.maxLen) return;
      values[cell.id] = cur + d;
      if (values[cell.id].length >= cell.maxLen && focusIndex < cells.length - 1) {
        focusIndex += 1; // 최대 자릿수에 도달하면 자동 이동
      }
      emit();
    },

    /** 한 자리 지우기. 칸이 비어 있으면 앞 칸으로. */
    backspace() {
      if (locked) return;
      const cell = current();
      if (values[cell.id] !== '') {
        values[cell.id] = values[cell.id].slice(0, -1);
      } else if (focusIndex > 0) {
        focusIndex -= 1;
      }
      emit();
    },

    /** 전부 지우기 */
    clear() {
      if (locked) return;
      for (const c of cells) values[c.id] = '';
      focusIndex = 0;
      emit();
    },

    next() {
      if (locked) return;
      if (focusIndex < cells.length - 1) focusIndex += 1;
      emit();
    },

    prev() {
      if (locked) return;
      if (focusIndex > 0) focusIndex -= 1;
      emit();
    },

    focus(idOrIndex) {
      if (locked) return;
      const i = typeof idOrIndex === 'number' ? idOrIndex : cells.findIndex((c) => c.id === idOrIndex);
      if (i < 0 || i >= cells.length) return;
      focusIndex = i;
      emit();
    },

    /** 제출. 비어 있어도 그대로 넘긴다. 판정은 채점기가 한다. */
    submit() {
      if (locked) return;
      onSubmit(snapshot());
    },

    /** 채점 중·연출 중 입력 잠금 */
    lock() {
      locked = true;
    },
    unlock() {
      locked = false;
    },

    /** 물리 키보드 키 하나를 해석한다. 처리했으면 true. */
    handleKey(key) {
      if (/^\d$/.test(key)) { model.type(key); return true; }
      switch (key) {
        case 'Backspace': model.backspace(); return true;
        case 'Delete': model.clear(); return true;
        case 'Enter': model.submit(); return true;
        case '/':
        case 'ArrowRight':
        case ' ':
          model.next(); return true;
        case 'ArrowLeft': model.prev(); return true;
        default: return false;
      }
    },
  };

  return model;
}
