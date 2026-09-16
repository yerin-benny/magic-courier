export type ItemSlot = 'hat' | 'cape' | 'bag' | 'badge' | 'friend';

export type ShopItem = {
  id: string;
  name: string;
  slot: ItemSlot;
  price: number;
  image: string;
  spriteSize: string;
  spriteX: string;
  spriteY: string;
  note: string;
};

export const itemSlotLabels: Record<ItemSlot, string> = {
  hat: '모자',
  cape: '망토',
  bag: '가방',
  badge: '배지',
  friend: '동물 친구',
};

export const itemSlots = Object.keys(itemSlotLabels) as ItemSlot[];

export const shopItems: ShopItem[] = [
  {
    id: 'item-1',
    name: '별깃털 마법모자',
    slot: 'hat',
    price: 10,
    image: '/items/item-sheet.png',
    spriteSize: '425.882% 319.412%',
    spriteX: '3.61%',
    spriteY: '5.362%',
    note: '초록 깃털이 살랑이는 모자',
  },
  {
    id: 'item-2',
    name: '보랏빛 우편모자',
    slot: 'hat',
    price: 10,
    image: '/items/item-sheet.png',
    spriteSize: '452.5% 339.375%',
    spriteX: '35.461%',
    spriteY: '10.444%',
    note: '반짝 단추가 달린 우편모자',
  },
  {
    id: 'item-3',
    name: '달빛 후드',
    slot: 'cape',
    price: 14,
    image: '/items/item-sheet.png',
    spriteSize: '425.882% 319.412%',
    spriteX: '64.982%',
    spriteY: '5.362%',
    note: '초승달 장식이 빛나는 후드',
  },
  {
    id: 'item-4',
    name: '햇살 망토',
    slot: 'cape',
    price: 14,
    image: '/items/item-sheet.png',
    spriteSize: '425.882% 319.412%',
    spriteX: '97.473%',
    spriteY: '8.043%',
    note: '노란 안감이 포근한 망토',
  },
  {
    id: 'item-5',
    name: '숲잎 우편가방',
    slot: 'bag',
    price: 16,
    image: '/items/item-sheet.png',
    spriteSize: '452.5% 339.375%',
    spriteX: '3.989%',
    spriteY: '49.608%',
    note: '작은 잎사귀가 달린 가방',
  },
  {
    id: 'item-6',
    name: '꽃바구니 가방',
    slot: 'bag',
    price: 16,
    image: '/items/item-sheet.png',
    spriteSize: '452.5% 339.375%',
    spriteX: '35.461%',
    spriteY: '49.608%',
    note: '꽃과 리본을 담은 바구니',
  },
  {
    id: 'item-7',
    name: '샛별 배지',
    slot: 'badge',
    price: 8,
    image: '/items/item-sheet.png',
    spriteSize: '517.143% 387.857%',
    spriteX: '64.212%',
    spriteY: '50.869%',
    note: '정확한 배송을 기념하는 별',
  },
  {
    id: 'item-8',
    name: '초승달 배지',
    slot: 'badge',
    price: 8,
    image: '/items/item-sheet.png',
    spriteSize: '517.143% 387.857%',
    spriteX: '95.034%',
    spriteY: '50.869%',
    note: '밤길을 밝혀 주는 달',
  },
  {
    id: 'item-9',
    name: '부엉이 포포',
    slot: 'friend',
    price: 22,
    image: '/items/item-sheet.png',
    spriteSize: '452.5% 339.375%',
    spriteX: '3.103%',
    spriteY: '90.078%',
    note: '밤하늘 길을 잘 찾는 친구',
  },
  {
    id: 'item-10',
    name: '고양이 나비',
    slot: 'friend',
    price: 22,
    image: '/items/item-sheet.png',
    spriteSize: '452.5% 339.375%',
    spriteX: '34.574%',
    spriteY: '90.078%',
    note: '소포를 꼼꼼히 챙기는 친구',
  },
  {
    id: 'item-11',
    name: '고슴도치 토리',
    slot: 'friend',
    price: 22,
    image: '/items/item-sheet.png',
    spriteSize: '452.5% 339.375%',
    spriteX: '65.603%',
    spriteY: '91.384%',
    note: '작은 편지를 아끼는 친구',
  },
  {
    id: 'item-12',
    name: '파랑새 파랑',
    slot: 'friend',
    price: 22,
    image: '/items/item-sheet.png',
    spriteSize: '452.5% 339.375%',
    spriteX: '97.518%',
    spriteY: '91.384%',
    note: '먼 곳의 소식을 전하는 친구',
  },
];

export function shopItem(id: string) {
  return shopItems.find((item) => item.id === id);
}
