// 60개국 데이터 테스트 (spec 13장).
import { describe, it, expect } from 'vitest';
import { COUNTRIES, CONTINENTS, COUNTRY_BY_ID, START_COUNTRY_ID, getCountry } from '../src/data/countries.js';

describe('국가 목록', () => {
  it('60개국, 대륙별 수가 spec과 같다', () => {
    expect(COUNTRIES.length).toBe(60);
    const count = {};
    for (const c of COUNTRIES) count[c.continent] = (count[c.continent] || 0) + 1;
    expect(count).toEqual({ asia: 14, europe: 14, africa: 12, northAmerica: 8, southAmerica: 7, oceania: 4, special: 1 });
  });

  it('id·이름이 중복되지 않고 모든 대륙 키가 유효하다', () => {
    expect(new Set(COUNTRIES.map((c) => c.id)).size).toBe(60);
    expect(new Set(COUNTRIES.map((c) => c.name)).size).toBe(60);
    for (const c of COUNTRIES) expect(CONTINENTS[c.continent]).toBeDefined();
  });

  it('spec 13장의 국가명이 전부 들어 있다', () => {
    const names = new Set(COUNTRIES.map((c) => c.name));
    const spec = [
      '대한민국', '일본', '중국', '러시아', '몽골', '베트남', '태국', '필리핀', '인도네시아', '싱가포르', '인도', '네팔', '사우디아라비아', '튀르키예',
      '영국', '프랑스', '독일', '이탈리아', '스페인', '포르투갈', '네덜란드', '스위스', '오스트리아', '그리스', '노르웨이', '스웨덴', '핀란드', '아이슬란드',
      '이집트', '모로코', '알제리', '나이지리아', '가나', '세네갈', '에티오피아', '케냐', '탄자니아', '마다가스카르', '남아프리카공화국', '보츠와나',
      '미국', '캐나다', '멕시코', '쿠바', '자메이카', '과테말라', '코스타리카', '파나마',
      '브라질', '아르헨티나', '칠레', '페루', '콜롬비아', '에콰도르', '볼리비아',
      '오스트레일리아', '뉴질랜드', '피지', '파푸아뉴기니', '남극',
    ];
    expect(spec.length).toBe(60);
    for (const n of spec) expect(names.has(n), n).toBe(true);
  });

  it('오스트레일리아로 표기하고 호주라는 말은 어디에도 없다', () => {
    expect(COUNTRY_BY_ID.AU.name).toBe('오스트레일리아');
    for (const c of COUNTRIES) {
      expect(c.name).not.toContain('호주');
      expect(c.intro).not.toContain('호주');
    }
  });

  it('러시아와 튀르키예는 아시아로 분류하고 두 대륙에 걸쳐 있다는 한 줄이 있다', () => {
    for (const id of ['RU', 'TR']) {
      expect(COUNTRY_BY_ID[id].continent).toBe('asia');
      expect(COUNTRY_BY_ID[id].intro).toContain('두 대륙');
    }
  });

  it('경제 수준이나 발전 정도로 서열화하는 표현이 없다', () => {
    const banned = ['선진국', '후진국', '개발도상국', '가난', '부자 나라', '잘사는', '못사는', '발전한', '발전된', '뒤떨어', '경제 대국', '강대국', '약소국'];
    for (const c of COUNTRIES) for (const w of banned) expect(c.intro, `${c.name}: ${w}`).not.toContain(w);
  });

  it('소개는 1~2문장이고 수도가 있다', () => {
    for (const c of COUNTRIES) {
      const sentences = c.intro.split(/[.!?]\s*/).filter(Boolean).length;
      expect(sentences, c.name).toBeGreaterThanOrEqual(1);
      expect(sentences, c.name).toBeLessThanOrEqual(2);
      expect(c.capital.length).toBeGreaterThan(0);
      expect(c.flagKey).toBe(`flag.${c.id}`);
    }
  });

  it('위경도가 범위 안이고 대략 맞는 반구에 있다', () => {
    for (const c of COUNTRIES) {
      expect(c.lat).toBeGreaterThanOrEqual(-90);
      expect(c.lat).toBeLessThanOrEqual(90);
      expect(c.lon).toBeGreaterThanOrEqual(-180);
      expect(c.lon).toBeLessThanOrEqual(180);
    }
    expect(COUNTRY_BY_ID.KR.lon).toBeGreaterThan(120);
    expect(COUNTRY_BY_ID.US.lon).toBeLessThan(0);
    expect(COUNTRY_BY_ID.AU.lat).toBeLessThan(0);
    expect(COUNTRY_BY_ID.AQ.lat).toBeLessThan(-60);
    for (const c of COUNTRIES.filter((x) => x.continent === 'southAmerica')) expect(c.lon).toBeLessThan(-30);
    for (const c of COUNTRIES.filter((x) => x.continent === 'europe')) expect(c.lat).toBeGreaterThan(35);
  });

  it('출발 국가는 대한민국이고 getCountry 는 모르는 id에 예외', () => {
    expect(START_COUNTRY_ID).toBe('KR');
    expect(getCountry('KR').name).toBe('대한민국');
    expect(() => getCountry('XX')).toThrow();
  });
});
