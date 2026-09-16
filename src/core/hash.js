// 비밀번호 해시. 로컬 단계에서도 평문으로 저장하지 않는다 (spec 8장, STEP 9).
// 화면에서는 "비밀번호"라고 부르고 식별자는 pin/pinHash 로 둔다 (2026-09-16).
// SHA-256(학교id:닉네임:비밀번호). 학교와 닉네임을 솔트로 써서 같은 번호라도 해시가 다르다.
// Web Crypto 는 브라우저와 Node 18+ 모두 globalThis.crypto.subtle 로 쓸 수 있다.

const encoder = new TextEncoder();

export async function sha256Hex(text) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('이 환경에서는 crypto.subtle 을 쓸 수 없습니다');
  const buf = await subtle.digest('SHA-256', encoder.encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isValidPin(pin) {
  return /^\d{4}$/.test(String(pin ?? ''));
}

export async function hashPin({ schoolId, nickname, pin }) {
  if (!isValidPin(pin)) throw new Error('비밀번호는 숫자 4자리여야 합니다');
  return sha256Hex(`${schoolId}:${String(nickname).toLowerCase()}:${pin}`);
}
