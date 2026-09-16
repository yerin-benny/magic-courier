import"./main-C6rRz6_Q.js";import{m as a}from"./manifest-BLqSftXh.js";const s=document.getElementById("app");s.innerHTML=`
  <style>
    .dev { max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
    .dev h1, .dev h2 { margin: 0; }
    .row { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; background: var(--paper); border-radius: 16px; padding: 16px; }
    .cell { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 12px; color: var(--ink-soft); }
    .cell img { object-fit: contain; background: repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0 / 16px 16px; border-radius: 6px; }
    .sky { background: var(--sky-image, var(--sky)); background-size: cover; }
  </style>
  <div class="dev">
    <h1>자산 확인</h1>
    <h2>캐릭터 4종 · 48px 축소 판독 (지도 크기)</h2>
    <div class="row sky" id="small"></div>
    <h2>캐릭터 4종 · 72px (문제 화면 크기)</h2>
    <div class="row sky" id="mid"></div>
    <div id="groups"></div>
  </div>
`;function d(o,c,n){const t=document.createElement("div");t.className="cell";const e=document.createElement("img");return e.src=o,e.alt="",e.width=n,e.height=n,t.append(e,document.createTextNode(c)),t}for(const[o,c]of[["small",48],["mid",72]]){const n=document.getElementById(o);for(let t=1;t<=4;t++){const e=a.characters[`side-${t}`];e&&n.append(d(e,`side-${t}`,c))}}const r=document.getElementById("groups");for(const[o,c]of Object.entries(a)){const n=Object.keys(c);if(!n.length)continue;const t=document.createElement("h2");t.textContent=`${o} (${n.length})`;const e=document.createElement("div");e.className="row";for(const i of n.sort())e.append(d(c[i],i,o==="flags"?48:96));r.append(t,e)}
