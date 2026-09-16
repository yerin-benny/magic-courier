# scripts/

검증 스크립트는 코드를 고치지 않고 위반 목록만 출력한다. 자산 스크립트는 assets/ 에 파일을 만든다.

| 명령 | 내용 | 단계 |
|---|---|---|
| `npm run verify:generators` | 유형 A~G 전수 문항 공간 크기, 조건 위반, 3만 건 무작위 뽑기의 최근 60문항 중복, 한 단원 160문제 유형 배분 | STEP 3 |
| `npm run verify:word` | 문장제 20맥락: 전수 문항 수, 맥락별 100건 생성 검사(그룹 1 자연수 답, 현실성), 맥락별 예시 3개 출력 | STEP 4 |
| `npm run verify:routes` | 회차 경로 추첨 3000회 시뮬레이션: 여권 1권 8회차, 대륙 분포, 60개국 15회차, 대륙 중복 해제 횟수 | STEP 7 |
| `npm run assets:flags` | flag-icons(MIT)에서 60개국 국기 SVG 복사 → assets/flags | STEP 8 |
| `npm run assets:cut` | 상위 폴더의 원본 시트(캐릭터·빗자루·아이템·소포·여권·하늘)를 잘라 assets/ 에 넣는다 (Python + Pillow) | STEP 10 |
