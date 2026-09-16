'use client';
import { useRef, useState } from 'react';
import { ArrowRight, Check, CornerDownLeft, Eraser } from 'lucide-react';
import type { AnswerInput } from '../core/rational';

type Field = keyof AnswerInput;
const maxLength: Record<Field, number> = {
  whole: 2,
  n: 3,
  d: 2,
  reciprocalN: 2,
  reciprocalD: 2,
};

export function AnswerPad({
  reciprocal,
  busy,
  onSubmit,
}: {
  reciprocal: boolean;
  busy: boolean;
  onSubmit: (value: AnswerInput) => void;
}) {
  const fields: Field[] = reciprocal
    ? ['reciprocalN', 'reciprocalD', 'whole', 'n', 'd']
    : ['whole', 'n', 'd'];
  const [value, setValue] = useState<AnswerInput>({});
  const [focus, setFocus] = useState<Field>(fields[0]);
  const refs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  function move(step: 1 | -1) {
    const current = fields.indexOf(focus);
    const field = fields[(current + step + fields.length) % fields.length];
    setFocus(field);
    refs.current[field]?.focus();
  }

  function enterDigit(digit: string) {
    const current = value[focus] ?? '';
    if (!current && digit === '0') return;
    if (current.length >= maxLength[focus]) return;
    const next = current + digit;
    setValue((old) => ({ ...old, [focus]: next }));
    if (next.length === maxLength[focus]) move(1);
  }

  function backspace() {
    const current = value[focus] ?? '';
    if (current) setValue((old) => ({ ...old, [focus]: current.slice(0, -1) }));
    else move(-1);
  }

  function clearAll() {
    setValue({});
    const first = fields[0];
    setFocus(first);
    refs.current[first]?.focus();
  }

  const box = (field: Field, label: string) => (
    <label className={'answer-field ' + (focus === field ? 'chosen' : '')}>
      <span>{label}</span>
      <input
        ref={(el) => {
          refs.current[field] = el;
        }}
        aria-label={label}
        inputMode="none"
        autoComplete="off"
        readOnly
        value={value[field] ?? ''}
        onFocus={() => setFocus(field)}
        maxLength={maxLength[field]}
      />
    </label>
  );

  return (
    <form
      className="answer-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
      onKeyDown={(event) => {
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          enterDigit(event.key);
        } else if (event.key === 'Backspace') {
          event.preventDefault();
          backspace();
        } else if (event.key === 'Delete') {
          event.preventDefault();
          clearAll();
        } else if (['/', 'ArrowRight', ' '].includes(event.key)) {
          event.preventDefault();
          move(1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend className="sr-only">정답 입력</legend>
        {reciprocal && (
          <div className="reciprocal">
            <span>먼저 나누는 분수의 역수를 적어 봐요</span>
            <div className="answer-row compact">
              {box('reciprocalN', '역수 분자')}
              <span className="answer-slash">/</span>
              {box('reciprocalD', '역수 분모')}
            </div>
          </div>
        )}
        <div className="answer-row">
          <div className="whole-box">{box('whole', '자연수')}</div>
          <div className="fraction-box">
            {box('n', '분자')}
            <div className="fraction-line" />
            {box('d', '분모')}
          </div>
        </div>
        <p className="input-help">자연수는 왼쪽 칸만 · 분수는 위아래 칸을 사용해요</p>
        <div className="keypad" aria-label="숫자 키패드">
          {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((number) => (
            <button type="button" key={number} onClick={() => enterDigit(String(number))}>
              {number}
            </button>
          ))}
          <button type="button" className="key-action" onClick={clearAll}>
            <Eraser size={18} /> 지우기
          </button>
          <button type="button" onClick={() => enterDigit('0')}>
            0
          </button>
          <button
            type="button"
            className="key-action"
            onClick={backspace}
            aria-label="한 자리 지우기"
          >
            <CornerDownLeft size={20} />
          </button>
          <button type="button" className="key-next" onClick={() => move(1)}>
            다음 칸 <ArrowRight size={18} />
          </button>
          <button type="submit" className="key-confirm">
            <Check size={19} /> {busy ? '확인 중…' : '정답 확인'}
          </button>
        </div>
      </fieldset>
    </form>
  );
}
