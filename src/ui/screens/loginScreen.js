// 2. 로그인 — 학교 선택(고정 목록) + 별명 + PIN 4자리 (spec 8장).
//
//   - 학교는 자유 입력을 막는다. "별빛초"와 "별빛초등학교"가 갈라지고 장난 학교명이 랭킹에 오른다.
//   - 별명 칸에 실명 금지 안내를 상시 노출한다.
//   - 처음 온 학생과 다시 온 학생이 같은 칸을 쓴다. 같은 학교·별명·PIN 을 넣으면 이어진다는 것을
//     화면에 적어 둔다. 6학년이 "가입"과 "로그인"을 구분해 누르게 하지 않는다.
//   - PIN 은 4칸으로 보이게 한다. 몇 자를 넣었는지 눈으로 세어야 한다.

import { el, button } from '../dom.js';
import { SCHOOLS, login } from '../../game/auth.js';
import { NICKNAME_MAX } from '../../data/nicknameFilter.js';
import { isOnboarded } from '../../game/studentDoc.js';
import { gameState } from '../../game/gameState.js';
import { storage } from '../../storage/index.js';
import { getAsset } from '../../../assets/manifest.js';

/** 라벨 + 입력칸 + 도움말 한 줄 */
function field(labelText, input, helpText, helpClass = '') {
  const wrap = el('label', 'field');
  wrap.append(el('span', 'field__label', labelText));
  wrap.append(input);
  if (helpText) wrap.append(el('span', `field__help ${helpClass}`.trim(), helpText));
  return wrap;
}

export function renderLoginScreen(root, params, nav) {
  const screen = el('section', 'screen screen--login');
  screen.append(el('h2', 'screen__heading', '마법 배달부 등록'));

  const form = el('form', 'card form login__card');
  form.noValidate = true;

  // ---- 접수대 머리 (배달부가 창구에서 맞아 주는 느낌) ----
  const head = el('div', 'login__head');
  const face = getAsset('characters.side-2');
  if (face) {
    const img = el('img', 'login__face');
    img.src = face;
    img.alt = '';
    img.draggable = false;
    head.append(img);
  }
  const hello = el('div', 'login__hello');
  hello.append(el('div', 'login__hello-title', '마법 우체국 접수대'));
  hello.append(el('div', 'login__hello-sub', '전에 등록했다면 같은 학교·별명·PIN 을 넣으면 이어져요'));
  head.append(hello);
  form.append(head);

  // ---- 학교 ----
  const school = el('select', 'field__input');
  const placeholder = el('option', null, '학교를 골라 주세요');
  placeholder.value = '';
  school.append(placeholder);
  for (const s of SCHOOLS) {
    const o = el('option', null, `${s.name} (${s.region})`);
    o.value = s.id;
    school.append(o);
  }
  form.append(field('학교', school, '목록에 학교가 없으면 선생님께 말씀해 주세요.'));

  // ---- 별명 ----
  const nick = el('input', 'field__input');
  nick.type = 'text';
  nick.maxLength = NICKNAME_MAX;
  nick.autocomplete = 'off';
  nick.placeholder = '별명을 지어 주세요';
  form.append(field('별명', nick, `실명은 쓰지 않아요. 별명으로 등록해 주세요. (2~${NICKNAME_MAX}자, 한글·영문·숫자)`, 'field__help--notice'));

  // ---- PIN ----
  const pin = el('input', 'field__input field__input--pin');
  pin.type = 'password';
  pin.inputMode = 'numeric';
  pin.maxLength = 4;
  pin.autocomplete = 'off';

  const pinBox = el('div', 'login__pin');
  const dots = el('div', 'login__pin-dots');
  const dotEls = [];
  for (let i = 0; i < 4; i += 1) {
    const d = el('span', 'login__pin-dot');
    dots.append(d);
    dotEls.push(d);
  }
  pinBox.append(pin, dots);
  // 숫자만 받고, 채운 칸 수를 점으로 보여 준다
  pin.addEventListener('input', () => {
    pin.value = pin.value.replace(/\D/g, '').slice(0, 4);
    dotEls.forEach((d, i) => d.classList.toggle('is-filled', i < pin.value.length));
  });
  form.append(field('PIN 4자리', pinBox, '내 기록을 지키는 비밀 숫자예요. 잊지 않게 기억해 두세요.'));

  const message = el('p', 'form__message');
  message.setAttribute('role', 'alert');

  const submit = button('시작하기', 'btn btn--primary btn--big');
  submit.type = 'submit';

  form.append(message, submit);
  screen.append(form);
  screen.append(button('처음으로', 'btn', () => nav.go('start')));
  root.append(screen);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true;
    message.textContent = '';
    try {
      const res = await login(storage, { schoolId: school.value, nickname: nick.value, pin: pin.value });
      if (res.status !== 'ok' && res.status !== 'created') {
        message.textContent = res.message;
        // 어디를 고쳐야 하는지 칸으로도 알려 준다
        const target = res.status === 'invalidSchool' ? school : res.status === 'invalidNickname' ? nick : pin;
        target.focus();
        return;
      }
      const recent = await storage.loadRecentProblemKeys(res.doc.id);
      gameState.loadStudent(res.doc, recent);
      nav.go(isOnboarded(res.doc) ? 'map' : 'character');
    } finally {
      submit.disabled = false;
    }
  });

  nick.focus();
}
