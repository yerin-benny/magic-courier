// 문장제 20맥락 데이터 (spec 4-3).
//
// 맥락마다 허용 수 범위를 개별 지정한다. 공통 랜덤을 쓰지 않는다.
//
// 그룹 1 (1~10): 세는 결과가 나오므로 답이 반드시 자연수.
//   사용자 확정(2026-09-16): 앞의 수는 자연수 2~9 또는 대분수 1~4, 뒤의 수는 분모 2~9의 진분수.
//   (자연수·대분수)÷(진분수) 구조이며 답이 자연수인 조합만 남긴다.
// 그룹 2 (11~20): 연속량, 단위량, 배 비교. 답이 분수여도 된다.
//   11~17: (자연수)÷(진분수). 시간 맥락(11, 13, 14, 15, 16)의 분수는 분모 2, 3, 4, 6, 12만.
//   18~20: (분수)÷(분수). 앞의 수가 뒤의 수보다 크다 ("몇 배"가 1보다 크게).
//
// 단위 표기 통일: L, kg, m, m², km, cm, 시간, 분.
// 조사: 단위 뒤에 붙는 조사는 단위의 읽기로 고정된다 (m를, kg을, L를, km를, cm가, 시간이, 분이).
//       숫자 뒤에 바로 조사가 붙는 자리는 없다. 숫자 표기는 josa.fractionText 를 쓴다.
//
// range 종류
//   { kind: 'count' }                         그룹 1 공통 범위
//   { kind: 'rate', min, max, time: bool, cap }  자연수 min~max ÷ 진분수(시간이면 분모 2,3,4,6,12 / 아니면 2~9), 답 ≤ cap
//   { kind: 'ratio' }                          분수 ÷ 분수, 앞 > 뒤, 답 10 이하, 답 분모 12 이하
//
// template: josa.fill 형식 문자열. {a}는 앞의 수(나누어지는 수), {b}는 뒤의 수(나누는 수).
//   일부 맥락은 문장 순서상 {b}가 먼저 나온다. 화면에서는 fillSegments 로 조각을 만들어 세로 분수로 그린다.

export const TIME_DENOMINATORS = Object.freeze([2, 3, 4, 6, 12]);

export const CONTEXTS = Object.freeze([
  // ---------- 그룹 1 ----------
  { id: 1, group: 1, name: '마법 케이크', range: { kind: 'count' }, answerUnit: '상자',
    template: '마법 케이크 {a}개를 한 상자에 {b}개씩 담으면 몇 상자가 될까요?' },
  { id: 2, group: 1, name: '선물 리본', range: { kind: 'count' }, answerUnit: '개',
    template: '선물 리본 {a} m를 {b} m씩 잘라 소포를 묶으면 소포를 몇 개 묶을 수 있을까요?' },
  { id: 3, group: 1, name: '별가루 봉지', range: { kind: 'count' }, answerUnit: '봉지',
    template: '별가루 {a} kg을 한 봉지에 {b} kg씩 나눠 담으면 몇 봉지가 될까요?' },
  { id: 4, group: 1, name: '마법 물약', range: { kind: 'count' }, answerUnit: '병',
    template: '마법 물약 {a} L를 한 병에 {b} L씩 담으면 몇 병이 될까요?' },
  { id: 5, group: 1, name: '꿀단지', range: { kind: 'count' }, answerUnit: '단지',
    template: '꿀 {a} kg을 한 단지에 {b} kg씩 담으면 몇 단지가 될까요?' },
  { id: 6, group: 1, name: '마법 편지지', range: { kind: 'count' }, answerUnit: '장',
    template: '마법 종이 {a} m를 {b} m씩 자르면 편지지가 몇 장 될까요?' },
  { id: 7, group: 1, name: '구름 솜사탕', range: { kind: 'count' }, answerUnit: '봉지',
    template: '구름 솜사탕 {a} kg을 {b} kg씩 포장하면 몇 봉지가 될까요?' },
  { id: 8, group: 1, name: '하늘 사다리', range: { kind: 'count' }, answerUnit: '칸',
    template: '밧줄 {a} m를 {b} m씩 잘라 하늘 사다리 칸을 만들면 몇 칸이 될까요?' },
  { id: 9, group: 1, name: '달빛 제과점', range: { kind: 'count' }, answerUnit: '개',
    template: '달빛 제과점에서 빵 반죽 {a} kg을 {b} kg씩 나누어 구우면 빵이 몇 개 될까요?' },
  { id: 10, group: 1, name: '구름 방석', range: { kind: 'count' }, answerUnit: '개',
    template: '구름 융단 {a} m를 {b} m씩 잘라 방석을 만들면 방석이 몇 개 될까요?' },

  // ---------- 그룹 2 ----------
  { id: 11, group: 2, name: '빗자루 속도', range: { kind: 'rate', min: 2, max: 20, time: true, cap: 60 }, answerUnit: 'km',
    template: '빗자루를 타고 {a} km를 가는 데 {b}시간이 걸렸습니다. 1시간에 몇 km를 갈 수 있을까요?' },
  { id: 12, group: 2, name: '우체국 벽 칠하기', range: { kind: 'rate', min: 2, max: 24, time: false, cap: 60 }, answerUnit: 'm²',
    template: '페인트 {b} L로 우체국 벽 {a} m²를 칠했습니다. 페인트 1 L로 몇 m²를 칠할 수 있을까요?' },
  { id: 13, group: 2, name: '눈 내린 마을', range: { kind: 'rate', min: 2, max: 20, time: true, cap: 48 }, answerUnit: 'cm',
    template: '{b}시간 동안 눈이 {a} cm 쌓였습니다. 1시간에 몇 cm씩 쌓였을까요?' },
  { id: 14, group: 2, name: '마법 우물', range: { kind: 'rate', min: 2, max: 12, time: true, cap: 30 }, answerUnit: 'L',
    template: '마법 우물에서 물 {a} L를 긷는 데 {b}분이 걸렸습니다. 1분에 몇 L를 길을 수 있을까요?' },
  { id: 15, group: 2, name: '마법 열차', range: { kind: 'rate', min: 10, max: 90, time: true, cap: 99 }, answerUnit: 'km',
    template: '마법 열차가 {b}시간 동안 {a} km를 달렸습니다. 1시간에 몇 km를 달렸을까요?' },
  { id: 16, group: 2, name: '밤샘 촛불', range: { kind: 'rate', min: 2, max: 12, time: true, cap: 30 }, answerUnit: 'cm',
    template: '초가 {b}시간 동안 {a} cm 탔습니다. 1시간에 몇 cm씩 탔을까요?' },
  { id: 17, group: 2, name: '마법 정원', range: { kind: 'rate', min: 2, max: 20, time: false, cap: 40 }, answerUnit: 'L',
    template: '물 {a} L로 마법 정원의 밭 {b} m²에 물을 주었습니다. 1 m²에 몇 L씩 주었을까요?' },
  { id: 18, group: 2, name: '두 밧줄', range: { kind: 'ratio' }, answerUnit: '배',
    template: '긴 밧줄은 {a} m, 짧은 밧줄은 {b} m입니다. 긴 밧줄의 길이는 짧은 밧줄의 길이의 몇 배일까요?' },
  { id: 19, group: 2, name: '두 소포', range: { kind: 'ratio' }, answerUnit: '배',
    template: '소포 가는 {a} kg, 소포 나는 {b} kg입니다. 소포 가의 무게는 소포 나의 무게의 몇 배일까요?' },
  { id: 20, group: 2, name: '두 배달지', range: { kind: 'ratio' }, answerUnit: '배',
    template: '첫 번째 배달지까지는 {a} km, 두 번째 배달지까지는 {b} km입니다. 첫 번째 배달지까지의 거리는 두 번째 배달지까지의 거리의 몇 배일까요?' },
]);

export const GROUP_1_IDS = Object.freeze(CONTEXTS.filter((c) => c.group === 1).map((c) => c.id));
export const GROUP_2_IDS = Object.freeze(CONTEXTS.filter((c) => c.group === 2).map((c) => c.id));
