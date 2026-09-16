import"./main-C6rRz6_Q.js";import{c as h,T as C,g as w,p as $,a as S,f as R,r as B,b as k,s as I,d as s,e as o,h as W,i as D,j as z,G as c,R as A,k as L}from"./fractionView-CNNveVzg.js";const m=L(),f=h(),M=document.getElementById("app");M.innerHTML=`
  <style>
    .dev { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
    .dev h1 { font-size: 20px; margin: 0; }
    .dev__picker { display: flex; flex-wrap: wrap; gap: 6px; }
    .dev__picker button { padding: 8px 12px; border: 2px solid var(--brown); border-radius: 8px; background: #fff; font: inherit; cursor: pointer; }
    .dev__picker button.is-active { background: var(--amber); color: #fff; border-color: var(--amber); }
    .dev__problem { background: #fff; border-radius: 12px; padding: 20px; font-size: 26px; min-height: 60px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .dev__problem--word { font-size: 20px; line-height: 1.5; }
    .dev__status { display: flex; gap: 16px; font-size: 14px; color: var(--brown); flex-wrap: wrap; }
    .dev__log { font-size: 13px; color: var(--purple); background: #fff; border-radius: 8px; padding: 8px 12px; max-height: 140px; overflow: auto; }
  </style>
  <div class="dev">
    <h1>답 입력 컴포넌트 시험</h1>
    <div class="dev__picker" id="picker"></div>
    <div class="dev__problem" id="problem"></div>
    <div id="input"></div>
    <div class="dev__status">
      <span id="attempts">시도 0회</span>
      <span id="firstTry">첫 시도 정답 자격: 유지</span>
      <span id="answerPeek"></span>
    </div>
    <div class="dev__log" id="log"></div>
  </div>
`;const v=document.getElementById("picker"),a=document.getElementById("problem"),P=document.getElementById("input"),G=document.getElementById("attempts"),F=document.getElementById("firstTry"),N=document.getElementById("answerPeek"),U=document.getElementById("log");let n=null,r=null,i=0,p=!0,g=!1;function d(e){const t=document.createElement("div");t.textContent=`${new Date().toLocaleTimeString()} ${e}`,U.prepend(t)}function H(e){if(a.replaceChildren(),a.classList.toggle("dev__problem--word",e.type==="W"||e.type==="G"),e.type==="W"){a.append(k(e.segments));return}if(e.type==="G"){a.append(k(I(e)));return}if(e.type==="E"){a.append(s(e.dividend),o("÷"),s(e.divisor),o("="),s(e.dividend),o("×"),W(),o("="),document.createTextNode("?"));return}a.append(s(e.dividend),o("÷"),s(e.divisor),o("="),document.createTextNode("?"))}function E(){var e;G.textContent=`시도 ${i}회`,F.textContent=`첫 시도 정답 자격: ${p?"유지":"없음"}`,N.textContent=g&&n?`정답: ${R(B(n.answer))}${(e=n.answerUnit)!=null?e:""}`:""}function T(e){n=e==="W1"?w(1,{rng:m,recent:f}):e==="W2"?w(2,{rng:m,recent:f}):$(e,{rng:m,recent:f}),i=0,p=!0,H(n),r&&r.destroy(),r=S(P,{layout:n.type==="E"?"reciprocal":"answer",onSubmit:J}),r.focus(),E(),d(`[${n.type}] ${n.key}`);for(const t of v.querySelectorAll("button"))t.classList.toggle("is-active",t.dataset.kind===e)}function J(e){var x,b,y;const t=n.type==="E"?D(e,n):z(e,n.answer),u=t.status;if(u===c.REJECTED){const _=(y=(b=t.reason)!=null?b:(x=t.result)==null?void 0:x.reason)!=null?y:t.reciprocal===c.REJECTED?"역수 칸":"";r.setMessage(_==="zeroDenominator"?"분모는 0이 될 수 없어요.":"칸을 다시 확인해 주세요.","info"),d(`입력 거부 (${_})`);return}if(u===c.NEEDS_REDUCE){r.setMessage(A,"reduce"),d("약분필요 → 재입력 (시도 차감 없음)");return}i+=1,u===c.CORRECT?(r.setMessage(p?"정답! 첫 시도 정답 (별가루 3)":"정답! (별가루 1)","correct"),r.lock(),d(`정답 (시도 ${i}회)`)):(p=!1,r.setMessage("다시 한번 생각해 볼까요?","wrong"),r.clear(),d(`오답 (시도 ${i}회)`)),E()}for(const e of[...C,"W1","W2"]){const t=document.createElement("button");t.type="button",t.dataset.kind=e,t.textContent=e==="W1"?"문장제 1":e==="W2"?"문장제 2":`유형 ${e}`,t.addEventListener("click",()=>T(e)),v.append(t)}const l=document.createElement("button");l.type="button";l.textContent="정답 보기";l.addEventListener("click",()=>{g=!g,E()});v.append(l);T("A");
