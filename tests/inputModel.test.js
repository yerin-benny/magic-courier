// 입력 상태 모델 테스트. 자동 포커스 이동과 두 자리 수 입력이 충돌하지 않는지가 핵심.
import { describe, it, expect, vi } from 'vitest';
import { createInputModel, LAYOUTS, MAX_DIGITS } from '../src/ui/components/inputModel.js';

describe('배치', () => {
  it('answer는 자연수/분자/분모 3칸, reciprocal은 역수 2칸 + 결과 3칸', () => {
    expect(LAYOUTS.answer.map((c) => c.id)).toEqual(['whole', 'num', 'den']);
    expect(LAYOUTS.reciprocal.map((c) => c.id)).toEqual(['recNum', 'recDen', 'whole', 'num', 'den']);
    expect(MAX_DIGITS).toBe(2);
  });

  it('알 수 없는 배치는 예외', () => {
    expect(() => createInputModel({ layout: 'x' })).toThrow();
  });
});

describe('숫자 입력과 자동 이동', () => {
  it('두 자리를 채우면 자동으로 다음 칸으로 간다', () => {
    const m = createInputModel();
    m.type('5');
    expect(m.focusId).toBe('whole'); // 한 자리는 머문다
    m.type('2');
    expect(m.values().whole).toBe('52');
    expect(m.focusId).toBe('num');
  });

  it('두 자리 수 입력이 끊기지 않는다: 12 ÷ 3/13 = 52 를 "5","2" 로', () => {
    const m = createInputModel();
    m.type('5'); m.type('2');
    expect(m.values()).toEqual({ whole: '52', num: '', den: '' });
  });

  it('한 자리 뒤에 다음 키로 넘어간다: 2와 1/3', () => {
    const m = createInputModel();
    m.type('2'); m.next(); m.type('1'); m.next(); m.type('3');
    expect(m.values()).toEqual({ whole: '2', num: '1', den: '3' });
    expect(m.focusId).toBe('den');
  });

  it('마지막 칸은 두 자리를 채워도 머문다', () => {
    const m = createInputModel();
    m.focus('den'); m.type('1'); m.type('7');
    expect(m.focusId).toBe('den');
    m.type('9');
    expect(m.values().den).toBe('17'); // 초과 입력 무시
  });

  it('빈 칸에 0은 들어가지 않는다 (분모 0 차단)', () => {
    const m = createInputModel();
    m.focus('den'); m.type('0');
    expect(m.values().den).toBe('');
    m.type('1'); m.type('0');
    expect(m.values().den).toBe('10');
  });

  it('숫자 아닌 문자는 무시', () => {
    const m = createInputModel();
    m.type('a'); m.type('/');
    expect(m.values().whole).toBe('');
  });
});

describe('지우기와 이동', () => {
  it('backspace는 마지막 자리를 지우고, 빈 칸이면 앞 칸으로 간다', () => {
    const m = createInputModel();
    m.type('1'); m.type('2'); // whole 12 → num 으로 이동
    expect(m.focusId).toBe('num');
    m.backspace(); // num 비어 있음 → whole 로
    expect(m.focusId).toBe('whole');
    m.backspace();
    expect(m.values().whole).toBe('1');
  });

  it('clear는 전부 지우고 첫 칸으로', () => {
    const m = createInputModel();
    m.type('1'); m.next(); m.type('2'); m.next(); m.type('3');
    m.clear();
    expect(m.values()).toEqual({ whole: '', num: '', den: '' });
    expect(m.focusIndex).toBe(0);
  });

  it('prev/next는 범위를 넘지 않는다', () => {
    const m = createInputModel();
    m.prev();
    expect(m.focusIndex).toBe(0);
    m.next(); m.next(); m.next();
    expect(m.focusIndex).toBe(2);
  });

  it('focus는 id나 인덱스로', () => {
    const m = createInputModel();
    m.focus('den');
    expect(m.focusIndex).toBe(2);
    m.focus(1);
    expect(m.focusId).toBe('num');
    m.focus('없음');
    expect(m.focusId).toBe('num');
  });
});

describe('제출과 잠금', () => {
  it('submit은 현재 값 스냅샷을 넘긴다', () => {
    const onSubmit = vi.fn();
    const m = createInputModel({ onSubmit });
    m.type('3'); m.next(); m.type('1'); m.next(); m.type('4');
    m.submit();
    expect(onSubmit).toHaveBeenCalledWith({ whole: '3', num: '1', den: '4' });
  });

  it('잠금 중에는 입력·이동·제출이 무시된다', () => {
    const onSubmit = vi.fn();
    const m = createInputModel({ onSubmit });
    m.type('1');
    m.lock();
    m.type('2'); m.next(); m.backspace(); m.clear(); m.submit();
    expect(m.values().whole).toBe('1');
    expect(m.focusIndex).toBe(0);
    expect(onSubmit).not.toHaveBeenCalled();
    m.unlock();
    m.type('2');
    expect(m.values().whole).toBe('12');
  });

  it('onChange가 값과 포커스를 알려준다', () => {
    const onChange = vi.fn();
    const m = createInputModel({ onChange });
    m.type('7');
    expect(onChange).toHaveBeenLastCalledWith({ values: { whole: '7', num: '', den: '' }, focusIndex: 0, focusId: 'whole' });
  });
});

describe('물리 키보드', () => {
  it('숫자, Backspace, Enter, /, 화살표, Delete를 해석한다', () => {
    const onSubmit = vi.fn();
    const m = createInputModel({ onSubmit });
    expect(m.handleKey('2')).toBe(true);
    expect(m.handleKey('/')).toBe(true);
    expect(m.focusId).toBe('num');
    m.handleKey('1');
    m.handleKey('ArrowRight');
    m.handleKey('3');
    expect(m.values()).toEqual({ whole: '2', num: '1', den: '3' });
    m.handleKey('ArrowLeft');
    expect(m.focusId).toBe('num');
    m.handleKey('Backspace');
    expect(m.values().num).toBe('');
    expect(m.handleKey('Enter')).toBe(true);
    expect(onSubmit).toHaveBeenCalled();
    expect(m.handleKey('Delete')).toBe(true);
    expect(m.values()).toEqual({ whole: '', num: '', den: '' });
    expect(m.handleKey('Shift')).toBe(false);
  });
});

describe('유형 E 배치', () => {
  it('역수 두 칸 → 결과 세 칸 순서로 흐른다', () => {
    const m = createInputModel({ layout: 'reciprocal' });
    m.type('2'); m.type('4'); // recNum 24 → recDen
    expect(m.focusId).toBe('recDen');
    m.type('1'); m.type('1'); // recDen 11 → whole
    expect(m.focusId).toBe('whole');
    m.next(); m.type('2'); m.next(); m.type('1'); m.type('1');
    expect(m.values()).toEqual({ recNum: '24', recDen: '11', whole: '', num: '2', den: '11' });
  });
});
