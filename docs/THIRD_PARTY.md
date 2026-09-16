# 외부 자산·데이터 출처

| 항목 | 출처 | 라이선스 | 사용처 |
|---|---|---|---|
| 세계지도 국가 경계 (1:110m) | Natural Earth (naturalearthdata.com), `world-atlas` npm 패키지의 `countries-110m.json` | Natural Earth: 퍼블릭 도메인 / world-atlas: ISC | 세계지도 화면 육지 층 |
| TopoJSON 디코딩 | `topojson-client` | ISC | 위 데이터를 GeoJSON으로 풀 때 |
| 국기 SVG (4:3) | `flag-icons` npm 패키지 (Panayiotis Lipiridis) | MIT | `assets/flags/*.svg` (60개국만 복사, `npm run assets:flags`) |
| 글꼴 Jua (제목·버튼·숫자) | `@fontsource/jua` (Woowahan Brothers) | SIL OFL 1.1 | 자체 호스팅, 빌드에 포함 |
| 글꼴 Gowun Dodum (본문) | `@fontsource/gowun-dodum` | SIL OFL 1.1 | 자체 호스팅, 빌드에 포함 |

MIT 라이선스 자산(flag-icons)은 배포물에 저작권 표기가 남아야 한다. 이 파일을 배포 폴더에 함께 두거나
앱의 정보 화면에 "국기: flag-icons (MIT)" 한 줄을 넣는다. OFL 글꼴은 그대로 포함해 배포할 수 있다.

원본 그래픽 시트(캐릭터, 여권, 소포, 하늘)는 사용자가 생성한 자산이며 `npm run assets:cut`(`scripts/cutAssets.py`, Pillow)으로
잘라 `assets/` 에 넣는다.

2026-09-16 지도 데이터·국기 사용자 승인.
