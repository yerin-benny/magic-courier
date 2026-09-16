// 배송 의뢰문 조합과 낱말 조사 테스트.
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/random.js';
import { ORIGINS, DESTINATIONS, ITEMS, DELIVERY_KINDS, composeRequest } from '../src/data/deliveryRequests.js';
import { josaWord, wordWithJosa, hasBatchimWord } from '../src/core/josa.js';

describe('낱말 조사', () => {
  it('받침 판정', () => {
    expect(hasBatchimWord('케이크')).toBe(false);
    expect(hasBatchimWord('꿀단지')).toBe(false);
    expect(hasBatchimWord('편지')).toBe(false);
    expect(hasBatchimWord('구슬')).toBe(true);
    expect(hasBatchimWord('열쇠')).toBe(false);
    expect(hasBatchimWord('장갑')).toBe(true);
    expect(hasBatchimWord('세트')).toBe(false);
    expect(hasBatchimWord('오르골')).toBe(true);
  });

  it('을/를, 이/가, 으로/로', () => {
    expect(wordWithJosa('생일 케이크', '을/를')).toBe('생일 케이크를');
    expect(wordWithJosa('유리 구슬', '을/를')).toBe('유리 구슬을');
    expect(wordWithJosa('손뜨개 장갑', '이/가')).toBe('손뜨개 장갑이');
    expect(josaWord('오르골', '으로/로')).toBe('로'); // ㄹ 받침
    expect(josaWord('장갑', '으로/로')).toBe('으로');
    expect(josaWord('화분', '으로/로')).toBe('으로');
  });

  it('숫자로 끝나는 낱말은 한자음 규칙', () => {
    expect(josaWord('3', '을/를')).toBe('을');
    expect(josaWord('2', '을/를')).toBe('를');
  });
});

describe('의뢰문 데이터', () => {
  it('출발지·목적지·물건이 각각 20종이고 중복이 없다', () => {
    for (const list of [ORIGINS, DESTINATIONS, ITEMS]) {
      expect(list.length).toBe(20);
      expect(new Set(list).size).toBe(20);
    }
  });

  it('배송 종류 6종, 지금은 일반 배송만 켜져 있다', () => {
    expect(Object.keys(DELIVERY_KINDS)).toEqual(['normal', 'night', 'rain', 'secret', 'animal', 'special']);
    expect(Object.values(DELIVERY_KINDS).filter((k) => k.enabled).map((k) => k.id)).toEqual(['normal']);
    expect(DELIVERY_KINDS.special.problems).toBe(7);
  });

  it('의뢰문은 세 목록에서 뽑아 조합하고 조사가 맞는다', () => {
    const rng = createRng(99);
    for (let i = 0; i < 200; i++) {
      const r = composeRequest(rng);
      expect(ORIGINS).toContain(r.origin);
      expect(DESTINATIONS).toContain(r.destination);
      expect(ITEMS).toContain(r.item);
      expect(r.text).toBe(`${r.origin}에서 ${r.destination}까지 ${r.item}${josaWord(r.item, '을/를')} 배달해 주세요.`);
      expect(r.text).not.toMatch(/\(를\)|\(을\)/);
      expect(r.kind.id).toBe('normal');
    }
  });
});
