// 화면 전환 관리. spec 11장의 화면을 이름으로 등록하고 하나씩 보여 준다.
// 각 화면은 render(root, params, nav) 함수다. nav.go(이름, params)로 다른 화면으로 간다.
// 화면이 정리 함수를 돌려주면 다음 화면으로 넘어갈 때 호출한다 (타이머·리스너 해제).

export function createRouter(root, { onChange = null } = {}) {
  const screens = new Map();
  let cleanup = null;

  function register(name, render) {
    screens.set(name, render);
  }

  function go(name, params = {}) {
    const render = screens.get(name);
    if (!render) {
      throw new Error(`등록되지 않은 화면: ${name}`);
    }
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    root.replaceChildren();
    root.dataset.screen = name;
    window.scrollTo(0, 0);
    const result = render(root, params, nav);
    if (typeof result === 'function') cleanup = result;
    // 상단 내비처럼 화면 바깥에 있는 것들이 현재 화면을 알아야 한다
    if (onChange) onChange(name, nav);
  }

  const nav = { register, go };

  function start(first = 'start') {
    go(first);
  }

  return { register, go, start };
}
