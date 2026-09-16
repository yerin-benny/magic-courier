import { Fraction, spoken } from '../core/rational';
export type WordTemplate = {
  id: number;
  group: 1 | 2;
  title: string;
  unit: string;
  time: boolean;
  range: { denominators?: number[]; maxDenominator: number };
  render: (a: Fraction, b: Fraction) => string;
};
const countRows = [
  ['마법 케이크', '케이크', '판', '상자'],
  ['선물 리본', '리본', 'm', '개'],
  ['별가루 봉지', '별가루', 'kg', '봉지'],
  ['마법 물약', '물약', 'L', '병'],
  ['꿀단지', '꿀', 'kg', '단지'],
  ['마법 편지지', '편지지', 'm', '장'],
  ['구름 솜사탕', '솜사탕', 'kg', '봉지'],
  ['하늘 사다리', '밧줄', 'm', '칸'],
  ['달빛 제과점', '반죽', 'kg', '개'],
  ['구름 방석', '융단', 'm', '개'],
];
function countText(i: number, a: Fraction, b: Fraction) {
  const x = spoken(a),
    y = spoken(b);
  return [
    '케이크가 ' + x + '판 있어요. 한 상자에 ' + y + '판씩 담으면 몇 상자인가요?',
    '리본이 ' + x + ' m 있어요. 선물 하나에 ' + y + ' m씩 쓰면 몇 개의 선물을 묶을 수 있나요?',
    '별가루가 ' + x + ' kg 있어요. 한 봉지에 ' + y + ' kg씩 담으면 몇 봉지인가요?',
    '물약이 ' + x + ' L 있어요. 한 병에 ' + y + ' L씩 담으면 몇 병인가요?',
    '꿀이 ' + x + ' kg 있어요. 한 단지에 ' + y + ' kg씩 담으면 몇 단지인가요?',
    '긴 편지지가 ' + x + ' m 있어요. 한 장을 ' + y + ' m 길이로 자르면 몇 장인가요?',
    '솜사탕이 ' + x + ' kg 있어요. 한 봉지에 ' + y + ' kg씩 담으면 몇 봉지인가요?',
    '밧줄이 ' + x + ' m 있어요. 사다리 한 칸에 ' + y + ' m씩 쓰면 몇 칸을 만들 수 있나요?',
    '반죽이 ' + x + ' kg 있어요. 빵 하나에 ' + y + ' kg씩 쓰면 빵 몇 개를 만들 수 있나요?',
    '융단이 ' + x + ' m 있어요. 방석 하나에 ' + y + ' m씩 쓰면 방석 몇 개를 만들 수 있나요?',
  ][i];
}
const rateRows = [
  ['빗자루 속도', 'km', '시간', 'km/시간', '빗자루로'],
  ['우체국 벽 칠하기', '㎡', 'L', '㎡/L', '우체국 벽을 칠해요. 페인트'],
  ['눈 내린 마을', 'cm', '시간', 'cm/시간', '눈이'],
  ['마법 우물', 'L', '분', 'L/분', '우물에서'],
  ['마법 열차', 'km', '시간', 'km/시간', '마법 열차로'],
  ['밤샘 촛불', 'cm', '시간', 'cm/시간', '촛불이'],
  ['마법 정원', 'L', '㎡', 'L/㎡', '정원에'],
];
export const wordTemplates: WordTemplate[] = [
  ...countRows.map(([title, item, measure, unit], i) => ({
    id: i + 1,
    group: 1 as const,
    title,
    unit,
    time: false,
    range: { maxDenominator: 40 },
    render: (a: Fraction, b: Fraction) => countText(i, a, b),
  })),
  ...rateRows.map(([title, quantity, per, unit], i) => ({
    id: i + 11,
    group: 2 as const,
    title,
    unit,
    time: ['시간', '분'].includes(per),
    range: {
      maxDenominator: 25,
      ...(['시간', '분'].includes(per) ? { denominators: [2, 3, 4, 6, 12] } : {}),
    },
    render: (a: Fraction, b: Fraction) => {
      const x = spoken(a),
        y = spoken(b);
      return i === 0
        ? `빗자루로 ${y}시간 동안 ${x} km를 갔어요. 같은 빠르기로 1시간에 몇 km를 가나요?`
        : i === 1
          ? `페인트 ${y} L로 벽 ${x} ㎡를 칠했어요. 페인트 1 L로 몇 ㎡를 칠할 수 있나요?`
          : i === 2
            ? `${y}시간 동안 눈이 ${x} cm 쌓였어요. 같은 양으로 내리면 1시간에 몇 cm가 쌓이나요?`
            : i === 3
              ? `${y}분 동안 우물에서 물 ${x} L를 길었어요. 같은 빠르기로 1분에 몇 L를 긷나요?`
              : i === 4
                ? `마법 열차가 ${y}시간 동안 ${x} km를 달렸어요. 같은 빠르기로 1시간에 몇 km를 가나요?`
                : i === 5
                  ? `촛불이 ${y}시간 동안 ${x} cm 탔어요. 같은 빠르기로 1시간에 몇 cm가 타나요?`
                  : `정원 ${y} ㎡에 물 ${x} L를 주었어요. 고르게 주면 1 ㎡에 몇 L를 주나요?`;
    },
  })),
  ...['두 밧줄', '두 소포', '두 배달지'].map((title, i) => ({
    id: 18 + i,
    group: 2 as const,
    title,
    unit: '배',
    time: false,
    range: { maxDenominator: 25 },
    render: (a: Fraction, b: Fraction) =>
      i === 0
        ? `긴 밧줄은 ${spoken(a)} m, 짧은 밧줄은 ${spoken(b)} m예요. 긴 밧줄은 짧은 밧줄의 몇 배인가요?`
        : i === 1
          ? `첫 소포는 ${spoken(a)} kg, 두 번째 소포는 ${spoken(b)} kg이에요. 첫 소포 무게는 두 번째 소포의 몇 배인가요?`
          : `첫 배달지까지 ${spoken(a)} km, 두 번째 배달지까지 ${spoken(b)} km예요. 첫 거리는 두 번째 거리의 몇 배인가요?`,
  })),
];
