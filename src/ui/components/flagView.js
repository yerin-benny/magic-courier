// 국기 표시. 이모지를 쓰지 않는다 (Windows 학교 PC에서 두 글자 알파벳으로 깨진다).
// assets/manifest.js 의 국기 SVG(flag-icons, MIT)를 <img> 로 그린다. 없으면 국가 코드 플레이스홀더.
// 국가명 등 글자는 이미지에 넣지 않고 호출부가 코드로 그린다.

import { el } from '../dom.js';
import { getAsset } from '../../../assets/manifest.js';

export function renderFlag(country, { size = 'md' } = {}) {
  const url = getAsset(country.flagKey);
  if (url) {
    const img = el('img', `flag flag--${size}`);
    img.src = url;
    img.alt = `${country.name} 국기`;
    img.width = size === 'lg' ? 72 : size === 'sm' ? 36 : 48;
    img.draggable = false;
    return img;
  }
  const box = el('span', `flag flag--${size} flag--placeholder`);
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', `${country.name} 국기`);
  box.dataset.flagKey = country.flagKey;
  box.textContent = country.id;
  return box;
}
