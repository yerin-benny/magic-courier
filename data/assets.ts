// Original simple placeholders. Replace paths only after licensing is reviewed.
export const assets = {
  characters: [
    {
      id: 'luna',
      name: '달빛 배달부',
      color: '#6B5B95',
      mark: '달',
      portraitX: '0%',
      description: '차근차근 길을 찾는 탐험가',
    },
    {
      id: 'sage',
      name: '숲빛 배달부',
      color: '#55734F',
      mark: '숲',
      portraitX: '33.333%',
      description: '작은 발견을 아끼는 탐험가',
    },
    {
      id: 'sun',
      name: '햇빛 배달부',
      color: '#92621B',
      mark: '해',
      portraitX: '66.667%',
      description: '새로운 길이 궁금한 탐험가',
    },
    {
      id: 'coral',
      name: '노을 배달부',
      color: '#AA5140',
      mark: '별',
      portraitX: '100%',
      description: '마음을 전하는 탐험가',
    },
  ],
  flags: Object.fromEntries(
    'KR JP CN RU MN VN TH PH ID SG IN NP SA TR GB FR DE IT ES PT NL CH AT GR NO SE FI IS EG MA DZ NG GH SN ET KE TZ MG ZA BW US CA MX CU JM GT CR PA BR AR CL PE CO EC BO AU NZ FJ PG AQ'
      .split(' ')
      .map((id) => [id, { src: `/flags/${id.toLowerCase()}.svg`, license: 'flag-icons · MIT' }]),
  ) as Record<string, { src: string; license: string }>,
  map: '/world-land.svg',
  flyingCharacters: '/couriers/flying-characters.png',
};
