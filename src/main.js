// 진입점. 저장 계층을 붙이고, 로그인 기록을 되찾고, 화면을 등록해 라우터를 시작한다. 게임 로직은 넣지 않는다.
import '@fontsource/jua/index.css'; // 제목·버튼·숫자 (OFL)
import '@fontsource/gowun-dodum/index.css'; // 본문 (OFL)
import './styles/fractionView.css';
import './styles/screens.css';
import { getAsset } from '../assets/manifest.js';
import { createRouter } from './app/router.js';
import { renderTopBar } from './ui/components/topBar.js';
import { storage } from './storage/index.js';
import { gameState } from './game/gameState.js';
import { resumeSession } from './game/auth.js';
import { renderStartScreen } from './ui/screens/startScreen.js';
import { renderLoginScreen } from './ui/screens/loginScreen.js';
import { renderCharacterScreen } from './ui/screens/characterScreen.js';
import { renderRequestScreen } from './ui/screens/requestScreen.js';
import { renderProblemScreen } from './ui/screens/problemScreen.js';
import { renderSuccessScreen } from './ui/screens/successScreen.js';
import { renderMapScreen } from './ui/screens/mapScreen.js';
import { renderRoundCompleteScreen } from './ui/screens/roundCompleteScreen.js';
import { renderPassportScreen } from './ui/screens/passportScreen.js';
import { renderNewPassportScreen } from './ui/screens/newPassportScreen.js';
import { renderRankingScreen } from './ui/screens/rankingScreen.js';
import { renderShopScreen } from './ui/screens/shopScreen.js';

// 하늘 배경 (원본 시트 7. 하늘). 경로는 manifest 를 거친다.
const sky = getAsset('backgrounds.sky');
if (sky) document.body.style.setProperty('--sky-image', `url(${sky})`);

// 빌드 타깃(es2019)에는 최상위 await 가 없으므로 async 함수로 감싼다
async function boot() {
// 저장 계층 연결 + 이 기기의 로그인 기록 복원
gameState.storage = storage;
const saved = await resumeSession(storage);
if (saved) gameState.loadStudent(saved, await storage.loadRecentProblemKeys(saved.id));

const root = document.getElementById('app');
const topbar = document.getElementById('topbar');
// 상단 내비는 화면 바깥에 있으므로 라우터가 화면을 바꿀 때마다 다시 그린다
const router = createRouter(root, { onChange: (name, nav) => renderTopBar(topbar, name, nav) });

// spec 11장 화면 번호: 1 시작, 2 로그인, 3 캐릭터, 5 세계지도, 6 배송 의뢰, 7 문제 풀이,
// (4 출발 지역 선택은 2026-09-16 사용자 요청으로 없앴다. 우체국 이름은 학교 지역에서 자동으로 만든다)
// 8 배송 성공, 9 회차 완료, 10 여권, 11 꾸미기(별빛 상점), 12 학교 랭킹.
router.register('start', renderStartScreen);
router.register('login', renderLoginScreen);
router.register('character', renderCharacterScreen);
router.register('map', renderMapScreen);
router.register('request', renderRequestScreen);
router.register('problem', renderProblemScreen);
router.register('success', renderSuccessScreen);
router.register('roundComplete', renderRoundCompleteScreen);
router.register('passport', renderPassportScreen);
router.register('newPassport', renderNewPassportScreen);
router.register('ranking', renderRankingScreen);
router.register('shop', renderShopScreen);

router.start('start');

// 개발 모드에서만: 브라우저 콘솔에서 상태를 들여다보기 위한 훅. 빌드에는 들어가지 않는다.
if (import.meta.env.DEV) {
  window.__game = gameState;
  window.__storage = storage;
}
}

boot();
