# Firebase 연결 안내 (STEP 11)

이 문서는 선생님이 Firebase 프로젝트를 만든 뒤에 할 일을 순서대로 적은 것이다.
**프로젝트를 만들기 전에도 앱은 그대로 돈다.** 설정이 비어 있으면 브라우저 저장(localStorage)으로
돌고, 학교 배송량 화면만 "인터넷에 연결되면 열려요"로 바뀐다.

---

## 1. 지금 무엇이 준비되어 있나

| 만든 것 | 파일 | 하는 일 |
|---|---|---|
| 랭킹 판정 규칙 | `src/game/ranking.js` | 45초 이상 + 정확 배송이면 학교 배송량에 1건 |
| Firestore 어댑터 | `src/storage/FirestoreAdapter.js` | 로컬 저장 대신 Firestore 로 읽고 쓴다 |
| 서버 판정 | `functions/index.js` | 로그인·배송 시작·배송 완료·집계 갱신 |
| 보안 규칙 | `firestore.rules` | 남의 문서 못 읽고, 랭킹 값은 클라이언트가 못 쓴다 |
| 랭킹 화면 | `src/ui/screens/rankingScreen.js` | 집계 문서 하나만 읽어서 보여 준다 |

---

## 2. 콘솔에서 할 일

1. <https://console.firebase.google.com> 에서 프로젝트를 만든다. (이름 예: `magic-courier`)
2. **Firestore Database** 만들기 → 위치는 `asia-northeast3`(서울) → **프로덕션 모드**로 시작.
3. **Authentication** → 시작하기. (로그인 제공자는 켤 필요 없다. 커스텀 토큰만 쓴다)
4. **App Check** → 앱 등록 → **reCAPTCHA v3** 선택 → 사이트 키를 받아 둔다.
   - Firestore 와 Cloud Functions 에 대해 **적용(Enforce)** 을 켠다.
5. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가** → SDK 설정값을 받아 둔다.
6. 요금제는 **Blaze**(종량제)로 올려야 Cloud Functions 를 배포할 수 있다.
   학급 규모에서는 무료 한도 안이지만, 예산 알림을 걸어 두는 편이 안전하다.

---

## 3. 이 프로젝트에 값 넣기

```bash
cp .env.example .env.local
```

`.env.local` 에 5번에서 받은 값을 채운다. `VITE_RECAPTCHA_SITE_KEY` 에는 4번의 사이트 키를 넣는다.
이 파일은 git 에 올리지 않는다.

```bash
cp functions/.env.example functions/.env
```

`PIN_PEPPER` 에 긴 무작위 문자열을 넣는다. **한번 정하면 바꾸지 않는다.**
바꾸면 이미 가입한 학생들의 PIN 이 전부 맞지 않게 된다.

---

## 4. 배포

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # 만든 프로젝트를 고른다
```

```bash
npm run sync:functions
cd functions && npm install && cd ..
firebase deploy --only firestore:rules,functions
```

앱 자체를 Firebase Hosting 으로 올리려면:

```bash
npm run build
firebase deploy --only hosting
```

---

## 5. 로컬에서 시험해 보기

실제 프로젝트 없이 에뮬레이터로 먼저 돌려볼 수 있다.

```bash
firebase emulators:start --only functions,firestore,auth
```

`.env.local` 에 `VITE_USE_EMULATOR=1` 을 넣으면 앱이 에뮬레이터에 붙는다.
에뮬레이터에서는 App Check 를 요구하지 않는다.

---

## 6. 데이터가 어떻게 놓이나

```
students/{uid}                  학생 본인만 읽고 쓴다. 게임 진행 상태 (spec 10장)
students/{uid}/state/recent     최근 60문항 제외 큐
students/{uid}/deliveries/{id}  배송 시작·완료 시각. 서버만 쓴다 (45초 판정의 근거)
credentials/{uid}               PIN 해시, 학교 id, 당일 반영 건수. 아무도 못 읽는다
schools/{schoolId}              학교별 주간·누적 배송량. 서버만 쓴다
aggregates/ranking              화면이 읽는 집계 문서 하나 (spec 9-3)
```

`uid` 는 `sha256(학교id:닉네임소문자)` 다. 커스텀 토큰으로 발급하므로 보안 규칙에서
`request.auth.uid == 문서id` 하나로 "내 문서만"을 강제할 수 있다.

**개인 닉네임은 공개 문서에 넣지 않는다.** `schools` 와 `aggregates` 에는 학교명만 들어간다 (spec 8-3).

---

## 7. 부정 방지 (spec 9-1)

| 방어 | 어디서 |
|---|---|
| App Check (reCAPTCHA v3) | 모든 callable 에 `enforceAppCheck: true` |
| 배송 완료는 서버가 판정 | `completeDelivery` — 클라이언트는 "완료했다"를 스스로 올릴 수 없다 |
| 45초 최소 소요 시간 | 시작 시각을 `startDelivery` 가 **서버 시계**로 찍는다 |
| 하루 상한 | `RANKING_RULES.dailyLimit` — 지금은 `null`(무제한) |
| 정확 배송 조건 | 서버가 첫 시도 정답 수로 다시 계산한다 (클라이언트 말을 믿지 않는다) |
| 배송 연타 | 1분에 3건 이상 시작하면 거부 |
| 랭킹 값 직접 수정 | 보안 규칙이 `ranking`·`lastRankVerdict` 클라이언트 쓰기를 막는다 |

**하루 상한을 켜고 싶어지면** `src/game/ranking.js` 의 `dailyLimit` 에 숫자를 넣고
`npm run sync:functions` 후 함수를 다시 배포하면 된다. 그 외에 고칠 곳은 없다.

여기서 더 막을 수 있는 것: 지금은 서버가 *답을 다시 채점하지는* 않는다.
문제와 답을 서버로 보내 재채점하려면 생성기와 채점기를 함수 쪽에도 올려야 한다.
학급·학교 규모에서는 위의 방어로 충분하다고 보고 넣지 않았다.

---

## 8. 값이 비어 있을 때의 동작

`.env.local` 이 없거나 값이 비면 `isFirebaseConfigured()` 가 false 가 되어
`src/storage/index.js` 가 `LocalStorageAdapter` 를 고른다. 이때

- 로그인·저장·문제·여권: 지금까지처럼 전부 동작 (그 컴퓨터 안에서만)
- 학교 배송량 화면: 안내 문구만 표시
- `startDelivery`/`submitDelivery` 는 호출되지 않고, 랭킹 판정은 로컬 계산으로만 표시된다
