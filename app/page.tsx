'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Compass,
  Flag,
  Globe2,
  Lightbulb,
  LogOut,
  Mail,
  Package,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { api, View, Aggregate } from '../lib/client';
import { schools } from '../data/schools';
import { assets } from '../data/assets';
import { country } from '../data/countries';
import { itemSlotLabels, itemSlots, shopItem, shopItems, type ShopItem } from '../data/items';
import { Fraction, mixed, AnswerInput } from '../core/rational';
import { hint } from '../core/problems';
import { WorldMap } from '../components/world-map';
import { AnswerPad } from '../components/answer-pad';
type Screen = 'login' | 'map' | 'solve' | 'success' | 'round' | 'passport' | 'shop' | 'ranking';
type LoginStep = 'welcome' | 'profile' | 'character';
type SavedProfile = { schoolId: string; nickname: string; character: string };
const broomStages = [
  {
    name: '새싹 나무 빗자루',
    note: '첫 배송을 함께 시작하는 포근한 기본 빗자루',
    src: '/brooms/broom-1.png',
  },
  {
    name: '별방울 빗자루',
    note: '작은 별 장식이 길을 밝혀 주는 빗자루',
    src: '/brooms/broom-2.png',
  },
  {
    name: '구름숲 빗자루',
    note: '구름처럼 부드럽게 하늘을 가르는 빗자루',
    src: '/brooms/broom-3.png',
  },
  {
    name: '달빛 빗자루',
    note: '초승달의 마법을 머금은 보랏빛 빗자루',
    src: '/brooms/broom-4.png',
  },
  {
    name: '전설의 별빛 빗자루',
    note: '세계일주를 빛으로 수놓는 최고 단계 빗자루',
    src: '/brooms/broom-5.png',
  },
] as const;

function broomStage(round: number) {
  return Math.min(broomStages.length, Math.max(1, round));
}

function BroomProgress({ round, leg }: { round: number; leg: number }) {
  const stage = broomStage(round);
  const broom = broomStages[stage - 1];
  const remaining = Math.max(0, 4 - leg);
  return (
    <section className="broom-progress-card" aria-label={`현재 ${stage}단계 빗자루`}>
      <div className="broom-art">
        <span>STAGE {stage}</span>
        <Image src={broom.src} alt={broom.name} width={1024} height={1400} priority />
      </div>
      <div className="broom-copy">
        <span className="eyebrow">나의 빗자루 성장</span>
        <h2>{broom.name}</h2>
        <p>{broom.note}</p>
        <div className="broom-stage-track" aria-label={`빗자루 성장 ${stage} / 5단계`}>
          {broomStages.map((item, index) => {
            const number = index + 1;
            return (
              <span
                className={number < stage ? 'complete' : number === stage ? 'current' : ''}
                key={item.name}
                title={item.name}
              >
                {number < stage ? <Check size={14} /> : number}
              </span>
            );
          })}
        </div>
      </div>
      <div className="broom-next">
        {stage === broomStages.length ? (
          <>
            <Sparkles size={20} />
            <strong>최고 단계 완성!</strong>
            <small>전설의 빗자루와 계속 여행해요</small>
          </>
        ) : (
          <>
            <strong>다음 성장까지</strong>
            <span>{remaining}개국</span>
            <small>이번 세계일주를 완주하면 {stage + 1}단계</small>
          </>
        )}
      </div>
    </section>
  );
}
function F({ value }: { value: Fraction }) {
  const m = mixed(value);
  return (
    <span
      className="math-number"
      aria-label={m.n ? `${m.whole ? m.whole + '와 ' : ''}${m.d}분의 ${m.n}` : String(m.whole)}
    >
      {m.whole > 0 && <span>{m.whole}</span>}
      {m.n > 0 && (
        <span className="fraction">
          <span>{m.n}</span>
          <span>{m.d}</span>
        </span>
      )}
    </span>
  );
}
function FlagAsset({ id }: { id: string }) {
  const asset = assets.flags[id];
  return asset ? (
    <img className="flag-asset" src={asset.src} alt={`${country(id).name} 국기`} />
  ) : (
    <span
      className="flag-placeholder"
      title="국기 자산 준비 중"
      aria-label={`${country(id).name} 국기 자리표시자`}
    >
      {id}
    </span>
  );
}
function Avatar({ id, large = false }: { id: string; large?: boolean }) {
  const c = assets.characters.find((c) => c.id === id) ?? assets.characters[0];
  return (
    <span
      className={'avatar ' + (large ? 'large' : '')}
      role="img"
      aria-label={`${c.name} 캐릭터`}
      style={
        {
          '--avatar-color': c.color,
          '--avatar-x': c.portraitX,
        } as React.CSSProperties
      }
    >
      <span>{c.mark}</span>
    </span>
  );
}
function ItemImage({ item }: { item: ShopItem }) {
  return (
    <span
      className="item-sprite"
      role="img"
      aria-label={item.name}
      style={{
        backgroundImage: `url(${item.image})`,
        backgroundSize: item.spriteSize,
        backgroundPosition: `${item.spriteX} ${item.spriteY}`,
      }}
    />
  );
}
function formatTime(ms: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ms);
}
export default function App() {
  const [screen, setScreen] = useState<Screen>('login'),
    [view, setView] = useState<View | null>(null),
    [busy, setBusy] = useState(false),
    [booting, setBooting] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [loginStep, setLoginStep] = useState<LoginStep>('welcome'),
    [editingProfile, setEditingProfile] = useState(false),
    [savedProfile, setSavedProfile] = useState<SavedProfile | null>(null),
    [pendingView, setPendingView] = useState<View | null>(null),
    [character, setCharacter] = useState('luna'),
    [schoolId, setSchoolId] = useState(''),
    [nickname, setNickname] = useState(''),
    [pin, setPin] = useState(''),
    [board, setBoard] = useState<Aggregate | null>(null),
    [rankTab, setRankTab] = useState<'weekly' | 'total'>('weekly'),
    [passport, setPassport] = useState(0);
  const s = view?.student,
    d = view?.delivery,
    p = d?.problem,
    dest = s && s.leg < 4 ? country(s.route[s.leg]) : null;
  const restore = (v: View) => {
    setView(v);
    setCharacter(v.student.character || 'luna');
    setScreen(
      !v.student.character ? 'login' : v.delivery ? 'solve' : v.student.leg === 4 ? 'round' : 'map',
    );
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem('magic-courier-profile');
      if (saved) {
        const profile = JSON.parse(saved) as SavedProfile;
        if (profile.schoolId && profile.nickname) {
          setSavedProfile(profile);
          setSchoolId(profile.schoolId);
          setNickname(profile.nickname);
          if (profile.character) setCharacter(profile.character);
        }
      }
    } catch {}
    api('state')
      .then(restore)
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);
  async function task(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function navigate(next: Screen) {
    setError('');
    setNotice('');
    setScreen(next);
    if (next === 'ranking') await task(async () => setBoard(await api<Aggregate>('leaderboard')));
  }
  function rememberProfile(v: View, selectedCharacter = character) {
    const profile: SavedProfile = {
      schoolId: v.student.schoolId,
      nickname: v.student.nickname,
      character: v.student.character || selectedCharacter,
    };
    localStorage.setItem('magic-courier-profile', JSON.stringify(profile));
    setSavedProfile(profile);
  }
  function openLogin(useSavedProfile: boolean) {
    setError('');
    setPin('');
    setPendingView(null);
    if (useSavedProfile && savedProfile) {
      setSchoolId(savedProfile.schoolId);
      setNickname(savedProfile.nickname);
      if (savedProfile.character) setCharacter(savedProfile.character);
      setEditingProfile(false);
    } else {
      setSchoolId('');
      setNickname('');
      setEditingProfile(true);
    }
    setLoginStep('profile');
  }
  function closeLogin() {
    setError('');
    setPin('');
    setPendingView(null);
    setLoginStep('welcome');
  }
  async function submitProfile() {
    await task(async () => {
      const v = await api<View>('login', { schoolId, nickname, pin });
      rememberProfile(v);
      if (!v.student.character) {
        setPendingView(v);
        setLoginStep('character');
        return;
      }
      setPin('');
      setLoginStep('welcome');
      restore(v);
    });
  }
  async function finishSetup() {
    if (!pendingView) return;
    await task(async () => {
      const v = await api<View>('setup', { character });
      rememberProfile(v, character);
      setPin('');
      setPendingView(null);
      setLoginStep('welcome');
      restore(v);
    });
  }
  async function submit(input: AnswerInput) {
    if (!d || !p) return;
    await task(async () => {
      const v = await api<View & { feedback: string }>('answer', {
        sessionId: d.id,
        problemId: p.id,
        requestId: crypto.randomUUID(),
        input,
      });
      setView(v);
      if (v.feedback === 'correct' && v.delivery?.index === 5) {
        const finished = await api<View>('finish', { sessionId: v.delivery.id });
        setView(finished);
        setNotice('');
        setScreen(finished.student.leg === 4 ? 'round' : 'success');
        return;
      }
      setNotice(
        v.feedback === 'correct'
          ? '정답이에요!'
          : v.feedback === 'simplify'
            ? '거의 다 왔어요. 더 간단히 줄일 수 있어요.'
            : hint(p, (d.attempts[d.index] ?? 0) + 1),
      );
    });
  }
  async function startDelivery() {
    await task(async () => {
      const next = d ? view : await api<View>('start');
      if (next) setView(next);
      setNotice('');
      setScreen('solve');
    });
  }
  const navItems = [
    { id: 'map' as Screen, label: '세계지도', icon: Compass },
    { id: 'passport' as Screen, label: '나의 여권', icon: BookOpen },
    { id: 'shop' as Screen, label: '꾸미기', icon: ShoppingBag },
    { id: 'ranking' as Screen, label: '학교 랭킹', icon: Trophy },
  ];
  return (
    <div className="app-shell">
      <a href="#main" className="skip">
        본문으로 바로가기
      </a>
      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate(s ? 'map' : 'login')}
          aria-label="마법 배달부 홈"
        >
          <span className="brand-icon">
            <Mail size={23} />
            <Sparkles size={12} />
          </span>
          <span>
            마법 배달부<small>세계일주 우편국</small>
          </span>
        </button>
        {s ? (
          <>
            <nav aria-label="주 메뉴">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  className={screen === item.id ? 'active' : ''}
                  onClick={() => navigate(item.id)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
            <div className="profile">
              <button
                className="dust dust-button"
                onClick={() => navigate('shop')}
                aria-label={`별가루 ${s.dust}개, 꾸미기 공방 열기`}
              >
                <Sparkles size={16} />
                {s.dust}
              </button>
              <Avatar id={s.character} />
              <button
                className="icon-button"
                aria-label="로그아웃"
                onClick={() =>
                  task(async () => {
                    await api('logout');
                    setView(null);
                    setScreen('login');
                    setLoginStep('welcome');
                    setPin('');
                  })
                }
              >
                <LogOut size={18} />
              </button>
            </div>
          </>
        ) : null}
      </header>
      <main id="main" tabIndex={-1}>
        {error && !(screen === 'login' && loginStep !== 'welcome') && (
          <div role="alert" className="error">
            {error}
            <button onClick={() => setError('')} aria-label="오류 안내 닫기">
              ×
            </button>
          </div>
        )}
        {booting ? (
          <div className="loading">
            <Mail />
            <p>불러오는 중…</p>
          </div>
        ) : (
          <>
            {screen === 'login' && (
              <section className="login-landing">
                <div className="login-hero">
                  <div className="login-hero-copy">
                    <span className="eyebrow">초등 6학년 수학 · 비와 비율</span>
                    <h1>
                      마법 배달부로
                      <br />
                      <em>
                        세계일주를<span className="desktop-space"> </span>
                        <br className="mobile-break" />
                        시작해요!
                      </em>
                    </h1>
                    <p>
                      문제를 풀고 마법의 소포를 배달하며 <br />
                      세계 각지의 여권 스탬프를 모아 보세요.
                    </p>
                    {savedProfile && (
                      <div className="saved-courier">
                        <Avatar id={savedProfile.character || 'luna'} />
                        <span>
                          <small>다시 만났네요!</small>
                          <strong>{savedProfile.nickname} 배달부</strong>
                        </span>
                      </div>
                    )}
                    <div className="login-actions">
                      <button className="primary" onClick={() => openLogin(Boolean(savedProfile))}>
                        {savedProfile ? '이어서 배달하기' : '배달 시작하기'}
                        <ArrowRight size={19} />
                      </button>
                      {savedProfile && (
                        <button className="text-button" onClick={() => openLogin(false)}>
                          다른 배달부로 시작
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="login-hero-art">
                    <span className="hero-spark hero-spark-one">✦</span>
                    <span className="hero-spark hero-spark-two">✦</span>
                    <img
                      src="/couriers/flying-characters.png"
                      alt="빗자루를 타고 배달하는 마법 배달부 네 명"
                    />
                    <div className="hero-delivery-tag">
                      <Package size={20} />
                      <span>
                        <strong>오늘의 배달</strong>
                        <small>4개국 · 20문제</small>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="login-quick-steps" aria-label="게임 진행 방법">
                  <span>
                    <b>01</b> 문제를 풀고
                  </span>
                  <span>
                    <b>02</b> 세계로 배달하고
                  </span>
                  <span>
                    <b>03</b> 여권 스탬프를 모아요
                  </span>
                </div>
                {loginStep !== 'welcome' && (
                  <div className="onboarding-backdrop" onMouseDown={closeLogin}>
                    <section
                      className="onboarding-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="onboarding-title"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        className="modal-close"
                        onClick={closeLogin}
                        aria-label="시작 창 닫기"
                      >
                        ×
                      </button>
                      <div
                        className="onboarding-progress"
                        aria-label={`${loginStep === 'profile' ? 1 : 2}단계 / 2단계`}
                      >
                        <span className="active" />
                        <span className={loginStep === 'character' ? 'active' : ''} />
                      </div>
                      {error && (
                        <div role="alert" className="error modal-error">
                          {error}
                          <button onClick={() => setError('')} aria-label="오류 안내 닫기">
                            ×
                          </button>
                        </div>
                      )}
                      {loginStep === 'profile' && (
                        <>
                          <span className="eyebrow">1단계 · 내 배달부 찾기</span>
                          <h2 id="onboarding-title">배달부 정보를 알려 주세요</h2>
                          <p className="modal-intro">
                            실명은 사용하지 않아요. PIN은 저장하지 않습니다.
                          </p>
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              void submitProfile();
                            }}
                          >
                            {savedProfile && !editingProfile ? (
                              <div className="remembered-profile">
                                <Avatar id={savedProfile.character || 'luna'} />
                                <span>
                                  <strong>{savedProfile.nickname}</strong>
                                  <small>
                                    {
                                      schools.find((school) => school.id === savedProfile.schoolId)
                                        ?.name
                                    }
                                  </small>
                                </span>
                                <button
                                  type="button"
                                  className="text-button"
                                  onClick={() => setEditingProfile(true)}
                                >
                                  변경
                                </button>
                              </div>
                            ) : (
                              <div className="profile-fields">
                                <label>
                                  학교
                                  <select
                                    required
                                    value={schoolId}
                                    onChange={(e) => setSchoolId(e.target.value)}
                                  >
                                    <option value="">학교를 선택해 주세요</option>
                                    {schools.map((school) => (
                                      <option value={school.id} key={school.id}>
                                        {school.region} · {school.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label>
                                  닉네임
                                  <input
                                    aria-label="닉네임"
                                    required
                                    minLength={2}
                                    maxLength={12}
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    autoComplete="username"
                                    placeholder="예: 구름봉투"
                                  />
                                  <small>한글, 영문, 숫자 2~12자</small>
                                </label>
                              </div>
                            )}
                            <label>
                              비밀 PIN 4자리
                              <input
                                required
                                type="password"
                                inputMode="numeric"
                                pattern="[0-9]{4}"
                                maxLength={4}
                                value={pin}
                                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                                autoComplete="current-password"
                                placeholder="● ● ● ●"
                                autoFocus
                              />
                            </label>
                            <button disabled={busy} className="primary">
                              {busy
                                ? '확인 중…'
                                : savedProfile && !editingProfile
                                  ? '이어서 배달하기'
                                  : '다음'}
                              <ArrowRight size={18} />
                            </button>
                          </form>
                        </>
                      )}
                      {loginStep === 'character' && (
                        <>
                          <span className="eyebrow">2단계 · 배달부 선택</span>
                          <h2 id="onboarding-title">함께 떠날 배달부를 골라요</h2>
                          <p className="modal-intro">캐릭터는 다음에도 기억해 둘게요.</p>
                          <fieldset className="character-picker character-picker-large">
                            <legend className="sr-only">배달부</legend>
                            {assets.characters.map((c) => (
                              <button
                                type="button"
                                key={c.id}
                                className={character === c.id ? 'selected' : ''}
                                aria-pressed={character === c.id}
                                onClick={() => setCharacter(c.id)}
                              >
                                <Avatar id={c.id} />
                                <span>{c.name.replace(' 배달부', '')}</span>
                              </button>
                            ))}
                          </fieldset>
                          <button
                            disabled={busy}
                            className="primary modal-primary"
                            onClick={() => void finishSetup()}
                          >
                            {busy ? '준비 중…' : '이 배달부로 출발!'}
                            <ArrowRight size={18} />
                          </button>
                          <button
                            className="text-button modal-back"
                            onClick={() => setLoginStep('profile')}
                          >
                            <ChevronLeft size={17} /> 이전으로
                          </button>
                        </>
                      )}
                    </section>
                  </div>
                )}
              </section>
            )}
            {screen === 'map' && s && (
              <section className="dashboard">
                <div className="page-heading">
                  <div>
                    <h1>{s.round}번째 세계일주</h1>
                    <p>오늘의 구름길을 따라 네 나라에 마법 소포를 전해요.</p>
                  </div>
                  <span className="round-badge">
                    <Globe2 size={18} />
                    {s.leg} / 4개국 도착
                  </span>
                </div>
                <div className="map-layout">
                  <div className="map-panel">
                    <div className="panel-heading">
                      <span>
                        <Compass size={18} />
                        여행 경로
                      </span>
                    </div>
                    <WorldMap
                      route={s.route}
                      leg={s.leg}
                      origin={s.origin}
                      character={s.character}
                    />
                    <ol className="route-list">
                      {s.route.map((id, i) => (
                        <li
                          key={id}
                          className={i < s.leg ? 'visited' : i === s.leg ? 'current' : ''}
                        >
                          <span className="step-number">
                            {i < s.leg ? <Check size={15} /> : i + 1}
                          </span>
                          <FlagAsset id={id} />
                          <div>
                            <strong>{country(id).name}</strong>
                            <small>
                              {country(id).continent} ·{' '}
                              {i < s.leg ? '도착' : i === s.leg ? '다음 배송지' : '배송 예정'}
                            </small>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <aside className="delivery-card">
                    <div className="label-row">
                      <span className="eyebrow">다음 목적지</span>
                      <Mail size={21} />
                    </div>
                    {dest ? (
                      <>
                        <FlagAsset id={dest.id} />
                        <h2>{dest.name}</h2>
                        <p className="destination-capital">
                          {dest.continent} · {dest.capital}
                        </p>
                        <div className="delivery-info">
                          <span>
                            이번 배송<strong>분수 문제 5개</strong>
                          </span>
                        </div>
                        <button className="primary" disabled={busy} onClick={startDelivery}>
                          {d ? '이어서 배달하기' : '배송 시작하기'}
                          <ArrowRight size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <h2>세계일주 완료!</h2>
                        <button className="primary" onClick={() => navigate('round')}>
                          완주 기록 보기
                          <ArrowRight size={18} />
                        </button>
                      </>
                    )}
                  </aside>
                </div>
                <BroomProgress round={s.round} leg={s.leg} />
                <div className="summary-grid">
                  <div>
                    <BookOpen />
                    <span>
                      모은 스탬프
                      <strong>
                        {s.visited.length}
                        <small> / 60개국</small>
                      </strong>
                    </span>
                  </div>
                  <div>
                    <Package />
                    <span>
                      완료한 배송
                      <strong>
                        {s.totalDeliveries}
                        <small> 건</small>
                      </strong>
                    </span>
                  </div>
                  <div>
                    <Sparkles />
                    <span>
                      별가루
                      <strong>
                        {s.dust}
                        <small> 톨</small>
                      </strong>
                    </span>
                  </div>
                  <button onClick={() => navigate('passport')}>
                    <span>
                      <strong>여권 보기</strong>
                    </span>
                    <ArrowRight />
                  </button>
                </div>
              </section>
            )}
            {screen === 'solve' && s && d && (
              <section className="solve-page">
                <div className="solve-heading">
                  <button className="text-button" onClick={() => navigate('map')}>
                    <ChevronLeft size={18} />
                    지도
                  </button>
                  <span>{country(d.destination).name}까지의 여행</span>
                  <strong>{d.index} / 5</strong>
                </div>
                <div
                  className="journey-progress"
                  role="progressbar"
                  aria-label="배송 진행"
                  aria-valuenow={d.index}
                  aria-valuemin={0}
                  aria-valuemax={5}
                >
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span className={i < d.index ? 'done' : ''} key={i}>
                      {i < d.index ? <Check size={16} /> : i + 1}
                    </span>
                  ))}
                </div>
                {p ? (
                  <div className="solve-layout">
                    <div className="question-card">
                      <div className="label-row">
                        <span className="eyebrow">{d.index + 1}번째 발걸음</span>
                        <span className="type-tag">
                          {p.word
                            ? '이야기 속 수학'
                            : p.type === 'G'
                              ? '빈칸 찾기'
                              : p.type === 'E'
                                ? '역수로 바꾸기'
                                : '분수의 나눗셈'}
                        </span>
                      </div>
                      <h1>
                        {p.word
                          ? p.word.title
                          : p.type === 'G'
                            ? '빈칸에 알맞은 수는?'
                            : p.type === 'E'
                              ? '뒤집어 곱하면 쉬워져요.'
                              : '차근차근 나누어 볼까요?'}
                      </h1>
                      {p.word ? (
                        <p className="word-problem">{p.word.text}</p>
                      ) : (
                        <div className="equation">
                          {p.type === 'G' ? (
                            <>
                              <span className="unknown">?</span>
                              <span>×</span>
                              <F value={p.right} />
                              <span>=</span>
                              <F value={p.left} />
                            </>
                          ) : (
                            <>
                              <F value={p.left} />
                              <span>÷</span>
                              <F value={p.right} />
                              <span>=</span>
                              <span className="unknown">?</span>
                            </>
                          )}
                        </div>
                      )}
                      {p.type === 'E' && (
                        <p className="reciprocal-equation">
                          <F value={p.left} /> ÷ <F value={p.right} /> = <F value={p.left} /> × □/□
                        </p>
                      )}
                      {p.word && <span className="unit-tag">답의 단위: {p.word.unit}</span>}
                      <div className="question-bottom">
                        <button
                          className="hint-button"
                          onClick={() => setNotice(hint(p, d.attempts[d.index] ?? 0))}
                        >
                          <Lightbulb size={18} />
                          힌트
                        </button>
                        <span>
                          <Sparkles size={16} />
                          +3 · 다시 풀면 +1
                        </span>
                      </div>
                      {notice && (
                        <div className="feedback" role="status" aria-live="polite">
                          {notice}
                        </div>
                      )}
                    </div>
                    <div className="answer-card">
                      <h2>나의 답</h2>
                      <AnswerPad
                        key={p.id}
                        reciprocal={p.type === 'E'}
                        busy={busy}
                        onSubmit={submit}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="arrival-ready">
                    <Flag size={55} />
                    <h1>배송 기록을 저장하고 있어요.</h1>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() =>
                        task(async () => {
                          const finished = await api<View>('finish', { sessionId: d.id });
                          setView(finished);
                          setScreen(finished.student.leg === 4 ? 'round' : 'success');
                        })
                      }
                    >
                      다시 저장
                      <Check size={20} />
                    </button>
                  </div>
                )}
              </section>
            )}
            {screen === 'success' && s && view?.lastDelivery && (
              <section className="success-card">
                <div className="stamp large-stamp">
                  <FlagAsset id={view.lastDelivery.destination} />
                  <strong>{country(view.lastDelivery.destination).name}</strong>
                  <small>MAGIC POST · 도착</small>
                </div>
                <h1>{country(view.lastDelivery.destination).name} 도착!</h1>
                <p className="arrival-meta">
                  {country(view.lastDelivery.destination).continent} · 수도{' '}
                  {country(view.lastDelivery.destination).capital}
                </p>
                <p className="country-intro">
                  <Sparkles size={17} />
                  {country(view.lastDelivery.destination).intro}
                </p>
                <div className="reward">
                  <Sparkles size={22} />+{view.lastDelivery.dust} 별가루
                </div>
                <p className="bonus-note">{view.lastDelivery.bonusReason}</p>
                <button className="primary" disabled={busy} onClick={startDelivery}>
                  다음 배송 시작
                  <ArrowRight size={18} />
                </button>
                <button className="text-button" onClick={() => navigate('map')}>
                  지도 보기
                </button>
              </section>
            )}
            {screen === 'round' && s && (
              <section className="success-card">
                <Globe2 className="hero-icon" size={64} />
                <h1>{s.round}번째 세계일주 완료!</h1>
                <div className="round-stamps">
                  {s.route.map((id) => (
                    <div className="stamp" key={id}>
                      <FlagAsset id={id} />
                      <strong>{country(id).name}</strong>
                    </div>
                  ))}
                </div>
                <div className="reward">
                  <Sparkles />
                  완주 선물 +10 별가루
                </div>
                {broomStage(s.round) < broomStages.length && (
                  <div className="next-broom-reward">
                    <Image
                      src={broomStages[broomStage(s.round)].src}
                      alt={`다음 보상 ${broomStages[broomStage(s.round)].name}`}
                      width={1024}
                      height={1400}
                    />
                    <span>
                      <small>다음 세계일주 성장 보상</small>
                      <strong>{broomStages[broomStage(s.round)].name}</strong>
                    </span>
                  </div>
                )}
                <button
                  disabled={busy}
                  className="primary"
                  onClick={() =>
                    task(async () => {
                      const nextRound = await api<View>('nextRound');
                      setView(nextRound);
                      const delivery = await api<View>('start');
                      setView(delivery);
                      setScreen('solve');
                    })
                  }
                >
                  다음 세계일주 바로 시작
                  <ArrowRight size={18} />
                </button>
                <button className="text-button" onClick={() => navigate('passport')}>
                  여권 펼쳐 보기
                </button>
              </section>
            )}
            {screen === 'passport' && s && (
              <section className="passport-page">
                <div className="page-heading">
                  <div>
                    <h1>나의 여권</h1>
                  </div>
                  <div className="segmented">
                    {[0, 1].map((i) => (
                      <button
                        className={passport === i ? 'active' : ''}
                        key={i}
                        onClick={() => setPassport(i)}
                      >
                        {i + 1}권
                      </button>
                    ))}
                  </div>
                </div>
                <div className="passport-book">
                  <div className="passport-title">
                    <BookOpen />
                    <h2>{s.nickname}의 세계일주 여권</h2>
                    <span>{Math.min(30, Math.max(0, s.visited.length - passport * 30))} / 30</span>
                  </div>
                  <div className="stamp-grid">
                    {Array.from({ length: 30 }, (_, i) => {
                      const id = s.visited[passport * 30 + i];
                      return (
                        <div
                          className={
                            'stamp ' + (!id ? 'empty-stamp' : `earned-stamp visa-tone-${i % 3}`)
                          }
                          key={i}
                          aria-label={
                            id ? `${country(id).name} 도착 완료 스탬프` : '미방문 국가 칸'
                          }
                        >
                          {id ? (
                            <div className="passport-stamp-content">
                              <div className="stamp-visa-head">
                                <span>
                                  입국 스탬프 · {String(passport * 30 + i + 1).padStart(2, '0')}
                                </span>
                                <Check size={13} strokeWidth={3} />
                              </div>
                              <FlagAsset id={id} />
                              <strong>{country(id).name}</strong>
                              <small>{country(id).capital}</small>
                              <span className="stamp-arrived">방문 완료</span>
                            </div>
                          ) : (
                            <>
                              <Globe2 size={24} />
                              <small>미방문</small>
                              <span>{String(passport * 30 + i + 1).padStart(2, '0')}</span>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="record-grid">
                  <div>
                    <strong>{s.totalProblems}</strong>
                    <span>풀어낸 문제</span>
                  </div>
                  <div>
                    <strong>{s.totalDeliveries}</strong>
                    <span>완료한 배송</span>
                  </div>
                  <div>
                    <strong>
                      {s.totalProblems ? Math.round((s.firstCorrect / s.totalProblems) * 100) : 0}%
                    </strong>
                    <span>첫 시도 정답률</span>
                  </div>
                  <div>
                    <strong>{Math.floor(s.visited.length / 30)}</strong>
                    <span>완성한 여권</span>
                  </div>
                </div>
                <details className="type-record">
                  <summary>유형별 학습 기록 펼치기</summary>
                  <div className="type-record-grid">
                    {Object.entries(s.stats).map(([type, stat]) => (
                      <span key={type}>
                        유형 {type}
                        <strong>
                          {stat.total ? Math.round((stat.first / stat.total) * 100) : 0}%
                        </strong>
                        <small>첫 시도 정답 · {stat.total}문제</small>
                      </span>
                    ))}
                  </div>
                </details>
              </section>
            )}
            {screen === 'shop' && s && (
              <section className="shop-page">
                <div className="page-heading shop-heading">
                  <div>
                    <span className="eyebrow">마법 우체국 꾸미기 공방</span>
                    <h1>별가루로 나만의 배달부를 꾸며요</h1>
                    <p>구입한 아이템은 계속 간직하고, 같은 종류끼리 자유롭게 바꿔 쓸 수 있어요.</p>
                  </div>
                  <span className="shop-balance">
                    <Sparkles size={18} />
                    별가루 <strong>{s.dust}</strong>개
                  </span>
                </div>
                <div className="shop-layout">
                  <aside className="wardrobe-preview">
                    <span className="eyebrow">지금 꾸민 모습</span>
                    <div className="wardrobe-avatar">
                      <Avatar id={s.character} large />
                      <span className="wardrobe-spark one">✦</span>
                      <span className="wardrobe-spark two">✦</span>
                    </div>
                    <h2>{s.nickname} 배달부의 선반</h2>
                    <div className="equipped-shelf">
                      {itemSlots.map((slot) => {
                        const item = shopItem((s.equippedItems ?? {})[slot] ?? '');
                        return (
                          <div className={'shelf-slot ' + (item ? 'filled' : '')} key={slot}>
                            <small>{itemSlotLabels[slot]}</small>
                            {item ? (
                              <>
                                <ItemImage item={item} />
                                <strong>{item.name}</strong>
                              </>
                            ) : (
                              <span>아직 비어 있어요</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="shop-note">
                      아이템은 학습 점수에 영향을 주지 않는 꾸미기 보상이에요.
                    </p>
                  </aside>
                  <div className="shop-catalog">
                    <div className="catalog-title">
                      <h2>오늘의 꾸미기 아이템</h2>
                      <span>
                        {(s.ownedItems ?? []).length} / {shopItems.length}개 보유
                      </span>
                    </div>
                    <div className="item-grid">
                      {shopItems.map((item) => {
                        const owned = (s.ownedItems ?? []).includes(item.id);
                        const equipped = (s.equippedItems ?? {})[item.slot] === item.id;
                        const short = Math.max(0, item.price - s.dust);
                        return (
                          <article
                            className={
                              'shop-item ' + (equipped ? 'equipped' : owned ? 'owned' : '')
                            }
                            key={item.id}
                          >
                            <span className="item-kind">{itemSlotLabels[item.slot]}</span>
                            <div className="item-art">
                              <ItemImage item={item} />
                            </div>
                            <h3>{item.name}</h3>
                            <p>{item.note}</p>
                            <button
                              type="button"
                              disabled={busy || equipped || (!owned && short > 0)}
                              onClick={() =>
                                task(async () => {
                                  const updated = await api<View>(owned ? 'equipItem' : 'buyItem', {
                                    itemId: item.id,
                                  });
                                  setView(updated);
                                })
                              }
                            >
                              {equipped ? (
                                <>
                                  <Check size={17} /> 사용 중
                                </>
                              ) : owned ? (
                                '사용하기'
                              ) : short ? (
                                `별가루 ${short}개 부족`
                              ) : (
                                <>
                                  <Sparkles size={16} /> {item.price}개로 구입
                                </>
                              )}
                            </button>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}
            {screen === 'ranking' && s && (
              <section className="ranking-page">
                <div className="page-heading">
                  <div>
                    <h1>학교 랭킹</h1>
                  </div>
                  <Trophy className="hero-icon" size={44} />
                </div>
                <div className="ranking-layout">
                  <div className="ranking-table">
                    <div className="ranking-toolbar">
                      <div className="segmented">
                        <button
                          className={rankTab === 'weekly' ? 'active' : ''}
                          onClick={() => setRankTab('weekly')}
                        >
                          이번 주
                        </button>
                        <button
                          className={rankTab === 'total' ? 'active' : ''}
                          onClick={() => setRankTab('total')}
                        >
                          역대 누적
                        </button>
                      </div>
                      <button
                        className="icon-button"
                        disabled={
                          busy || (!!board?.updatedAt && Date.now() - board.updatedAt < 1800000)
                        }
                        aria-label="랭킹 새로고침"
                        onClick={() =>
                          task(async () => setBoard(await api<Aggregate>('refreshLeaderboard')))
                        }
                      >
                        <RefreshCw size={18} />
                      </button>
                    </div>
                    {!board ? (
                      <p className="empty">랭킹을 불러오는 중…</p>
                    ) : (
                      <>
                        <table>
                          <thead>
                            <tr>
                              <th>순위</th>
                              <th>학교</th>
                              <th>배송량</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(rankTab === 'weekly' ? board.top10 : board.allTimeTop10).map(
                              (row) => (
                                <tr
                                  key={row.id}
                                  className={row.id === s.schoolId ? 'my-school' : ''}
                                >
                                  <td>{rankTab === 'weekly' ? row.weeklyRank : row.totalRank}</td>
                                  <td>
                                    {row.name}
                                    {row.id === s.schoolId && <small>우리 학교</small>}
                                  </td>
                                  <td>
                                    {rankTab === 'weekly' ? row.weekly : row.total}
                                    <small> 건</small>
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                        {!board.top10.length && (
                          <p className="empty">첫 번째 학교 배송을 기다리고 있어요.</p>
                        )}
                        <div className="ranking-meta">
                          {board.totalSchools}개 학교 ·{' '}
                          {board.updatedAt ? formatTime(board.updatedAt) + ' 갱신' : '집계 전'}
                          <br />
                          매시간 갱신
                        </div>
                      </>
                    )}
                  </div>
                  <aside className="ranking-aside">
                    <Mail size={32} />
                    <h2>우리 학교</h2>
                    <strong>{schools.find((x) => x.id === s.schoolId)?.name}</strong>
                    <div className="school-rank">
                      {board?.schools[s.schoolId]
                        ? (rankTab === 'weekly'
                            ? board.schools[s.schoolId].weeklyRank
                            : board.schools[s.schoolId].totalRank) + '위'
                        : '집계 준비 중'}
                    </div>
                    <p>랭킹 반영 조건</p>
                    <ul>
                      <li>5문제 중 첫 도전에 3문제 이상</li>
                      <li>45초 이상 차근차근 풀기</li>
                      <li>하루 최대 {s.rankingCap ?? 25}건 반영</li>
                    </ul>
                    <small>조건을 못 채워도 개인 기록은 남아요.</small>
                    <hr />
                    <small>매주 월요일 00:00 초기화 · 한국 시간</small>
                  </aside>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
