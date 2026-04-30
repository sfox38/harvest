(()=>{var Lr=(m,g,d)=>{if(!g.has(m))throw TypeError("Cannot "+d)};var t=(m,g,d)=>(Lr(m,g,"read from private field"),d?d.call(m):g.get(m)),r=(m,g,d)=>{if(g.has(m))throw TypeError("Cannot add the same private member more than once");g instanceof WeakSet?g.add(m):g.set(m,d)},n=(m,g,d,It)=>(Lr(m,g,"write to private field"),It?It.call(m,d):g.set(m,d),d);var o=(m,g,d)=>(Lr(m,g,"access private method"),d);(function(){"use strict";var Pt,A,fi,I,rt,w,V,we,_e,st,_t,nt,at,Wt,Se,G,ot,Ut,gi,$e,Cr,rn,_,Fi,Vr,Ni,Gr,Vi,Yr,Gi,Zr,ke,gr,Ce,mr,Yi,Wr,Xt,zi,Zi,Ur,Wi,Xr,mi,Mr,bi,Ar,Ui,Kr,J,R,Xi,P,Le,j,ht,dt,lt,D,S,Dt,St,z,E,Kt,Me,yi,Ae,br,Jt,Bi,xi,Er,Ee,yr,wi,Tr,_i,qr,zt,pi,Ki,Jr,Ji,Qr,Si,Hr,$i,Ir,Qi,ts,ki,Pr,tr,es,Y,$t,ct,Te,Bt,qe,He,Ie,O,F,Pe,De,ze,Be,kt,Re,Qt,N,pt,je,Oe,Fe,ut,Rt,te,Ne,Ve,Ge,Ye,Ze,Ci,We,Li,Dr,er,is,ir,rs,Ue,xr,Mi,zr,Xe,wr,rr,ss,sr,ns,Ai,Br,Ei,Rr,nr,as,ar,os,vt,ee,ie,ft,C,re,se,ne,Ct,gt,Ti,qi,Hi,Ke,_r,or,hs,ae,Lt,T,H,Je,jt,Ot,Mt,q,Z,Q,At,Ft,hr,ds,dr,ls,Nt,ui,Qe,Sr,lr,cs,Vt,vi,ti,mt,Ii,Et,oe,cr,ps,Pi,jr,Tt,ei,ii,he,de,bt,L,le,ce,pe,yt,qt,Di,ri,$r,pr,us,si,ni,ai,xt,oi,ue,U,Ht,Gt,Yt,ve,hi,di,tt,li,ur,vs,vr,fs,fr,gs,fe,Ri,ci,wt,ge,me;const m=window.HArvest;if(!m||!m.renderers||!m.renderers.BaseCard){console.warn("[HArvest Minimus] HArvest not found - pack not loaded.");return}const g=m.renderers.BaseCard;function d(c){return String(c??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function It(c,u){let e=null;return function(...i){e&&clearTimeout(e),e=setTimeout(()=>{e=null,c.apply(this,i)},u)}}function be(c){return c?c.charAt(0).toUpperCase()+c.slice(1).replace(/_/g," "):""}const X=`
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
  `;function W(c){c.querySelectorAll("[part=companion]").forEach(u=>{u.title=u.getAttribute("aria-label")??""})}const ms=60,bs=60,Zt=48,B=225,b=270,it=2*Math.PI*Zt*(b/360);function ys(c){return c*Math.PI/180}function K(c){const u=ys(c);return{x:ms+Zt*Math.cos(u),y:bs-Zt*Math.sin(u)}}function xs(){const c=K(B),u=K(B-b);return`M ${c.x} ${c.y} A ${Zt} ${Zt} 0 1 1 ${u.x} ${u.y}`}const ye=xs(),xe=["brightness","temp","color"],ji=120;function Or(c){const u=b/ji;let e="";for(let i=0;i<ji;i++){const s=B-i*u,a=B-(i+1)*u,h=K(s),l=K(a),p=`M ${h.x} ${h.y} A ${Zt} ${Zt} 0 0 1 ${l.x} ${l.y}`,v=i===0||i===ji-1?"round":"butt";e+=`<path d="${p}" stroke="${c(i/ji)}" fill="none" stroke-width="8" stroke-linecap="${v}" />`}return e}const ws=Or(c=>`hsl(${Math.round(c*360)},100%,50%)`),_s=Or(c=>{const e=Math.round(143+112*c),i=Math.round(255*c);return`rgb(255,${e},${i})`}),kr=`
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
      touch-action: none;
      cursor: grab;
    }
    .hrv-dial-wrap:active { cursor: grabbing; }
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
      width: 36px;
      height: 84px;
      background: var(--hrv-color-surface-alt, #e0e0e0);
      border-radius: 18px;
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
      left: 6px;
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
      left: 15px;
      opacity: 0.4;
    }

    .hrv-mode-dot:nth-child(2) { top: 11px; }
    .hrv-mode-dot:nth-child(3) { top: 39px; }
    .hrv-mode-dot:nth-child(4) { top: 67px; }

    .hrv-mode-switch[data-pos="0"] .hrv-mode-dot:nth-child(2),
    .hrv-mode-switch[data-pos="1"] .hrv-mode-dot:nth-child(3),
    .hrv-mode-switch[data-pos="2"] .hrv-mode-dot:nth-child(4) { opacity: 0; }

    [part=toggle-button] {
      width: 44px;
      height: 44px;
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
  `;class $s extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,Cr);r(this,Fi);r(this,Ni);r(this,Vi);r(this,Gi);r(this,ke);r(this,Ce);r(this,Yi);r(this,Xt);r(this,Zi);r(this,Wi);r(this,mi);r(this,bi);r(this,Ui);r(this,Pt,null);r(this,A,null);r(this,fi,null);r(this,I,null);r(this,rt,null);r(this,w,null);r(this,V,null);r(this,we,null);r(this,_e,null);r(this,st,0);r(this,_t,4e3);r(this,nt,0);r(this,at,!1);r(this,Wt,!1);r(this,Se,null);r(this,G,0);r(this,ot,2e3);r(this,Ut,6500);r(this,gi,void 0);r(this,$e,new Map);r(this,_,[]);n(this,gi,It(o(this,Ui,Kr).bind(this),300))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=i.includes("brightness"),a=i.includes("color_temp"),h=i.includes("rgb_color"),l=e&&(s||a||h),p=[s,a,h].filter(Boolean).length,v=e&&p>1;n(this,ot,this.def.feature_config?.min_color_temp_kelvin??2e3),n(this,Ut,this.def.feature_config?.max_color_temp_kelvin??6500);const x=K(B);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${kr}${Ss}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${l?"":"hrv-no-dial"}">
            ${l?`
              <div class="hrv-dial-column">
                <div class="hrv-dial-wrap" role="slider" aria-valuemin="0"
                  aria-valuemax="100" aria-valuenow="0"
                  aria-label="${d(this.def.friendly_name)} brightness"
                  title="Drag to adjust">
                  <svg viewBox="0 0 120 120">
                    <g class="hrv-dial-segs hrv-dial-segs-color">${ws}</g>
                    <g class="hrv-dial-segs hrv-dial-segs-temp">${_s}</g>
                    <path class="hrv-dial-track" d="${ye}" />
                    <path class="hrv-dial-fill" d="${ye}"
                      stroke-dasharray="${it}"
                      stroke-dashoffset="${it}" />
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
                  role="img" aria-label="${d(this.def.friendly_name)}"
                  title="Read-only">
                  <span part="ro-state-icon" aria-hidden="true"></span>
                </div>
                <div class="hrv-light-ro-dots">
                  ${s?'<span class="hrv-light-ro-dot" data-attr="brightness" title="Brightness"></span>':""}
                  ${a?'<span class="hrv-light-ro-dot" data-attr="temp" title="Color temperature"></span>':""}
                  ${h?'<span class="hrv-light-ro-dot" data-attr="color" title="Color"></span>':""}
                </div>
              </div>
            `}
            ${e?`
              <div class="hrv-dial-controls">
                ${v?`
                  <div class="hrv-mode-switch" data-pos="0" data-count="${p}"
                    role="radiogroup" aria-label="Dial mode" tabindex="0">
                    <div class="hrv-mode-switch-thumb"></div>
                    ${'<span class="hrv-mode-dot"></span>'.repeat(p)}
                  </div>
                `:""}
                <button part="toggle-button" type="button"
                  aria-label="${d(this.def.friendly_name)} - toggle"
                  title="Turn ${d(this.def.friendly_name)} on / off">
                  <div class="hrv-light-toggle-knob"></div>
                </button>
              </div>
            `:""}
          </div>
          ${l?"":this.renderCompanionZoneHTML()}
        </div>
      `,n(this,Pt,this.root.querySelector("[part=toggle-button]")),n(this,A,this.root.querySelector(".hrv-dial-fill")),n(this,fi,this.root.querySelector(".hrv-dial-track")),n(this,I,this.root.querySelector(".hrv-dial-thumb")),n(this,rt,this.root.querySelector(".hrv-dial-pct")),n(this,w,this.root.querySelector(".hrv-dial-wrap")),n(this,Se,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,we,this.root.querySelector(".hrv-dial-segs-color")),n(this,_e,this.root.querySelector(".hrv-dial-segs-temp")),n(this,V,this.root.querySelector(".hrv-mode-switch")),t(this,Pt)&&this._attachGestureHandlers(t(this,Pt),{onTap:()=>{const $=this.config.gestureConfig?.tap;if($){this._runAction($);return}this.config.card?.sendCommand("toggle",{})}}),t(this,w)&&(t(this,w).addEventListener("pointerdown",o(this,Zi,Ur).bind(this)),t(this,w).addEventListener("pointermove",o(this,Wi,Xr).bind(this)),t(this,w).addEventListener("pointerup",o(this,mi,Mr).bind(this)),t(this,w).addEventListener("pointercancel",o(this,mi,Mr).bind(this))),l&&o(this,Fi,Vr).call(this),t(this,V)&&(t(this,V).addEventListener("click",o(this,Ni,Gr).bind(this)),t(this,V).addEventListener("keydown",o(this,Gi,Zr).bind(this)),t(this,V).addEventListener("mousemove",o(this,Vi,Yr).bind(this))),o(this,Ce,mr).call(this),this.root.querySelector("[part=ro-state-icon]")&&this.renderIcon(this.resolveIcon(this.def.icon,"mdi:lightbulb"),"ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach($=>{$.title=$.getAttribute("aria-label")??"Companion";const M=$.getAttribute("data-entity");if(M&&t(this,$e).has(M)){const k=t(this,$e).get(M);$.setAttribute("data-on",String(k==="on"))}})}applyState(e,i){if(n(this,at,e==="on"),n(this,st,i?.brightness??0),i?.color_temp_kelvin!==void 0?n(this,_t,i.color_temp_kelvin):i?.color_temp!==void 0&&i.color_temp>0&&n(this,_t,Math.round(1e6/i.color_temp)),i?.hs_color)n(this,nt,Math.round(i.hs_color[0]));else if(i?.rgb_color){const[a,h,l]=i.rgb_color;n(this,nt,Ls(a,h,l))}t(this,Pt)&&t(this,Pt).setAttribute("aria-pressed",String(t(this,at)));const s=this.root.querySelector(".hrv-light-ro-circle");if(s){s.setAttribute("data-on",String(t(this,at)));const a=t(this,at)?"mdi:lightbulb":"mdi:lightbulb-outline",h=this.def.icon_state_map?.[e]??this.def.icon_state_map?.["*"]??this.def.icon??a;this.renderIcon(this.resolveIcon(h,a),"ro-state-icon");const l=i?.color_mode,p=l==="color_temp",v=l&&l!=="color_temp",x=this.root.querySelector('[data-attr="brightness"]');if(x){const k=Math.round(t(this,st)/255*100);x.title=t(this,at)?`Brightness: ${k}%`:"Brightness: off"}const $=this.root.querySelector('[data-attr="temp"]');$&&($.title=`Color temperature: ${t(this,_t)}K`,$.style.display=v?"none":"");const M=this.root.querySelector('[data-attr="color"]');if(M)if(M.style.display=p?"none":"",i?.rgb_color){const[k,f,y]=i.rgb_color;M.style.background=`rgb(${k},${f},${y})`,M.title=`Color: rgb(${k}, ${f}, ${y})`}else M.style.background=`hsl(${t(this,nt)}, 100%, 50%)`,M.title=`Color: hue ${t(this,nt)}°`}o(this,ke,gr).call(this)}predictState(e,i){return e==="toggle"?{state:t(this,at)?"off":"on",attributes:{brightness:t(this,st)}}:e==="turn_on"&&i.brightness!==void 0?{state:"on",attributes:{brightness:i.brightness}}:null}updateCompanionState(e,i,s){t(this,$e).set(e,i),super.updateCompanionState(e,i,s)}}Pt=new WeakMap,A=new WeakMap,fi=new WeakMap,I=new WeakMap,rt=new WeakMap,w=new WeakMap,V=new WeakMap,we=new WeakMap,_e=new WeakMap,st=new WeakMap,_t=new WeakMap,nt=new WeakMap,at=new WeakMap,Wt=new WeakMap,Se=new WeakMap,G=new WeakMap,ot=new WeakMap,Ut=new WeakMap,gi=new WeakMap,$e=new WeakMap,Cr=new WeakSet,rn=function(){const e=this.def.supported_features??[],i=[];return e.includes("brightness")&&i.push("brightness"),e.includes("color_temp")&&i.push("temp"),e.includes("rgb_color")&&i.push("color"),i.length>0?i:["brightness"]},_=new WeakMap,Fi=new WeakSet,Vr=function(){const e=this.def.supported_features??[],i=[e.includes("brightness"),e.includes("color_temp"),e.includes("rgb_color")];n(this,_,[]),i[0]&&t(this,_).push(0),i[1]&&t(this,_).push(1),i[2]&&t(this,_).push(2),t(this,_).length===0&&t(this,_).push(0),t(this,_).includes(t(this,G))||n(this,G,t(this,_)[0])},Ni=new WeakSet,Gr=function(e){const i=t(this,V).getBoundingClientRect(),s=e.clientY-i.top,a=i.height/3;let h;s<a?h=0:s<a*2?h=1:h=2,h=Math.min(h,t(this,_).length-1),n(this,G,t(this,_)[h]),t(this,V).setAttribute("data-pos",String(h)),o(this,Ce,mr).call(this),o(this,ke,gr).call(this)},Vi=new WeakSet,Yr=function(e){const i={brightness:"Brightness",temp:"Color Temperature",color:"Color"},s=t(this,V).getBoundingClientRect(),a=Math.min(Math.floor((e.clientY-s.top)/(s.height/t(this,_).length)),t(this,_).length-1),h=xe[t(this,_)[Math.max(0,a)]];t(this,V).title=`Dial mode: ${i[h]??h}`},Gi=new WeakSet,Zr=function(e){const i=t(this,_).indexOf(t(this,G));let s=i;if(e.key==="ArrowUp"||e.key==="ArrowLeft")s=Math.max(0,i-1);else if(e.key==="ArrowDown"||e.key==="ArrowRight")s=Math.min(t(this,_).length-1,i+1);else return;e.preventDefault(),n(this,G,t(this,_)[s]),t(this,V).setAttribute("data-pos",String(s)),o(this,Ce,mr).call(this),o(this,ke,gr).call(this)},ke=new WeakSet,gr=function(){t(this,I)&&(t(this,I).style.transition="none"),t(this,A)&&(t(this,A).style.transition="none"),o(this,Yi,Wr).call(this),t(this,I)?.getBoundingClientRect(),t(this,A)?.getBoundingClientRect(),t(this,I)&&(t(this,I).style.transition=""),t(this,A)&&(t(this,A).style.transition="")},Ce=new WeakSet,mr=function(){if(!t(this,A))return;const e=xe[t(this,G)],i=e==="color"||e==="temp";t(this,fi).style.display=i?"none":"",t(this,A).style.display=i?"none":"",t(this,we)&&t(this,we).classList.toggle("hrv-dial-segs-visible",e==="color"),t(this,_e)&&t(this,_e).classList.toggle("hrv-dial-segs-visible",e==="temp"),e==="brightness"&&t(this,A).setAttribute("stroke-dasharray",String(it));const s={brightness:"brightness",temp:"color temperature",color:"color"},a={brightness:"Drag to adjust brightness",temp:"Drag to adjust color temperature",color:"Drag to adjust color"};t(this,w)?.setAttribute("aria-label",`${d(this.def.friendly_name)} ${s[e]}`),t(this,w)&&(t(this,w).title=a[e])},Yi=new WeakSet,Wr=function(){const e=xe[t(this,G)];if(e==="brightness"){const i=t(this,at)?t(this,st):0;o(this,Xt,zi).call(this,Math.round(i/255*100))}else if(e==="temp"){const i=Math.round((t(this,_t)-t(this,ot))/(t(this,Ut)-t(this,ot))*100);o(this,Xt,zi).call(this,Math.max(0,Math.min(100,i)))}else{const i=Math.round(t(this,nt)/360*100);o(this,Xt,zi).call(this,i)}},Xt=new WeakSet,zi=function(e){const i=xe[t(this,G)],s=e/100*b,a=K(B-s);if(t(this,I)?.setAttribute("cx",String(a.x)),t(this,I)?.setAttribute("cy",String(a.y)),t(this,Se)?.setAttribute("cx",String(a.x)),t(this,Se)?.setAttribute("cy",String(a.y)),i==="brightness"){const h=it*(1-e/100);t(this,A)?.setAttribute("stroke-dashoffset",String(h)),t(this,rt)&&(t(this,rt).textContent=e+"%"),t(this,w)?.setAttribute("aria-valuenow",String(e))}else if(i==="temp"){const h=Math.round(t(this,ot)+e/100*(t(this,Ut)-t(this,ot)));t(this,rt)&&(t(this,rt).textContent=h+"K"),t(this,w)?.setAttribute("aria-valuenow",String(h))}else t(this,rt)&&(t(this,rt).textContent=Math.round(e/100*360)+"°"),t(this,w)?.setAttribute("aria-valuenow",String(Math.round(e/100*360)))},Zi=new WeakSet,Ur=function(e){n(this,Wt,!0),t(this,w)?.setPointerCapture(e.pointerId),o(this,bi,Ar).call(this,e)},Wi=new WeakSet,Xr=function(e){t(this,Wt)&&o(this,bi,Ar).call(this,e)},mi=new WeakSet,Mr=function(e){if(t(this,Wt)){n(this,Wt,!1);try{t(this,w)?.releasePointerCapture(e.pointerId)}catch{}t(this,gi).call(this)}},bi=new WeakSet,Ar=function(e){if(!t(this,w))return;const i=t(this,w).getBoundingClientRect(),s=i.left+i.width/2,a=i.top+i.height/2,h=e.clientX-s,l=-(e.clientY-a);let p=Math.atan2(l,h)*180/Math.PI;p<0&&(p+=360);let v=B-p;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b);const x=Math.round(v/b*100),$=xe[t(this,G)];$==="brightness"?n(this,st,Math.round(x/100*255)):$==="temp"?n(this,_t,Math.round(t(this,ot)+x/100*(t(this,Ut)-t(this,ot)))):n(this,nt,Math.round(x/100*360)),t(this,A)&&(t(this,A).style.transition="none"),t(this,I)&&(t(this,I).style.transition="none"),o(this,Xt,zi).call(this,x)},Ui=new WeakSet,Kr=function(){t(this,A)&&(t(this,A).style.transition=""),t(this,I)&&(t(this,I).style.transition="");const e=xe[t(this,G)];e==="brightness"?t(this,st)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("turn_on",{brightness:t(this,st)}):e==="temp"?this.config.card?.sendCommand("turn_on",{color_temp_kelvin:t(this,_t)}):this.config.card?.sendCommand("turn_on",{hs_color:[t(this,nt),100]})};const ks=kr+`
    .hrv-fan-feat-btn {
      width: 40px;
      height: 40px;
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
  `;class Cs extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,Ae);r(this,Jt);r(this,xi);r(this,Ee);r(this,wi);r(this,_i);r(this,zt);r(this,Ki);r(this,Ji);r(this,Si);r(this,$i);r(this,Qi);r(this,ki);r(this,tr);r(this,J,null);r(this,R,null);r(this,Xi,null);r(this,P,null);r(this,Le,null);r(this,j,null);r(this,ht,null);r(this,dt,null);r(this,lt,null);r(this,D,!1);r(this,S,0);r(this,Dt,!1);r(this,St,"forward");r(this,z,null);r(this,E,[]);r(this,Kt,!1);r(this,Me,null);r(this,yi,void 0);n(this,yi,It(o(this,Qi,ts).bind(this),300)),n(this,E,e.feature_config?.preset_modes??[])}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=i.includes("set_speed"),a=i.includes("oscillate"),h=i.includes("direction"),l=i.includes("preset_mode"),p=e&&s,v=p&&t(this,Jt,Bi),x=v&&!t(this,E).length,$=v&&!!t(this,E).length,M=K(B);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${ks}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${p?x?"hrv-fan-horiz":"":"hrv-no-dial"}">
            ${p?`
              <div class="hrv-dial-column">
                ${x?`
                  <div class="hrv-fan-hspeed-wrap">
                    <div class="hrv-fan-hspeed-switch" role="group"
                      aria-label="${d(this.def.friendly_name)} speed"
                      data-on="false">
                      <div class="hrv-fan-hspeed-thumb"></div>
                      ${t(this,Ee,yr).map((f,y)=>`
                        <div class="hrv-fan-hspeed-dot" data-pct="${f}" data-idx="${y}"
                          data-active="false"
                          role="button" tabindex="0"
                          aria-label="Speed ${y+1} (${f}%)"
                          title="Speed ${y+1} (${f}%)"></div>
                      `).join("")}
                    </div>
                  </div>
                `:$?`
                  <div class="hrv-fan-stepped-wrap">
                    <button class="hrv-fan-speed-circle" part="speed-circle" type="button"
                      aria-pressed="false"
                      title="Click to increase fan speed"
                      aria-label="Click to increase fan speed"><svg class="hrv-fan-speed-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13,19C13,17.59 13.5,16.3 14.3,15.28C14.17,14.97 14.03,14.65 13.86,14.34C14.26,14 14.57,13.59 14.77,13.11C15.26,13.21 15.78,13.39 16.25,13.67C17.07,13.25 18,13 19,13C20.05,13 21.03,13.27 21.89,13.74C21.95,13.37 22,12.96 22,12.5C22,8.92 18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11,9.22C13.3,8.29 13.74,7.24 14.73,6.75C17.09,5.57 17,2 12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4,10.39 9.21,10.87C8.28,10.68 7.23,10.25 6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 10.88,14.79C10.68,15.71 10.24,16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13,21.78 13.5,21.41C13.19,20.67 13,19.86 13,19M20,15V18H23V20H20V23H18V20H15V18H18V15H20Z"/></svg></button>
                  </div>
                `:`
                  <div class="hrv-dial-wrap" role="slider"
                    aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                    aria-label="${d(this.def.friendly_name)} speed"
                    title="Drag to adjust fan speed">
                    <svg viewBox="0 0 120 120">
                      <path class="hrv-dial-track" d="${ye}" />
                      <path class="hrv-dial-fill" d="${ye}"
                        stroke-dasharray="${it}"
                        stroke-dashoffset="${it}" />
                      <circle class="hrv-dial-thumb" r="7"
                        cx="${M.x}" cy="${M.y}" />
                      <circle class="hrv-dial-thumb-hit" r="16"
                        cx="${M.x}" cy="${M.y}" />
                    </svg>
                    <span class="hrv-dial-pct">0%</span>
                  </div>
                `}
                <div part="companion-zone" role="group" aria-label="Companions"></div>
              </div>
            `:e?"":`
              <div class="hrv-fan-ro-center">
                <div class="hrv-fan-ro-circle" data-on="false"
                  role="img" aria-label="${d(this.def.friendly_name)}"
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
                ${h?`
                  <button class="hrv-fan-feat-btn" data-feat="direction" type="button"
                    aria-label="Direction: forward" title="Direction: forward"></button>
                `:""}
                ${l?`
                  <button class="hrv-fan-feat-btn" data-feat="preset" type="button"
                    aria-label="Preset: none" title="Preset: none"></button>
                `:""}
                <button part="toggle-button" type="button"
                  aria-label="${d(this.def.friendly_name)} - toggle"
                  title="Turn ${d(this.def.friendly_name)} on / off">${p?"":'<span part="fan-onoff-icon" aria-hidden="true"></span>'}</button>
              </div>
            `:""}
          </div>
          ${p?"":this.renderCompanionZoneHTML()}
        </div>
      `,n(this,J,this.root.querySelector("[part=toggle-button]")),n(this,R,this.root.querySelector(".hrv-dial-fill")),n(this,Xi,this.root.querySelector(".hrv-dial-track")),n(this,P,this.root.querySelector(".hrv-dial-thumb")),n(this,Le,this.root.querySelector(".hrv-dial-pct")),n(this,j,this.root.querySelector(".hrv-dial-wrap")),n(this,Me,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,ht,this.root.querySelector('[data-feat="oscillate"]')),n(this,dt,this.root.querySelector('[data-feat="direction"]')),n(this,lt,this.root.querySelector('[data-feat="preset"]')),t(this,J)&&!p&&(this.renderIcon(this.def.icon??"mdi:fan","fan-onoff-icon"),t(this,J).setAttribute("data-animate",String(!!this.config.animate))),this._attachGestureHandlers(t(this,J),{onTap:()=>{const f=this.config.gestureConfig?.tap;if(f){this._runAction(f);return}this.config.card?.sendCommand("toggle",{})}}),t(this,j)&&(t(this,j).addEventListener("pointerdown",o(this,Ki,Jr).bind(this)),t(this,j).addEventListener("pointermove",o(this,Ji,Qr).bind(this)),t(this,j).addEventListener("pointerup",o(this,Si,Hr).bind(this)),t(this,j).addEventListener("pointercancel",o(this,Si,Hr).bind(this))),this.root.querySelector(".hrv-fan-speed-circle")?.addEventListener("click",()=>{const f=t(this,Ee,yr);if(!f.length)return;let y;if(!t(this,D)||t(this,S)===0)y=f[0],n(this,D,!0),t(this,J)?.setAttribute("aria-pressed","true");else{const et=f.findIndex(en=>en>t(this,S));y=et===-1?f[0]:f[et]}n(this,S,y),o(this,wi,Tr).call(this),this.config.card?.sendCommand("set_percentage",{percentage:y})}),this.root.querySelectorAll(".hrv-fan-hspeed-dot").forEach(f=>{const y=()=>{const et=Number(f.getAttribute("data-pct"));t(this,D)||(n(this,D,!0),t(this,J)?.setAttribute("aria-pressed","true")),n(this,S,et),o(this,_i,qr).call(this),this.config.card?.sendCommand("set_percentage",{percentage:et})};f.addEventListener("click",y),f.addEventListener("keydown",et=>{(et.key==="Enter"||et.key===" ")&&(et.preventDefault(),y())})}),t(this,ht)?.addEventListener("click",()=>{this.config.card?.sendCommand("oscillate",{oscillating:!t(this,Dt)})}),t(this,dt)?.addEventListener("click",()=>{const f=t(this,St)==="forward"?"reverse":"forward";n(this,St,f),o(this,zt,pi).call(this),this.config.card?.sendCommand("set_direction",{direction:f})}),t(this,lt)?.addEventListener("click",()=>{if(t(this,E).length){if(t(this,xi,Er)){const f=t(this,z)??t(this,E)[0];this.config.card?.sendCommand("set_preset_mode",{preset_mode:f});return}if(t(this,z)){const f=t(this,E).indexOf(t(this,z));if(f===-1||f===t(this,E).length-1){n(this,z,null),o(this,zt,pi).call(this);const y=t(this,Ae,br),et=Math.floor(t(this,S)/y)*y||y;this.config.card?.sendCommand("set_percentage",{percentage:et})}else{const y=t(this,E)[f+1];n(this,z,y),o(this,zt,pi).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:y})}}else{const f=t(this,E)[0];n(this,z,f),o(this,zt,pi).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:f})}}}),this.root.querySelector(".hrv-fan-ro-circle")&&this.renderIcon(this.def.icon??"mdi:fan","ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach(f=>{f.title=f.getAttribute("aria-label")??"Companion"})}applyState(e,i){n(this,D,e==="on"),n(this,S,i?.percentage??0),n(this,Dt,i?.oscillating??!1),n(this,St,i?.direction??"forward"),n(this,z,i?.preset_mode??null),i?.preset_modes?.length&&n(this,E,i.preset_modes),t(this,J)&&t(this,J).setAttribute("aria-pressed",String(t(this,D)));const s=this.root.querySelector(".hrv-fan-ro-circle");s&&s.setAttribute("data-on",String(t(this,D))),t(this,Jt,Bi)&&!t(this,E).length?o(this,_i,qr).call(this):t(this,Jt,Bi)?o(this,wi,Tr).call(this):o(this,tr,es).call(this),o(this,zt,pi).call(this),this.announceState(`${this.def.friendly_name}, ${e}`+(t(this,S)>0?`, ${t(this,S)}%`:""))}predictState(e,i){return e==="toggle"?{state:t(this,D)?"off":"on",attributes:{percentage:t(this,S)}}:e==="set_percentage"?{state:"on",attributes:{percentage:i.percentage,oscillating:t(this,Dt),direction:t(this,St),preset_mode:t(this,z),preset_modes:t(this,E)}}:null}}J=new WeakMap,R=new WeakMap,Xi=new WeakMap,P=new WeakMap,Le=new WeakMap,j=new WeakMap,ht=new WeakMap,dt=new WeakMap,lt=new WeakMap,D=new WeakMap,S=new WeakMap,Dt=new WeakMap,St=new WeakMap,z=new WeakMap,E=new WeakMap,Kt=new WeakMap,Me=new WeakMap,yi=new WeakMap,Ae=new WeakSet,br=function(){const e=this.def?.feature_config;return e?.percentage_step>1?e.percentage_step:e?.speed_count>1?100/e.speed_count:1},Jt=new WeakSet,Bi=function(){return t(this,Ae,br)>1},xi=new WeakSet,Er=function(){return t(this,Jt,Bi)&&t(this,E).length>0},Ee=new WeakSet,yr=function(){const e=t(this,Ae,br),i=[];for(let s=1;s*e<=100.001;s++)i.push(Math.floor(s*e*10)/10);return i},wi=new WeakSet,Tr=function(){const e=this.root.querySelector(".hrv-fan-speed-circle");if(!e)return;e.setAttribute("aria-pressed",String(t(this,D)));const i=t(this,D)?"Click to increase fan speed":"Fan off - click to turn on";e.setAttribute("aria-label",i),e.title=i},_i=new WeakSet,qr=function(){const e=this.root.querySelector(".hrv-fan-hspeed-switch");if(!e)return;const i=e.querySelector(".hrv-fan-hspeed-thumb"),s=t(this,Ee,yr);let a=-1;if(t(this,D)&&t(this,S)>0){let h=1/0;s.forEach((l,p)=>{const v=Math.abs(l-t(this,S));v<h&&(h=v,a=p)})}e.setAttribute("data-on",String(a>=0)),i&&a>=0&&(i.style.left=`${2+a*32}px`),e.querySelectorAll(".hrv-fan-hspeed-dot").forEach((h,l)=>{h.setAttribute("data-active",String(l===a))})},zt=new WeakSet,pi=function(){const e=t(this,xi,Er);if(t(this,ht)){const i=e||t(this,Dt),s=e?"Oscillate":`Oscillate: ${t(this,Dt)?"on":"off"}`;t(this,ht).setAttribute("data-on",String(i)),t(this,ht).setAttribute("aria-pressed",String(i)),t(this,ht).setAttribute("aria-label",s),t(this,ht).title=s}if(t(this,dt)){const i=t(this,St)!=="reverse",s=`Direction: ${t(this,St)}`;t(this,dt).setAttribute("data-on",String(i)),t(this,dt).setAttribute("aria-pressed",String(i)),t(this,dt).setAttribute("aria-label",s),t(this,dt).title=s}if(t(this,lt)){const i=e||!!t(this,z),s=e?t(this,z)??t(this,E)[0]??"Preset":t(this,z)?`Preset: ${t(this,z)}`:"Preset: none";t(this,lt).setAttribute("data-on",String(i)),t(this,lt).setAttribute("aria-pressed",String(i)),t(this,lt).setAttribute("aria-label",s),t(this,lt).title=s}},Ki=new WeakSet,Jr=function(e){n(this,Kt,!0),t(this,j)?.setPointerCapture(e.pointerId),o(this,$i,Ir).call(this,e)},Ji=new WeakSet,Qr=function(e){t(this,Kt)&&o(this,$i,Ir).call(this,e)},Si=new WeakSet,Hr=function(e){if(t(this,Kt)){n(this,Kt,!1);try{t(this,j)?.releasePointerCapture(e.pointerId)}catch{}t(this,yi).call(this)}},$i=new WeakSet,Ir=function(e){if(!t(this,j))return;const i=t(this,j).getBoundingClientRect(),s=i.left+i.width/2,a=i.top+i.height/2,h=e.clientX-s,l=-(e.clientY-a);let p=Math.atan2(l,h)*180/Math.PI;p<0&&(p+=360);let v=B-p;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b),n(this,S,Math.round(v/b*100)),t(this,R)&&(t(this,R).style.transition="none"),t(this,P)&&(t(this,P).style.transition="none"),o(this,ki,Pr).call(this,t(this,S))},Qi=new WeakSet,ts=function(){t(this,R)&&(t(this,R).style.transition=""),t(this,P)&&(t(this,P).style.transition=""),t(this,S)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("set_percentage",{percentage:t(this,S)})},ki=new WeakSet,Pr=function(e){const i=it*(1-e/100),s=K(B-e/100*b);t(this,R)?.setAttribute("stroke-dashoffset",String(i)),t(this,P)?.setAttribute("cx",String(s.x)),t(this,P)?.setAttribute("cy",String(s.y)),t(this,Me)?.setAttribute("cx",String(s.x)),t(this,Me)?.setAttribute("cy",String(s.y)),t(this,Le)&&(t(this,Le).textContent=`${e}%`),t(this,j)?.setAttribute("aria-valuenow",String(e))},tr=new WeakSet,es=function(){t(this,P)&&(t(this,P).style.transition="none"),t(this,R)&&(t(this,R).style.transition="none"),o(this,ki,Pr).call(this,t(this,D)?t(this,S):0),t(this,P)?.getBoundingClientRect(),t(this,R)?.getBoundingClientRect(),t(this,P)&&(t(this,P).style.transition=""),t(this,R)&&(t(this,R).style.transition="")};function Ls(c,u,e){c/=255,u/=255,e/=255;const i=Math.max(c,u,e),s=Math.min(c,u,e),a=i-s;if(a===0)return 0;let h;return i===c?h=(u-e)/a%6:i===u?h=(e-c)/a+2:h=(c-u)/a+4,Math.round((h*60+360)%360)}const Ms=kr+`
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
      padding: 12px 14px;
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
  `;class As extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,Li);r(this,er);r(this,ir);r(this,Ue);r(this,Mi);r(this,Xe);r(this,rr);r(this,sr);r(this,Ai);r(this,Ei);r(this,nr);r(this,ar);r(this,Y,null);r(this,$t,null);r(this,ct,null);r(this,Te,null);r(this,Bt,!1);r(this,qe,null);r(this,He,null);r(this,Ie,null);r(this,O,null);r(this,F,null);r(this,Pe,null);r(this,De,null);r(this,ze,null);r(this,Be,null);r(this,kt,null);r(this,Re,null);r(this,Qt,null);r(this,N,20);r(this,pt,"off");r(this,je,null);r(this,Oe,null);r(this,Fe,null);r(this,ut,16);r(this,Rt,32);r(this,te,.5);r(this,Ne,"°C");r(this,Ve,[]);r(this,Ge,[]);r(this,Ye,[]);r(this,Ze,[]);r(this,Ci,{});r(this,We,void 0);n(this,We,It(o(this,nr,as).bind(this),500))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features?.includes("target_temperature"),s=this.def.supported_features?.includes("fan_mode")||this.def.feature_config?.fan_modes?.length>0,a=this.def.supported_features?.includes("preset_mode")||this.def.feature_config?.preset_modes?.length>0,h=this.def.supported_features?.includes("swing_mode")||this.def.feature_config?.swing_modes?.length>0;n(this,ut,this.def.feature_config?.min_temp??16),n(this,Rt,this.def.feature_config?.max_temp??32),n(this,te,this.def.feature_config?.temp_step??.5),n(this,Ne,this.def.unit_of_measurement??"°C"),n(this,Ve,this.def.feature_config?.hvac_modes??["off","heat","cool","heat_cool","auto","dry","fan_only"]),n(this,Ge,this.def.feature_config?.fan_modes??[]),n(this,Ye,this.def.feature_config?.preset_modes??[]),n(this,Ze,this.def.feature_config?.swing_modes??[]);const l=o(this,Li,Dr).call(this,t(this,N)),p=K(B),v=K(B-l/100*b),x=it*(1-l/100),[$,M]=t(this,N).toFixed(1).split(".");this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ms}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e&&i?`
              <div class="hrv-dial-wrap">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <path class="hrv-dial-track" d="${ye}"/>
                  <path class="hrv-dial-fill" d="${ye}"
                    stroke-dasharray="${it}" stroke-dashoffset="${x}"/>
                  <circle class="hrv-dial-thumb" r="7" cx="${v.x}" cy="${v.y}"><title>Drag to set temperature</title></circle>
                  <circle class="hrv-dial-thumb-hit" r="16" cx="${v.x}" cy="${v.y}"><title>Drag to set temperature</title></circle>
                </svg>
                <div class="hrv-climate-center">
                  <span class="hrv-climate-state-text"></span>
                  <div class="hrv-climate-temp-row">
                    <span class="hrv-climate-temp-int">${d($)}</span><span class="hrv-climate-temp-frac">.${d(M)}</span><span class="hrv-climate-temp-unit">${d(t(this,Ne))}</span>
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
                  <span class="hrv-climate-ro-temp-int">${d($)}</span><span class="hrv-climate-ro-temp-frac">.${d(M)}</span><span class="hrv-climate-ro-temp-unit">${d(t(this,Ne))}</span>
                </div>
              </div>
            `:""}
            <div class="hrv-climate-grid">
              ${t(this,Ve).length?`
                <button class="hrv-cf-btn" data-feat="mode" type="button"
                  ${e?'title="Change HVAC mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${a&&t(this,Ye).length?`
                <button class="hrv-cf-btn" data-feat="preset" type="button"
                  ${e?'title="Change preset mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Preset</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${s&&t(this,Ge).length?`
                <button class="hrv-cf-btn" data-feat="fan" type="button"
                  ${e?'title="Change fan mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Fan mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${h&&t(this,Ze).length?`
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
      `,n(this,Y,this.root.querySelector(".hrv-dial-wrap")),n(this,$t,this.root.querySelector(".hrv-dial-fill")),n(this,ct,this.root.querySelector(".hrv-dial-thumb")),n(this,Te,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,qe,this.root.querySelector(".hrv-climate-state-text")),n(this,He,this.root.querySelector(".hrv-climate-temp-int")),n(this,Ie,this.root.querySelector(".hrv-climate-temp-frac")),n(this,O,this.root.querySelector("[data-dir='-']")),n(this,F,this.root.querySelector("[data-dir='+']")),n(this,Pe,this.root.querySelector("[data-feat=mode]")),n(this,De,this.root.querySelector("[data-feat=fan]")),n(this,ze,this.root.querySelector("[data-feat=preset]")),n(this,Be,this.root.querySelector("[data-feat=swing]")),n(this,kt,this.root.querySelector(".hrv-climate-dropdown")),t(this,Y)&&(t(this,Y).addEventListener("pointerdown",o(this,rr,ss).bind(this)),t(this,Y).addEventListener("pointermove",o(this,sr,ns).bind(this)),t(this,Y).addEventListener("pointerup",o(this,Ai,Br).bind(this)),t(this,Y).addEventListener("pointercancel",o(this,Ai,Br).bind(this))),t(this,O)&&(t(this,O).addEventListener("click",()=>o(this,Mi,zr).call(this,-1)),t(this,O).addEventListener("pointerdown",()=>t(this,O).setAttribute("data-pressing","true")),t(this,O).addEventListener("pointerup",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointerleave",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointercancel",()=>t(this,O).removeAttribute("data-pressing"))),t(this,F)&&(t(this,F).addEventListener("click",()=>o(this,Mi,zr).call(this,1)),t(this,F).addEventListener("pointerdown",()=>t(this,F).setAttribute("data-pressing","true")),t(this,F).addEventListener("pointerup",()=>t(this,F).removeAttribute("data-pressing")),t(this,F).addEventListener("pointerleave",()=>t(this,F).removeAttribute("data-pressing")),t(this,F).addEventListener("pointercancel",()=>t(this,F).removeAttribute("data-pressing"))),e&&[t(this,Pe),t(this,De),t(this,ze),t(this,Be)].forEach(k=>{if(!k)return;const f=k.getAttribute("data-feat");k.addEventListener("click",()=>o(this,ir,rs).call(this,f)),k.addEventListener("pointerdown",()=>k.setAttribute("data-pressing","true")),k.addEventListener("pointerup",()=>k.removeAttribute("data-pressing")),k.addEventListener("pointerleave",()=>k.removeAttribute("data-pressing")),k.addEventListener("pointercancel",()=>k.removeAttribute("data-pressing"))}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,Ci,{...i}),n(this,pt,e),n(this,je,i.fan_mode??null),n(this,Oe,i.preset_mode??null),n(this,Fe,i.swing_mode??null),!t(this,Bt)&&i.temperature!==void 0&&(n(this,N,i.temperature),o(this,Xe,wr).call(this)),t(this,qe)&&(t(this,qe).textContent=be(i.hvac_action??e));const s=this.root.querySelector(".hrv-climate-ro-temp-int"),a=this.root.querySelector(".hrv-climate-ro-temp-frac");if(s&&i.temperature!==void 0){n(this,N,i.temperature);const[p,v]=t(this,N).toFixed(1).split(".");s.textContent=p,a.textContent=`.${v}`}o(this,ar,os).call(this);const h=i.hvac_action??e,l=be(h);this.announceState(`${this.def.friendly_name}, ${l}`)}predictState(e,i){const s={...t(this,Ci)};return e==="set_hvac_mode"&&i.hvac_mode?{state:i.hvac_mode,attributes:s}:e==="set_temperature"&&i.temperature!==void 0?{state:t(this,pt),attributes:{...s,temperature:i.temperature}}:e==="set_fan_mode"&&i.fan_mode?{state:t(this,pt),attributes:{...s,fan_mode:i.fan_mode}}:e==="set_preset_mode"&&i.preset_mode?{state:t(this,pt),attributes:{...s,preset_mode:i.preset_mode}}:e==="set_swing_mode"&&i.swing_mode?{state:t(this,pt),attributes:{...s,swing_mode:i.swing_mode}}:null}}Y=new WeakMap,$t=new WeakMap,ct=new WeakMap,Te=new WeakMap,Bt=new WeakMap,qe=new WeakMap,He=new WeakMap,Ie=new WeakMap,O=new WeakMap,F=new WeakMap,Pe=new WeakMap,De=new WeakMap,ze=new WeakMap,Be=new WeakMap,kt=new WeakMap,Re=new WeakMap,Qt=new WeakMap,N=new WeakMap,pt=new WeakMap,je=new WeakMap,Oe=new WeakMap,Fe=new WeakMap,ut=new WeakMap,Rt=new WeakMap,te=new WeakMap,Ne=new WeakMap,Ve=new WeakMap,Ge=new WeakMap,Ye=new WeakMap,Ze=new WeakMap,Ci=new WeakMap,We=new WeakMap,Li=new WeakSet,Dr=function(e){return Math.max(0,Math.min(100,(e-t(this,ut))/(t(this,Rt)-t(this,ut))*100))},er=new WeakSet,is=function(e){const i=t(this,ut)+e/100*(t(this,Rt)-t(this,ut)),s=Math.round(i/t(this,te))*t(this,te);return Math.max(t(this,ut),Math.min(t(this,Rt),+s.toFixed(10)))},ir=new WeakSet,rs=function(e){if(t(this,Re)===e){o(this,Ue,xr).call(this);return}n(this,Re,e);let i=[],s=null,a="",h="";switch(e){case"mode":i=t(this,Ve),s=t(this,pt),a="set_hvac_mode",h="hvac_mode";break;case"fan":i=t(this,Ge),s=t(this,je),a="set_fan_mode",h="fan_mode";break;case"preset":i=t(this,Ye),s=t(this,Oe),a="set_preset_mode",h="preset_mode";break;case"swing":i=t(this,Ze),s=t(this,Fe),a="set_swing_mode",h="swing_mode";break}if(!i.length||!t(this,kt))return;t(this,kt).innerHTML=i.map(p=>`
        <button class="hrv-cf-option" data-active="${p===s}" type="button">
          ${d(be(p))}
        </button>
      `).join(""),t(this,kt).querySelectorAll(".hrv-cf-option").forEach((p,v)=>{p.addEventListener("click",()=>{this.config.card?.sendCommand(a,{[h]:i[v]}),o(this,Ue,xr).call(this)})}),t(this,kt).removeAttribute("hidden");const l=p=>{p.composedPath().some(x=>x===this.root||x===this.root.host)||o(this,Ue,xr).call(this)};n(this,Qt,l),document.addEventListener("pointerdown",l,!0)},Ue=new WeakSet,xr=function(){n(this,Re,null),t(this,kt)?.setAttribute("hidden",""),t(this,Qt)&&(document.removeEventListener("pointerdown",t(this,Qt),!0),n(this,Qt,null))},Mi=new WeakSet,zr=function(e){const i=Math.round((t(this,N)+e*t(this,te))*100)/100;n(this,N,Math.max(t(this,ut),Math.min(t(this,Rt),i))),o(this,Xe,wr).call(this),t(this,We).call(this)},Xe=new WeakSet,wr=function(){const e=o(this,Li,Dr).call(this,t(this,N)),i=it*(1-e/100),s=K(B-e/100*b);t(this,$t)?.setAttribute("stroke-dashoffset",String(i)),t(this,ct)?.setAttribute("cx",String(s.x)),t(this,ct)?.setAttribute("cy",String(s.y)),t(this,Te)?.setAttribute("cx",String(s.x)),t(this,Te)?.setAttribute("cy",String(s.y));const[a,h]=t(this,N).toFixed(1).split(".");t(this,He)&&(t(this,He).textContent=a),t(this,Ie)&&(t(this,Ie).textContent=`.${h}`)},rr=new WeakSet,ss=function(e){n(this,Bt,!0),t(this,Y)?.setPointerCapture(e.pointerId),o(this,Ei,Rr).call(this,e)},sr=new WeakSet,ns=function(e){t(this,Bt)&&o(this,Ei,Rr).call(this,e)},Ai=new WeakSet,Br=function(e){if(t(this,Bt)){n(this,Bt,!1);try{t(this,Y)?.releasePointerCapture(e.pointerId)}catch{}t(this,$t)&&(t(this,$t).style.transition=""),t(this,ct)&&(t(this,ct).style.transition="")}},Ei=new WeakSet,Rr=function(e){if(!t(this,Y))return;const i=t(this,Y).getBoundingClientRect(),s=i.left+i.width/2,a=i.top+i.height/2,h=e.clientX-s,l=-(e.clientY-a);let p=Math.atan2(l,h)*180/Math.PI;p<0&&(p+=360);let v=B-p;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b),n(this,N,o(this,er,is).call(this,v/b*100)),t(this,$t)&&(t(this,$t).style.transition="none"),t(this,ct)&&(t(this,ct).style.transition="none"),o(this,Xe,wr).call(this),t(this,We).call(this)},nr=new WeakSet,as=function(){this.config.card?.sendCommand("set_temperature",{temperature:t(this,N)})},ar=new WeakSet,os=function(){const e=(i,s)=>{if(!i)return;const a=i.querySelector(".hrv-cf-value");a&&(a.textContent=be(s??"None"))};e(t(this,Pe),t(this,pt)),e(t(this,De),t(this,je)),e(t(this,ze),t(this,Oe)),e(t(this,Be),t(this,Fe))};const Es=`
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
  `;class Ts extends g{constructor(){super(...arguments);r(this,vt,null)}render(){const e=this.def.capabilities==="read-write",i=this.def.friendly_name;this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Es}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(i)}</span>
          </div>
          <div part="card-body">
            <button part="trigger-button" type="button"
              aria-label="${d(i)}"
              title="${e?d(i):"Read-only"}"
              ${e?"":"disabled"}>
              <span part="btn-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,vt,this.root.querySelector("[part=trigger-button]")),this.renderIcon(this.def.icon_state_map?.idle??this.def.icon??"mdi:play","btn-icon"),t(this,vt)&&e&&this._attachGestureHandlers(t(this,vt),{onTap:()=>{const s=this.config.gestureConfig?.tap;if(s){this._runAction(s);return}t(this,vt).disabled=!0,this.config.card?.sendCommand("trigger",{})}}),this.renderCompanions(),W(this.root)}applyState(e,i){const s=e==="triggered";t(this,vt)&&(t(this,vt).setAttribute("data-state",e),this.def.capabilities==="read-write"&&(t(this,vt).disabled=s));const a=this.def.icon_state_map?.[e]??this.def.icon??"mdi:play";this.renderIcon(a,"btn-icon"),s&&this.announceState(`${this.def.friendly_name}, ${this.i18n.t("state.triggered")}`)}predictState(e,i){return e!=="trigger"?null:{state:"triggered",attributes:{}}}}vt=new WeakMap;const qs=`
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
  `;class Hs extends g{constructor(){super(...arguments);r(this,ee,null)}render(){this.root.innerHTML=`
        <style>${this.getSharedStyles()}${qs}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-bs-circle" data-on="false"
              role="img" aria-label="${d(this.def.friendly_name)}">
              <span part="state-icon" aria-hidden="true"></span>
            </div>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,ee,this.root.querySelector(".hrv-bs-circle")),this.renderIcon(this.def.icon_state_map?.off??this.def.icon??"mdi:radiobox-blank","state-icon"),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){const s=e==="on",a=this.i18n.t(`state.${e}`)!==`state.${e}`?this.i18n.t(`state.${e}`):e;t(this,ee)&&(t(this,ee).setAttribute("data-on",String(s)),t(this,ee).setAttribute("aria-label",`${this.def.friendly_name}: ${a}`));const h=this.def.icon_state_map?.[e]??this.def.icon??(s?"mdi:radiobox-marked":"mdi:radiobox-blank");this.renderIcon(h,"state-icon"),this.announceState(`${this.def.friendly_name}, ${a}`)}}ee=new WeakMap;const Is='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 14h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V10z" opacity="0.3"/><path d="M3 4h18v2H3V4zm0 16h18v2H3v-2z"/></svg>',Ps='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',Ds='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>',zs=`
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
      width: 28px;
      height: 28px;
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
  `;class Bs extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,Ke);r(this,or);r(this,ie,null);r(this,ft,null);r(this,C,null);r(this,re,null);r(this,se,null);r(this,ne,null);r(this,Ct,!1);r(this,gt,0);r(this,Ti,"closed");r(this,qi,{});r(this,Hi,void 0);n(this,Hi,It(o(this,or,hs).bind(this),300))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features?.includes("set_position"),s=!this.def.supported_features||this.def.supported_features.includes("buttons");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${zs}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
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
            ${e&&s?`
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
      `,n(this,ie,this.root.querySelector(".hrv-cover-slider-track")),n(this,ft,this.root.querySelector(".hrv-cover-slider-fill")),n(this,C,this.root.querySelector(".hrv-cover-slider-thumb")),n(this,re,this.root.querySelector("[data-action=open]")),n(this,se,this.root.querySelector("[data-action=stop]")),n(this,ne,this.root.querySelector("[data-action=close]")),t(this,ie)&&t(this,C)&&e){const a=l=>{n(this,Ct,!0),t(this,C).style.transition="none",t(this,ft).style.transition="none",o(this,Ke,_r).call(this,l),t(this,C).setPointerCapture(l.pointerId)};t(this,C).addEventListener("pointerdown",a),t(this,ie).addEventListener("pointerdown",l=>{l.target!==t(this,C)&&(n(this,Ct,!0),t(this,C).style.transition="none",t(this,ft).style.transition="none",o(this,Ke,_r).call(this,l),t(this,C).setPointerCapture(l.pointerId))}),t(this,C).addEventListener("pointermove",l=>{t(this,Ct)&&o(this,Ke,_r).call(this,l)});const h=()=>{t(this,Ct)&&(n(this,Ct,!1),t(this,C).style.transition="",t(this,ft).style.transition="",t(this,Hi).call(this))};t(this,C).addEventListener("pointerup",h),t(this,C).addEventListener("pointercancel",h)}[t(this,re),t(this,se),t(this,ne)].forEach(a=>{if(!a)return;const h=a.getAttribute("data-action");a.addEventListener("click",()=>{this.config.card?.sendCommand(`${h}_cover`,{})}),a.addEventListener("pointerdown",()=>a.setAttribute("data-pressing","true")),a.addEventListener("pointerup",()=>a.removeAttribute("data-pressing")),a.addEventListener("pointerleave",()=>a.removeAttribute("data-pressing")),a.addEventListener("pointercancel",()=>a.removeAttribute("data-pressing"))}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,Ti,e),n(this,qi,{...i});const s=e==="opening"||e==="closing",a=i.current_position;t(this,re)&&(t(this,re).disabled=!s&&a===100),t(this,se)&&(t(this,se).disabled=!s),t(this,ne)&&(t(this,ne).disabled=!s&&e==="closed"),i.current_position!==void 0&&!t(this,Ct)&&(n(this,gt,i.current_position),t(this,ft)&&(t(this,ft).style.width=`${t(this,gt)}%`),t(this,C)&&(t(this,C).style.left=`${t(this,gt)}%`)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){const s={...t(this,qi)};return e==="open_cover"?(s.current_position=100,{state:"open",attributes:s}):e==="close_cover"?(s.current_position=0,{state:"closed",attributes:s}):e==="stop_cover"?{state:t(this,Ti),attributes:s}:e==="set_cover_position"&&i.position!==void 0?(s.current_position=i.position,{state:i.position>0?"open":"closed",attributes:s}):null}}ie=new WeakMap,ft=new WeakMap,C=new WeakMap,re=new WeakMap,se=new WeakMap,ne=new WeakMap,Ct=new WeakMap,gt=new WeakMap,Ti=new WeakMap,qi=new WeakMap,Hi=new WeakMap,Ke=new WeakSet,_r=function(e){const i=t(this,ie).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,gt,Math.round(s)),t(this,ft).style.width=`${t(this,gt)}%`,t(this,C).style.left=`${t(this,gt)}%`},or=new WeakSet,hs=function(){this.config.card?.sendCommand("set_cover_position",{position:t(this,gt)})};const Rs=`
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
  `;class js extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,hr);r(this,dr);r(this,Nt);r(this,Qe);r(this,lr);r(this,Vt);r(this,ae,null);r(this,Lt,null);r(this,T,null);r(this,H,null);r(this,Je,null);r(this,jt,null);r(this,Ot,null);r(this,Mt,!1);r(this,q,0);r(this,Z,0);r(this,Q,100);r(this,At,1);r(this,Ft,void 0);n(this,Ft,It(o(this,lr,cs).bind(this),300))}render(){const e=this.def.capabilities==="read-write";n(this,Z,this.def.feature_config?.min??0),n(this,Q,this.def.feature_config?.max??100),n(this,At,this.def.feature_config?.step??1);const i=this.def.unit_of_measurement??"";if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Rs}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
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
                  aria-label="Decrease ${d(this.def.friendly_name)}">-</button>
                <input class="hrv-num-input" type="number"
                  min="${t(this,Z)}" max="${t(this,Q)}" step="${t(this,At)}"
                  title="Enter value" aria-label="${d(this.def.friendly_name)} value">
                <button class="hrv-num-btn" type="button" part="inc-btn"
                  aria-label="Increase ${d(this.def.friendly_name)}">+</button>
                ${i?`<span class="hrv-num-unit">${d(i)}</span>`:""}
              </div>
            `:`
              <div class="hrv-num-readonly">
                <span class="hrv-num-readonly-val">-</span>
                ${i?`<span class="hrv-num-readonly-unit">${d(i)}</span>`:""}
              </div>
            `}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,ae,this.root.querySelector(".hrv-num-slider-track")),n(this,Lt,this.root.querySelector(".hrv-num-slider-fill")),n(this,T,this.root.querySelector(".hrv-num-slider-thumb")),n(this,H,this.root.querySelector(".hrv-num-input")),n(this,Je,this.root.querySelector(".hrv-num-readonly-val")),n(this,jt,this.root.querySelector("[part=dec-btn]")),n(this,Ot,this.root.querySelector("[part=inc-btn]")),t(this,ae)&&t(this,T)){const s=h=>{n(this,Mt,!0),t(this,T).style.transition="none",t(this,Lt).style.transition="none",o(this,Qe,Sr).call(this,h),t(this,T).setPointerCapture(h.pointerId)};t(this,T).addEventListener("pointerdown",s),t(this,ae).addEventListener("pointerdown",h=>{h.target!==t(this,T)&&(n(this,Mt,!0),t(this,T).style.transition="none",t(this,Lt).style.transition="none",o(this,Qe,Sr).call(this,h),t(this,T).setPointerCapture(h.pointerId))}),t(this,T).addEventListener("pointermove",h=>{t(this,Mt)&&o(this,Qe,Sr).call(this,h)});const a=()=>{t(this,Mt)&&(n(this,Mt,!1),t(this,T).style.transition="",t(this,Lt).style.transition="",t(this,Ft).call(this))};t(this,T).addEventListener("pointerup",a),t(this,T).addEventListener("pointercancel",a)}t(this,H)&&t(this,H).addEventListener("input",()=>{const s=parseFloat(t(this,H).value);isNaN(s)||(n(this,q,Math.max(t(this,Z),Math.min(t(this,Q),s))),o(this,Nt,ui).call(this),o(this,Vt,vi).call(this),t(this,Ft).call(this))}),t(this,jt)&&t(this,jt).addEventListener("click",()=>{n(this,q,+Math.max(t(this,Z),t(this,q)-t(this,At)).toFixed(10)),o(this,Nt,ui).call(this),t(this,H)&&(t(this,H).value=String(t(this,q))),o(this,Vt,vi).call(this),t(this,Ft).call(this)}),t(this,Ot)&&t(this,Ot).addEventListener("click",()=>{n(this,q,+Math.min(t(this,Q),t(this,q)+t(this,At)).toFixed(10)),o(this,Nt,ui).call(this),t(this,H)&&(t(this,H).value=String(t(this,q))),o(this,Vt,vi).call(this),t(this,Ft).call(this)}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){const s=parseFloat(e);if(isNaN(s))return;n(this,q,s),t(this,Mt)||(o(this,Nt,ui).call(this),t(this,H)&&!this.isFocused(t(this,H))&&(t(this,H).value=String(s))),o(this,Vt,vi).call(this),t(this,Je)&&(t(this,Je).textContent=String(s));const a=this.def.unit_of_measurement??"";this.announceState(`${this.def.friendly_name}, ${s}${a?` ${a}`:""}`)}predictState(e,i){return e==="set_value"&&i.value!==void 0?{state:String(i.value),attributes:{}}:null}}ae=new WeakMap,Lt=new WeakMap,T=new WeakMap,H=new WeakMap,Je=new WeakMap,jt=new WeakMap,Ot=new WeakMap,Mt=new WeakMap,q=new WeakMap,Z=new WeakMap,Q=new WeakMap,At=new WeakMap,Ft=new WeakMap,hr=new WeakSet,ds=function(e){const i=t(this,Q)-t(this,Z);return i===0?0:Math.max(0,Math.min(100,(e-t(this,Z))/i*100))},dr=new WeakSet,ls=function(e){const i=t(this,Z)+e/100*(t(this,Q)-t(this,Z)),s=Math.round(i/t(this,At))*t(this,At);return Math.max(t(this,Z),Math.min(t(this,Q),+s.toFixed(10)))},Nt=new WeakSet,ui=function(){const e=o(this,hr,ds).call(this,t(this,q));t(this,Lt)&&(t(this,Lt).style.width=`${e}%`),t(this,T)&&(t(this,T).style.left=`${e}%`)},Qe=new WeakSet,Sr=function(e){const i=t(this,ae).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,q,o(this,dr,ls).call(this,s)),o(this,Nt,ui).call(this),t(this,H)&&(t(this,H).value=String(t(this,q))),o(this,Vt,vi).call(this)},lr=new WeakSet,cs=function(){this.config.card?.sendCommand("set_value",{value:t(this,q)})},Vt=new WeakSet,vi=function(){t(this,jt)&&(t(this,jt).disabled=t(this,q)<=t(this,Z)),t(this,Ot)&&(t(this,Ot).disabled=t(this,q)>=t(this,Q))};const Os=`
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
  `;class Fs extends g{constructor(){super(...arguments);r(this,cr);r(this,Pi);r(this,ti,null);r(this,mt,null);r(this,Ii,"");r(this,Et,[]);r(this,oe,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Os}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-is-selected" type="button"
              ${e?'title="Select an option"':'data-readonly="true" title="Read-only" disabled'}
              aria-label="${d(this.def.friendly_name)}">
              <span class="hrv-is-label">-</span>
              ${e?'<span class="hrv-is-arrow" aria-hidden="true">&#9660;</span>':""}
            </button>
            ${e?'<div class="hrv-is-dropdown" hidden></div>':""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,ti,this.root.querySelector(".hrv-is-selected")),n(this,mt,this.root.querySelector(".hrv-is-dropdown")),t(this,ti)&&e&&t(this,ti).addEventListener("click",()=>{t(this,oe)?o(this,Pi,jr).call(this):o(this,cr,ps).call(this)}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,Ii,e),n(this,Et,i?.options??t(this,Et));const s=this.root.querySelector(".hrv-is-label");s&&(s.textContent=e),t(this,oe)&&t(this,mt)?.querySelectorAll(".hrv-is-option").forEach((a,h)=>{a.setAttribute("data-active",String(t(this,Et)[h]===e))}),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e==="select_option"&&i.option!==void 0?{state:String(i.option),attributes:{}}:null}}ti=new WeakMap,mt=new WeakMap,Ii=new WeakMap,Et=new WeakMap,oe=new WeakMap,cr=new WeakSet,ps=function(){if(!t(this,mt)||!t(this,Et).length)return;t(this,mt).innerHTML=t(this,Et).map(i=>`
        <button class="hrv-is-option" type="button"
          data-active="${i===t(this,Ii)}"
          title="${d(i)}">
          ${d(i)}
        </button>
      `).join(""),t(this,mt).querySelectorAll(".hrv-is-option").forEach((i,s)=>{i.addEventListener("click",()=>{this.config.card?.sendCommand("select_option",{option:t(this,Et)[s]}),o(this,Pi,jr).call(this)})});const e=this.root.querySelector("[part=card]");e&&(e.style.overflow="visible"),t(this,mt).removeAttribute("hidden"),n(this,oe,!0)},Pi=new WeakSet,jr=function(){t(this,mt)?.setAttribute("hidden","");const e=this.root.querySelector("[part=card]");e&&(e.style.overflow=""),n(this,oe,!1)};const Ns=`
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
      width: 44px;
      height: 44px;
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
      width: 40px;
      height: 40px;
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
      width: 24px;
      height: 24px;
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
  `;class Vs extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,ri);r(this,pr);r(this,Tt,null);r(this,ei,null);r(this,ii,null);r(this,he,null);r(this,de,null);r(this,bt,null);r(this,L,null);r(this,le,null);r(this,ce,null);r(this,pe,!1);r(this,yt,0);r(this,qt,!1);r(this,Di,void 0);n(this,Di,this.debounce(o(this,pr,us).bind(this),200))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=i.includes("volume_set"),a=i.includes("previous_track");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ns}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
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
            ${s?`
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
      `,n(this,Tt,this.root.querySelector("[data-role=play]")),n(this,ei,this.root.querySelector("[data-role=prev]")),n(this,ii,this.root.querySelector("[data-role=next]")),n(this,he,this.root.querySelector(".hrv-mp-mute")),n(this,de,this.root.querySelector(".hrv-mp-slider-track")),n(this,bt,this.root.querySelector(".hrv-mp-slider-fill")),n(this,L,this.root.querySelector(".hrv-mp-slider-thumb")),n(this,le,this.root.querySelector(".hrv-mp-artist")),n(this,ce,this.root.querySelector(".hrv-mp-title")),this.renderIcon("mdi:play","play-icon"),this.renderIcon("mdi:skip-previous","prev-icon"),this.renderIcon("mdi:skip-next","next-icon"),this.renderIcon("mdi:volume-high","mute-icon"),e&&(t(this,Tt)?.addEventListener("click",()=>{this.config.card?.sendCommand("media_play_pause",{})}),t(this,ei)?.addEventListener("click",()=>this.config.card?.sendCommand("media_previous_track",{})),t(this,ii)?.addEventListener("click",()=>this.config.card?.sendCommand("media_next_track",{})),[t(this,Tt),t(this,ei),t(this,ii)].forEach(h=>{h&&(h.addEventListener("pointerdown",()=>h.setAttribute("data-pressing","true")),h.addEventListener("pointerup",()=>h.removeAttribute("data-pressing")),h.addEventListener("pointerleave",()=>h.removeAttribute("data-pressing")),h.addEventListener("pointercancel",()=>h.removeAttribute("data-pressing")))}),t(this,he)?.addEventListener("click",()=>this.config.card?.sendCommand("volume_mute",{is_volume_muted:!t(this,pe)})),t(this,de)&&t(this,L))){const h=p=>{n(this,qt,!0),t(this,L).style.transition="none",t(this,bt).style.transition="none",o(this,ri,$r).call(this,p),t(this,L).setPointerCapture(p.pointerId)};t(this,L).addEventListener("pointerdown",h),t(this,de).addEventListener("pointerdown",p=>{p.target!==t(this,L)&&(n(this,qt,!0),t(this,L).style.transition="none",t(this,bt).style.transition="none",o(this,ri,$r).call(this,p),t(this,L).setPointerCapture(p.pointerId))}),t(this,L).addEventListener("pointermove",p=>{t(this,qt)&&o(this,ri,$r).call(this,p)});const l=()=>{t(this,qt)&&(n(this,qt,!1),t(this,L).style.transition="",t(this,bt).style.transition="",t(this,Di).call(this))};t(this,L).addEventListener("pointerup",l),t(this,L).addEventListener("pointercancel",l)}this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){const s=e==="playing",a=e==="paused";if(t(this,le)){const l=i.media_artist??"";t(this,le).textContent=l,t(this,le).title=l||"Artist"}if(t(this,ce)){const l=i.media_title??"";t(this,ce).textContent=l,t(this,ce).title=l||"Title"}if(t(this,Tt)){t(this,Tt).setAttribute("data-playing",String(s));const l=s?"mdi:pause":"mdi:play";this.renderIcon(l,"play-icon"),this.def.capabilities==="read-write"&&(t(this,Tt).title=s?"Pause":"Play")}if(n(this,pe,!!i.is_volume_muted),t(this,he)){const l=t(this,pe)?"mdi:volume-off":"mdi:volume-high";this.renderIcon(l,"mute-icon"),this.def.capabilities==="read-write"&&(t(this,he).title=t(this,pe)?"Unmute":"Mute")}i.volume_level!==void 0&&!t(this,qt)&&(n(this,yt,Math.round(i.volume_level*100)),t(this,bt)&&(t(this,bt).style.width=`${t(this,yt)}%`),t(this,L)&&(t(this,L).style.left=`${t(this,yt)}%`));const h=i.media_title??"";this.announceState(`${this.def.friendly_name}, ${e}${h?` - ${h}`:""}`)}}Tt=new WeakMap,ei=new WeakMap,ii=new WeakMap,he=new WeakMap,de=new WeakMap,bt=new WeakMap,L=new WeakMap,le=new WeakMap,ce=new WeakMap,pe=new WeakMap,yt=new WeakMap,qt=new WeakMap,Di=new WeakMap,ri=new WeakSet,$r=function(e){const i=t(this,de).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,yt,Math.round(s)),t(this,bt).style.width=`${t(this,yt)}%`,t(this,L).style.left=`${t(this,yt)}%`},pr=new WeakSet,us=function(){this.config.card?.sendCommand("volume_set",{volume_level:t(this,yt)/100})};const Gs=`
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
  `;class Ys extends g{constructor(){super(...arguments);r(this,si,null)}render(){const e=this.def.capabilities==="read-write",i=this.config.tapAction?.data?.command??"power";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Gs}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-remote-circle" type="button"
              title="${e?d(i):"Read-only"}"
              aria-label="${d(this.def.friendly_name)} - ${d(i)}"
              ${e?"":"disabled"}>
              <span part="remote-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,si,this.root.querySelector(".hrv-remote-circle"));const s=this.resolveIcon(this.def.icon,"mdi:remote");this.renderIcon(s,"remote-icon"),t(this,si)&&e&&this._attachGestureHandlers(t(this,si),{onTap:()=>{const a=this.config.gestureConfig?.tap;if(a){this._runAction(a);return}const h=this.config.tapAction?.data?.command??"power",l=this.config.tapAction?.data?.device??void 0,p=l?{command:h,device:l}:{command:h};this.config.card?.sendCommand("send_command",p)}}),this.renderCompanions(),W(this.root)}applyState(e,i){const s=this.def.icon_state_map?.[e]??this.def.icon??"mdi:remote";this.renderIcon(this.resolveIcon(s,"mdi:remote"),"remote-icon"),this.announceState(`${this.def.friendly_name}, ${e}`)}}si=new WeakMap;const Zs=`
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
  `;class Ws extends g{constructor(){super(...arguments);r(this,ni,null);r(this,ai,null)}render(){const e=this.def.unit_of_measurement??"";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Zs}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" title="${d(this.def.friendly_name)}">
            <span class="hrv-sensor-val" aria-live="polite">-</span>
            ${e?`<span class="hrv-sensor-unit" title="${d(e)}">${d(e)}</span>`:""}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,ni,this.root.querySelector(".hrv-sensor-val")),n(this,ai,this.root.querySelector(".hrv-sensor-unit")),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){t(this,ni)&&(t(this,ni).textContent=e),t(this,ai)&&i.unit_of_measurement!==void 0&&(t(this,ai).textContent=i.unit_of_measurement);const s=i.unit_of_measurement??this.def.unit_of_measurement??"",a=this.root.querySelector("[part=card-body]");a&&(a.title=`${e}${s?` ${s}`:""}`),this.announceState(`${this.def.friendly_name}, ${e}${s?` ${s}`:""}`)}}ni=new WeakMap,ai=new WeakMap;const Us=`
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
  `;class Fr extends g{constructor(){super(...arguments);r(this,xt,null);r(this,oi,null);r(this,ue,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Us}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e?`
              <button class="hrv-switch-track" type="button" data-on="false"
                title="Toggle" aria-label="${d(this.def.friendly_name)} - Toggle">
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
      `,n(this,xt,this.root.querySelector(".hrv-switch-track")),n(this,oi,this.root.querySelector(".hrv-switch-ro")),t(this,xt)&&e&&this._attachGestureHandlers(t(this,xt),{onTap:()=>{const i=this.config.gestureConfig?.tap;if(i){this._runAction(i);return}this.config.card?.sendCommand("toggle",{})}}),this.renderCompanions(),W(this.root)}applyState(e,i){n(this,ue,e==="on");const s=e==="unavailable"||e==="unknown";t(this,xt)&&(t(this,xt).setAttribute("data-on",String(t(this,ue))),t(this,xt).title=t(this,ue)?"On - click to turn off":"Off - click to turn on",t(this,xt).disabled=s),t(this,oi)&&(t(this,oi).textContent=be(e)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,ue)?"off":"on",attributes:{}}}}xt=new WeakMap,oi=new WeakMap,ue=new WeakMap;const Xs=`
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
  `;function Oi(c){c<0&&(c=0);const u=Math.floor(c/3600),e=Math.floor(c%3600/60),i=Math.floor(c%60),s=a=>String(a).padStart(2,"0");return u>0?`${u}:${s(e)}:${s(i)}`:`${s(e)}:${s(i)}`}function Nr(c){if(typeof c=="number")return c;if(typeof c!="string")return 0;const u=c.split(":").map(Number);return u.length===3?u[0]*3600+u[1]*60+u[2]:u.length===2?u[0]*60+u[1]:u[0]||0}class Ks extends g{constructor(){super(...arguments);r(this,ur);r(this,vr);r(this,fr);r(this,fe);r(this,U,null);r(this,Ht,null);r(this,Gt,null);r(this,Yt,null);r(this,ve,null);r(this,hi,"idle");r(this,di,{});r(this,tt,null);r(this,li,null)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Xs}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-timer-display" title="Time remaining">00:00</span>
            ${e?`
              <div class="hrv-timer-controls">
                <button class="hrv-timer-btn" data-action="playpause" type="button"
                  title="Start" aria-label="${d(this.def.friendly_name)} - Start">
                  <span part="playpause-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="cancel" type="button"
                  title="Cancel" aria-label="${d(this.def.friendly_name)} - Cancel">
                  <span part="cancel-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="finish" type="button"
                  title="Finish" aria-label="${d(this.def.friendly_name)} - Finish">
                  <span part="finish-icon" aria-hidden="true"></span>
                </button>
              </div>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,U,this.root.querySelector(".hrv-timer-display")),n(this,Ht,this.root.querySelector("[data-action=playpause]")),n(this,Gt,this.root.querySelector("[data-action=cancel]")),n(this,Yt,this.root.querySelector("[data-action=finish]")),this.renderIcon("mdi:play","playpause-icon"),this.renderIcon("mdi:stop","cancel-icon"),this.renderIcon("mdi:check-circle","finish-icon"),e&&(t(this,Ht)?.addEventListener("click",()=>{const i=t(this,hi)==="active"?"pause":"start";this.config.card?.sendCommand(i,{})}),t(this,Gt)?.addEventListener("click",()=>{this.config.card?.sendCommand("cancel",{})}),t(this,Yt)?.addEventListener("click",()=>{this.config.card?.sendCommand("finish",{})}),[t(this,Ht),t(this,Gt),t(this,Yt)].forEach(i=>{i&&(i.addEventListener("pointerdown",()=>i.setAttribute("data-pressing","true")),i.addEventListener("pointerup",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointerleave",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointercancel",()=>i.removeAttribute("data-pressing")))})),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,hi,e),n(this,di,{...i}),n(this,tt,i.finishes_at??null),n(this,li,i.remaining!=null?Nr(i.remaining):null),o(this,ur,vs).call(this,e),o(this,vr,fs).call(this,e),e==="active"&&t(this,tt)?o(this,fr,gs).call(this):o(this,fe,Ri).call(this),t(this,U)&&t(this,U).setAttribute("data-paused",String(e==="paused"))}predictState(e,i){const s={...t(this,di)};return e==="start"?{state:"active",attributes:s}:e==="pause"?(t(this,tt)&&(s.remaining=Math.max(0,(new Date(t(this,tt)).getTime()-Date.now())/1e3)),{state:"paused",attributes:s}):e==="cancel"||e==="finish"?{state:"idle",attributes:s}:null}}U=new WeakMap,Ht=new WeakMap,Gt=new WeakMap,Yt=new WeakMap,ve=new WeakMap,hi=new WeakMap,di=new WeakMap,tt=new WeakMap,li=new WeakMap,ur=new WeakSet,vs=function(e){const i=e==="idle",s=e==="active";if(t(this,Ht)){const a=s?"mdi:pause":"mdi:play",h=s?"Pause":e==="paused"?"Resume":"Start";this.renderIcon(a,"playpause-icon"),t(this,Ht).title=h,t(this,Ht).setAttribute("aria-label",`${this.def.friendly_name} - ${h}`)}t(this,Gt)&&(t(this,Gt).disabled=i),t(this,Yt)&&(t(this,Yt).disabled=i),this.announceState(`${this.def.friendly_name}, ${e}`)},vr=new WeakSet,fs=function(e){if(t(this,U)){if(e==="idle"){const i=t(this,di).duration;t(this,U).textContent=i?Oi(Nr(i)):"00:00";return}if(e==="paused"&&t(this,li)!=null){t(this,U).textContent=Oi(t(this,li));return}if(e==="active"&&t(this,tt)){const i=Math.max(0,(new Date(t(this,tt)).getTime()-Date.now())/1e3);t(this,U).textContent=Oi(i)}}},fr=new WeakSet,gs=function(){o(this,fe,Ri).call(this),n(this,ve,setInterval(()=>{if(!t(this,tt)||t(this,hi)!=="active"){o(this,fe,Ri).call(this);return}const e=Math.max(0,(new Date(t(this,tt)).getTime()-Date.now())/1e3);t(this,U)&&(t(this,U).textContent=Oi(e)),e<=0&&o(this,fe,Ri).call(this)},1e3))},fe=new WeakSet,Ri=function(){t(this,ve)&&(clearInterval(t(this,ve)),n(this,ve,null))};const Js=`
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
  `;class Qs extends g{constructor(){super(...arguments);r(this,ci,null);r(this,wt,null);r(this,ge,!1);r(this,me,!1)}render(){const e=this.def.capabilities==="read-write";n(this,me,!1),this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Js}${X}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${d(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-generic-state" title="${d(this.def.friendly_name)}">-</span>
            ${e?`
              <button class="hrv-generic-toggle" type="button" data-on="false"
                title="Toggle" aria-label="${d(this.def.friendly_name)} - Toggle"
                hidden>
                <div class="hrv-generic-knob"></div>
              </button>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,ci,this.root.querySelector(".hrv-generic-state")),n(this,wt,this.root.querySelector(".hrv-generic-toggle")),t(this,wt)&&e&&this._attachGestureHandlers(t(this,wt),{onTap:()=>{const i=this.config.gestureConfig?.tap;if(i){this._runAction(i);return}this.config.card?.sendCommand("toggle",{})}}),this.renderCompanions(),W(this.root)}applyState(e,i){const s=e==="on"||e==="off";n(this,ge,e==="on"),t(this,ci)&&(t(this,ci).textContent=be(e)),t(this,wt)&&(s&&!t(this,me)&&(t(this,wt).removeAttribute("hidden"),n(this,me,!0)),t(this,me)&&(t(this,wt).setAttribute("data-on",String(t(this,ge))),t(this,wt).title=t(this,ge)?"On - click to turn off":"Off - click to turn on")),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,ge)?"off":"on",attributes:{}}}}ci=new WeakMap,wt=new WeakMap,ge=new WeakMap,me=new WeakMap,m._packs=m._packs||{};const tn=window.__HARVEST_PACK_ID__||"minimus";m._packs[tn]={light:$s,fan:Cs,climate:As,harvest_action:Ts,binary_sensor:Hs,cover:Bs,input_boolean:Fr,input_number:js,input_select:Fs,media_player:Vs,remote:Ys,sensor:Ws,switch:Fr,timer:Ks,generic:Qs}})();})();
