// 세계지리 둘러보기 — 이번 회차에 지나는 나라를 하나씩 눌러 보는 카드.
//
// [추가 2026-09-16] 6학년 2학기 사회 "세계의 여러 나라"와 같이 굴러가도록 넣었다.
// 문제로 내지 않는다. 눌러야 보이고, 안 눌러도 배송은 그대로 진행된다 (spec 13장).
//
// 보여 주는 것: 대륙 · 반구 · 위경도 · 수도 · 우리나라에서의 거리와 방향 · 한 줄 소개.
// 전부 countries.js 의 수도 좌표에서 계산한 값이다 (나라 전체가 아니라 수도 기준).

import { el, button } from '../dom.js';
import { geographyOf, formatKm } from '../../data/geography.js';
import { renderFlag } from './flagView.js';

/**
 * @param {{id: string, label: string}[]} entries 칩으로 늘어놓을 나라들. 번호·이름은 부르는 쪽이 정한다
 *        (회차 번호를 여기서 다시 세면 현재 위치가 경로에 있을 때 번호가 밀린다)
 * @param {string} [selectedId] 처음 열어 둘 나라
 */
export function renderGeographyPanel(entries, selectedId = null) {
  const ids = entries;
  let selected = selectedId ?? entries[0]?.id;

  const panel = el('div', 'card panel geo');
  const head = el('div', 'geo__head');
  head.append(el('h3', 'panel__title', '세계지리 둘러보기'));
  head.append(el('span', 'geo__hint', '이번 여행 나라를 하나씩 눌러 보세요'));
  panel.append(head);

  const chips = el('div', 'geo__chips');
  panel.append(chips);

  const detail = el('div', 'geo__detail');
  panel.append(detail);

  function drawChips() {
    chips.replaceChildren();
    for (const entry of ids) {
      const chip = button(entry.label, `geo__chip${entry.id === selected ? ' is-on' : ''}`, () => {
        selected = entry.id;
        drawChips();
        drawDetail();
      });
      chips.append(chip);
    }
  }

  function drawDetail() {
    const g = geographyOf(selected);
    detail.replaceChildren();

    // 나라
    const who = el('div', 'geo__who');
    who.append(renderFlag(g.country, { size: 'sm' }));
    const names = el('div');
    names.append(el('div', 'geo__continent', g.continent.name));
    names.append(el('div', 'geo__name', g.country.name));
    who.append(names);
    detail.append(who);

    // 지구에서의 자리
    const where = el('dl', 'geo__rows');
    where.append(el('dt', null, '지구에서'), el('dd', null, g.hemisphere.text));
    where.append(el('dt', null, '위치 좌표'), el('dd', null, `${g.latitude} · ${g.longitude}`));
    where.append(el('dt', null, '수도'), el('dd', null, g.country.capital));
    if (g.home) {
      where.append(
        el('dt', null, `${g.home.home.name}에서`),
        el('dd', null, `${formatKm(g.home.km)} km · ${g.home.direction}`),
      );
    }
    detail.append(where);

    detail.append(el('p', 'geo__intro', g.country.intro));
  }

  drawChips();
  drawDetail();
  return panel;
}
