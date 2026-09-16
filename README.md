# 마법 배달부의 세계일주

초등 6학년 2학기 분수의 나눗셈을 복습하는 한국어 반응형 웹앱입니다. 문제 생성·채점·계정·저장·배송 확정·학교 랭킹을 서버에서 처리합니다.

## 빠른 실행 — Firebase 계정 없이

Node.js 22 LTS 이상을 준비한 뒤 이 폴더에서 실행합니다.

```sh
npm ci
npm run dev
```

[로컬 앱](http://127.0.0.1:3000)을 엽니다. 샘플 학교를 선택하고 **실명이 아닌 닉네임**과 숫자 PIN 4자리를 입력하면 가입되며, 같은 조합으로 다시 로그인할 수 있습니다. `.env.local`이 없어도 로컬 개발 모드로 실행됩니다.

개인 기록은 서버의 `.local-data/state.json`에 저장됩니다. 브라우저를 새로고침하거나 재로그인해도 복원됩니다. 브라우저 저장소에 PIN이나 정답을 저장하지 않습니다. 로컬 모드는 단일 개발 서버용입니다. 여러 서버 인스턴스나 실제 학교 서비스에는 아래 Firebase 모드를 사용하세요.

## 구현된 학습 흐름

- 학교/PIN 로그인과 캐릭터 선택 → 세계지도 (출발지는 대한민국으로 고정)
- 지도에서 바로 5문제 → 자동 배송 완료·스탬프 → 다음 배송 바로 시작 → 4배송 후 회차 완주
- A~G 정확한 유리수 문제 생성기, 20개 문장제, 최근 60문항 중복 방지
- 자연수/분자/분모 입력과 숫자 키패드, 역수 입력, 미약분 재안내, 힌트
- 첫 시도 +3 / 재시도 +1 별가루, 회차 완주 +10 별가루
- 60개 목적지, 서로 다른 30개국씩 여권 2권, 누적 학습 기록
- 학교 주간/누적 TOP 10·내 학교 순위, 서버 검증을 통과한 배송만 반영

입력은 숫자 키패드 또는 PC 키보드로 할 수 있습니다. 한 칸의 입력이 끝나면 **다음 칸 버튼, Tab 또는 오른쪽 화살표**로 이동합니다. 여러 자리 숫자가 있으므로 숫자를 누를 때마다 자동으로 다음 칸으로 넘어가지는 않습니다. Enter로 제출합니다.

## 주요 구조

| 경로                   | 역할                                                    |
| ---------------------- | ------------------------------------------------------- |
| `core/`                | 유리수, seed 난수, 문제·경로 생성, 채점                 |
| `data/`                | 국가·학교·20개 문장 템플릿·교체할 자산 매핑             |
| `server/service.ts`    | 인증, 제출 이력, 배송 확정, 랭킹 트랜잭션               |
| `server/file-store.ts` | 개발용 파일 저장·원자적 쓰기                            |
| `functions/src/`       | Firebase callable, Firestore 트랜잭션, 시간별 랭킹 집계 |
| `app/`, `components/`  | Next.js 화면·입력·세계지도                              |
| `tests/`, `e2e/`       | 생성기·채점·보안 규칙·Firebase 통합·학생 여정 검사      |

화면 흐름과 데이터 모델은 [ARCHITECTURE.md](ARCHITECTURE.md), 미정 사항은 [OPEN_DECISIONS.md](OPEN_DECISIONS.md)를 참고하세요.

## Firebase 에뮬레이터

Java 21 이상과 Node.js 22 이상이 필요합니다. CLI는 프로젝트 개발 의존성에 포함되어 있습니다.

1. `.env.example`을 `.env.local`로 복사하고 아래 값을 설정합니다.

```dotenv
NEXT_PUBLIC_BACKEND=firebase
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_FIREBASE_API_KEY=demo-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-magic-courier.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-magic-courier
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app-id
```

2. `functions/.secret.local`을 만들고 개발용 값만 넣습니다.

```dotenv
PIN_PEPPER=emulator-only-secret-never-use-in-production
```

3. 첫 터미널에서 다음을 실행합니다.

```sh
npm --prefix functions ci
npm run emulators
```

4. 두 번째 터미널에서 샘플 학교를 넣고 앱을 실행합니다. PowerShell:

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
$env:FIREBASE_PROJECT_ID = 'demo-magic-courier'
npm run seed
npm run dev
```

macOS/Linux에서는 `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT_ID=demo-magic-courier npm run seed`로 실행합니다.

에뮬레이터 UI: [localhost:4000](http://127.0.0.1:4000). 에뮬레이터는 기본적으로 종료 시 데이터를 버립니다. 필요하면 `firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data`로 저장하세요. 에뮬레이터에서만 App Check 검증이 비활성화됩니다. 시간별 스케줄은 운영 Cloud Scheduler가 실행하며, 로컬에서는 랭킹 수동 갱신을 사용합니다.

## 테스트

```sh
npm run typecheck
npm test
npm run functions:build
npm run build
npm run test:e2e
npm run test:firebase
```

- `npm test`: A~G 각각 2,000개 생성, 문장제 1,200개, 퇴화 RNG, 경로·채점·트랜잭션 검사. Firebase 통합 1개는 에뮬레이터가 없을 때 명시적으로 건너뜁니다.
- `test:e2e`: 설치된 Chrome으로 360px / 768px / 1440px의 가입→20문제→4배송→여권→랭킹→재로그인을 검사합니다. Chrome이 없으면 `npx playwright install chrome`을 실행하거나 설정의 `channel`을 제거한 뒤 `npx playwright install chromium`을 실행하세요.
- E2E는 3100번 포트, `.next-e2e`, `.local-data/e2e-시간값.json`을 사용합니다. 개발 서버와 데이터가 분리됩니다. E2E만 서버 파일에서 정답을 읽으며 운영 앱에는 정답 조회 API가 없습니다.
- `test:firebase`: Auth, Firestore, Functions 에뮬레이터를 시작해 실제 Custom Token 로그인·callable 배송·중복 확정·Firestore 규칙을 확인합니다. 먼저 `functions/.secret.local`과 `npm run functions:build`를 준비하세요.
- 규칙만 검사하려면 `npm run test:rules`를 사용합니다.

테스트 실행 결과와 검증 한계는 [TEST_REPORT.md](TEST_REPORT.md)에 정리했습니다.

## 운영 배포

Firebase 프로젝트·도메인·reCAPTCHA 설정은 사용자 계정에서 준비해야 합니다. 현재 소스는 실제 운영 프로젝트에 배포되지 않았습니다.

1. Firebase 프로젝트에서 Firestore 및 Authentication을 준비하고 웹 앱을 등록합니다. Cloud Functions와 Scheduler를 사용할 결제 요금제를 확인합니다.
2. `.firebaserc`의 프로젝트 또는 CLI `--project` 옵션을 실제 ID로 지정합니다.
3. `NEXT_PUBLIC_BACKEND=firebase`, 실제 Firebase 웹 설정, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`를 설정합니다. `NEXT_PUBLIC_USE_EMULATORS=false`로 설정하고 로컬 서버 우회 옵션은 사용하지 않습니다.
4. Firebase App Check에 reCAPTCHA v3 사이트 키와 실제 도메인을 등록합니다. Cloud Functions는 운영에서 `enforceAppCheck: true`를 강제합니다. Firestore에도 App Check enforcement를 켭니다. 토큰·PIN·입력 답을 로그에 출력하지 않습니다.
5. 무작위 32바이트 이상의 비밀값을 생성하고 Secret Manager에 등록합니다. 공개 환경변수에 넣지 마세요.

```sh
npx firebase login
npx firebase functions:secrets:set PIN_PEPPER --project YOUR_PROJECT_ID
npm --prefix functions ci
npm run functions:build
npx firebase deploy --only firestore,functions --project YOUR_PROJECT_ID
```

`DAILY_RANKING_CAP`은 Functions의 정수 파라미터이며 기본값 25입니다. PIN은 랜덤 salt와 서버 pepper를 넣은 scrypt로 처리합니다. pepper를 바꾸면 기존 PIN을 검증할 수 없으므로 별도의 계정 이전 절차가 필요합니다.

6. 웹은 **Firebase App Hosting**에 이 저장소를 연결하여 배포할 수 있습니다. `.env.local`은 커밋하지 말고 배포 콘솔에서 웹 환경변수를 설정하세요. `apphosting.yaml`은 Firebase 모드 기본값만 포함합니다. 또는 Next.js Node 호스트에서 `npm run build`, `npm run start`를 실행할 수 있습니다. 환경변수는 빌드 전에 설정해야 합니다.
7. 샘플 데이터 seed는 운영을 명시한 경우에만 실행됩니다. 실제 학교 서비스에는 학교 목록 결정 후 `SchoolRepository`와 클라이언트 데이터 소스를 교체하세요. 운영 seed가 필요하면 서비스 계정 ADC 환경에서 `npm run seed -- --production`을 실행합니다.

공식 문서: [Next.js 설치](https://nextjs.org/docs/app/getting-started/installation), [Firebase callable](https://firebase.google.com/docs/functions/callable), [App Check 적용](https://firebase.google.com/docs/app-check/cloud-functions), [Firebase App Hosting](https://firebase.google.com/docs/app-hosting/get-started).

## 서버 검증과 랭킹

학생은 배송/별가루/학교 집계를 직접 수정할 수 없습니다. 서버가 발급한 문제 ID, 소유자, 순서, 실제 답·오답 이력으로 완료를 확인합니다. 제출 요청 ID와 완료 플래그로 중복을 막고 학생·배송·학교 문서를 원자적으로 기록합니다.

첫 시도 정답 3개 이상, 실제 서버 경과 45초 이상, 서울 날짜 기준 하루 25건 미만인 배송만 학교에 반영합니다. 부족해도 개인 진행과 스탬프는 저장됩니다. 회차 완주 보상은 한 번만 지급합니다.

주간 기준은 Asia/Seoul 월요일 00:00입니다. 학교별 주차 키 카운터를 사용해 지난 주 기록과 섞이지 않습니다. 매시간 하나의 집계 문서를 만들며, 클라이언트는 이 문서만 읽습니다. 수동 갱신은 전체 집계 기준 30분 간격입니다. 동점은 공동 순위로 표시합니다. 학생 닉네임과 개인 순위는 랭킹에 넣지 않습니다.

## 자산

국기는 ISO 코드 자리표시자이며, 캐릭터는 우편 아이콘과 색상으로 구별한 교체용 그래픽입니다. 지도는 [Natural Earth 공개 도메인 지형 데이터](https://www.naturalearthdata.com/about/terms-of-use/)로 만들었습니다. Lucide 아이콘은 ISC 라이선스입니다. 원본 링크와 결정 대기 목록은 [OPEN_DECISIONS.md](OPEN_DECISIONS.md)에 있습니다.
