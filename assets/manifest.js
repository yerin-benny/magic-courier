// 그래픽 자산 키 → URL 매핑. 코드 어디에서도 자산 파일 경로를 직접 쓰지 않는다. 반드시 이 manifest 를 거친다.
//
// 폴더
//   flags/        flag-icons(MIT)에서 복사한 60개국 SVG. `npm run assets:flags`
//   backgrounds/  sky.jpg (원본 시트 7. 하늘)
//   characters/   side-1..4.png 측면 비행 포즈(투명), front-sheet.png 정면 시트 (원본 시트 1, 2)
//   passport/     cover.png, stamp-1..6.png (원본 시트 6)
//   parcels/      parcel-1..8.png (원본 시트 5, 배경 제거)
//   brooms/, items/  STEP 10 2차
// 원본 시트에서 자르는 스크립트: scripts/cutAssets.py
//
// getAsset(key) 는 없는 키에 null 을 돌려준다. 호출부는 null 이면 플레이스홀더를 그린다.

function fromGlob(files, pattern) {
  const out = {};
  for (const [path, url] of Object.entries(files)) {
    const m = path.match(pattern);
    if (m) out[m[1]] = url;
  }
  return Object.freeze(out);
}

const flags = fromGlob(import.meta.glob('./flags/*.svg', { eager: true, query: '?url', import: 'default' }), /\/([a-z]{2})\.svg$/);
const characters = fromGlob(import.meta.glob('./characters/*.png', { eager: true, query: '?url', import: 'default' }), /\/([\w-]+)\.png$/);
const passport = fromGlob(import.meta.glob('./passport/*.png', { eager: true, query: '?url', import: 'default' }), /\/([\w-]+)\.png$/);
const parcels = fromGlob(import.meta.glob('./parcels/*.png', { eager: true, query: '?url', import: 'default' }), /\/([\w-]+)\.png$/);
const backgrounds = fromGlob(import.meta.glob('./backgrounds/*.{jpg,png}', { eager: true, query: '?url', import: 'default' }), /\/([\w-]+)\.(?:jpg|png)$/);
const brooms = fromGlob(import.meta.glob('./brooms/*.png', { eager: true, query: '?url', import: 'default' }), /\/([\w-]+)\.png$/);
const items = fromGlob(import.meta.glob('./items/*.png', { eager: true, query: '?url', import: 'default' }), /\/([\w-]+)\.png$/);

export const manifest = Object.freeze({
  flags: Object.freeze(Object.fromEntries(Object.entries(flags).map(([k, v]) => [k.toUpperCase(), v]))), // 'KR' → url
  characters, // 'side-1', 'front-sheet'
  passport, // 'cover', 'stamp-1'..'stamp-6'
  parcels, // 'parcel-1'..'parcel-8'
  backgrounds, // 'sky'
  brooms, // 'broom-1'..'broom-5' (2차: 빗자루 단계)
  items, // 'item-1'..'item-12' (2차: 꾸미기)
});

/** 'flag.KR', 'passport.cover', 'characters.side-1' 같은 점 표기 키로 URL 을 얻는다. 없으면 null. */
export function getAsset(key) {
  const [group, ...rest] = String(key).split('.');
  const name = rest.join('.');
  if (group === 'flag') return manifest.flags[name] ?? null;
  const bucket = manifest[group];
  if (!bucket) return null;
  return bucket[name] ?? null;
}

/** 물건 이름 → 소포 그림. 딱 맞는 그림이 없으면 끈으로 묶은 소포(1). */
export function parcelFor(itemName) {
  const rules = [
    [/케이크|초콜릿/, 'parcel-3'],
    [/물약/, 'parcel-4'],
    [/편지|두루마리/, 'parcel-5'],
    [/리본|목도리|장갑/, 'parcel-6'],
    [/꿀/, 'parcel-7'],
    [/별가루|씨앗|주머니/, 'parcel-8'],
    [/모자|액자|오르골|상자/, 'parcel-2'],
  ];
  const hit = rules.find(([re]) => re.test(itemName));
  return getAsset(`parcels.${hit ? hit[1] : 'parcel-1'}`);
}
