(()=>{var Lr=(g,m,h)=>{if(!m.has(g))throw TypeError("Cannot "+h)};var t=(g,m,h)=>(Lr(g,m,"read from private field"),h?h.call(g):m.get(g)),r=(g,m,h)=>{if(m.has(g))throw TypeError("Cannot add the same private member more than once");m instanceof WeakSet?m.add(g):m.set(g,h)},s=(g,m,h,Dt)=>(Lr(g,m,"write to private field"),Dt?Dt.call(g,h):m.set(g,h),h);var o=(g,m,h)=>(Lr(g,m,"access private method"),h);(function(){"use strict";var zt,A,fi,I,at,K,V,$e,ke,ot,$t,dt,ht,Xt,Y,Z,lt,Kt,mi,Ce,Cr,rn,w,Fi,Vr,Ni,Yr,Vi,Zr,Yi,Wr,Le,mr,Ae,gr,Zi,Ur,Jt,zi,Wi,Gr,Ui,Xr,gi,Ar,bi,Er,Gi,Kr,et,R,Xi,P,Ee,Qt,ct,pt,ut,D,_,Bt,kt,z,E,te,W,yi,Me,br,ee,Bi,xi,Mr,Te,yr,wi,Tr,_i,qr,Rt,pi,Ki,Jr,Ji,Qr,Si,Hr,$i,Ir,Qi,ts,ki,Pr,tr,es,qe,Ct,vt,U,jt,He,Ie,Pe,j,O,De,ze,Be,Re,Lt,je,ie,F,ft,Oe,Fe,Ne,mt,Ot,re,Ve,Ye,Ze,We,Ue,Ci,Ge,Li,Dr,er,is,ir,rs,Xe,xr,Ai,zr,Ke,wr,rr,ss,sr,ns,Ei,Br,Mi,Rr,nr,as,ar,os,$,se,ne,gt,k,ae,oe,de,At,bt,Ti,qi,Hi,Je,_r,or,ds,he,Et,M,q,Qe,Ft,Nt,Mt,T,G,it,Tt,Vt,dr,hs,hr,ls,Yt,ui,ti,Sr,lr,cs,Zt,vi,ei,yt,Ii,qt,le,cr,ps,Pi,jr,Ht,ii,ri,ce,pe,xt,C,ue,ve,fe,wt,It,Di,si,$r,pr,us,N,ni,ai,_t,oi,me,J,Pt,Wt,Ut,ge,di,hi,rt,li,ur,vs,vr,fs,fr,ms,be,Ri,ci,St,ye,xe;const g=window.HArvest;if(!g||!g.renderers||!g.renderers.BaseCard){console.warn("[HArvest Minimus] HArvest not found - pack not loaded.");return}const m=g.renderers.BaseCard;function h(c){return String(c??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Dt(c,p){let e=null;return function(...i){e&&clearTimeout(e),e=setTimeout(()=>{e=null,c.apply(this,i)},p)}}function we(c){return c?c.charAt(0).toUpperCase()+c.slice(1).replace(/_/g," "):""}const Q=`
    [part=companion-zone] {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
      padding: 8px var(--hrv-card-padding, 16px) var(--hrv-card-padding, 16px);
      border-top: none;
      margin-top: 0;
    }
    [part=companion-zone]:empty { display: none; }
    [part=companion] {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      border: none;
      padding: 0;
      cursor: default;
      flex-shrink: 0;
      box-shadow: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s);
    }
    [part=companion][data-on=true] { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    [part=companion][data-interactive=true] { cursor: pointer; }
    [part=companion][data-interactive=true]:hover { opacity: 0.88; }
    [part=companion-icon]  { display: none; }
    [part=companion-state] { display: none; }
  `;function X(c){c.querySelectorAll("[part=companion]").forEach(p=>{p.title=p.getAttribute("aria-label")??""})}const gs=60,bs=60,Gt=48,B=225,b=270,nt=2*Math.PI*Gt*(b/360);function ys(c){return c*Math.PI/180}function tt(c){const p=ys(c);return{x:gs+Gt*Math.cos(p),y:bs-Gt*Math.sin(p)}}function xs(){const c=tt(B),p=tt(B-b);return`M ${c.x} ${c.y} A ${Gt} ${Gt} 0 1 1 ${p.x} ${p.y}`}const _e=xs(),Se=["brightness","temp","color"],ji=120;function Or(c){const p=b/ji;let e="";for(let i=0;i<ji;i++){const n=B-i*p,a=B-(i+1)*p,d=tt(n),l=tt(a),u=`M ${d.x} ${d.y} A ${Gt} ${Gt} 0 0 1 ${l.x} ${l.y}`,v=i===0||i===ji-1?"round":"butt";e+=`<path d="${u}" stroke="${c(i/ji)}" fill="none" stroke-width="8" stroke-linecap="${v}" />`}return e}const ws=Or(c=>`hsl(${Math.round(c*360)},100%,50%)`),_s=Or(c=>{const e=Math.round(143+112*c),i=Math.round(255*c);return`rgb(255,${e},${i})`}),kr=`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      align-items: stretch;
      gap: 10px;
    }

    [part=card-body].hrv-no-dial {
      align-items: center;
      justify-content: center;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-dial-column {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }

    [part=companion-zone] {
      margin-top: 6px;
      border-top: none;
      padding-top: 0;
      padding-bottom: var(--hrv-card-padding, 16px);
      justify-content: center;
      gap: 12px;
    }

    [part=companion-zone]:empty { display: none; }

    [part=companion] {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      border: none;
      padding: 0;
      cursor: default;
      flex-shrink: 0;
      box-shadow: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s);
    }

    [part=companion][data-on=true] { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    [part=companion][data-interactive=true] { cursor: pointer; }
    [part=companion][data-interactive=true]:hover { opacity: 0.88; }

    [part=companion-icon] { display: none; }
    [part=companion-state] { display: none; }

    .hrv-dial-wrap {
      position: relative;
      flex: none;
      width: 100%;
      aspect-ratio: 1 / 1;
      touch-action: auto;
      cursor: default;
    }
    .hrv-dial-thumb-hit {
      touch-action: none;
      cursor: grab;
      fill: transparent;
    }
    .hrv-dial-thumb-hit:active { cursor: grabbing; }

    .hrv-dial-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-shrink: 0;
    }

    .hrv-dial-wrap svg {
      width: 100%;
      height: 100%;
    }

    .hrv-dial-track {
      fill: none;
      stroke: var(--hrv-color-surface-alt, #e0e0e0);
      stroke-width: 8;
      stroke-linecap: round;
    }

    .hrv-dial-fill {
      fill: none;
      stroke: var(--hrv-color-state-on, #ffc107);
      stroke-width: 8;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.15s ease;
    }

    .hrv-dial-segs { display: none; }
    .hrv-dial-segs-visible { display: block; }

    .hrv-dial-thumb {
      fill: none;
      stroke: var(--hrv-ex-ring, #fff);
      stroke-width: 1.5;
      filter: drop-shadow(0 1px 3px rgba(0,0,0,0.4));
      transition: cx 0.15s ease, cy 0.15s ease;
    }

    .hrv-dial-pct {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: var(--hrv-font-size-l, 18px);
      font-weight: var(--hrv-font-weight-bold, 700);
      color: var(--hrv-color-text, #1a1a1a);
      pointer-events: none;
      user-select: none;
    }

    .hrv-mode-switch {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 28px;
      height: 84px;
      background: var(--hrv-color-surface-alt, #e0e0e0);
      border-radius: 14px;
      position: relative;
      cursor: pointer;
      user-select: none;
      flex-shrink: 0;
    }

    .hrv-mode-switch[data-count="2"] { height: 56px; }

    .hrv-mode-switch-thumb {
      position: absolute;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      left: 2px;
      top: 2px;
      transition: top 0.15s ease;
      pointer-events: none;
    }

    .hrv-mode-switch[data-pos="1"] .hrv-mode-switch-thumb { top: 30px; }
    .hrv-mode-switch[data-pos="2"] .hrv-mode-switch-thumb { top: 58px; }

    .hrv-mode-dot {
      position: absolute;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--hrv-color-text-secondary, #888);
      left: 11px;
      opacity: 0.4;
    }

    .hrv-mode-dot:nth-child(2) { top: 11px; }
    .hrv-mode-dot:nth-child(3) { top: 39px; }
    .hrv-mode-dot:nth-child(4) { top: 67px; }

    .hrv-mode-switch[data-pos="0"] .hrv-mode-dot:nth-child(2),
    .hrv-mode-switch[data-pos="1"] .hrv-mode-dot:nth-child(3),
    .hrv-mode-switch[data-pos="2"] .hrv-mode-dot:nth-child(4) { opacity: 0; }

    [part=toggle-button] {
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      cursor: pointer;
      box-shadow: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s);
    }

    [part=toggle-button]:hover { opacity: 0.88; }
    [part=toggle-button]:active { opacity: 0.75; }

    [part=toggle-button][aria-pressed=true] {
      box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff);
    }

    [part=toggle-button][aria-pressed=false] {
      box-shadow: none;
    }

    .hrv-light-ro-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: var(--hrv-spacing-m, 16px) 0;
    }
    .hrv-light-ro-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      box-shadow: 0 0 0 0 transparent;
      transition: box-shadow 200ms ease, opacity 200ms ease;
    }
    .hrv-light-ro-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }
    .hrv-light-ro-circle [part=ro-state-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    .hrv-light-ro-circle [part=ro-state-icon] svg { width: 40px; height: 40px; }
    .hrv-light-ro-dots {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    .hrv-light-ro-dots:empty { display: none; }
    .hrv-light-ro-dot {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--hrv-ex-dot-bg, rgba(255,255,255,0.45));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: var(--hrv-ex-dot-text, #000);
      line-height: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-dial-fill { transition: none; }
      .hrv-dial-thumb { transition: none; }
      .hrv-mode-switch-thumb { transition: none; }
    }
  `,Ss=`
    [part=toggle-button] {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      position: relative;
      width: 36px;
      height: 72px;
      border-radius: 18px;
      background: var(--hrv-ex-toggle-idle, rgba(255,255,255,0.25));
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.3));
      cursor: pointer;
      padding: 0;
      margin: 0;
      outline: none;
      font: inherit;
      color: inherit;
      transition: background 250ms ease, border-color 250ms ease;
    }
    [part=toggle-button]:focus-visible {
      box-shadow: 0 0 0 3px var(--hrv-color-primary, #1976d2);
    }
    [part=toggle-button][aria-pressed=true] {
      background: var(--hrv-color-primary, #1976d2);
      border-color: var(--hrv-color-primary, #1976d2);
      box-shadow: none;
    }
    .hrv-dial-wrap {
      max-width: 200px;
      margin: 0 auto;
    }
    [part=toggle-button]:hover { opacity: 0.85; }
    [part=toggle-button]:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .hrv-light-toggle-knob {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: top 200ms ease;
      pointer-events: none;
      top: 40px;
    }
    [part=toggle-button][aria-pressed=true] .hrv-light-toggle-knob { top: 4px; }
    @media (prefers-reduced-motion: reduce) {
      [part=toggle-button],
      .hrv-light-toggle-knob { transition: none; }
    }
  `;class $s extends m{constructor(e,i,n,a){super(e,i,n,a);r(this,Cr);r(this,Fi);r(this,Ni);r(this,Vi);r(this,Yi);r(this,Le);r(this,Ae);r(this,Zi);r(this,Jt);r(this,Wi);r(this,Ui);r(this,gi);r(this,bi);r(this,Gi);r(this,zt,null);r(this,A,null);r(this,fi,null);r(this,I,null);r(this,at,null);r(this,K,null);r(this,V,null);r(this,$e,null);r(this,ke,null);r(this,ot,0);r(this,$t,4e3);r(this,dt,0);r(this,ht,!1);r(this,Xt,!1);r(this,Y,null);r(this,Z,0);r(this,lt,2e3);r(this,Kt,6500);r(this,mi,void 0);r(this,Ce,new Map);r(this,w,[]);s(this,mi,Dt(o(this,Gi,Kr).bind(this),300))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],n=i.includes("brightness"),a=i.includes("color_temp"),d=i.includes("rgb_color"),l=e&&(n||a||d),u=[n,a,d].filter(Boolean).length,v=e&&u>1;s(this,lt,this.def.feature_config?.min_color_temp_kelvin??2e3),s(this,Kt,this.def.feature_config?.max_color_temp_kelvin??6500);const x=tt(B);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${kr}${Ss}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${l?"":"hrv-no-dial"}">
            ${l?`
              <div class="hrv-dial-column">
                <div class="hrv-dial-wrap" role="slider" aria-valuemin="0"
                  aria-valuemax="100" aria-valuenow="0"
                  aria-label="${h(this.def.friendly_name)} brightness"
                  title="Drag to adjust">
                  <svg viewBox="0 0 120 120">
                    <g class="hrv-dial-segs hrv-dial-segs-color">${ws}</g>
                    <g class="hrv-dial-segs hrv-dial-segs-temp">${_s}</g>
                    <path class="hrv-dial-track" d="${_e}" />
                    <path class="hrv-dial-fill" d="${_e}"
                      stroke-dasharray="${nt}"
                      stroke-dashoffset="${nt}" />
                    <circle class="hrv-dial-thumb" r="7"
                      cx="${x.x}" cy="${x.y}" />
                    <circle class="hrv-dial-thumb-hit" r="16"
                      cx="${x.x}" cy="${x.y}" />
                  </svg>
                  <span class="hrv-dial-pct">0%</span>
                </div>
                <div part="companion-zone" role="group" aria-label="Companions"></div>
              </div>
            `:e?"":`
              <div class="hrv-light-ro-center">
                <div class="hrv-light-ro-circle" data-on="false"
                  role="img" aria-label="${h(this.def.friendly_name)}"
                  title="Read-only">
                  <span part="ro-state-icon" aria-hidden="true"></span>
                </div>
                <div class="hrv-light-ro-dots">
                  ${n?'<span class="hrv-light-ro-dot" data-attr="brightness" title="Brightness"></span>':""}
                  ${a?'<span class="hrv-light-ro-dot" data-attr="temp" title="Color temperature"></span>':""}
                  ${d?'<span class="hrv-light-ro-dot" data-attr="color" title="Color"></span>':""}
                </div>
              </div>
            `}
            ${e?`
              <div class="hrv-dial-controls">
                ${v?`
                  <div class="hrv-mode-switch" data-pos="0" data-count="${u}"
                    role="radiogroup" aria-label="Dial mode" tabindex="0">
                    <div class="hrv-mode-switch-thumb"></div>
                    ${'<span class="hrv-mode-dot"></span>'.repeat(u)}
                  </div>
                `:""}
                <button part="toggle-button" type="button"
                  aria-label="${h(this.def.friendly_name)} - toggle"
                  title="Turn ${h(this.def.friendly_name)} on / off">
                  <div class="hrv-light-toggle-knob"></div>
                </button>
              </div>
            `:""}
          </div>
          ${l?"":this.renderCompanionZoneHTML()}
        </div>
      `,s(this,zt,this.root.querySelector("[part=toggle-button]")),s(this,A,this.root.querySelector(".hrv-dial-fill")),s(this,fi,this.root.querySelector(".hrv-dial-track")),s(this,I,this.root.querySelector(".hrv-dial-thumb")),s(this,at,this.root.querySelector(".hrv-dial-pct")),s(this,K,this.root.querySelector(".hrv-dial-wrap")),s(this,Y,this.root.querySelector(".hrv-dial-thumb-hit")),s(this,$e,this.root.querySelector(".hrv-dial-segs-color")),s(this,ke,this.root.querySelector(".hrv-dial-segs-temp")),s(this,V,this.root.querySelector(".hrv-mode-switch")),t(this,zt)&&t(this,zt).addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),t(this,Y)&&(t(this,Y).addEventListener("pointerdown",o(this,Wi,Gr).bind(this)),t(this,Y).addEventListener("pointermove",o(this,Ui,Xr).bind(this)),t(this,Y).addEventListener("pointerup",o(this,gi,Ar).bind(this)),t(this,Y).addEventListener("pointercancel",o(this,gi,Ar).bind(this))),l&&o(this,Fi,Vr).call(this),t(this,V)&&(t(this,V).addEventListener("click",o(this,Ni,Yr).bind(this)),t(this,V).addEventListener("keydown",o(this,Yi,Wr).bind(this)),t(this,V).addEventListener("mousemove",o(this,Vi,Zr).bind(this))),o(this,Ae,gr).call(this),this.root.querySelector("[part=ro-state-icon]")&&this.renderIcon(this.resolveIcon(this.def.icon,"mdi:lightbulb"),"ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach(H=>{H.title=H.getAttribute("aria-label")??"Companion";const L=H.getAttribute("data-entity");if(L&&t(this,Ce).has(L)){const S=t(this,Ce).get(L);H.setAttribute("data-on",String(S==="on"))}})}applyState(e,i){if(s(this,ht,e==="on"),s(this,ot,i?.brightness??0),i?.color_temp_kelvin!==void 0?s(this,$t,i.color_temp_kelvin):i?.color_temp!==void 0&&i.color_temp>0&&s(this,$t,Math.round(1e6/i.color_temp)),i?.hs_color)s(this,dt,Math.round(i.hs_color[0]));else if(i?.rgb_color){const[a,d,l]=i.rgb_color;s(this,dt,Ls(a,d,l))}t(this,zt)&&t(this,zt).setAttribute("aria-pressed",String(t(this,ht)));const n=this.root.querySelector(".hrv-light-ro-circle");if(n){n.setAttribute("data-on",String(t(this,ht)));const a=t(this,ht)?"mdi:lightbulb":"mdi:lightbulb-outline",d=this.def.icon_state_map?.[e]??this.def.icon_state_map?.["*"]??this.def.icon??a;this.renderIcon(this.resolveIcon(d,a),"ro-state-icon");const l=i?.color_mode,u=l==="color_temp",v=l&&l!=="color_temp",x=this.root.querySelector('[data-attr="brightness"]');if(x){const S=Math.round(t(this,ot)/255*100);x.title=t(this,ht)?`Brightness: ${S}%`:"Brightness: off"}const H=this.root.querySelector('[data-attr="temp"]');H&&(H.title=`Color temperature: ${t(this,$t)}K`,H.style.display=v?"none":"");const L=this.root.querySelector('[data-attr="color"]');if(L)if(L.style.display=u?"none":"",i?.rgb_color){const[S,f,y]=i.rgb_color;L.style.background=`rgb(${S},${f},${y})`,L.title=`Color: rgb(${S}, ${f}, ${y})`}else L.style.background=`hsl(${t(this,dt)}, 100%, 50%)`,L.title=`Color: hue ${t(this,dt)}°`}o(this,Le,mr).call(this)}predictState(e,i){return e==="toggle"?{state:t(this,ht)?"off":"on",attributes:{brightness:t(this,ot)}}:e==="turn_on"&&i.brightness!==void 0?{state:"on",attributes:{brightness:i.brightness}}:null}updateCompanionState(e,i,n){t(this,Ce).set(e,i),super.updateCompanionState(e,i,n)}}zt=new WeakMap,A=new WeakMap,fi=new WeakMap,I=new WeakMap,at=new WeakMap,K=new WeakMap,V=new WeakMap,$e=new WeakMap,ke=new WeakMap,ot=new WeakMap,$t=new WeakMap,dt=new WeakMap,ht=new WeakMap,Xt=new WeakMap,Y=new WeakMap,Z=new WeakMap,lt=new WeakMap,Kt=new WeakMap,mi=new WeakMap,Ce=new WeakMap,Cr=new WeakSet,rn=function(){const e=this.def.supported_features??[],i=[];return e.includes("brightness")&&i.push("brightness"),e.includes("color_temp")&&i.push("temp"),e.includes("rgb_color")&&i.push("color"),i.length>0?i:["brightness"]},w=new WeakMap,Fi=new WeakSet,Vr=function(){const e=this.def.supported_features??[],i=[e.includes("brightness"),e.includes("color_temp"),e.includes("rgb_color")];s(this,w,[]),i[0]&&t(this,w).push(0),i[1]&&t(this,w).push(1),i[2]&&t(this,w).push(2),t(this,w).length===0&&t(this,w).push(0),t(this,w).includes(t(this,Z))||s(this,Z,t(this,w)[0])},Ni=new WeakSet,Yr=function(e){const i=t(this,V).getBoundingClientRect(),n=e.clientY-i.top,a=i.height/3;let d;n<a?d=0:n<a*2?d=1:d=2,d=Math.min(d,t(this,w).length-1),s(this,Z,t(this,w)[d]),t(this,V).setAttribute("data-pos",String(d)),o(this,Ae,gr).call(this),o(this,Le,mr).call(this)},Vi=new WeakSet,Zr=function(e){const i={brightness:"Brightness",temp:"Color Temperature",color:"Color"},n=t(this,V).getBoundingClientRect(),a=Math.min(Math.floor((e.clientY-n.top)/(n.height/t(this,w).length)),t(this,w).length-1),d=Se[t(this,w)[Math.max(0,a)]];t(this,V).title=`Dial mode: ${i[d]??d}`},Yi=new WeakSet,Wr=function(e){const i=t(this,w).indexOf(t(this,Z));let n=i;if(e.key==="ArrowUp"||e.key==="ArrowLeft")n=Math.max(0,i-1);else if(e.key==="ArrowDown"||e.key==="ArrowRight")n=Math.min(t(this,w).length-1,i+1);else return;e.preventDefault(),s(this,Z,t(this,w)[n]),t(this,V).setAttribute("data-pos",String(n)),o(this,Ae,gr).call(this),o(this,Le,mr).call(this)},Le=new WeakSet,mr=function(){t(this,I)&&(t(this,I).style.transition="none"),t(this,A)&&(t(this,A).style.transition="none"),o(this,Zi,Ur).call(this),t(this,I)?.getBoundingClientRect(),t(this,A)?.getBoundingClientRect(),t(this,I)&&(t(this,I).style.transition=""),t(this,A)&&(t(this,A).style.transition="")},Ae=new WeakSet,gr=function(){if(!t(this,A))return;const e=Se[t(this,Z)],i=e==="color"||e==="temp";t(this,fi).style.display=i?"none":"",t(this,A).style.display=i?"none":"",t(this,$e)&&t(this,$e).classList.toggle("hrv-dial-segs-visible",e==="color"),t(this,ke)&&t(this,ke).classList.toggle("hrv-dial-segs-visible",e==="temp"),e==="brightness"&&t(this,A).setAttribute("stroke-dasharray",String(nt));const n={brightness:"brightness",temp:"color temperature",color:"color"},a={brightness:"Drag to adjust brightness",temp:"Drag to adjust color temperature",color:"Drag to adjust color"};t(this,K)?.setAttribute("aria-label",`${h(this.def.friendly_name)} ${n[e]}`),t(this,K)&&(t(this,K).title=a[e])},Zi=new WeakSet,Ur=function(){const e=Se[t(this,Z)];if(e==="brightness"){const i=t(this,ht)?t(this,ot):0;o(this,Jt,zi).call(this,Math.round(i/255*100))}else if(e==="temp"){const i=Math.round((t(this,$t)-t(this,lt))/(t(this,Kt)-t(this,lt))*100);o(this,Jt,zi).call(this,Math.max(0,Math.min(100,i)))}else{const i=Math.round(t(this,dt)/360*100);o(this,Jt,zi).call(this,i)}},Jt=new WeakSet,zi=function(e){const i=Se[t(this,Z)],n=e/100*b,a=tt(B-n);if(t(this,I)?.setAttribute("cx",String(a.x)),t(this,I)?.setAttribute("cy",String(a.y)),t(this,Y)?.setAttribute("cx",String(a.x)),t(this,Y)?.setAttribute("cy",String(a.y)),i==="brightness"){const d=nt*(1-e/100);t(this,A)?.setAttribute("stroke-dashoffset",String(d)),t(this,at)&&(t(this,at).textContent=e+"%"),t(this,K)?.setAttribute("aria-valuenow",String(e))}else if(i==="temp"){const d=Math.round(t(this,lt)+e/100*(t(this,Kt)-t(this,lt)));t(this,at)&&(t(this,at).textContent=d+"K"),t(this,K)?.setAttribute("aria-valuenow",String(d))}else t(this,at)&&(t(this,at).textContent=Math.round(e/100*360)+"°"),t(this,K)?.setAttribute("aria-valuenow",String(Math.round(e/100*360)))},Wi=new WeakSet,Gr=function(e){s(this,Xt,!0),t(this,Y)?.setPointerCapture(e.pointerId),o(this,bi,Er).call(this,e)},Ui=new WeakSet,Xr=function(e){t(this,Xt)&&o(this,bi,Er).call(this,e)},gi=new WeakSet,Ar=function(e){if(t(this,Xt)){s(this,Xt,!1);try{t(this,Y)?.releasePointerCapture(e.pointerId)}catch{}t(this,mi).call(this)}},bi=new WeakSet,Er=function(e){if(!t(this,K))return;const i=t(this,K).getBoundingClientRect(),n=i.left+i.width/2,a=i.top+i.height/2,d=e.clientX-n,l=-(e.clientY-a);let u=Math.atan2(l,d)*180/Math.PI;u<0&&(u+=360);let v=B-u;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b);const x=Math.round(v/b*100),H=Se[t(this,Z)];H==="brightness"?s(this,ot,Math.round(x/100*255)):H==="temp"?s(this,$t,Math.round(t(this,lt)+x/100*(t(this,Kt)-t(this,lt)))):s(this,dt,Math.round(x/100*360)),t(this,A)&&(t(this,A).style.transition="none"),t(this,I)&&(t(this,I).style.transition="none"),o(this,Jt,zi).call(this,x)},Gi=new WeakSet,Kr=function(){t(this,A)&&(t(this,A).style.transition=""),t(this,I)&&(t(this,I).style.transition="");const e=Se[t(this,Z)];e==="brightness"?t(this,ot)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("turn_on",{brightness:t(this,ot)}):e==="temp"?this.config.card?.sendCommand("turn_on",{color_temp_kelvin:t(this,$t)}):this.config.card?.sendCommand("turn_on",{hs_color:[t(this,dt),100]})};const ks=kr+`
    .hrv-fan-feat-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: none;
      background: var(--hrv-color-primary, #1976d2);
      cursor: pointer;
      flex-shrink: 0;
      padding: 0;
      transition: box-shadow var(--hrv-transition-speed, 0.2s), opacity var(--hrv-transition-speed, 0.2s);
    }
    .hrv-fan-feat-btn[data-on=true]  { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); opacity: 1; }
    .hrv-fan-feat-btn[data-on=false] { opacity: 0.45; box-shadow: none; }
    .hrv-fan-feat-btn:hover { opacity: 0.88; }
    .hrv-dial-controls [part=toggle-button] { margin-top: 8px; }
    .hrv-fan-horiz .hrv-dial-controls [part=toggle-button] { margin-top: 0; }
    .hrv-dial-controls { padding-bottom: var(--hrv-card-padding, 16px); }
    .hrv-dial-wrap { max-width: 200px; margin: 0 auto; }
    .hrv-fan-stepped-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--hrv-card-padding, 16px) 0;
    }
    .hrv-fan-speed-circle {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: none;
      background: var(--hrv-color-primary, #1976d2);
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      box-shadow: none;
      user-select: none;
      transition: box-shadow var(--hrv-transition-speed, 0.2s), opacity var(--hrv-transition-speed, 0.2s);
    }
    .hrv-fan-speed-svg {
      width: 56px;
      height: 56px;
      display: block;
      pointer-events: none;
      fill: currentColor;
    }
    .hrv-fan-speed-circle[aria-pressed=false] { opacity: 0.45; }
    .hrv-fan-speed-circle[aria-pressed=true]  { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    .hrv-fan-speed-circle:active { transition: none; opacity: 0.75; }
    .hrv-fan-hspeed-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-bottom: var(--hrv-card-padding, 16px);
    }
    .hrv-fan-hspeed-switch {
      position: relative;
      display: inline-flex;
      flex-direction: row;
      height: 32px;
      background: var(--hrv-color-surface-alt, rgba(255,255,255,0.15));
      border-radius: 16px;
      cursor: pointer;
      user-select: none;
    }
    .hrv-fan-hspeed-thumb {
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      top: 2px;
      left: 2px;
      transition: left var(--hrv-transition-speed, 0.15s) ease, opacity var(--hrv-transition-speed, 0.2s);
      pointer-events: none;
      opacity: 0;
    }
    .hrv-fan-hspeed-switch[data-on=true] .hrv-fan-hspeed-thumb { opacity: 1; }
    .hrv-fan-hspeed-dot {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .hrv-fan-hspeed-dot::after {
      content: "";
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--hrv-color-text, rgba(255,255,255,0.6));
      opacity: 0.4;
      pointer-events: none;
      display: block;
    }
    .hrv-fan-hspeed-dot[data-active=true]::after { opacity: 0; }

    .hrv-fan-ro-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--hrv-spacing-m, 16px) 0;
    }
    .hrv-fan-ro-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      box-shadow: 0 0 0 0 transparent;
      transition: box-shadow 200ms ease, opacity 200ms ease;
    }
    .hrv-fan-ro-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }
    .hrv-fan-ro-circle [part=ro-state-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    .hrv-fan-ro-circle [part=ro-state-icon] svg { width: 40px; height: 40px; }
    .hrv-fan-ro-circle[data-on=true] [part=ro-state-icon] svg {
      animation: hrv-fan-spin 2s linear infinite;
      transform-origin: center;
    }
    @keyframes hrv-fan-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    [part=card-body].hrv-no-dial [part=toggle-button] {
      width: 96px;
      height: 96px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    [part=card-body].hrv-no-dial [part=toggle-button][aria-pressed=false] { opacity: 0.45; }
    [part=fan-onoff-icon] { color: var(--hrv-color-on-primary, #fff); }
    [part=fan-onoff-icon] svg { width: 56px; height: 56px; display: block; pointer-events: none; }
    [part=toggle-button][aria-pressed=true][data-animate=true] [part=fan-onoff-icon] svg {
      animation: hrv-fan-spin 2s linear infinite;
      transform-origin: center;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-fan-hspeed-thumb { transition: none; }
      .hrv-fan-ro-circle[data-on=true] [part=ro-state-icon] svg { animation: none; }
      [part=toggle-button][aria-pressed=true][data-animate=true] [part=fan-onoff-icon] svg { animation: none; }
    }
  `;class Cs extends m{constructor(e,i,n,a){super(e,i,n,a);r(this,Me);r(this,ee);r(this,xi);r(this,Te);r(this,wi);r(this,_i);r(this,Rt);r(this,Ki);r(this,Ji);r(this,Si);r(this,$i);r(this,Qi);r(this,ki);r(this,tr);r(this,et,null);r(this,R,null);r(this,Xi,null);r(this,P,null);r(this,Ee,null);r(this,Qt,null);r(this,ct,null);r(this,pt,null);r(this,ut,null);r(this,D,!1);r(this,_,0);r(this,Bt,!1);r(this,kt,"forward");r(this,z,null);r(this,E,[]);r(this,te,!1);r(this,W,null);r(this,yi,void 0);s(this,yi,Dt(o(this,Qi,ts).bind(this),300)),s(this,E,e.feature_config?.preset_modes??[])}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],n=i.includes("set_speed"),a=i.includes("oscillate"),d=i.includes("direction"),l=i.includes("preset_mode"),u=e&&n,v=u&&t(this,ee,Bi),x=v&&!t(this,E).length,H=v&&!!t(this,E).length,L=tt(B);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${ks}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${u?x?"hrv-fan-horiz":"":"hrv-no-dial"}">
            ${u?`
              <div class="hrv-dial-column">
                ${x?`
                  <div class="hrv-fan-hspeed-wrap">
                    <div class="hrv-fan-hspeed-switch" role="group"
                      aria-label="${h(this.def.friendly_name)} speed"
                      data-on="false">
                      <div class="hrv-fan-hspeed-thumb"></div>
                      ${t(this,Te,yr).map((f,y)=>`
                        <div class="hrv-fan-hspeed-dot" data-pct="${f}" data-idx="${y}"
                          data-active="false"
                          role="button" tabindex="0"
                          aria-label="Speed ${y+1} (${f}%)"
                          title="Speed ${y+1} (${f}%)"></div>
                      `).join("")}
                    </div>
                  </div>
                `:H?`
                  <div class="hrv-fan-stepped-wrap">
                    <button class="hrv-fan-speed-circle" part="speed-circle" type="button"
                      aria-pressed="false"
                      title="Click to increase fan speed"
                      aria-label="Click to increase fan speed"><svg class="hrv-fan-speed-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13,19C13,17.59 13.5,16.3 14.3,15.28C14.17,14.97 14.03,14.65 13.86,14.34C14.26,14 14.57,13.59 14.77,13.11C15.26,13.21 15.78,13.39 16.25,13.67C17.07,13.25 18,13 19,13C20.05,13 21.03,13.27 21.89,13.74C21.95,13.37 22,12.96 22,12.5C22,8.92 18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11,9.22C13.3,8.29 13.74,7.24 14.73,6.75C17.09,5.57 17,2 12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4,10.39 9.21,10.87C8.28,10.68 7.23,10.25 6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 10.88,14.79C10.68,15.71 10.24,16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13,21.78 13.5,21.41C13.19,20.67 13,19.86 13,19M20,15V18H23V20H20V23H18V20H15V18H18V15H20Z"/></svg></button>
                  </div>
                `:`
                  <div class="hrv-dial-wrap" role="slider"
                    aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                    aria-label="${h(this.def.friendly_name)} speed"
                    title="Drag to adjust fan speed">
                    <svg viewBox="0 0 120 120">
                      <path class="hrv-dial-track" d="${_e}" />
                      <path class="hrv-dial-fill" d="${_e}"
                        stroke-dasharray="${nt}"
                        stroke-dashoffset="${nt}" />
                      <circle class="hrv-dial-thumb" r="7"
                        cx="${L.x}" cy="${L.y}" />
                      <circle class="hrv-dial-thumb-hit" r="16"
                        cx="${L.x}" cy="${L.y}" />
                    </svg>
                    <span class="hrv-dial-pct">0%</span>
                  </div>
                `}
                <div part="companion-zone" role="group" aria-label="Companions"></div>
              </div>
            `:e?"":`
              <div class="hrv-fan-ro-center">
                <div class="hrv-fan-ro-circle" data-on="false"
                  role="img" aria-label="${h(this.def.friendly_name)}"
                  title="Read-only">
                  <span part="ro-state-icon" aria-hidden="true"></span>
                </div>
              </div>
            `}
            ${e?`
              <div class="hrv-dial-controls">
                ${a?`
                  <button class="hrv-fan-feat-btn" data-feat="oscillate" type="button"
                    aria-label="Oscillate: off" title="Oscillate: off"></button>
                `:""}
                ${d?`
                  <button class="hrv-fan-feat-btn" data-feat="direction" type="button"
                    aria-label="Direction: forward" title="Direction: forward"></button>
                `:""}
                ${l?`
                  <button class="hrv-fan-feat-btn" data-feat="preset" type="button"
                    aria-label="Preset: none" title="Preset: none"></button>
                `:""}
                <button part="toggle-button" type="button"
                  aria-label="${h(this.def.friendly_name)} - toggle"
                  title="Turn ${h(this.def.friendly_name)} on / off">${u?"":'<span part="fan-onoff-icon" aria-hidden="true"></span>'}</button>
              </div>
            `:""}
          </div>
          ${u?"":this.renderCompanionZoneHTML()}
        </div>
      `,s(this,et,this.root.querySelector("[part=toggle-button]")),s(this,R,this.root.querySelector(".hrv-dial-fill")),s(this,Xi,this.root.querySelector(".hrv-dial-track")),s(this,P,this.root.querySelector(".hrv-dial-thumb")),s(this,Ee,this.root.querySelector(".hrv-dial-pct")),s(this,Qt,this.root.querySelector(".hrv-dial-wrap")),s(this,W,this.root.querySelector(".hrv-dial-thumb-hit")),s(this,ct,this.root.querySelector('[data-feat="oscillate"]')),s(this,pt,this.root.querySelector('[data-feat="direction"]')),s(this,ut,this.root.querySelector('[data-feat="preset"]')),t(this,et)&&!u&&(this.renderIcon(this.def.icon??"mdi:fan","fan-onoff-icon"),t(this,et).setAttribute("data-animate",String(!!this.config.animate))),t(this,et)?.addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),t(this,W)&&(t(this,W).addEventListener("pointerdown",o(this,Ki,Jr).bind(this)),t(this,W).addEventListener("pointermove",o(this,Ji,Qr).bind(this)),t(this,W).addEventListener("pointerup",o(this,Si,Hr).bind(this)),t(this,W).addEventListener("pointercancel",o(this,Si,Hr).bind(this))),this.root.querySelector(".hrv-fan-speed-circle")?.addEventListener("click",()=>{const f=t(this,Te,yr);if(!f.length)return;let y;if(!t(this,D)||t(this,_)===0)y=f[0],s(this,D,!0),t(this,et)?.setAttribute("aria-pressed","true");else{const st=f.findIndex(en=>en>t(this,_));y=st===-1?f[0]:f[st]}s(this,_,y),o(this,wi,Tr).call(this),this.config.card?.sendCommand("set_percentage",{percentage:y})}),this.root.querySelectorAll(".hrv-fan-hspeed-dot").forEach(f=>{const y=()=>{const st=Number(f.getAttribute("data-pct"));t(this,D)||(s(this,D,!0),t(this,et)?.setAttribute("aria-pressed","true")),s(this,_,st),o(this,_i,qr).call(this),this.config.card?.sendCommand("set_percentage",{percentage:st})};f.addEventListener("click",y),f.addEventListener("keydown",st=>{(st.key==="Enter"||st.key===" ")&&(st.preventDefault(),y())})}),t(this,ct)?.addEventListener("click",()=>{this.config.card?.sendCommand("oscillate",{oscillating:!t(this,Bt)})}),t(this,pt)?.addEventListener("click",()=>{const f=t(this,kt)==="forward"?"reverse":"forward";s(this,kt,f),o(this,Rt,pi).call(this),this.config.card?.sendCommand("set_direction",{direction:f})}),t(this,ut)?.addEventListener("click",()=>{if(t(this,E).length){if(t(this,xi,Mr)){const f=t(this,z)??t(this,E)[0];this.config.card?.sendCommand("set_preset_mode",{preset_mode:f});return}if(t(this,z)){const f=t(this,E).indexOf(t(this,z));if(f===-1||f===t(this,E).length-1){s(this,z,null),o(this,Rt,pi).call(this);const y=t(this,Me,br),st=Math.floor(t(this,_)/y)*y||y;this.config.card?.sendCommand("set_percentage",{percentage:st})}else{const y=t(this,E)[f+1];s(this,z,y),o(this,Rt,pi).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:y})}}else{const f=t(this,E)[0];s(this,z,f),o(this,Rt,pi).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:f})}}}),this.root.querySelector(".hrv-fan-ro-circle")&&this.renderIcon(this.def.icon??"mdi:fan","ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach(f=>{f.title=f.getAttribute("aria-label")??"Companion"})}applyState(e,i){s(this,D,e==="on"),s(this,_,i?.percentage??0),s(this,Bt,i?.oscillating??!1),s(this,kt,i?.direction??"forward"),s(this,z,i?.preset_mode??null),i?.preset_modes?.length&&s(this,E,i.preset_modes),t(this,et)&&t(this,et).setAttribute("aria-pressed",String(t(this,D)));const n=this.root.querySelector(".hrv-fan-ro-circle");n&&n.setAttribute("data-on",String(t(this,D))),t(this,ee,Bi)&&!t(this,E).length?o(this,_i,qr).call(this):t(this,ee,Bi)?o(this,wi,Tr).call(this):o(this,tr,es).call(this),o(this,Rt,pi).call(this),this.announceState(`${this.def.friendly_name}, ${e}`+(t(this,_)>0?`, ${t(this,_)}%`:""))}predictState(e,i){return e==="toggle"?{state:t(this,D)?"off":"on",attributes:{percentage:t(this,_)}}:e==="set_percentage"?{state:"on",attributes:{percentage:i.percentage,oscillating:t(this,Bt),direction:t(this,kt),preset_mode:t(this,z),preset_modes:t(this,E)}}:null}}et=new WeakMap,R=new WeakMap,Xi=new WeakMap,P=new WeakMap,Ee=new WeakMap,Qt=new WeakMap,ct=new WeakMap,pt=new WeakMap,ut=new WeakMap,D=new WeakMap,_=new WeakMap,Bt=new WeakMap,kt=new WeakMap,z=new WeakMap,E=new WeakMap,te=new WeakMap,W=new WeakMap,yi=new WeakMap,Me=new WeakSet,br=function(){const e=this.def?.feature_config;return e?.percentage_step>1?e.percentage_step:e?.speed_count>1?100/e.speed_count:1},ee=new WeakSet,Bi=function(){return t(this,Me,br)>1},xi=new WeakSet,Mr=function(){return t(this,ee,Bi)&&t(this,E).length>0},Te=new WeakSet,yr=function(){const e=t(this,Me,br),i=[];for(let n=1;n*e<=100.001;n++)i.push(Math.floor(n*e*10)/10);return i},wi=new WeakSet,Tr=function(){const e=this.root.querySelector(".hrv-fan-speed-circle");if(!e)return;e.setAttribute("aria-pressed",String(t(this,D)));const i=t(this,D)?"Click to increase fan speed":"Fan off - click to turn on";e.setAttribute("aria-label",i),e.title=i},_i=new WeakSet,qr=function(){const e=this.root.querySelector(".hrv-fan-hspeed-switch");if(!e)return;const i=e.querySelector(".hrv-fan-hspeed-thumb"),n=t(this,Te,yr);let a=-1;if(t(this,D)&&t(this,_)>0){let d=1/0;n.forEach((l,u)=>{const v=Math.abs(l-t(this,_));v<d&&(d=v,a=u)})}e.setAttribute("data-on",String(a>=0)),i&&a>=0&&(i.style.left=`${2+a*32}px`),e.querySelectorAll(".hrv-fan-hspeed-dot").forEach((d,l)=>{d.setAttribute("data-active",String(l===a))})},Rt=new WeakSet,pi=function(){const e=t(this,xi,Mr);if(t(this,ct)){const i=e||t(this,Bt),n=e?"Oscillate":`Oscillate: ${t(this,Bt)?"on":"off"}`;t(this,ct).setAttribute("data-on",String(i)),t(this,ct).setAttribute("aria-pressed",String(i)),t(this,ct).setAttribute("aria-label",n),t(this,ct).title=n}if(t(this,pt)){const i=t(this,kt)!=="reverse",n=`Direction: ${t(this,kt)}`;t(this,pt).setAttribute("data-on",String(i)),t(this,pt).setAttribute("aria-pressed",String(i)),t(this,pt).setAttribute("aria-label",n),t(this,pt).title=n}if(t(this,ut)){const i=e||!!t(this,z),n=e?t(this,z)??t(this,E)[0]??"Preset":t(this,z)?`Preset: ${t(this,z)}`:"Preset: none";t(this,ut).setAttribute("data-on",String(i)),t(this,ut).setAttribute("aria-pressed",String(i)),t(this,ut).setAttribute("aria-label",n),t(this,ut).title=n}},Ki=new WeakSet,Jr=function(e){s(this,te,!0),t(this,W)?.setPointerCapture(e.pointerId),o(this,$i,Ir).call(this,e)},Ji=new WeakSet,Qr=function(e){t(this,te)&&o(this,$i,Ir).call(this,e)},Si=new WeakSet,Hr=function(e){if(t(this,te)){s(this,te,!1);try{t(this,W)?.releasePointerCapture(e.pointerId)}catch{}t(this,yi).call(this)}},$i=new WeakSet,Ir=function(e){if(!t(this,Qt))return;const i=t(this,Qt).getBoundingClientRect(),n=i.left+i.width/2,a=i.top+i.height/2,d=e.clientX-n,l=-(e.clientY-a);let u=Math.atan2(l,d)*180/Math.PI;u<0&&(u+=360);let v=B-u;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b),s(this,_,Math.round(v/b*100)),t(this,R)&&(t(this,R).style.transition="none"),t(this,P)&&(t(this,P).style.transition="none"),o(this,ki,Pr).call(this,t(this,_))},Qi=new WeakSet,ts=function(){t(this,R)&&(t(this,R).style.transition=""),t(this,P)&&(t(this,P).style.transition=""),t(this,_)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("set_percentage",{percentage:t(this,_)})},ki=new WeakSet,Pr=function(e){const i=nt*(1-e/100),n=tt(B-e/100*b);t(this,R)?.setAttribute("stroke-dashoffset",String(i)),t(this,P)?.setAttribute("cx",String(n.x)),t(this,P)?.setAttribute("cy",String(n.y)),t(this,W)?.setAttribute("cx",String(n.x)),t(this,W)?.setAttribute("cy",String(n.y)),t(this,Ee)&&(t(this,Ee).textContent=`${e}%`),t(this,Qt)?.setAttribute("aria-valuenow",String(e))},tr=new WeakSet,es=function(){t(this,P)&&(t(this,P).style.transition="none"),t(this,R)&&(t(this,R).style.transition="none"),o(this,ki,Pr).call(this,t(this,D)?t(this,_):0),t(this,P)?.getBoundingClientRect(),t(this,R)?.getBoundingClientRect(),t(this,P)&&(t(this,P).style.transition=""),t(this,R)&&(t(this,R).style.transition="")};function Ls(c,p,e){c/=255,p/=255,e/=255;const i=Math.max(c,p,e),n=Math.min(c,p,e),a=i-n;if(a===0)return 0;let d;return i===c?d=(p-e)/a%6:i===p?d=(e-c)/a+2:d=(c-p)/a+4,Math.round((d*60+360)%360)}const As=kr+`
    [part=card-body] {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: 0 var(--hrv-card-padding, 16px) 0;
    }

    .hrv-dial-wrap {
      flex: none;
      width: 100%;
      max-width: 260px;
      margin: 0 auto;
    }

    .hrv-climate-current {
      text-align: center;
      padding: 6px 0 0;
    }
    .hrv-climate-current-label {
      display: block;
      font-size: 12px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.6));
    }
    .hrv-climate-current-val {
      display: block;
      font-size: 26px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      line-height: 1.2;
    }

    .hrv-climate-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      user-select: none;
      width: 65%;
    }
    .hrv-climate-state-text {
      display: block;
      font-size: 13px;
      color: var(--hrv-color-text, #fff);
      margin-bottom: 2px;
    }
    .hrv-climate-temp-row {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      line-height: 1;
    }
    .hrv-climate-temp-int {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
    }
    .hrv-climate-temp-frac {
      font-size: 20px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      align-self: flex-end;
      padding-bottom: 6px;
    }
    .hrv-climate-temp-unit {
      font-size: 13px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
      align-self: flex-start;
      padding-top: 5px;
      padding-left: 2px;
    }

    .hrv-climate-stepper {
      display: flex;
      justify-content: center;
      gap: 36px;
      padding: 6px 0 14px;
    }
    .hrv-climate-step {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.35));
      background: transparent;
      color: var(--hrv-color-text, #fff);
      font-size: 1.6rem;
      font-weight: 300;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: inherit;
      transition: border-color 0.15s, background 0.15s;
    }
    .hrv-climate-step:active,
    .hrv-climate-step[data-pressing=true] {
      border-color: var(--hrv-ex-ring, #fff);
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.1));
      transition: none;
    }

    .hrv-climate-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding-bottom: 16px;
      position: relative;
    }
    .hrv-cf-btn {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 11px 13px;
      border: none;
      border-radius: var(--hrv-radius-m, 12px);
      background: var(--hrv-color-surface-alt, rgba(255,255,255,0.1));
      color: var(--hrv-color-text, #fff);
      cursor: pointer;
      text-align: left;
      gap: 3px;
      font-family: inherit;
      min-width: 0;
      transition: opacity 0.15s;
    }
    .hrv-cf-btn:active,
    .hrv-cf-btn[data-pressing=true] { opacity: 0.65; transition: none; }
    .hrv-cf-label {
      font-size: 11px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.55));
    }
    .hrv-cf-value {
      font-size: var(--hrv-font-size-s, 14px);
      font-weight: var(--hrv-font-weight-medium, 500);
      color: var(--hrv-color-text, #fff);
    }

    .hrv-climate-dropdown {
      position: absolute;
      bottom: calc(100% - 8px);
      left: 0;
      right: 0;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--hrv-radius-s, 8px);
      box-shadow: 0 -4px 16px rgba(0,0,0,0.25), 0 0 0 1px var(--hrv-ex-glass-border, rgba(255,255,255,0.12));
      overflow: hidden;
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: none;
      z-index: 10;
    }
    .hrv-cf-option {
      display: block;
      width: 100%;
      padding: 8px 14px;
      border: none;
      background: transparent;
      color: var(--hrv-color-text, #fff);
      text-align: left;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: background 0.1s;
    }
    .hrv-cf-option + .hrv-cf-option {
      border-top: 1px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.06));
    }
    .hrv-cf-option:hover { background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.08)); }
    .hrv-cf-option[data-active=true] { color: var(--hrv-color-primary, #1976d2); }

    .hrv-cf-btn[data-readonly=true] {
      cursor: not-allowed;
    }
    .hrv-climate-ro-temp {
      text-align: center;
      padding: 24px 0 16px;
    }
    .hrv-climate-ro-temp-row {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      line-height: 1;
    }
    .hrv-climate-ro-temp-int {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
    }
    .hrv-climate-ro-temp-frac {
      font-size: 20px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      align-self: flex-end;
      padding-bottom: 6px;
    }
    .hrv-climate-ro-temp-unit {
      font-size: 13px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
      align-self: flex-start;
      padding-top: 5px;
      padding-left: 2px;
    }
  `;class Es extends m{constructor(e,i,n,a){super(e,i,n,a);r(this,Li);r(this,er);r(this,ir);r(this,Xe);r(this,Ai);r(this,Ke);r(this,rr);r(this,sr);r(this,Ei);r(this,Mi);r(this,nr);r(this,ar);r(this,qe,null);r(this,Ct,null);r(this,vt,null);r(this,U,null);r(this,jt,!1);r(this,He,null);r(this,Ie,null);r(this,Pe,null);r(this,j,null);r(this,O,null);r(this,De,null);r(this,ze,null);r(this,Be,null);r(this,Re,null);r(this,Lt,null);r(this,je,null);r(this,ie,null);r(this,F,20);r(this,ft,"off");r(this,Oe,null);r(this,Fe,null);r(this,Ne,null);r(this,mt,16);r(this,Ot,32);r(this,re,.5);r(this,Ve,"°C");r(this,Ye,[]);r(this,Ze,[]);r(this,We,[]);r(this,Ue,[]);r(this,Ci,{});r(this,Ge,void 0);s(this,Ge,Dt(o(this,nr,as).bind(this),500))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features?.includes("target_temperature"),n=this.def.supported_features?.includes("fan_mode")||this.def.feature_config?.fan_modes?.length>0,a=this.def.supported_features?.includes("preset_mode")||this.def.feature_config?.preset_modes?.length>0,d=this.def.supported_features?.includes("swing_mode")||this.def.feature_config?.swing_modes?.length>0;s(this,mt,this.def.feature_config?.min_temp??16),s(this,Ot,this.def.feature_config?.max_temp??32),s(this,re,this.def.feature_config?.temp_step??.5),s(this,Ve,this.def.unit_of_measurement??"°C"),s(this,Ye,this.def.feature_config?.hvac_modes??["off","heat","cool","heat_cool","auto","dry","fan_only"]),s(this,Ze,this.def.feature_config?.fan_modes??[]),s(this,We,this.def.feature_config?.preset_modes??[]),s(this,Ue,this.def.feature_config?.swing_modes??[]);const l=o(this,Li,Dr).call(this,t(this,F)),u=tt(B),v=tt(B-l/100*b),x=nt*(1-l/100),[H,L]=t(this,F).toFixed(1).split(".");this.root.innerHTML=`
        <style>${this.getSharedStyles()}${As}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e&&i?`
              <div class="hrv-dial-wrap">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <path class="hrv-dial-track" d="${_e}"/>
                  <path class="hrv-dial-fill" d="${_e}"
                    stroke-dasharray="${nt}" stroke-dashoffset="${x}"/>
                  <circle class="hrv-dial-thumb" r="7" cx="${v.x}" cy="${v.y}"><title>Drag to set temperature</title></circle>
                  <circle class="hrv-dial-thumb-hit" r="16" cx="${v.x}" cy="${v.y}"><title>Drag to set temperature</title></circle>
                </svg>
                <div class="hrv-climate-center">
                  <span class="hrv-climate-state-text"></span>
                  <div class="hrv-climate-temp-row">
                    <span class="hrv-climate-temp-int">${h(H)}</span><span class="hrv-climate-temp-frac">.${h(L)}</span><span class="hrv-climate-temp-unit">${h(t(this,Ve))}</span>
                  </div>
                </div>
              </div>
              <div class="hrv-climate-stepper">
                <button class="hrv-climate-step" type="button" aria-label="Decrease temperature" title="Decrease temperature" data-dir="-">&#8722;</button>
                <button class="hrv-climate-step" type="button" aria-label="Increase temperature" title="Increase temperature" data-dir="+">+</button>
              </div>
            `:!e&&i?`
              <div class="hrv-climate-ro-temp">
                <div class="hrv-climate-ro-temp-row">
                  <span class="hrv-climate-ro-temp-int">${h(H)}</span><span class="hrv-climate-ro-temp-frac">.${h(L)}</span><span class="hrv-climate-ro-temp-unit">${h(t(this,Ve))}</span>
                </div>
              </div>
            `:""}
            <div class="hrv-climate-grid">
              ${t(this,Ye).length?`
                <button class="hrv-cf-btn" data-feat="mode" type="button"
                  ${e?'title="Change HVAC mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${a&&t(this,We).length?`
                <button class="hrv-cf-btn" data-feat="preset" type="button"
                  ${e?'title="Change preset mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Preset</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${n&&t(this,Ze).length?`
                <button class="hrv-cf-btn" data-feat="fan" type="button"
                  ${e?'title="Change fan mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Fan mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${d&&t(this,Ue).length?`
                <button class="hrv-cf-btn" data-feat="swing" type="button"
                  ${e?'title="Change swing mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Swing mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${e?'<div class="hrv-climate-dropdown" hidden></div>':""}
            </div>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,qe,this.root.querySelector(".hrv-dial-wrap")),s(this,Ct,this.root.querySelector(".hrv-dial-fill")),s(this,vt,this.root.querySelector(".hrv-dial-thumb")),s(this,U,this.root.querySelector(".hrv-dial-thumb-hit")),s(this,He,this.root.querySelector(".hrv-climate-state-text")),s(this,Ie,this.root.querySelector(".hrv-climate-temp-int")),s(this,Pe,this.root.querySelector(".hrv-climate-temp-frac")),s(this,j,this.root.querySelector("[data-dir='-']")),s(this,O,this.root.querySelector("[data-dir='+']")),s(this,De,this.root.querySelector("[data-feat=mode]")),s(this,ze,this.root.querySelector("[data-feat=fan]")),s(this,Be,this.root.querySelector("[data-feat=preset]")),s(this,Re,this.root.querySelector("[data-feat=swing]")),s(this,Lt,this.root.querySelector(".hrv-climate-dropdown")),t(this,U)&&(t(this,U).addEventListener("pointerdown",o(this,rr,ss).bind(this)),t(this,U).addEventListener("pointermove",o(this,sr,ns).bind(this)),t(this,U).addEventListener("pointerup",o(this,Ei,Br).bind(this)),t(this,U).addEventListener("pointercancel",o(this,Ei,Br).bind(this))),t(this,j)&&(t(this,j).addEventListener("click",()=>o(this,Ai,zr).call(this,-1)),t(this,j).addEventListener("pointerdown",()=>t(this,j).setAttribute("data-pressing","true")),t(this,j).addEventListener("pointerup",()=>t(this,j).removeAttribute("data-pressing")),t(this,j).addEventListener("pointerleave",()=>t(this,j).removeAttribute("data-pressing")),t(this,j).addEventListener("pointercancel",()=>t(this,j).removeAttribute("data-pressing"))),t(this,O)&&(t(this,O).addEventListener("click",()=>o(this,Ai,zr).call(this,1)),t(this,O).addEventListener("pointerdown",()=>t(this,O).setAttribute("data-pressing","true")),t(this,O).addEventListener("pointerup",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointerleave",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointercancel",()=>t(this,O).removeAttribute("data-pressing"))),e&&[t(this,De),t(this,ze),t(this,Be),t(this,Re)].forEach(S=>{if(!S)return;const f=S.getAttribute("data-feat");S.addEventListener("click",()=>o(this,ir,rs).call(this,f)),S.addEventListener("pointerdown",()=>S.setAttribute("data-pressing","true")),S.addEventListener("pointerup",()=>S.removeAttribute("data-pressing")),S.addEventListener("pointerleave",()=>S.removeAttribute("data-pressing")),S.addEventListener("pointercancel",()=>S.removeAttribute("data-pressing"))}),this.renderCompanions(),X(this.root)}applyState(e,i){s(this,Ci,{...i}),s(this,ft,e),s(this,Oe,i.fan_mode??null),s(this,Fe,i.preset_mode??null),s(this,Ne,i.swing_mode??null),!t(this,jt)&&i.temperature!==void 0&&(s(this,F,i.temperature),o(this,Ke,wr).call(this)),t(this,He)&&(t(this,He).textContent=we(i.hvac_action??e));const n=this.root.querySelector(".hrv-climate-ro-temp-int"),a=this.root.querySelector(".hrv-climate-ro-temp-frac");if(n&&i.temperature!==void 0){s(this,F,i.temperature);const[u,v]=t(this,F).toFixed(1).split(".");n.textContent=u,a.textContent=`.${v}`}o(this,ar,os).call(this);const d=i.hvac_action??e,l=we(d);this.announceState(`${this.def.friendly_name}, ${l}`)}predictState(e,i){const n={...t(this,Ci)};return e==="set_hvac_mode"&&i.hvac_mode?{state:i.hvac_mode,attributes:n}:e==="set_temperature"&&i.temperature!==void 0?{state:t(this,ft),attributes:{...n,temperature:i.temperature}}:e==="set_fan_mode"&&i.fan_mode?{state:t(this,ft),attributes:{...n,fan_mode:i.fan_mode}}:e==="set_preset_mode"&&i.preset_mode?{state:t(this,ft),attributes:{...n,preset_mode:i.preset_mode}}:e==="set_swing_mode"&&i.swing_mode?{state:t(this,ft),attributes:{...n,swing_mode:i.swing_mode}}:null}}qe=new WeakMap,Ct=new WeakMap,vt=new WeakMap,U=new WeakMap,jt=new WeakMap,He=new WeakMap,Ie=new WeakMap,Pe=new WeakMap,j=new WeakMap,O=new WeakMap,De=new WeakMap,ze=new WeakMap,Be=new WeakMap,Re=new WeakMap,Lt=new WeakMap,je=new WeakMap,ie=new WeakMap,F=new WeakMap,ft=new WeakMap,Oe=new WeakMap,Fe=new WeakMap,Ne=new WeakMap,mt=new WeakMap,Ot=new WeakMap,re=new WeakMap,Ve=new WeakMap,Ye=new WeakMap,Ze=new WeakMap,We=new WeakMap,Ue=new WeakMap,Ci=new WeakMap,Ge=new WeakMap,Li=new WeakSet,Dr=function(e){return Math.max(0,Math.min(100,(e-t(this,mt))/(t(this,Ot)-t(this,mt))*100))},er=new WeakSet,is=function(e){const i=t(this,mt)+e/100*(t(this,Ot)-t(this,mt)),n=Math.round(i/t(this,re))*t(this,re);return Math.max(t(this,mt),Math.min(t(this,Ot),+n.toFixed(10)))},ir=new WeakSet,rs=function(e){if(t(this,je)===e){o(this,Xe,xr).call(this);return}s(this,je,e);let i=[],n=null,a="",d="";switch(e){case"mode":i=t(this,Ye),n=t(this,ft),a="set_hvac_mode",d="hvac_mode";break;case"fan":i=t(this,Ze),n=t(this,Oe),a="set_fan_mode",d="fan_mode";break;case"preset":i=t(this,We),n=t(this,Fe),a="set_preset_mode",d="preset_mode";break;case"swing":i=t(this,Ue),n=t(this,Ne),a="set_swing_mode",d="swing_mode";break}if(!i.length||!t(this,Lt))return;t(this,Lt).innerHTML=i.map(u=>`
        <button class="hrv-cf-option" data-active="${u===n}" type="button">
          ${h(we(u))}
        </button>
      `).join(""),t(this,Lt).querySelectorAll(".hrv-cf-option").forEach((u,v)=>{u.addEventListener("click",()=>{this.config.card?.sendCommand(a,{[d]:i[v]}),o(this,Xe,xr).call(this)})}),t(this,Lt).removeAttribute("hidden");const l=u=>{u.composedPath().some(x=>x===this.root||x===this.root.host)||o(this,Xe,xr).call(this)};s(this,ie,l),document.addEventListener("pointerdown",l,!0)},Xe=new WeakSet,xr=function(){s(this,je,null),t(this,Lt)?.setAttribute("hidden",""),t(this,ie)&&(document.removeEventListener("pointerdown",t(this,ie),!0),s(this,ie,null))},Ai=new WeakSet,zr=function(e){const i=Math.round((t(this,F)+e*t(this,re))*100)/100;s(this,F,Math.max(t(this,mt),Math.min(t(this,Ot),i))),o(this,Ke,wr).call(this),t(this,Ge).call(this)},Ke=new WeakSet,wr=function(){const e=o(this,Li,Dr).call(this,t(this,F)),i=nt*(1-e/100),n=tt(B-e/100*b);t(this,Ct)?.setAttribute("stroke-dashoffset",String(i)),t(this,vt)?.setAttribute("cx",String(n.x)),t(this,vt)?.setAttribute("cy",String(n.y)),t(this,U)?.setAttribute("cx",String(n.x)),t(this,U)?.setAttribute("cy",String(n.y));const[a,d]=t(this,F).toFixed(1).split(".");t(this,Ie)&&(t(this,Ie).textContent=a),t(this,Pe)&&(t(this,Pe).textContent=`.${d}`)},rr=new WeakSet,ss=function(e){s(this,jt,!0),t(this,U)?.setPointerCapture(e.pointerId),o(this,Mi,Rr).call(this,e)},sr=new WeakSet,ns=function(e){t(this,jt)&&o(this,Mi,Rr).call(this,e)},Ei=new WeakSet,Br=function(e){if(t(this,jt)){s(this,jt,!1);try{t(this,U)?.releasePointerCapture(e.pointerId)}catch{}t(this,Ct)&&(t(this,Ct).style.transition=""),t(this,vt)&&(t(this,vt).style.transition="")}},Mi=new WeakSet,Rr=function(e){if(!t(this,qe))return;const i=t(this,qe).getBoundingClientRect(),n=i.left+i.width/2,a=i.top+i.height/2,d=e.clientX-n,l=-(e.clientY-a);let u=Math.atan2(l,d)*180/Math.PI;u<0&&(u+=360);let v=B-u;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b),s(this,F,o(this,er,is).call(this,v/b*100)),t(this,Ct)&&(t(this,Ct).style.transition="none"),t(this,vt)&&(t(this,vt).style.transition="none"),o(this,Ke,wr).call(this),t(this,Ge).call(this)},nr=new WeakSet,as=function(){this.config.card?.sendCommand("set_temperature",{temperature:t(this,F)})},ar=new WeakSet,os=function(){const e=(i,n)=>{if(!i)return;const a=i.querySelector(".hrv-cf-value");a&&(a.textContent=we(n??"None"))};e(t(this,De),t(this,ft)),e(t(this,ze),t(this,Oe)),e(t(this,Be),t(this,Fe)),e(t(this,Re),t(this,Ne))};const Ms=`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--hrv-spacing-s);
      padding: var(--hrv-spacing-s) 0 var(--hrv-spacing-m);
    }

    [part=btn-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    [part=btn-icon] svg { width: 40px; height: 40px; }

    [part=trigger-button] {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      border: none;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--hrv-color-primary);
      cursor: pointer;
      box-shadow: 0 0 0 0 transparent;
      transition:
        box-shadow 200ms ease,
        background var(--hrv-transition-speed),
        opacity 80ms;
    }

    [part=trigger-button]:hover { opacity: 0.88; }

    [part=trigger-button][data-pressing=true] {
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
      transition: box-shadow 0ms, background var(--hrv-transition-speed), opacity 80ms;
    }

    [part=trigger-button][data-state=triggered] {
      background: var(--hrv-color-primary, #1976d2);
      opacity: 0.5;
    }

    [part=trigger-button]:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `;class Ts extends m{constructor(){super(...arguments);r(this,$,null)}render(){const e=this.def.capabilities==="read-write",i=this.def.friendly_name;this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ms}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(i)}</span>
          </div>
          <div part="card-body">
            <button part="trigger-button" type="button"
              aria-label="${h(i)}"
              title="${e?h(i):"Read-only"}"
              ${e?"":"disabled"}>
              <span part="btn-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,$,this.root.querySelector("[part=trigger-button]")),this.renderIcon(this.def.icon_state_map?.idle??this.def.icon??"mdi:play","btn-icon"),t(this,$)&&e&&(t(this,$).addEventListener("click",()=>{t(this,$).disabled=!0,this.config.card?.sendCommand("trigger",{})}),t(this,$).addEventListener("pointerdown",()=>t(this,$).setAttribute("data-pressing","true")),t(this,$).addEventListener("pointerup",()=>t(this,$).removeAttribute("data-pressing")),t(this,$).addEventListener("pointerleave",()=>t(this,$).removeAttribute("data-pressing")),t(this,$).addEventListener("pointercancel",()=>t(this,$).removeAttribute("data-pressing"))),this.renderCompanions(),X(this.root)}applyState(e,i){const n=e==="triggered";t(this,$)&&(t(this,$).setAttribute("data-state",e),this.def.capabilities==="read-write"&&(t(this,$).disabled=n));const a=this.def.icon_state_map?.[e]??this.def.icon??"mdi:play";this.renderIcon(a,"btn-icon"),n&&this.announceState(`${this.def.friendly_name}, ${this.i18n.t("state.triggered")}`)}predictState(e,i){return e!=="trigger"?null:{state:"triggered",attributes:{}}}}$=new WeakMap;const qs=`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--hrv-spacing-s) 0 var(--hrv-spacing-m);
    }

    .hrv-bs-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.35;
      box-shadow: 0 0 0 0 transparent;
      transition:
        box-shadow 200ms ease,
        opacity 200ms ease;
    }

    .hrv-bs-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }

    [part=state-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    [part=state-icon] svg { width: 40px; height: 40px; }
  `;class Hs extends m{constructor(){super(...arguments);r(this,se,null)}render(){this.root.innerHTML=`
        <style>${this.getSharedStyles()}${qs}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-bs-circle" data-on="false"
              role="img" aria-label="${h(this.def.friendly_name)}">
              <span part="state-icon" aria-hidden="true"></span>
            </div>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,se,this.root.querySelector(".hrv-bs-circle")),this.renderIcon(this.def.icon_state_map?.off??this.def.icon??"mdi:radiobox-blank","state-icon"),this.renderCompanions(),X(this.root)}applyState(e,i){const n=e==="on",a=this.i18n.t(`state.${e}`)!==`state.${e}`?this.i18n.t(`state.${e}`):e;t(this,se)&&(t(this,se).setAttribute("data-on",String(n)),t(this,se).setAttribute("aria-label",`${this.def.friendly_name}: ${a}`));const d=this.def.icon_state_map?.[e]??this.def.icon??(n?"mdi:radiobox-marked":"mdi:radiobox-blank");this.renderIcon(d,"state-icon"),this.announceState(`${this.def.friendly_name}, ${a}`)}}se=new WeakMap;const Is='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 14h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V10z" opacity="0.3"/><path d="M3 4h18v2H3V4zm0 16h18v2H3v-2z"/></svg>',Ps='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',Ds='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>',zs=`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: 0 var(--hrv-card-padding, 16px) 0;
    }

    [part=companion-zone] {
      margin-top: 6px;
      border-top: none;
      padding-top: 0;
      padding-bottom: var(--hrv-card-padding, 16px);
      justify-content: center;
      gap: 12px;
    }
    [part=companion-zone]:empty { display: none; }

    .hrv-cover-slider-wrap {
      padding: 16px 8px 20px;
    }
    .hrv-cover-slider-track {
      position: relative;
      height: 6px;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      border-radius: 3px;
      cursor: pointer;
    }
    .hrv-cover-slider-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--hrv-color-primary, #1976d2);
      border-radius: 3px;
      transition: width 0.15s;
      pointer-events: none;
    }
    .hrv-cover-slider-thumb {
      position: absolute;
      top: 50%;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: transparent;
      border: 3px solid var(--hrv-ex-thumb, #fff);
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: left 0.15s;
      box-sizing: border-box;
    }
    .hrv-cover-slider-thumb:active { cursor: grabbing; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-cover-slider-fill,
      .hrv-cover-slider-thumb { transition: none; }
    }

    .hrv-cover-btns {
      display: flex;
      justify-content: center;
      gap: 24px;
      padding: 0 0 16px;
    }
    .hrv-cover-btn {
      width: 52px;
      height: 52px;
      border-radius: 50%;
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.35));
      background: transparent;
      color: var(--hrv-color-text, #fff);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: border-color 0.15s, background 0.15s;
    }
    .hrv-cover-btn svg { width: 22px; height: 22px; }
    .hrv-cover-btn:active,
    .hrv-cover-btn[data-pressing=true] {
      border-color: var(--hrv-ex-ring, #fff);
      transition: none;
    }
    .hrv-cover-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .hrv-cover-btn:disabled:active { background: transparent; border-color: var(--hrv-ex-outline, rgba(255,255,255,0.35)); }
  `;class Bs extends m{constructor(e,i,n,a){super(e,i,n,a);r(this,Je);r(this,or);r(this,ne,null);r(this,gt,null);r(this,k,null);r(this,ae,null);r(this,oe,null);r(this,de,null);r(this,At,!1);r(this,bt,0);r(this,Ti,"closed");r(this,qi,{});r(this,Hi,void 0);s(this,Hi,Dt(o(this,or,ds).bind(this),300))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features?.includes("set_position"),n=!this.def.supported_features||this.def.supported_features.includes("buttons");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${zs}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${i?`
              <div class="hrv-cover-slider-wrap" title="${e?"Drag to set position":"Read-only"}">
                <div class="hrv-cover-slider-track" ${e?"":'style="cursor:not-allowed"'}>
                  <div class="hrv-cover-slider-fill" style="width:0%"></div>
                  <div class="hrv-cover-slider-thumb" style="left:0%;${e?"":"cursor:not-allowed;pointer-events:none"}"></div>
                </div>
              </div>
            `:""}
            ${e&&n?`
              <div class="hrv-cover-btns">
                <button class="hrv-cover-btn" data-action="open" type="button"
                  title="Open cover" aria-label="Open cover">${Is}</button>
                <button class="hrv-cover-btn" data-action="stop" type="button"
                  title="Stop cover" aria-label="Stop cover">${Ps}</button>
                <button class="hrv-cover-btn" data-action="close" type="button"
                  title="Close cover" aria-label="Close cover">${Ds}</button>
              </div>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,ne,this.root.querySelector(".hrv-cover-slider-track")),s(this,gt,this.root.querySelector(".hrv-cover-slider-fill")),s(this,k,this.root.querySelector(".hrv-cover-slider-thumb")),s(this,ae,this.root.querySelector("[data-action=open]")),s(this,oe,this.root.querySelector("[data-action=stop]")),s(this,de,this.root.querySelector("[data-action=close]")),t(this,ne)&&t(this,k)&&e){const a=l=>{s(this,At,!0),t(this,k).style.transition="none",t(this,gt).style.transition="none",o(this,Je,_r).call(this,l),t(this,k).setPointerCapture(l.pointerId)};t(this,k).addEventListener("pointerdown",a),t(this,ne).addEventListener("pointerdown",l=>{l.target!==t(this,k)&&(s(this,At,!0),t(this,k).style.transition="none",t(this,gt).style.transition="none",o(this,Je,_r).call(this,l),t(this,k).setPointerCapture(l.pointerId))}),t(this,k).addEventListener("pointermove",l=>{t(this,At)&&o(this,Je,_r).call(this,l)});const d=()=>{t(this,At)&&(s(this,At,!1),t(this,k).style.transition="",t(this,gt).style.transition="",t(this,Hi).call(this))};t(this,k).addEventListener("pointerup",d),t(this,k).addEventListener("pointercancel",d)}[t(this,ae),t(this,oe),t(this,de)].forEach(a=>{if(!a)return;const d=a.getAttribute("data-action");a.addEventListener("click",()=>{this.config.card?.sendCommand(`${d}_cover`,{})}),a.addEventListener("pointerdown",()=>a.setAttribute("data-pressing","true")),a.addEventListener("pointerup",()=>a.removeAttribute("data-pressing")),a.addEventListener("pointerleave",()=>a.removeAttribute("data-pressing")),a.addEventListener("pointercancel",()=>a.removeAttribute("data-pressing"))}),this.renderCompanions(),X(this.root)}applyState(e,i){s(this,Ti,e),s(this,qi,{...i});const n=e==="opening"||e==="closing",a=i.current_position;t(this,ae)&&(t(this,ae).disabled=!n&&a===100),t(this,oe)&&(t(this,oe).disabled=!n),t(this,de)&&(t(this,de).disabled=!n&&e==="closed"),i.current_position!==void 0&&!t(this,At)&&(s(this,bt,i.current_position),t(this,gt)&&(t(this,gt).style.width=`${t(this,bt)}%`),t(this,k)&&(t(this,k).style.left=`${t(this,bt)}%`)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){const n={...t(this,qi)};return e==="open_cover"?(n.current_position=100,{state:"open",attributes:n}):e==="close_cover"?(n.current_position=0,{state:"closed",attributes:n}):e==="stop_cover"?{state:t(this,Ti),attributes:n}:e==="set_cover_position"&&i.position!==void 0?(n.current_position=i.position,{state:i.position>0?"open":"closed",attributes:n}):null}}ne=new WeakMap,gt=new WeakMap,k=new WeakMap,ae=new WeakMap,oe=new WeakMap,de=new WeakMap,At=new WeakMap,bt=new WeakMap,Ti=new WeakMap,qi=new WeakMap,Hi=new WeakMap,Je=new WeakSet,_r=function(e){const i=t(this,ne).getBoundingClientRect(),n=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));s(this,bt,Math.round(n)),t(this,gt).style.width=`${t(this,bt)}%`,t(this,k).style.left=`${t(this,bt)}%`},or=new WeakSet,ds=function(){this.config.card?.sendCommand("set_cover_position",{position:t(this,bt)})};const Rs=`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: 0;
      padding: var(--hrv-card-padding, 16px) var(--hrv-card-padding, 16px) 0;
    }

    .hrv-num-slider-wrap {
      padding: 20px 8px 20px;
    }
    .hrv-num-slider-track {
      position: relative;
      height: 6px;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      border-radius: 3px;
      cursor: pointer;
    }
    .hrv-num-slider-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: var(--hrv-color-primary, #1976d2);
      border-radius: 3px;
      transition: width 0.15s;
      pointer-events: none;
    }
    .hrv-num-slider-thumb {
      position: absolute;
      top: 50%;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: transparent;
      border: 3px solid var(--hrv-ex-thumb, #fff);
      box-sizing: border-box;
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: left 0.15s;
    }
    .hrv-num-slider-thumb:active { cursor: grabbing; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-num-slider-fill,
      .hrv-num-slider-thumb { transition: none; }
    }

    .hrv-num-input-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      padding: 0 0 16px;
    }
    .hrv-num-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      color: var(--hrv-color-on-primary, #fff);
      cursor: pointer;
      padding: 0;
      font-size: 22px;
      font-weight: 300;
      line-height: 1;
      transition: opacity 150ms ease, box-shadow 150ms ease;
    }
    .hrv-num-btn:hover { opacity: 0.85; }
    .hrv-num-btn:focus-visible { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    .hrv-num-btn:active { box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff); }
    .hrv-num-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-num-btn:disabled:hover { opacity: 0.35; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-num-btn { transition: none; }
    }

    .hrv-num-input {
      width: 58px;
      padding: 4px 6px;
      border: 1.5px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.18));
      border-radius: var(--hrv-radius-s, 8px);
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.10));
      color: var(--hrv-color-text, #fff);
      font-size: 18px;
      font-weight: 500;
      font-family: inherit;
      text-align: center;
      outline: none;
      -webkit-appearance: textfield;
      -moz-appearance: textfield;
      appearance: textfield;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .hrv-num-input::-webkit-outer-spin-button,
    .hrv-num-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .hrv-num-input:focus {
      border-color: var(--hrv-color-primary, #1976d2);
      box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.35);
    }
    .hrv-num-unit {
      font-size: 13px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.6));
    }

    .hrv-num-readonly {
      display: flex;
      align-items: baseline;
      justify-content: center;
      padding: 28px 0 32px;
      gap: 4px;
    }
    .hrv-num-readonly-val {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      line-height: 1;
    }
    .hrv-num-readonly-unit {
      font-size: 18px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
    }

    [part=history-graph] {
      margin-top: 0;
      padding: 0;
      border-radius: 0 0 var(--hrv-radius-l, 16px) var(--hrv-radius-l, 16px);
      overflow: hidden;
    }
    [part=history-svg] {
      height: 56px;
      display: block;
    }
    [part=history-empty] { display: none; }
  `;class js extends m{constructor(e,i,n,a){super(e,i,n,a);r(this,dr);r(this,hr);r(this,Yt);r(this,ti);r(this,lr);r(this,Zt);r(this,he,null);r(this,Et,null);r(this,M,null);r(this,q,null);r(this,Qe,null);r(this,Ft,null);r(this,Nt,null);r(this,Mt,!1);r(this,T,0);r(this,G,0);r(this,it,100);r(this,Tt,1);r(this,Vt,void 0);s(this,Vt,Dt(o(this,lr,cs).bind(this),300))}render(){const e=this.def.capabilities==="read-write";s(this,G,this.def.feature_config?.min??0),s(this,it,this.def.feature_config?.max??100),s(this,Tt,this.def.feature_config?.step??1);const i=this.def.unit_of_measurement??"";if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Rs}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e?`
              <div class="hrv-num-slider-wrap" title="Drag to set value">
                <div class="hrv-num-slider-track">
                  <div class="hrv-num-slider-fill" style="width:0%"></div>
                  <div class="hrv-num-slider-thumb" style="left:0%"></div>
                </div>
              </div>
              <div class="hrv-num-input-row">
                <button class="hrv-num-btn" type="button" part="dec-btn"
                  aria-label="Decrease ${h(this.def.friendly_name)}">-</button>
                <input class="hrv-num-input" type="number"
                  min="${t(this,G)}" max="${t(this,it)}" step="${t(this,Tt)}"
                  title="Enter value" aria-label="${h(this.def.friendly_name)} value">
                <button class="hrv-num-btn" type="button" part="inc-btn"
                  aria-label="Increase ${h(this.def.friendly_name)}">+</button>
                ${i?`<span class="hrv-num-unit">${h(i)}</span>`:""}
              </div>
            `:`
              <div class="hrv-num-readonly">
                <span class="hrv-num-readonly-val">-</span>
                ${i?`<span class="hrv-num-readonly-unit">${h(i)}</span>`:""}
              </div>
            `}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,he,this.root.querySelector(".hrv-num-slider-track")),s(this,Et,this.root.querySelector(".hrv-num-slider-fill")),s(this,M,this.root.querySelector(".hrv-num-slider-thumb")),s(this,q,this.root.querySelector(".hrv-num-input")),s(this,Qe,this.root.querySelector(".hrv-num-readonly-val")),s(this,Ft,this.root.querySelector("[part=dec-btn]")),s(this,Nt,this.root.querySelector("[part=inc-btn]")),t(this,he)&&t(this,M)){const n=d=>{s(this,Mt,!0),t(this,M).style.transition="none",t(this,Et).style.transition="none",o(this,ti,Sr).call(this,d),t(this,M).setPointerCapture(d.pointerId)};t(this,M).addEventListener("pointerdown",n),t(this,he).addEventListener("pointerdown",d=>{d.target!==t(this,M)&&(s(this,Mt,!0),t(this,M).style.transition="none",t(this,Et).style.transition="none",o(this,ti,Sr).call(this,d),t(this,M).setPointerCapture(d.pointerId))}),t(this,M).addEventListener("pointermove",d=>{t(this,Mt)&&o(this,ti,Sr).call(this,d)});const a=()=>{t(this,Mt)&&(s(this,Mt,!1),t(this,M).style.transition="",t(this,Et).style.transition="",t(this,Vt).call(this))};t(this,M).addEventListener("pointerup",a),t(this,M).addEventListener("pointercancel",a)}t(this,q)&&t(this,q).addEventListener("input",()=>{const n=parseFloat(t(this,q).value);isNaN(n)||(s(this,T,Math.max(t(this,G),Math.min(t(this,it),n))),o(this,Yt,ui).call(this),o(this,Zt,vi).call(this),t(this,Vt).call(this))}),t(this,Ft)&&t(this,Ft).addEventListener("click",()=>{s(this,T,+Math.max(t(this,G),t(this,T)-t(this,Tt)).toFixed(10)),o(this,Yt,ui).call(this),t(this,q)&&(t(this,q).value=String(t(this,T))),o(this,Zt,vi).call(this),t(this,Vt).call(this)}),t(this,Nt)&&t(this,Nt).addEventListener("click",()=>{s(this,T,+Math.min(t(this,it),t(this,T)+t(this,Tt)).toFixed(10)),o(this,Yt,ui).call(this),t(this,q)&&(t(this,q).value=String(t(this,T))),o(this,Zt,vi).call(this),t(this,Vt).call(this)}),this.renderCompanions(),X(this.root)}applyState(e,i){const n=parseFloat(e);if(isNaN(n))return;s(this,T,n),t(this,Mt)||(o(this,Yt,ui).call(this),t(this,q)&&!this.isFocused(t(this,q))&&(t(this,q).value=String(n))),o(this,Zt,vi).call(this),t(this,Qe)&&(t(this,Qe).textContent=String(n));const a=this.def.unit_of_measurement??"";this.announceState(`${this.def.friendly_name}, ${n}${a?` ${a}`:""}`)}predictState(e,i){return e==="set_value"&&i.value!==void 0?{state:String(i.value),attributes:{}}:null}}he=new WeakMap,Et=new WeakMap,M=new WeakMap,q=new WeakMap,Qe=new WeakMap,Ft=new WeakMap,Nt=new WeakMap,Mt=new WeakMap,T=new WeakMap,G=new WeakMap,it=new WeakMap,Tt=new WeakMap,Vt=new WeakMap,dr=new WeakSet,hs=function(e){const i=t(this,it)-t(this,G);return i===0?0:Math.max(0,Math.min(100,(e-t(this,G))/i*100))},hr=new WeakSet,ls=function(e){const i=t(this,G)+e/100*(t(this,it)-t(this,G)),n=Math.round(i/t(this,Tt))*t(this,Tt);return Math.max(t(this,G),Math.min(t(this,it),+n.toFixed(10)))},Yt=new WeakSet,ui=function(){const e=o(this,dr,hs).call(this,t(this,T));t(this,Et)&&(t(this,Et).style.width=`${e}%`),t(this,M)&&(t(this,M).style.left=`${e}%`)},ti=new WeakSet,Sr=function(e){const i=t(this,he).getBoundingClientRect(),n=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));s(this,T,o(this,hr,ls).call(this,n)),o(this,Yt,ui).call(this),t(this,q)&&(t(this,q).value=String(t(this,T))),o(this,Zt,vi).call(this)},lr=new WeakSet,cs=function(){this.config.card?.sendCommand("set_value",{value:t(this,T)})},Zt=new WeakSet,vi=function(){t(this,Ft)&&(t(this,Ft).disabled=t(this,T)<=t(this,G)),t(this,Nt)&&(t(this,Nt).disabled=t(this,T)>=t(this,it))};const Os=`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--hrv-spacing-s, 8px) var(--hrv-spacing-m, 16px) var(--hrv-spacing-m, 16px);
      position: relative;
    }

    .hrv-is-selected {
      width: 100%;
      padding: 10px 14px;
      border-radius: var(--hrv-radius-s, 8px);
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.10));
      color: var(--hrv-color-text, #fff);
      font-size: 14px;
      font-family: inherit;
      text-align: left;
      border: 1px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.12));
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.15s;
    }
    .hrv-is-selected:hover { background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15)); }
    .hrv-is-selected[data-readonly=true] {
      cursor: not-allowed;
      border-color: transparent;
      background: transparent;
      justify-content: center;
    }
    .hrv-is-selected[data-readonly=true]:hover { background: transparent; }
    .hrv-is-arrow { font-size: 10px; opacity: 0.5; }

    .hrv-is-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--hrv-radius-s, 8px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px var(--hrv-ex-glass-border, rgba(255,255,255,0.12));
      overflow: hidden;
      max-height: 280px;
      overflow-y: auto;
      scrollbar-width: none;
      z-index: 10;
    }
    .hrv-is-option {
      display: block;
      width: 100%;
      padding: 8px 14px;
      border: none;
      background: transparent;
      color: var(--hrv-color-text, #fff);
      text-align: left;
      cursor: pointer;
      font-size: 13px;
      font-family: inherit;
      transition: background 0.1s;
    }
    .hrv-is-option + .hrv-is-option {
      border-top: 1px solid var(--hrv-ex-glass-border, rgba(255,255,255,0.06));
    }
    .hrv-is-option:hover { background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.08)); }
    .hrv-is-option[data-active=true] { color: var(--hrv-color-primary, #1976d2); }
  `;class Fs extends m{constructor(){super(...arguments);r(this,cr);r(this,Pi);r(this,ei,null);r(this,yt,null);r(this,Ii,"");r(this,qt,[]);r(this,le,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Os}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-is-selected" type="button"
              ${e?'title="Select an option"':'data-readonly="true" title="Read-only" disabled'}
              aria-label="${h(this.def.friendly_name)}">
              <span class="hrv-is-label">-</span>
              ${e?'<span class="hrv-is-arrow" aria-hidden="true">&#9660;</span>':""}
            </button>
            ${e?'<div class="hrv-is-dropdown" hidden></div>':""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,ei,this.root.querySelector(".hrv-is-selected")),s(this,yt,this.root.querySelector(".hrv-is-dropdown")),t(this,ei)&&e&&t(this,ei).addEventListener("click",()=>{t(this,le)?o(this,Pi,jr).call(this):o(this,cr,ps).call(this)}),this.renderCompanions(),X(this.root)}applyState(e,i){s(this,Ii,e),s(this,qt,i?.options??t(this,qt));const n=this.root.querySelector(".hrv-is-label");n&&(n.textContent=e),t(this,le)&&t(this,yt)?.querySelectorAll(".hrv-is-option").forEach((a,d)=>{a.setAttribute("data-active",String(t(this,qt)[d]===e))}),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e==="select_option"&&i.option!==void 0?{state:String(i.option),attributes:{}}:null}}ei=new WeakMap,yt=new WeakMap,Ii=new WeakMap,qt=new WeakMap,le=new WeakMap,cr=new WeakSet,ps=function(){if(!t(this,yt)||!t(this,qt).length)return;t(this,yt).innerHTML=t(this,qt).map(i=>`
        <button class="hrv-is-option" type="button"
          data-active="${i===t(this,Ii)}"
          title="${h(i)}">
          ${h(i)}
        </button>
      `).join(""),t(this,yt).querySelectorAll(".hrv-is-option").forEach((i,n)=>{i.addEventListener("click",()=>{this.config.card?.sendCommand("select_option",{option:t(this,qt)[n]}),o(this,Pi,jr).call(this)})});const e=this.root.querySelector("[part=card]");e&&(e.style.overflow="visible"),t(this,yt).removeAttribute("hidden"),s(this,le,!0)},Pi=new WeakSet,jr=function(){t(this,yt)?.setAttribute("hidden","");const e=this.root.querySelector("[part=card]");e&&(e.style.overflow=""),s(this,le,!1)};const Ns=`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: var(--hrv-spacing-s, 8px) var(--hrv-spacing-m, 16px) var(--hrv-spacing-m, 16px);
    }

    .hrv-mp-info {
      text-align: center;
      min-height: 32px;
    }
    .hrv-mp-artist {
      font-size: 11px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.6));
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .hrv-mp-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--hrv-color-text, #fff);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .hrv-mp-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }
    .hrv-mp-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      color: var(--hrv-color-on-primary, #fff);
      cursor: pointer;
      padding: 0;
      box-shadow: none;
      transition: box-shadow 150ms ease, opacity 150ms ease;
    }
    .hrv-mp-btn:hover { opacity: 0.85; }
    .hrv-mp-btn:active,
    .hrv-mp-btn[data-pressing=true] {
      box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff);
    }
    .hrv-mp-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-mp-btn svg { width: 20px; height: 20px; display: block; }
    .hrv-mp-btn[data-role=play] { width: 48px; height: 48px; }
    .hrv-mp-btn[data-role=play] svg { width: 24px; height: 24px; display: block; }

    .hrv-mp-volume {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hrv-mp-mute {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--hrv-color-text, #fff);
      cursor: pointer;
      padding: 0;
      transition: opacity 150ms;
    }
    .hrv-mp-mute:hover { opacity: 0.7; }
    .hrv-mp-mute:disabled { opacity: 0.35; cursor: not-allowed; }
    .hrv-mp-mute svg { width: 20px; height: 20px; display: block; }

    .hrv-mp-slider-wrap { flex: 1; padding: 4px 0; }
    .hrv-mp-slider-track {
      position: relative;
      height: 6px;
      background: var(--hrv-ex-glass-bg, rgba(255,255,255,0.15));
      border-radius: 3px;
      cursor: pointer;
    }
    .hrv-mp-slider-fill {
      position: absolute;
      left: 0; top: 0;
      height: 100%;
      background: var(--hrv-color-primary, #1976d2);
      border-radius: 3px;
      transition: width 0.15s;
      pointer-events: none;
    }
    .hrv-mp-slider-thumb {
      position: absolute;
      top: 50%;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      transform: translate(-50%, -50%);
      cursor: grab;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: left 0.15s;
      box-sizing: border-box;
    }
    .hrv-mp-slider-thumb:active { cursor: grabbing; }
    .hrv-mp-slider-track[data-readonly=true] { cursor: not-allowed; }
    .hrv-mp-slider-track[data-readonly=true] .hrv-mp-slider-thumb {
      cursor: not-allowed;
      pointer-events: none;
    }
    @media (prefers-reduced-motion: reduce) {
      .hrv-mp-slider-fill,
      .hrv-mp-slider-thumb { transition: none; }
      .hrv-mp-btn { transition: none; }
    }
  `;class Vs extends m{constructor(e,i,n,a){super(e,i,n,a);r(this,si);r(this,pr);r(this,Ht,null);r(this,ii,null);r(this,ri,null);r(this,ce,null);r(this,pe,null);r(this,xt,null);r(this,C,null);r(this,ue,null);r(this,ve,null);r(this,fe,!1);r(this,wt,0);r(this,It,!1);r(this,Di,void 0);s(this,Di,this.debounce(o(this,pr,us).bind(this),200))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],n=i.includes("volume_set"),a=i.includes("previous_track");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ns}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-mp-info">
              <div class="hrv-mp-artist" title="Artist"></div>
              <div class="hrv-mp-title" title="Title"></div>
            </div>
            ${e?`
              <div class="hrv-mp-controls">
                ${a?`
                  <button class="hrv-mp-btn" data-role="prev" type="button"
                    title="Previous track">
                    <span part="prev-icon" aria-hidden="true"></span>
                  </button>
                `:""}
                <button class="hrv-mp-btn" data-role="play" type="button"
                  title="Play">
                  <span part="play-icon" aria-hidden="true"></span>
                </button>
                ${a?`
                  <button class="hrv-mp-btn" data-role="next" type="button"
                    title="Next track">
                    <span part="next-icon" aria-hidden="true"></span>
                  </button>
                `:""}
              </div>
            `:""}
            ${n?`
              <div class="hrv-mp-volume" title="${e?"Volume":"Read-only"}">
                <button class="hrv-mp-mute" type="button"
                  title="${e?"Mute":"Read-only"}"
                  ${e?"":"disabled"}>
                  <span part="mute-icon" aria-hidden="true"></span>
                </button>
                <div class="hrv-mp-slider-wrap">
                  <div class="hrv-mp-slider-track" ${e?"":'data-readonly="true"'}>
                    <div class="hrv-mp-slider-fill" style="width:0%"></div>
                    <div class="hrv-mp-slider-thumb" style="left:0%"></div>
                  </div>
                </div>
              </div>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,Ht,this.root.querySelector("[data-role=play]")),s(this,ii,this.root.querySelector("[data-role=prev]")),s(this,ri,this.root.querySelector("[data-role=next]")),s(this,ce,this.root.querySelector(".hrv-mp-mute")),s(this,pe,this.root.querySelector(".hrv-mp-slider-track")),s(this,xt,this.root.querySelector(".hrv-mp-slider-fill")),s(this,C,this.root.querySelector(".hrv-mp-slider-thumb")),s(this,ue,this.root.querySelector(".hrv-mp-artist")),s(this,ve,this.root.querySelector(".hrv-mp-title")),this.renderIcon("mdi:play","play-icon"),this.renderIcon("mdi:skip-previous","prev-icon"),this.renderIcon("mdi:skip-next","next-icon"),this.renderIcon("mdi:volume-high","mute-icon"),e&&(t(this,Ht)?.addEventListener("click",()=>{this.config.card?.sendCommand("media_play_pause",{})}),t(this,ii)?.addEventListener("click",()=>this.config.card?.sendCommand("media_previous_track",{})),t(this,ri)?.addEventListener("click",()=>this.config.card?.sendCommand("media_next_track",{})),[t(this,Ht),t(this,ii),t(this,ri)].forEach(d=>{d&&(d.addEventListener("pointerdown",()=>d.setAttribute("data-pressing","true")),d.addEventListener("pointerup",()=>d.removeAttribute("data-pressing")),d.addEventListener("pointerleave",()=>d.removeAttribute("data-pressing")),d.addEventListener("pointercancel",()=>d.removeAttribute("data-pressing")))}),t(this,ce)?.addEventListener("click",()=>this.config.card?.sendCommand("volume_mute",{is_volume_muted:!t(this,fe)})),t(this,pe)&&t(this,C))){const d=u=>{s(this,It,!0),t(this,C).style.transition="none",t(this,xt).style.transition="none",o(this,si,$r).call(this,u),t(this,C).setPointerCapture(u.pointerId)};t(this,C).addEventListener("pointerdown",d),t(this,pe).addEventListener("pointerdown",u=>{u.target!==t(this,C)&&(s(this,It,!0),t(this,C).style.transition="none",t(this,xt).style.transition="none",o(this,si,$r).call(this,u),t(this,C).setPointerCapture(u.pointerId))}),t(this,C).addEventListener("pointermove",u=>{t(this,It)&&o(this,si,$r).call(this,u)});const l=()=>{t(this,It)&&(s(this,It,!1),t(this,C).style.transition="",t(this,xt).style.transition="",t(this,Di).call(this))};t(this,C).addEventListener("pointerup",l),t(this,C).addEventListener("pointercancel",l)}this.renderCompanions(),X(this.root)}applyState(e,i){const n=e==="playing",a=e==="paused";if(t(this,ue)){const l=i.media_artist??"";t(this,ue).textContent=l,t(this,ue).title=l||"Artist"}if(t(this,ve)){const l=i.media_title??"";t(this,ve).textContent=l,t(this,ve).title=l||"Title"}if(t(this,Ht)){t(this,Ht).setAttribute("data-playing",String(n));const l=n?"mdi:pause":"mdi:play";this.renderIcon(l,"play-icon"),this.def.capabilities==="read-write"&&(t(this,Ht).title=n?"Pause":"Play")}if(s(this,fe,!!i.is_volume_muted),t(this,ce)){const l=t(this,fe)?"mdi:volume-off":"mdi:volume-high";this.renderIcon(l,"mute-icon"),this.def.capabilities==="read-write"&&(t(this,ce).title=t(this,fe)?"Unmute":"Mute")}i.volume_level!==void 0&&!t(this,It)&&(s(this,wt,Math.round(i.volume_level*100)),t(this,xt)&&(t(this,xt).style.width=`${t(this,wt)}%`),t(this,C)&&(t(this,C).style.left=`${t(this,wt)}%`));const d=i.media_title??"";this.announceState(`${this.def.friendly_name}, ${e}${d?` - ${d}`:""}`)}}Ht=new WeakMap,ii=new WeakMap,ri=new WeakMap,ce=new WeakMap,pe=new WeakMap,xt=new WeakMap,C=new WeakMap,ue=new WeakMap,ve=new WeakMap,fe=new WeakMap,wt=new WeakMap,It=new WeakMap,Di=new WeakMap,si=new WeakSet,$r=function(e){const i=t(this,pe).getBoundingClientRect(),n=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));s(this,wt,Math.round(n)),t(this,xt).style.width=`${t(this,wt)}%`,t(this,C).style.left=`${t(this,wt)}%`},pr=new WeakSet,us=function(){this.config.card?.sendCommand("volume_set",{volume_level:t(this,wt)/100})};const Ys=`
    [part=card-body] {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-remote-circle {
      width: 88px;
      height: 88px;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      padding: 0;
      color: var(--hrv-color-on-primary, #fff);
      box-shadow: none;
      transition: box-shadow 150ms ease, opacity 150ms ease;
    }
    .hrv-remote-circle:hover { opacity: 0.85; }
    .hrv-remote-circle:active,
    .hrv-remote-circle[data-pressing=true] {
      box-shadow: 0 0 0 5px var(--hrv-ex-ring, #fff);
    }
    .hrv-remote-circle:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-remote-circle:disabled:hover { opacity: 0.35; }
    [part=remote-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    [part=remote-icon] svg { width: 40px; height: 40px; }
    @media (prefers-reduced-motion: reduce) {
      .hrv-remote-circle { transition: none; }
    }
  `;class Zs extends m{constructor(){super(...arguments);r(this,N,null)}render(){const e=this.def.capabilities==="read-write",i=this.config.tapAction?.data?.command??"power";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ys}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-remote-circle" type="button"
              title="${e?h(i):"Read-only"}"
              aria-label="${h(this.def.friendly_name)} - ${h(i)}"
              ${e?"":"disabled"}>
              <span part="remote-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,N,this.root.querySelector(".hrv-remote-circle"));const n=this.resolveIcon(this.def.icon,"mdi:remote");this.renderIcon(n,"remote-icon"),t(this,N)&&e&&(t(this,N).addEventListener("click",()=>{const a=this.config.tapAction?.data?.command??"power",d=this.config.tapAction?.data?.device??void 0,l=d?{command:a,device:d}:{command:a};this.config.card?.sendCommand("send_command",l)}),t(this,N).addEventListener("pointerdown",()=>t(this,N).setAttribute("data-pressing","true")),t(this,N).addEventListener("pointerup",()=>t(this,N).removeAttribute("data-pressing")),t(this,N).addEventListener("pointerleave",()=>t(this,N).removeAttribute("data-pressing")),t(this,N).addEventListener("pointercancel",()=>t(this,N).removeAttribute("data-pressing"))),this.renderCompanions(),X(this.root)}applyState(e,i){const n=this.def.icon_state_map?.[e]??this.def.icon??"mdi:remote";this.renderIcon(this.resolveIcon(n,"mdi:remote"),"remote-icon"),this.announceState(`${this.def.friendly_name}, ${e}`)}}N=new WeakMap;const Ws=`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      align-items: baseline;
      justify-content: center;
      gap: 4px;
      padding: 28px 0 32px;
    }

    .hrv-sensor-val {
      font-size: 52px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      line-height: 1;
    }
    .hrv-sensor-unit {
      font-size: 18px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
    }

    [part=history-graph] {
      margin-top: 0;
      padding: 0;
      border-radius: 0 0 var(--hrv-radius-l, 16px) var(--hrv-radius-l, 16px);
      overflow: hidden;
    }
    [part=history-svg] {
      height: 56px;
      display: block;
    }
  `;class Us extends m{constructor(){super(...arguments);r(this,ni,null);r(this,ai,null)}render(){const e=this.def.unit_of_measurement??"";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ws}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" title="${h(this.def.friendly_name)}">
            <span class="hrv-sensor-val" aria-live="polite">-</span>
            ${e?`<span class="hrv-sensor-unit" title="${h(e)}">${h(e)}</span>`:""}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,ni,this.root.querySelector(".hrv-sensor-val")),s(this,ai,this.root.querySelector(".hrv-sensor-unit")),this.renderCompanions(),X(this.root)}applyState(e,i){t(this,ni)&&(t(this,ni).textContent=e),t(this,ai)&&i.unit_of_measurement!==void 0&&(t(this,ai).textContent=i.unit_of_measurement);const n=i.unit_of_measurement??this.def.unit_of_measurement??"",a=this.root.querySelector("[part=card-body]");a&&(a.title=`${e}${n?` ${n}`:""}`),this.announceState(`${this.def.friendly_name}, ${e}${n?` ${n}`:""}`)}}ni=new WeakMap,ai=new WeakMap;const Gs=`
    [part=card-body] {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px 0 24px;
    }

    button.hrv-switch-track {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      position: relative;
      width: 48px;
      height: 96px;
      border-radius: 24px;
      background: var(--hrv-ex-toggle-idle, rgba(255,255,255,0.25));
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.3));
      cursor: pointer;
      padding: 0;
      margin: 0;
      outline: none;
      font: inherit;
      color: inherit;
      line-height: 1;
      text-align: center;
      text-decoration: none;
      transition: background 250ms ease, border-color 250ms ease;
      user-select: none;
      box-sizing: border-box;
    }
    .hrv-switch-track:focus-visible {
      box-shadow: 0 0 0 3px var(--hrv-color-primary, #1976d2);
    }
    .hrv-switch-track[data-on=true] {
      background: var(--hrv-color-primary, #1976d2);
      border-color: var(--hrv-color-primary, #1976d2);
    }
    .hrv-switch-track:hover { opacity: 0.85; }
    .hrv-switch-track:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .hrv-switch-track:disabled:hover { opacity: 0.4; }

    .hrv-switch-knob {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: top 200ms ease;
      pointer-events: none;
      top: 52px;
    }
    .hrv-switch-track[data-on=true] .hrv-switch-knob {
      top: 4px;
    }

    .hrv-switch-ro {
      font-size: 28px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      text-align: center;
      padding: 28px 0 32px;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-switch-knob,
      .hrv-switch-track { transition: none; }
    }
  `;class Fr extends m{constructor(){super(...arguments);r(this,_t,null);r(this,oi,null);r(this,me,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Gs}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e?`
              <button class="hrv-switch-track" type="button" data-on="false"
                title="Toggle" aria-label="${h(this.def.friendly_name)} - Toggle">
                <div class="hrv-switch-knob"></div>
              </button>
            `:`
              <div class="hrv-switch-ro" title="Read-only">-</div>
            `}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,_t,this.root.querySelector(".hrv-switch-track")),s(this,oi,this.root.querySelector(".hrv-switch-ro")),t(this,_t)&&e&&t(this,_t).addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),this.renderCompanions(),X(this.root)}applyState(e,i){s(this,me,e==="on");const n=e==="unavailable"||e==="unknown";t(this,_t)&&(t(this,_t).setAttribute("data-on",String(t(this,me))),t(this,_t).title=t(this,me)?"On - click to turn off":"Off - click to turn on",t(this,_t).disabled=n),t(this,oi)&&(t(this,oi).textContent=we(e)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,me)?"off":"on",attributes:{}}}}_t=new WeakMap,oi=new WeakMap,me=new WeakMap;const Xs=`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-timer-display {
      font-size: 48px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    .hrv-timer-display[data-paused=true] {
      opacity: 0.6;
    }

    .hrv-timer-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
    }
    .hrv-timer-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 50%;
      background: var(--hrv-color-primary, #1976d2);
      color: var(--hrv-color-on-primary, #fff);
      cursor: pointer;
      padding: 0;
      box-shadow: none;
      transition: box-shadow 150ms ease, opacity 150ms ease;
    }
    .hrv-timer-btn:hover { opacity: 0.85; }
    .hrv-timer-btn:active,
    .hrv-timer-btn[data-pressing=true] {
      box-shadow: 0 0 0 3px var(--hrv-ex-ring, #fff);
    }
    .hrv-timer-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-timer-btn:disabled:hover { opacity: 0.35; }
    .hrv-timer-btn svg { width: 20px; height: 20px; }
    .hrv-timer-btn [part] {
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-timer-btn { transition: none; }
    }
  `;function Oi(c){c<0&&(c=0);const p=Math.floor(c/3600),e=Math.floor(c%3600/60),i=Math.floor(c%60),n=a=>String(a).padStart(2,"0");return p>0?`${p}:${n(e)}:${n(i)}`:`${n(e)}:${n(i)}`}function Nr(c){if(typeof c=="number")return c;if(typeof c!="string")return 0;const p=c.split(":").map(Number);return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:p[0]||0}class Ks extends m{constructor(){super(...arguments);r(this,ur);r(this,vr);r(this,fr);r(this,be);r(this,J,null);r(this,Pt,null);r(this,Wt,null);r(this,Ut,null);r(this,ge,null);r(this,di,"idle");r(this,hi,{});r(this,rt,null);r(this,li,null)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Xs}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-timer-display" title="Time remaining">00:00</span>
            ${e?`
              <div class="hrv-timer-controls">
                <button class="hrv-timer-btn" data-action="playpause" type="button"
                  title="Start" aria-label="${h(this.def.friendly_name)} - Start">
                  <span part="playpause-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="cancel" type="button"
                  title="Cancel" aria-label="${h(this.def.friendly_name)} - Cancel">
                  <span part="cancel-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="finish" type="button"
                  title="Finish" aria-label="${h(this.def.friendly_name)} - Finish">
                  <span part="finish-icon" aria-hidden="true"></span>
                </button>
              </div>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,J,this.root.querySelector(".hrv-timer-display")),s(this,Pt,this.root.querySelector("[data-action=playpause]")),s(this,Wt,this.root.querySelector("[data-action=cancel]")),s(this,Ut,this.root.querySelector("[data-action=finish]")),this.renderIcon("mdi:play","playpause-icon"),this.renderIcon("mdi:stop","cancel-icon"),this.renderIcon("mdi:check-circle","finish-icon"),e&&(t(this,Pt)?.addEventListener("click",()=>{const i=t(this,di)==="active"?"pause":"start";this.config.card?.sendCommand(i,{})}),t(this,Wt)?.addEventListener("click",()=>{this.config.card?.sendCommand("cancel",{})}),t(this,Ut)?.addEventListener("click",()=>{this.config.card?.sendCommand("finish",{})}),[t(this,Pt),t(this,Wt),t(this,Ut)].forEach(i=>{i&&(i.addEventListener("pointerdown",()=>i.setAttribute("data-pressing","true")),i.addEventListener("pointerup",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointerleave",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointercancel",()=>i.removeAttribute("data-pressing")))})),this.renderCompanions(),X(this.root)}applyState(e,i){s(this,di,e),s(this,hi,{...i}),s(this,rt,i.finishes_at??null),s(this,li,i.remaining!=null?Nr(i.remaining):null),o(this,ur,vs).call(this,e),o(this,vr,fs).call(this,e),e==="active"&&t(this,rt)?o(this,fr,ms).call(this):o(this,be,Ri).call(this),t(this,J)&&t(this,J).setAttribute("data-paused",String(e==="paused"))}predictState(e,i){const n={...t(this,hi)};return e==="start"?{state:"active",attributes:n}:e==="pause"?(t(this,rt)&&(n.remaining=Math.max(0,(new Date(t(this,rt)).getTime()-Date.now())/1e3)),{state:"paused",attributes:n}):e==="cancel"||e==="finish"?{state:"idle",attributes:n}:null}}J=new WeakMap,Pt=new WeakMap,Wt=new WeakMap,Ut=new WeakMap,ge=new WeakMap,di=new WeakMap,hi=new WeakMap,rt=new WeakMap,li=new WeakMap,ur=new WeakSet,vs=function(e){const i=e==="idle",n=e==="active";if(t(this,Pt)){const a=n?"mdi:pause":"mdi:play",d=n?"Pause":e==="paused"?"Resume":"Start";this.renderIcon(a,"playpause-icon"),t(this,Pt).title=d,t(this,Pt).setAttribute("aria-label",`${this.def.friendly_name} - ${d}`)}t(this,Wt)&&(t(this,Wt).disabled=i),t(this,Ut)&&(t(this,Ut).disabled=i),this.announceState(`${this.def.friendly_name}, ${e}`)},vr=new WeakSet,fs=function(e){if(t(this,J)){if(e==="idle"){const i=t(this,hi).duration;t(this,J).textContent=i?Oi(Nr(i)):"00:00";return}if(e==="paused"&&t(this,li)!=null){t(this,J).textContent=Oi(t(this,li));return}if(e==="active"&&t(this,rt)){const i=Math.max(0,(new Date(t(this,rt)).getTime()-Date.now())/1e3);t(this,J).textContent=Oi(i)}}},fr=new WeakSet,ms=function(){o(this,be,Ri).call(this),s(this,ge,setInterval(()=>{if(!t(this,rt)||t(this,di)!=="active"){o(this,be,Ri).call(this);return}const e=Math.max(0,(new Date(t(this,rt)).getTime()-Date.now())/1e3);t(this,J)&&(t(this,J).textContent=Oi(e)),e<=0&&o(this,be,Ri).call(this)},1e3))},be=new WeakSet,Ri=function(){t(this,ge)&&(clearInterval(t(this,ge)),s(this,ge,null))};const Js=`
    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: var(--hrv-spacing-m, 16px) 0;
    }

    .hrv-generic-state {
      font-size: 28px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      text-align: center;
    }

    button.hrv-generic-toggle {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      position: relative;
      width: 44px;
      height: 88px;
      border-radius: 22px;
      background: var(--hrv-color-surface-alt, rgba(255,255,255,0.15));
      cursor: pointer;
      border: 2px solid var(--hrv-ex-outline, rgba(255,255,255,0.3));
      padding: 0;
      margin: 0;
      outline: none;
      font: inherit;
      color: inherit;
      transition: background 250ms ease, border-color 250ms ease;
      user-select: none;
      box-sizing: border-box;
    }
    .hrv-generic-toggle:focus-visible {
      box-shadow: 0 0 0 3px var(--hrv-color-primary, #1976d2);
    }
    .hrv-generic-toggle[data-on=true] {
      background: var(--hrv-color-primary, #1976d2);
      border-color: var(--hrv-color-primary, #1976d2);
    }
    .hrv-generic-toggle:hover { opacity: 0.85; }
    .hrv-generic-toggle:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .hrv-generic-toggle:disabled:hover { opacity: 0.4; }

    .hrv-generic-knob {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--hrv-ex-thumb, #fff);
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      transition: top 200ms ease;
      pointer-events: none;
      top: 48px;
    }
    .hrv-generic-toggle[data-on=true] .hrv-generic-knob {
      top: 4px;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-generic-knob,
      .hrv-generic-toggle { transition: none; }
    }
  `;class Qs extends m{constructor(){super(...arguments);r(this,ci,null);r(this,St,null);r(this,ye,!1);r(this,xe,!1)}render(){const e=this.def.capabilities==="read-write";s(this,xe,!1),this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Js}${Q}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-generic-state" title="${h(this.def.friendly_name)}">-</span>
            ${e?`
              <button class="hrv-generic-toggle" type="button" data-on="false"
                title="Toggle" aria-label="${h(this.def.friendly_name)} - Toggle"
                hidden>
                <div class="hrv-generic-knob"></div>
              </button>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,s(this,ci,this.root.querySelector(".hrv-generic-state")),s(this,St,this.root.querySelector(".hrv-generic-toggle")),t(this,St)&&e&&t(this,St).addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),this.renderCompanions(),X(this.root)}applyState(e,i){const n=e==="on"||e==="off";s(this,ye,e==="on"),t(this,ci)&&(t(this,ci).textContent=we(e)),t(this,St)&&(n&&!t(this,xe)&&(t(this,St).removeAttribute("hidden"),s(this,xe,!0)),t(this,xe)&&(t(this,St).setAttribute("data-on",String(t(this,ye))),t(this,St).title=t(this,ye)?"On - click to turn off":"Off - click to turn on")),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,ye)?"off":"on",attributes:{}}}}ci=new WeakMap,St=new WeakMap,ye=new WeakMap,xe=new WeakMap,g._packs=g._packs||{};const tn=window.__HARVEST_PACK_ID__||"minimus";g._packs[tn]={light:$s,fan:Cs,climate:Es,harvest_action:Ts,binary_sensor:Hs,cover:Bs,input_boolean:Fr,input_number:js,input_select:Fs,media_player:Vs,remote:Zs,sensor:Us,switch:Fr,timer:Ks,generic:Qs}})();})();
