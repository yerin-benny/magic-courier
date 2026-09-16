// 닉네임 규칙과 필터 (spec 8-3). 필터 목록은 이 파일에만 둔다.
//
//   - 2~8자, 한글·영문·숫자만. 공백 없음.
//   - 숫자만으로 된 닉네임 금지
//   - 욕설·비하 표현 포함 금지 (BANNED_WORDS)
//   - 실명형 패턴 금지: 흔한 성씨 + 두 글자 = 세 글자 한글 이름 (예: 김민준). 실명 입력을 막기 위한 보수적 규칙이다.
//     이름처럼 보여도 이름이 아닌 경우(이슬비 등)가 걸릴 수 있으므로 안내 문구로 다른 닉네임을 권한다.

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 8;

// 흔한 성씨 (실명형 패턴 판정용)
const SURNAMES = '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민나진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉';

// 욕설·비하 목록. 부분 일치. 필요하면 여기에만 추가한다.
export const BANNED_WORDS = Object.freeze([
  '시발', '씨발', '씨팔', '시팔', 'ㅅㅂ', '씹', '좆', '존나', '개새', '새끼', '병신', 'ㅂㅅ', '지랄', '미친', '꺼져', '죽어', '멍청', '바보', '등신', '찐따',
  '느금', '니애미', '애미', '애비', '창녀', '걸레', '섹스', 'sex', 'fuck', 'shit', 'bitch', 'dick', 'porn', '야동', '자지', '보지',
  '일베', '한남', '한녀', '틀딱', '급식충', '흑형', '짱깨', '쪽바리',
]);

// 자모만 나열한 조합(ㅋㅋㅋ, ㅎㅎ)은 닉네임으로 부적절
const JAMO_ONLY = /^[ㄱ-ㅎㅏ-ㅣ]+$/;

export const NICKNAME_MESSAGES = Object.freeze({
  ok: '',
  empty: '닉네임을 입력해 주세요.',
  length: `닉네임은 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 해 주세요.`,
  chars: '한글, 영문, 숫자만 쓸 수 있어요. 띄어쓰기는 안 돼요.',
  digits: '숫자만으로는 닉네임을 만들 수 없어요.',
  jamo: '자음이나 모음만으로는 닉네임을 만들 수 없어요.',
  banned: '쓸 수 없는 말이 들어 있어요. 다른 닉네임을 골라 주세요.',
  realName: '실명처럼 보이는 닉네임은 쓸 수 없어요. 별명을 지어 주세요.',
});

/** 실명형 패턴: 흔한 성씨로 시작하는 세 글자 한글 */
export function looksLikeRealName(nick) {
  if (!/^[가-힣]{3}$/.test(nick)) return false;
  return SURNAMES.includes(nick[0]);
}

/** 닉네임 검사. { ok, reason, message } */
export function validateNickname(raw) {
  const nick = String(raw ?? '').trim();
  const fail = (reason) => ({ ok: false, reason, message: NICKNAME_MESSAGES[reason] });
  if (!nick) return fail('empty');
  if (nick.length < NICKNAME_MIN || nick.length > NICKNAME_MAX) return fail('length');
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]+$/.test(nick)) return fail('chars');
  if (/^\d+$/.test(nick)) return fail('digits');
  if (JAMO_ONLY.test(nick)) return fail('jamo');
  const lower = nick.toLowerCase();
  if (BANNED_WORDS.some((w) => lower.includes(w.toLowerCase()))) return fail('banned');
  if (looksLikeRealName(nick)) return fail('realName');
  return { ok: true, reason: 'ok', message: '', nickname: nick };
}

/** 저장 키용 정규화: 앞뒤 공백 제거, 영문 소문자 */
export function normalizeNickname(raw) {
  return String(raw ?? '').trim().toLowerCase();
}
