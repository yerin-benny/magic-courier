// 개발용 페이지: manifest 의 자산을 전부 나열하고, 캐릭터 4종을 48px 로 축소해 서로 구분되는지 본다.
// npm run dev 후 /dev/assets.html

import { manifest } from '../../assets/manifest.js';

const app = document.getElementById('app');
app.innerHTML = `
  <style>
    .dev { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .dev h1, .dev h2 { margin: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; background: var(--paper); border-radius: 16px; padding: 16px; }
    .cell { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; color: var(--ink-soft); }
    .cell img { object-fit: contain; background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 16px 16px; border-radius: 6px; }
    .sky { background: var(--sky-image, var(--sky)); background-size: cover; }
  </style>
  <div class="dev">
    <h1>자산 확인</h1>
    <h2>캐릭터 4종 · 48px 축소 판독 (지도 크기)</h2>
    <div class="row sky" id="small"></div>
    <h2>캐릭터 4종 · 72px (문제 화면 크기)</h2>
    <div class="row sky" id="mid"></div>
    <div id="groups"></div>
  </div>
`;

function cell(url, label, size) {
  const c = document.createElement('div');
  c.className = 'cell';
  const img = document.createElement('img');
  img.src = url;
  img.alt = '';
  img.width = size;
  img.height = size;
  c.append(img, document.createTextNode(label));
  return c;
}

for (const [host, size] of [['small', 48], ['mid', 72]]) {
  const el = document.getElementById(host);
  for (let i = 1; i <= 4; i++) {
    const url = manifest.characters[`side-${i}`];
    if (url) el.append(cell(url, `side-${i}`, size));
  }
}

const groups = document.getElementById('groups');
for (const [name, bucket] of Object.entries(manifest)) {
  const keys = Object.keys(bucket);
  if (!keys.length) continue;
  const h = document.createElement('h2');
  h.textContent = `${name} (${keys.length})`;
  const row = document.createElement('div');
  row.className = 'row';
  for (const k of keys.sort()) row.append(cell(bucket[k], k, name === 'flags' ? 48 : 96));
  groups.append(h, row);
}
