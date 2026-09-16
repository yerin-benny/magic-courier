// 8. 배송 성공 화면 — 국가 도착, 별가루, 정확 배송 보너스. 여권 스탬프판은 STEP 8.
// 조건을 못 채워도 개인 기록은 정상 적립된다. 부정적 문구를 쓰지 않는다.
// 국가 소개는 수도 정도만 1~2줄. 세계지리 문제를 따로 내지 않는다.

import { el, button } from '../dom.js';
import { gameState } from '../../game/gameState.js';
import { getCountry, CONTINENTS } from '../../data/countries.js';
import { renderFlag } from '../components/flagView.js';
import { geographyOf, formatKm } from '../../data/geography.js';
import { parcelFor } from '../../../assets/manifest.js';

export function renderSuccessScreen(root, params, nav) {
  const session = gameState.session;
  const req = gameState.request;
  if (!session || !session.isComplete) {
    nav.go('map');
    return;
  }
  const summary = session.summary();
  const arrivedId = gameState.completeDelivery(summary); // 누적 기록 반영 + 국가 도착
  const country = getCountry(arrivedId);

  const screen = el('section', 'screen screen--success');
  screen.append(el('h2', 'screen__heading', '배송 성공!'));

  // ---- 국가 도착 ----
  const arrive = el('div', 'card arrive');
  arrive.append(renderFlag(country, { size: 'lg' }));
  const info = el('div', 'arrive__info');
  info.append(el('div', 'arrive__name', `${country.name} 도착`));
  info.append(el('div', 'arrive__meta', `${CONTINENTS[country.continent].name} · 수도 ${country.capital}`));
  // 도착한 순간이 지리를 한 줄 붙이기 좋은 자리다 (문제로 내지는 않는다, spec 13장)
  const geo = geographyOf(country.id);
  const where = [geo.hemisphere.text, `${geo.latitude} · ${geo.longitude}`];
  if (geo.home) where.push(`${geo.home.home.name}에서 ${formatKm(geo.home.km)} km ${geo.home.direction}`);
  info.append(el('div', 'arrive__geo', where.join('  ·  ')));
  info.append(el('p', 'arrive__intro', country.intro));
  info.append(el('div', 'badge badge--stamp', `여권 스탬프 획득 (${gameState.visited.length}개)`));
  arrive.append(info);
  screen.append(arrive);

  // ---- 배송 결과 ----
  const card = el('div', 'card success');
  card.append(el('p', 'success__text', `${req.destination}에 ${req.item} 배달 완료`));
  const parcelUrl = parcelFor(req.item);
  if (parcelUrl) {
    const img = el('img', 'success__parcel');
    img.src = parcelUrl;
    img.alt = '';
    img.draggable = false;
    card.append(img);
  }
  const stats = el('dl', 'success__stats');
  stats.append(el('dt', null, '별가루'), el('dd', 'success__stardust', `+${summary.stardust}`));
  stats.append(el('dt', null, '첫 시도 정답'), el('dd', null, `${summary.firstTryCount} / ${summary.total}`));
  card.append(stats);
  if (summary.accurateBonus) card.append(el('div', 'badge badge--accurate', '정확 배송 보너스!'));

  // 학교 배송량 반영 결과. 우선 로컬 예측을 보여 주고, 서버 판정이 오면 그 문구로 바꾼다 (spec 9-1).
  // 반영되지 않아도 개인 기록과 스탬프는 그대로다. 부정적 문구를 쓰지 않는다.
  const rankNote = el('p', 'rank-note', gameState.lastVerdict?.message ?? '');
  const paintVerdict = (verdict) => {
    rankNote.textContent = verdict?.message ?? '';
    rankNote.classList.toggle('rank-note--counted', !!verdict?.counted);
  };
  paintVerdict(gameState.lastVerdict);
  card.append(rankNote);
  screen.append(card);

  gameState.reportDelivery(summary, paintVerdict);

  const t = gameState.totals;
  screen.append(el('p', 'totals', `누적: 배송 ${t.deliveries}건 · 문제 ${t.problems}개 · 별가루 ${t.stardust}`));

  // 여권 한 권이 막 완성됐으면 새 여권 수여 연출을 먼저 보여 준다
  const next = gameState.pendingPassport ? 'newPassport' : gameState.isRoundComplete ? 'roundComplete' : 'map';
  const label = gameState.pendingPassport ? '여권 완성 보기' : gameState.isRoundComplete ? '세계일주 완료 보기' : '지도로 가기';
  screen.append(button(label, 'btn btn--primary btn--big', () => nav.go(next)));
  root.append(screen);
}
