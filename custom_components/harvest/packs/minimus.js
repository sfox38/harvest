(()=>{var Kr=(y,g,l)=>{if(!g.has(y))throw TypeError("Cannot "+l)};var t=(y,g,l)=>(Kr(y,g,"read from private field"),l?l.call(y):g.get(y)),r=(y,g,l)=>{if(g.has(y))throw TypeError("Cannot add the same private member more than once");g instanceof WeakSet?g.add(y):g.set(y,l)},n=(y,g,l,Rt)=>(Kr(y,g,"write to private field"),Rt?Rt.call(y,l):g.set(y,l),l);var h=(y,g,l)=>(Kr(y,g,"access private method"),l);(function(){"use strict";var jt,E,Ti,I,ot,C,Y,Te,qe,ht,Lt,dt,lt,te,De,G,ct,ee,qi,Ie,Xr,Rn,_,hr,bs,dr,ys,lr,xs,cr,ws,Pe,zr,ze,Br,pr,Cs,ie,rr,ur,_s,vr,As,Di,Jr,Ii,Qr,fr,Ss,it,j,mr,P,Be,V,pt,ut,vt,z,A,Vt,kt,B,$,re,Re,Pi,je,Rr,se,sr,zi,ts,Ve,jr,Bi,es,Ri,is,Ot,Mi,gr,$s,br,Ls,ji,rs,Vi,ss,yr,ks,Oi,ns,xr,Ms,U,Mt,ft,Oe,Ft,Fe,Ne,Ze,O,F,We,Ye,Ge,Ue,Ht,Xe,ne,N,mt,Ke,Je,Qe,gt,Nt,ae,ti,ei,ii,ri,si,Fi,ni,Ni,as,wr,Hs,Cr,Es,ai,Vr,Zi,os,oi,Or,_r,Ts,Ar,qs,Wi,hs,Yi,ds,Sr,Ds,$r,Is,bt,oe,he,yt,L,de,le,ce,Et,xt,Gi,Ui,Xi,hi,Fr,Lr,Ps,pe,Tt,T,D,di,Zt,Wt,qt,q,X,rt,Dt,Yt,kr,zs,Mr,Bs,Gt,Hi,li,Nr,Hr,Rs,Ut,Ei,ci,wt,Ki,It,ue,Er,js,Ji,ls,Pt,pi,ui,ve,fe,Ct,k,me,ge,be,_t,zt,ye,xe,Qi,vi,Zr,Tr,Vs,fi,mi,gi,At,bi,we,J,Bt,Xt,Kt,Ce,yi,xi,st,wi,qr,Os,Dr,Fs,Ir,Ns,_e,nr,Ci,St,Ae,Se,_i,$e,Ai,Si,$i,Li,Q,$t,tt,ki,Z,Jt,Wr,Le,ke,tr,cs,er,ps,ir,us,Pr,Zs;const y=window.HArvest;if(!y||!y.renderers||!y.renderers.BaseCard){console.warn("[HArvest Minimus] HArvest not found - pack not loaded.");return}const g=y.renderers.BaseCard;function l(u){return String(u??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function Rt(u,v){let e=null;return function(...i){e&&clearTimeout(e),e=setTimeout(()=>{e=null,u.apply(this,i)},v)}}function Me(u){return u?u.charAt(0).toUpperCase()+u.slice(1).replace(/_/g," "):""}const K=`
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
  `;function W(u){u.querySelectorAll("[part=companion]").forEach(v=>{v.title=v.getAttribute("aria-label")??""})}const Ws=60,Ys=60,Qt=48,R=225,w=270,at=2*Math.PI*Qt*(w/360);function Gs(u){return u*Math.PI/180}function et(u){const v=Gs(u);return{x:Ws+Qt*Math.cos(v),y:Ys-Qt*Math.sin(v)}}function Us(){const u=et(R),v=et(R-w);return`M ${u.x} ${u.y} A ${Qt} ${Qt} 0 1 1 ${v.x} ${v.y}`}const He=Us(),Ee=["brightness","temp","color"],ar=120;function vs(u){const v=w/ar;let e="";for(let i=0;i<ar;i++){const s=R-i*v,a=R-(i+1)*v,o=et(s),c=et(a),d=`M ${o.x} ${o.y} A ${Qt} ${Qt} 0 0 1 ${c.x} ${c.y}`,p=i===0||i===ar-1?"round":"butt";e+=`<path d="${d}" stroke="${u(i/ar)}" fill="none" stroke-width="8" stroke-linecap="${p}" />`}return e}const Xs=vs(u=>`hsl(${Math.round(u*360)},100%,50%)`),Ks=vs(u=>{const e=Math.round(143+112*u),i=Math.round(255*u);return`rgb(255,${e},${i})`}),Yr=`
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
  `,Js=`
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
  `;class Qs extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,Xr);r(this,hr);r(this,dr);r(this,lr);r(this,cr);r(this,Pe);r(this,ze);r(this,pr);r(this,ie);r(this,ur);r(this,vr);r(this,Di);r(this,Ii);r(this,fr);r(this,jt,null);r(this,E,null);r(this,Ti,null);r(this,I,null);r(this,ot,null);r(this,C,null);r(this,Y,null);r(this,Te,null);r(this,qe,null);r(this,ht,0);r(this,Lt,4e3);r(this,dt,0);r(this,lt,!1);r(this,te,!1);r(this,De,null);r(this,G,0);r(this,ct,2e3);r(this,ee,6500);r(this,qi,void 0);r(this,Ie,new Map);r(this,_,[]);n(this,qi,Rt(h(this,fr,Ss).bind(this),300))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=this.config.displayHints??{},a=s.show_brightness!==!1&&i.includes("brightness"),o=s.show_color_temp!==!1&&i.includes("color_temp"),c=s.show_rgb!==!1&&i.includes("rgb_color"),d=e&&(a||o||c),p=[a,o,c].filter(Boolean).length,f=e&&p>1;n(this,ct,this.def.feature_config?.min_color_temp_kelvin??2e3),n(this,ee,this.def.feature_config?.max_color_temp_kelvin??6500);const x=et(R);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Yr}${Js}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${d?"":"hrv-no-dial"}">
            ${d?`
              <div class="hrv-dial-column">
                <div class="hrv-dial-wrap" role="slider" aria-valuemin="0"
                  aria-valuemax="100" aria-valuenow="0"
                  aria-label="${l(this.def.friendly_name)} brightness"
                  title="Drag to adjust">
                  <svg viewBox="0 0 120 120">
                    <g class="hrv-dial-segs hrv-dial-segs-color">${Xs}</g>
                    <g class="hrv-dial-segs hrv-dial-segs-temp">${Ks}</g>
                    <path class="hrv-dial-track" d="${He}" />
                    <path class="hrv-dial-fill" d="${He}"
                      stroke-dasharray="${at}"
                      stroke-dashoffset="${at}" />
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
                  role="img" aria-label="${l(this.def.friendly_name)}"
                  title="Read-only">
                  <span part="ro-state-icon" aria-hidden="true"></span>
                </div>
                <div class="hrv-light-ro-dots">
                  ${a?'<span class="hrv-light-ro-dot" data-attr="brightness" title="Brightness"></span>':""}
                  ${o?'<span class="hrv-light-ro-dot" data-attr="temp" title="Color temperature"></span>':""}
                  ${c?'<span class="hrv-light-ro-dot" data-attr="color" title="Color"></span>':""}
                </div>
              </div>
            `}
            ${e?`
              <div class="hrv-dial-controls">
                ${f?`
                  <div class="hrv-mode-switch" data-pos="0" data-count="${p}"
                    role="radiogroup" aria-label="Dial mode" tabindex="0">
                    <div class="hrv-mode-switch-thumb"></div>
                    ${'<span class="hrv-mode-dot"></span>'.repeat(p)}
                  </div>
                `:""}
                <button part="toggle-button" type="button"
                  aria-label="${l(this.def.friendly_name)} - toggle"
                  title="Turn ${l(this.def.friendly_name)} on / off">
                  <div class="hrv-light-toggle-knob"></div>
                </button>
              </div>
            `:""}
          </div>
          ${d?"":this.renderCompanionZoneHTML()}
        </div>
      `,n(this,jt,this.root.querySelector("[part=toggle-button]")),n(this,E,this.root.querySelector(".hrv-dial-fill")),n(this,Ti,this.root.querySelector(".hrv-dial-track")),n(this,I,this.root.querySelector(".hrv-dial-thumb")),n(this,ot,this.root.querySelector(".hrv-dial-pct")),n(this,C,this.root.querySelector(".hrv-dial-wrap")),n(this,De,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,Te,this.root.querySelector(".hrv-dial-segs-color")),n(this,qe,this.root.querySelector(".hrv-dial-segs-temp")),n(this,Y,this.root.querySelector(".hrv-mode-switch")),t(this,jt)&&this._attachGestureHandlers(t(this,jt),{onTap:()=>{const b=this.config.gestureConfig?.tap;if(b){this._runAction(b);return}this.config.card?.sendCommand("toggle",{})}}),t(this,C)&&(t(this,C).addEventListener("pointerdown",h(this,ur,_s).bind(this)),t(this,C).addEventListener("pointermove",h(this,vr,As).bind(this)),t(this,C).addEventListener("pointerup",h(this,Di,Jr).bind(this)),t(this,C).addEventListener("pointercancel",h(this,Di,Jr).bind(this))),d&&h(this,hr,bs).call(this),t(this,Y)&&(t(this,Y).addEventListener("click",h(this,dr,ys).bind(this)),t(this,Y).addEventListener("keydown",h(this,cr,ws).bind(this)),t(this,Y).addEventListener("mousemove",h(this,lr,xs).bind(this))),h(this,ze,Br).call(this),this.root.querySelector("[part=ro-state-icon]")&&this.renderIcon(this.resolveIcon(this.def.icon,"mdi:lightbulb"),"ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach(b=>{b.title=b.getAttribute("aria-label")??"Companion";const M=b.getAttribute("data-entity");if(M&&t(this,Ie).has(M)){const S=t(this,Ie).get(M);b.setAttribute("data-on",String(S==="on"))}})}applyState(e,i){if(n(this,lt,e==="on"),n(this,ht,i?.brightness??0),i?.color_temp_kelvin!==void 0?n(this,Lt,i.color_temp_kelvin):i?.color_temp!==void 0&&i.color_temp>0&&n(this,Lt,Math.round(1e6/i.color_temp)),i?.hs_color)n(this,dt,Math.round(i.hs_color[0]));else if(i?.rgb_color){const[a,o,c]=i.rgb_color;n(this,dt,rn(a,o,c))}t(this,jt)&&t(this,jt).setAttribute("aria-pressed",String(t(this,lt)));const s=this.root.querySelector(".hrv-light-ro-circle");if(s){s.setAttribute("data-on",String(t(this,lt)));const a=t(this,lt)?"mdi:lightbulb":"mdi:lightbulb-outline",o=this.def.icon_state_map?.[e]??this.def.icon_state_map?.["*"]??this.def.icon??a;this.renderIcon(this.resolveIcon(o,a),"ro-state-icon");const c=i?.color_mode,d=c==="color_temp",p=c&&c!=="color_temp",f=this.root.querySelector('[data-attr="brightness"]');if(f){const M=Math.round(t(this,ht)/255*100);f.title=t(this,lt)?`Brightness: ${M}%`:"Brightness: off"}const x=this.root.querySelector('[data-attr="temp"]');x&&(x.title=`Color temperature: ${t(this,Lt)}K`,x.style.display=p?"none":"");const b=this.root.querySelector('[data-attr="color"]');if(b)if(b.style.display=d?"none":"",i?.rgb_color){const[M,S,m]=i.rgb_color;b.style.background=`rgb(${M},${S},${m})`,b.title=`Color: rgb(${M}, ${S}, ${m})`}else b.style.background=`hsl(${t(this,dt)}, 100%, 50%)`,b.title=`Color: hue ${t(this,dt)}°`}h(this,Pe,zr).call(this)}predictState(e,i){return e==="toggle"?{state:t(this,lt)?"off":"on",attributes:{brightness:t(this,ht)}}:e==="turn_on"&&i.brightness!==void 0?{state:"on",attributes:{brightness:i.brightness}}:null}updateCompanionState(e,i,s){t(this,Ie).set(e,i),super.updateCompanionState(e,i,s)}}jt=new WeakMap,E=new WeakMap,Ti=new WeakMap,I=new WeakMap,ot=new WeakMap,C=new WeakMap,Y=new WeakMap,Te=new WeakMap,qe=new WeakMap,ht=new WeakMap,Lt=new WeakMap,dt=new WeakMap,lt=new WeakMap,te=new WeakMap,De=new WeakMap,G=new WeakMap,ct=new WeakMap,ee=new WeakMap,qi=new WeakMap,Ie=new WeakMap,Xr=new WeakSet,Rn=function(){const e=this.def.supported_features??[],i=[];return e.includes("brightness")&&i.push("brightness"),e.includes("color_temp")&&i.push("temp"),e.includes("rgb_color")&&i.push("color"),i.length>0?i:["brightness"]},_=new WeakMap,hr=new WeakSet,bs=function(){const e=this.def.supported_features??[],i=[e.includes("brightness"),e.includes("color_temp"),e.includes("rgb_color")];n(this,_,[]),i[0]&&t(this,_).push(0),i[1]&&t(this,_).push(1),i[2]&&t(this,_).push(2),t(this,_).length===0&&t(this,_).push(0),t(this,_).includes(t(this,G))||n(this,G,t(this,_)[0])},dr=new WeakSet,ys=function(e){const i=t(this,Y).getBoundingClientRect(),s=e.clientY-i.top,a=i.height/3;let o;s<a?o=0:s<a*2?o=1:o=2,o=Math.min(o,t(this,_).length-1),n(this,G,t(this,_)[o]),t(this,Y).setAttribute("data-pos",String(o)),h(this,ze,Br).call(this),h(this,Pe,zr).call(this)},lr=new WeakSet,xs=function(e){const i={brightness:"Brightness",temp:"Color Temperature",color:"Color"},s=t(this,Y).getBoundingClientRect(),a=Math.min(Math.floor((e.clientY-s.top)/(s.height/t(this,_).length)),t(this,_).length-1),o=Ee[t(this,_)[Math.max(0,a)]];t(this,Y).title=`Dial mode: ${i[o]??o}`},cr=new WeakSet,ws=function(e){const i=t(this,_).indexOf(t(this,G));let s=i;if(e.key==="ArrowUp"||e.key==="ArrowLeft")s=Math.max(0,i-1);else if(e.key==="ArrowDown"||e.key==="ArrowRight")s=Math.min(t(this,_).length-1,i+1);else return;e.preventDefault(),n(this,G,t(this,_)[s]),t(this,Y).setAttribute("data-pos",String(s)),h(this,ze,Br).call(this),h(this,Pe,zr).call(this)},Pe=new WeakSet,zr=function(){t(this,I)&&(t(this,I).style.transition="none"),t(this,E)&&(t(this,E).style.transition="none"),h(this,pr,Cs).call(this),t(this,I)?.getBoundingClientRect(),t(this,E)?.getBoundingClientRect(),t(this,I)&&(t(this,I).style.transition=""),t(this,E)&&(t(this,E).style.transition="")},ze=new WeakSet,Br=function(){if(!t(this,E))return;const e=Ee[t(this,G)],i=e==="color"||e==="temp";t(this,Ti).style.display=i?"none":"",t(this,E).style.display=i?"none":"",t(this,Te)&&t(this,Te).classList.toggle("hrv-dial-segs-visible",e==="color"),t(this,qe)&&t(this,qe).classList.toggle("hrv-dial-segs-visible",e==="temp"),e==="brightness"&&t(this,E).setAttribute("stroke-dasharray",String(at));const s={brightness:"brightness",temp:"color temperature",color:"color"},a={brightness:"Drag to adjust brightness",temp:"Drag to adjust color temperature",color:"Drag to adjust color"};t(this,C)?.setAttribute("aria-label",`${l(this.def.friendly_name)} ${s[e]}`),t(this,C)&&(t(this,C).title=a[e])},pr=new WeakSet,Cs=function(){const e=Ee[t(this,G)];if(e==="brightness"){const i=t(this,lt)?t(this,ht):0;h(this,ie,rr).call(this,Math.round(i/255*100))}else if(e==="temp"){const i=Math.round((t(this,Lt)-t(this,ct))/(t(this,ee)-t(this,ct))*100);h(this,ie,rr).call(this,Math.max(0,Math.min(100,i)))}else{const i=Math.round(t(this,dt)/360*100);h(this,ie,rr).call(this,i)}},ie=new WeakSet,rr=function(e){const i=Ee[t(this,G)],s=e/100*w,a=et(R-s);if(t(this,I)?.setAttribute("cx",String(a.x)),t(this,I)?.setAttribute("cy",String(a.y)),t(this,De)?.setAttribute("cx",String(a.x)),t(this,De)?.setAttribute("cy",String(a.y)),i==="brightness"){const o=at*(1-e/100);t(this,E)?.setAttribute("stroke-dashoffset",String(o)),t(this,ot)&&(t(this,ot).textContent=e+"%"),t(this,C)?.setAttribute("aria-valuenow",String(e))}else if(i==="temp"){const o=Math.round(t(this,ct)+e/100*(t(this,ee)-t(this,ct)));t(this,ot)&&(t(this,ot).textContent=o+"K"),t(this,C)?.setAttribute("aria-valuenow",String(o))}else t(this,ot)&&(t(this,ot).textContent=Math.round(e/100*360)+"°"),t(this,C)?.setAttribute("aria-valuenow",String(Math.round(e/100*360)))},ur=new WeakSet,_s=function(e){n(this,te,!0),t(this,C)?.setPointerCapture(e.pointerId),h(this,Ii,Qr).call(this,e)},vr=new WeakSet,As=function(e){t(this,te)&&h(this,Ii,Qr).call(this,e)},Di=new WeakSet,Jr=function(e){if(t(this,te)){n(this,te,!1);try{t(this,C)?.releasePointerCapture(e.pointerId)}catch{}t(this,qi).call(this)}},Ii=new WeakSet,Qr=function(e){if(!t(this,C))return;const i=t(this,C).getBoundingClientRect(),s=i.left+i.width/2,a=i.top+i.height/2,o=e.clientX-s,c=-(e.clientY-a);let d=Math.atan2(c,o)*180/Math.PI;d<0&&(d+=360);let p=R-d;p<0&&(p+=360),p>w&&(p=p>w+(360-w)/2?0:w);const f=Math.round(p/w*100),x=Ee[t(this,G)];x==="brightness"?n(this,ht,Math.round(f/100*255)):x==="temp"?n(this,Lt,Math.round(t(this,ct)+f/100*(t(this,ee)-t(this,ct)))):n(this,dt,Math.round(f/100*360)),t(this,E)&&(t(this,E).style.transition="none"),t(this,I)&&(t(this,I).style.transition="none"),h(this,ie,rr).call(this,f)},fr=new WeakSet,Ss=function(){t(this,E)&&(t(this,E).style.transition=""),t(this,I)&&(t(this,I).style.transition="");const e=Ee[t(this,G)];e==="brightness"?t(this,ht)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("turn_on",{brightness:t(this,ht)}):e==="temp"?this.config.card?.sendCommand("turn_on",{color_temp_kelvin:t(this,Lt)}):this.config.card?.sendCommand("turn_on",{hs_color:[t(this,dt),100]})};const tn=Yr+`
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
  `;class en extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,je);r(this,se);r(this,zi);r(this,Ve);r(this,Bi);r(this,Ri);r(this,Ot);r(this,gr);r(this,br);r(this,ji);r(this,Vi);r(this,yr);r(this,Oi);r(this,xr);r(this,it,null);r(this,j,null);r(this,mr,null);r(this,P,null);r(this,Be,null);r(this,V,null);r(this,pt,null);r(this,ut,null);r(this,vt,null);r(this,z,!1);r(this,A,0);r(this,Vt,!1);r(this,kt,"forward");r(this,B,null);r(this,$,[]);r(this,re,!1);r(this,Re,null);r(this,Pi,void 0);n(this,Pi,Rt(h(this,yr,ks).bind(this),300)),n(this,$,e.feature_config?.preset_modes??[])}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=(this.config.displayHints??this.def.display_hints??{}).display_mode??null;let a=i.includes("set_speed");const o=i.includes("oscillate"),c=i.includes("direction"),d=i.includes("preset_mode");s==="on-off"&&(a=!1);let p=e&&a,f=p&&t(this,se,sr),x=f&&!t(this,$).length,b=f&&!!t(this,$).length;s==="continuous"?(f=!1,x=!1,b=!1):s==="stepped"?(b=!1,x=f&&!t(this,$).length):s==="cycle"&&(f=!0,b=!0,x=!1);const M=et(R);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${tn}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${p?x?"hrv-fan-horiz":"":"hrv-no-dial"}">
            ${p?`
              <div class="hrv-dial-column">
                ${x?`
                  <div class="hrv-fan-hspeed-wrap">
                    <div class="hrv-fan-hspeed-switch" role="group"
                      aria-label="${l(this.def.friendly_name)} speed"
                      data-on="false">
                      <div class="hrv-fan-hspeed-thumb"></div>
                      ${t(this,Ve,jr).map((m,H)=>`
                        <div class="hrv-fan-hspeed-dot" data-pct="${m}" data-idx="${H}"
                          data-active="false"
                          role="button" tabindex="0"
                          aria-label="Speed ${H+1} (${m}%)"
                          title="Speed ${H+1} (${m}%)"></div>
                      `).join("")}
                    </div>
                  </div>
                `:b?`
                  <div class="hrv-fan-stepped-wrap">
                    <button class="hrv-fan-speed-circle" part="speed-circle" type="button"
                      aria-pressed="false"
                      title="Click to increase fan speed"
                      aria-label="Click to increase fan speed"><svg class="hrv-fan-speed-svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13,19C13,17.59 13.5,16.3 14.3,15.28C14.17,14.97 14.03,14.65 13.86,14.34C14.26,14 14.57,13.59 14.77,13.11C15.26,13.21 15.78,13.39 16.25,13.67C17.07,13.25 18,13 19,13C20.05,13 21.03,13.27 21.89,13.74C21.95,13.37 22,12.96 22,12.5C22,8.92 18.03,8.13 14.33,10.13C14,9.73 13.59,9.42 13.11,9.22C13.3,8.29 13.74,7.24 14.73,6.75C17.09,5.57 17,2 12.5,2C8.93,2 8.14,5.96 10.13,9.65C9.72,9.97 9.4,10.39 9.21,10.87C8.28,10.68 7.23,10.25 6.73,9.26C5.56,6.89 2,7 2,11.5C2,15.07 5.95,15.85 9.64,13.87C9.96,14.27 10.39,14.59 10.88,14.79C10.68,15.71 10.24,16.75 9.26,17.24C6.9,18.42 7,22 11.5,22C12.31,22 13,21.78 13.5,21.41C13.19,20.67 13,19.86 13,19M20,15V18H23V20H20V23H18V20H15V18H18V15H20Z"/></svg></button>
                  </div>
                `:`
                  <div class="hrv-dial-wrap" role="slider"
                    aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                    aria-label="${l(this.def.friendly_name)} speed"
                    title="Drag to adjust fan speed">
                    <svg viewBox="0 0 120 120">
                      <path class="hrv-dial-track" d="${He}" />
                      <path class="hrv-dial-fill" d="${He}"
                        stroke-dasharray="${at}"
                        stroke-dashoffset="${at}" />
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
                  role="img" aria-label="${l(this.def.friendly_name)}"
                  title="Read-only">
                  <span part="ro-state-icon" aria-hidden="true"></span>
                </div>
              </div>
            `}
            ${e?`
              <div class="hrv-dial-controls">
                ${o?`
                  <button class="hrv-fan-feat-btn" data-feat="oscillate" type="button"
                    aria-label="Oscillate: off" title="Oscillate: off"></button>
                `:""}
                ${c?`
                  <button class="hrv-fan-feat-btn" data-feat="direction" type="button"
                    aria-label="Direction: forward" title="Direction: forward"></button>
                `:""}
                ${d?`
                  <button class="hrv-fan-feat-btn" data-feat="preset" type="button"
                    aria-label="Preset: none" title="Preset: none"></button>
                `:""}
                <button part="toggle-button" type="button"
                  aria-label="${l(this.def.friendly_name)} - toggle"
                  title="Turn ${l(this.def.friendly_name)} on / off">${p?"":'<span part="fan-onoff-icon" aria-hidden="true"></span>'}</button>
              </div>
            `:""}
          </div>
          ${p?"":this.renderCompanionZoneHTML()}
        </div>
      `,n(this,it,this.root.querySelector("[part=toggle-button]")),n(this,j,this.root.querySelector(".hrv-dial-fill")),n(this,mr,this.root.querySelector(".hrv-dial-track")),n(this,P,this.root.querySelector(".hrv-dial-thumb")),n(this,Be,this.root.querySelector(".hrv-dial-pct")),n(this,V,this.root.querySelector(".hrv-dial-wrap")),n(this,Re,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,pt,this.root.querySelector('[data-feat="oscillate"]')),n(this,ut,this.root.querySelector('[data-feat="direction"]')),n(this,vt,this.root.querySelector('[data-feat="preset"]')),t(this,it)&&!p&&(this.renderIcon(this.def.icon??"mdi:fan","fan-onoff-icon"),t(this,it).setAttribute("data-animate",String(!!this.config.animate))),this._attachGestureHandlers(t(this,it),{onTap:()=>{const m=this.config.gestureConfig?.tap;if(m){this._runAction(m);return}this.config.card?.sendCommand("toggle",{})}}),t(this,V)&&(t(this,V).addEventListener("pointerdown",h(this,gr,$s).bind(this)),t(this,V).addEventListener("pointermove",h(this,br,Ls).bind(this)),t(this,V).addEventListener("pointerup",h(this,ji,rs).bind(this)),t(this,V).addEventListener("pointercancel",h(this,ji,rs).bind(this))),this.root.querySelector(".hrv-fan-speed-circle")?.addEventListener("click",()=>{const m=t(this,Ve,jr);if(!m.length)return;let H;if(!t(this,z)||t(this,A)===0)H=m[0],n(this,z,!0),t(this,it)?.setAttribute("aria-pressed","true");else{const nt=m.findIndex(Bn=>Bn>t(this,A));H=nt===-1?m[0]:m[nt]}n(this,A,H),h(this,Bi,es).call(this),this.config.card?.sendCommand("set_percentage",{percentage:H})}),this.root.querySelectorAll(".hrv-fan-hspeed-dot").forEach(m=>{const H=()=>{const nt=Number(m.getAttribute("data-pct"));t(this,z)||(n(this,z,!0),t(this,it)?.setAttribute("aria-pressed","true")),n(this,A,nt),h(this,Ri,is).call(this),this.config.card?.sendCommand("set_percentage",{percentage:nt})};m.addEventListener("click",H),m.addEventListener("keydown",nt=>{(nt.key==="Enter"||nt.key===" ")&&(nt.preventDefault(),H())})}),t(this,pt)?.addEventListener("click",()=>{this.config.card?.sendCommand("oscillate",{oscillating:!t(this,Vt)})}),t(this,ut)?.addEventListener("click",()=>{const m=t(this,kt)==="forward"?"reverse":"forward";n(this,kt,m),h(this,Ot,Mi).call(this),this.config.card?.sendCommand("set_direction",{direction:m})}),t(this,vt)?.addEventListener("click",()=>{if(t(this,$).length){if(t(this,zi,ts)){const m=t(this,B)??t(this,$)[0];this.config.card?.sendCommand("set_preset_mode",{preset_mode:m});return}if(t(this,B)){const m=t(this,$).indexOf(t(this,B));if(m===-1||m===t(this,$).length-1){n(this,B,null),h(this,Ot,Mi).call(this);const H=t(this,je,Rr),nt=Math.floor(t(this,A)/H)*H||H;this.config.card?.sendCommand("set_percentage",{percentage:nt})}else{const H=t(this,$)[m+1];n(this,B,H),h(this,Ot,Mi).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:H})}}else{const m=t(this,$)[0];n(this,B,m),h(this,Ot,Mi).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:m})}}}),this.root.querySelector(".hrv-fan-ro-circle")&&this.renderIcon(this.def.icon??"mdi:fan","ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach(m=>{m.title=m.getAttribute("aria-label")??"Companion"})}applyState(e,i){n(this,z,e==="on"),n(this,A,i?.percentage??0),n(this,Vt,i?.oscillating??!1),n(this,kt,i?.direction??"forward"),n(this,B,i?.preset_mode??null),i?.preset_modes?.length&&n(this,$,i.preset_modes),t(this,it)&&t(this,it).setAttribute("aria-pressed",String(t(this,z)));const s=this.root.querySelector(".hrv-fan-ro-circle");s&&s.setAttribute("data-on",String(t(this,z))),t(this,se,sr)&&!t(this,$).length?h(this,Ri,is).call(this):t(this,se,sr)?h(this,Bi,es).call(this):h(this,xr,Ms).call(this),h(this,Ot,Mi).call(this),this.announceState(`${this.def.friendly_name}, ${e}`+(t(this,A)>0?`, ${t(this,A)}%`:""))}predictState(e,i){return e==="toggle"?{state:t(this,z)?"off":"on",attributes:{percentage:t(this,A)}}:e==="set_percentage"?{state:"on",attributes:{percentage:i.percentage,oscillating:t(this,Vt),direction:t(this,kt),preset_mode:t(this,B),preset_modes:t(this,$)}}:null}}it=new WeakMap,j=new WeakMap,mr=new WeakMap,P=new WeakMap,Be=new WeakMap,V=new WeakMap,pt=new WeakMap,ut=new WeakMap,vt=new WeakMap,z=new WeakMap,A=new WeakMap,Vt=new WeakMap,kt=new WeakMap,B=new WeakMap,$=new WeakMap,re=new WeakMap,Re=new WeakMap,Pi=new WeakMap,je=new WeakSet,Rr=function(){const e=this.def?.feature_config;return e?.percentage_step>1?e.percentage_step:e?.speed_count>1?100/e.speed_count:1},se=new WeakSet,sr=function(){return t(this,je,Rr)>1},zi=new WeakSet,ts=function(){return t(this,se,sr)&&t(this,$).length>0},Ve=new WeakSet,jr=function(){const e=t(this,je,Rr),i=[];for(let s=1;s*e<=100.001;s++)i.push(Math.floor(s*e*10)/10);return i},Bi=new WeakSet,es=function(){const e=this.root.querySelector(".hrv-fan-speed-circle");if(!e)return;e.setAttribute("aria-pressed",String(t(this,z)));const i=t(this,z)?"Click to increase fan speed":"Fan off - click to turn on";e.setAttribute("aria-label",i),e.title=i},Ri=new WeakSet,is=function(){const e=this.root.querySelector(".hrv-fan-hspeed-switch");if(!e)return;const i=e.querySelector(".hrv-fan-hspeed-thumb"),s=t(this,Ve,jr);let a=-1;if(t(this,z)&&t(this,A)>0){let o=1/0;s.forEach((c,d)=>{const p=Math.abs(c-t(this,A));p<o&&(o=p,a=d)})}e.setAttribute("data-on",String(a>=0)),i&&a>=0&&(i.style.left=`${2+a*32}px`),e.querySelectorAll(".hrv-fan-hspeed-dot").forEach((o,c)=>{o.setAttribute("data-active",String(c===a))})},Ot=new WeakSet,Mi=function(){const e=t(this,zi,ts);if(t(this,pt)){const i=e||t(this,Vt),s=e?"Oscillate":`Oscillate: ${t(this,Vt)?"on":"off"}`;t(this,pt).setAttribute("data-on",String(i)),t(this,pt).setAttribute("aria-pressed",String(i)),t(this,pt).setAttribute("aria-label",s),t(this,pt).title=s}if(t(this,ut)){const i=t(this,kt)!=="reverse",s=`Direction: ${t(this,kt)}`;t(this,ut).setAttribute("data-on",String(i)),t(this,ut).setAttribute("aria-pressed",String(i)),t(this,ut).setAttribute("aria-label",s),t(this,ut).title=s}if(t(this,vt)){const i=e||!!t(this,B),s=e?t(this,B)??t(this,$)[0]??"Preset":t(this,B)?`Preset: ${t(this,B)}`:"Preset: none";t(this,vt).setAttribute("data-on",String(i)),t(this,vt).setAttribute("aria-pressed",String(i)),t(this,vt).setAttribute("aria-label",s),t(this,vt).title=s}},gr=new WeakSet,$s=function(e){n(this,re,!0),t(this,V)?.setPointerCapture(e.pointerId),h(this,Vi,ss).call(this,e)},br=new WeakSet,Ls=function(e){t(this,re)&&h(this,Vi,ss).call(this,e)},ji=new WeakSet,rs=function(e){if(t(this,re)){n(this,re,!1);try{t(this,V)?.releasePointerCapture(e.pointerId)}catch{}t(this,Pi).call(this)}},Vi=new WeakSet,ss=function(e){if(!t(this,V))return;const i=t(this,V).getBoundingClientRect(),s=i.left+i.width/2,a=i.top+i.height/2,o=e.clientX-s,c=-(e.clientY-a);let d=Math.atan2(c,o)*180/Math.PI;d<0&&(d+=360);let p=R-d;p<0&&(p+=360),p>w&&(p=p>w+(360-w)/2?0:w),n(this,A,Math.round(p/w*100)),t(this,j)&&(t(this,j).style.transition="none"),t(this,P)&&(t(this,P).style.transition="none"),h(this,Oi,ns).call(this,t(this,A))},yr=new WeakSet,ks=function(){t(this,j)&&(t(this,j).style.transition=""),t(this,P)&&(t(this,P).style.transition=""),t(this,A)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("set_percentage",{percentage:t(this,A)})},Oi=new WeakSet,ns=function(e){const i=at*(1-e/100),s=et(R-e/100*w);t(this,j)?.setAttribute("stroke-dashoffset",String(i)),t(this,P)?.setAttribute("cx",String(s.x)),t(this,P)?.setAttribute("cy",String(s.y)),t(this,Re)?.setAttribute("cx",String(s.x)),t(this,Re)?.setAttribute("cy",String(s.y)),t(this,Be)&&(t(this,Be).textContent=`${e}%`),t(this,V)?.setAttribute("aria-valuenow",String(e))},xr=new WeakSet,Ms=function(){t(this,P)&&(t(this,P).style.transition="none"),t(this,j)&&(t(this,j).style.transition="none"),h(this,Oi,ns).call(this,t(this,z)?t(this,A):0),t(this,P)?.getBoundingClientRect(),t(this,j)?.getBoundingClientRect(),t(this,P)&&(t(this,P).style.transition=""),t(this,j)&&(t(this,j).style.transition="")};function rn(u,v,e){u/=255,v/=255,e/=255;const i=Math.max(u,v,e),s=Math.min(u,v,e),a=i-s;if(a===0)return 0;let o;return i===u?o=(v-e)/a%6:i===v?o=(e-u)/a+2:o=(u-v)/a+4,Math.round((o*60+360)%360)}const sn=Yr+`
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
  `;class nn extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,Ni);r(this,wr);r(this,Cr);r(this,ai);r(this,Zi);r(this,oi);r(this,_r);r(this,Ar);r(this,Wi);r(this,Yi);r(this,Sr);r(this,$r);r(this,U,null);r(this,Mt,null);r(this,ft,null);r(this,Oe,null);r(this,Ft,!1);r(this,Fe,null);r(this,Ne,null);r(this,Ze,null);r(this,O,null);r(this,F,null);r(this,We,null);r(this,Ye,null);r(this,Ge,null);r(this,Ue,null);r(this,Ht,null);r(this,Xe,null);r(this,ne,null);r(this,N,20);r(this,mt,"off");r(this,Ke,null);r(this,Je,null);r(this,Qe,null);r(this,gt,16);r(this,Nt,32);r(this,ae,.5);r(this,ti,"°C");r(this,ei,[]);r(this,ii,[]);r(this,ri,[]);r(this,si,[]);r(this,Fi,{});r(this,ni,void 0);n(this,ni,Rt(h(this,Sr,Ds).bind(this),500))}render(){const e=this.def.capabilities==="read-write",i=this.config.displayHints??{},s=this.def.supported_features?.includes("target_temperature"),a=i.show_fan_mode!==!1&&(this.def.supported_features?.includes("fan_mode")||this.def.feature_config?.fan_modes?.length>0),o=i.show_presets!==!1&&(this.def.supported_features?.includes("preset_mode")||this.def.feature_config?.preset_modes?.length>0),c=i.show_swing_mode!==!1&&(this.def.supported_features?.includes("swing_mode")||this.def.feature_config?.swing_modes?.length>0);n(this,gt,this.def.feature_config?.min_temp??16),n(this,Nt,this.def.feature_config?.max_temp??32),n(this,ae,this.def.feature_config?.temp_step??.5),n(this,ti,this.def.unit_of_measurement??"°C"),n(this,ei,this.def.feature_config?.hvac_modes??["off","heat","cool","heat_cool","auto","dry","fan_only"]),n(this,ii,this.def.feature_config?.fan_modes??[]),n(this,ri,this.def.feature_config?.preset_modes??[]),n(this,si,this.def.feature_config?.swing_modes??[]);const d=h(this,Ni,as).call(this,t(this,N)),p=et(R),f=et(R-d/100*w),x=at*(1-d/100),[b,M]=t(this,N).toFixed(1).split(".");this.root.innerHTML=`
        <style>${this.getSharedStyles()}${sn}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e&&s?`
              <div class="hrv-dial-wrap">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <path class="hrv-dial-track" d="${He}"/>
                  <path class="hrv-dial-fill" d="${He}"
                    stroke-dasharray="${at}" stroke-dashoffset="${x}"/>
                  <circle class="hrv-dial-thumb" r="7" cx="${f.x}" cy="${f.y}"><title>Drag to set temperature</title></circle>
                  <circle class="hrv-dial-thumb-hit" r="16" cx="${f.x}" cy="${f.y}"><title>Drag to set temperature</title></circle>
                </svg>
                <div class="hrv-climate-center">
                  <span class="hrv-climate-state-text"></span>
                  <div class="hrv-climate-temp-row">
                    <span class="hrv-climate-temp-int">${l(b)}</span><span class="hrv-climate-temp-frac">.${l(M)}</span><span class="hrv-climate-temp-unit">${l(t(this,ti))}</span>
                  </div>
                </div>
              </div>
              <div class="hrv-climate-stepper">
                <button class="hrv-climate-step" type="button" aria-label="Decrease temperature" title="Decrease temperature" data-dir="-">&#8722;</button>
                <button class="hrv-climate-step" type="button" aria-label="Increase temperature" title="Increase temperature" data-dir="+">+</button>
              </div>
            `:!e&&s?`
              <div class="hrv-climate-ro-temp">
                <div class="hrv-climate-ro-temp-row">
                  <span class="hrv-climate-ro-temp-int">${l(b)}</span><span class="hrv-climate-ro-temp-frac">.${l(M)}</span><span class="hrv-climate-ro-temp-unit">${l(t(this,ti))}</span>
                </div>
              </div>
            `:""}
            <div class="hrv-climate-grid">
              ${i.show_hvac_modes!==!1&&t(this,ei).length?`
                <button class="hrv-cf-btn" data-feat="mode" type="button"
                  ${e?'title="Change HVAC mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${o&&t(this,ri).length?`
                <button class="hrv-cf-btn" data-feat="preset" type="button"
                  ${e?'title="Change preset mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Preset</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${a&&t(this,ii).length?`
                <button class="hrv-cf-btn" data-feat="fan" type="button"
                  ${e?'title="Change fan mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Fan mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${c&&t(this,si).length?`
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
      `,n(this,U,this.root.querySelector(".hrv-dial-wrap")),n(this,Mt,this.root.querySelector(".hrv-dial-fill")),n(this,ft,this.root.querySelector(".hrv-dial-thumb")),n(this,Oe,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,Fe,this.root.querySelector(".hrv-climate-state-text")),n(this,Ne,this.root.querySelector(".hrv-climate-temp-int")),n(this,Ze,this.root.querySelector(".hrv-climate-temp-frac")),n(this,O,this.root.querySelector("[data-dir='-']")),n(this,F,this.root.querySelector("[data-dir='+']")),n(this,We,this.root.querySelector("[data-feat=mode]")),n(this,Ye,this.root.querySelector("[data-feat=fan]")),n(this,Ge,this.root.querySelector("[data-feat=preset]")),n(this,Ue,this.root.querySelector("[data-feat=swing]")),n(this,Ht,this.root.querySelector(".hrv-climate-dropdown")),t(this,U)&&(t(this,U).addEventListener("pointerdown",h(this,_r,Ts).bind(this)),t(this,U).addEventListener("pointermove",h(this,Ar,qs).bind(this)),t(this,U).addEventListener("pointerup",h(this,Wi,hs).bind(this)),t(this,U).addEventListener("pointercancel",h(this,Wi,hs).bind(this))),t(this,O)&&(t(this,O).addEventListener("click",()=>h(this,Zi,os).call(this,-1)),t(this,O).addEventListener("pointerdown",()=>t(this,O).setAttribute("data-pressing","true")),t(this,O).addEventListener("pointerup",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointerleave",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointercancel",()=>t(this,O).removeAttribute("data-pressing"))),t(this,F)&&(t(this,F).addEventListener("click",()=>h(this,Zi,os).call(this,1)),t(this,F).addEventListener("pointerdown",()=>t(this,F).setAttribute("data-pressing","true")),t(this,F).addEventListener("pointerup",()=>t(this,F).removeAttribute("data-pressing")),t(this,F).addEventListener("pointerleave",()=>t(this,F).removeAttribute("data-pressing")),t(this,F).addEventListener("pointercancel",()=>t(this,F).removeAttribute("data-pressing"))),e&&[t(this,We),t(this,Ye),t(this,Ge),t(this,Ue)].forEach(S=>{if(!S)return;const m=S.getAttribute("data-feat");S.addEventListener("click",()=>h(this,Cr,Es).call(this,m)),S.addEventListener("pointerdown",()=>S.setAttribute("data-pressing","true")),S.addEventListener("pointerup",()=>S.removeAttribute("data-pressing")),S.addEventListener("pointerleave",()=>S.removeAttribute("data-pressing")),S.addEventListener("pointercancel",()=>S.removeAttribute("data-pressing"))}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,Fi,{...i}),n(this,mt,e),n(this,Ke,i.fan_mode??null),n(this,Je,i.preset_mode??null),n(this,Qe,i.swing_mode??null),!t(this,Ft)&&i.temperature!==void 0&&(n(this,N,i.temperature),h(this,oi,Or).call(this)),t(this,Fe)&&(t(this,Fe).textContent=Me(i.hvac_action??e));const s=this.root.querySelector(".hrv-climate-ro-temp-int"),a=this.root.querySelector(".hrv-climate-ro-temp-frac");if(s&&i.temperature!==void 0){n(this,N,i.temperature);const[d,p]=t(this,N).toFixed(1).split(".");s.textContent=d,a.textContent=`.${p}`}h(this,$r,Is).call(this);const o=i.hvac_action??e,c=Me(o);this.announceState(`${this.def.friendly_name}, ${c}`)}predictState(e,i){const s={...t(this,Fi)};return e==="set_hvac_mode"&&i.hvac_mode?{state:i.hvac_mode,attributes:s}:e==="set_temperature"&&i.temperature!==void 0?{state:t(this,mt),attributes:{...s,temperature:i.temperature}}:e==="set_fan_mode"&&i.fan_mode?{state:t(this,mt),attributes:{...s,fan_mode:i.fan_mode}}:e==="set_preset_mode"&&i.preset_mode?{state:t(this,mt),attributes:{...s,preset_mode:i.preset_mode}}:e==="set_swing_mode"&&i.swing_mode?{state:t(this,mt),attributes:{...s,swing_mode:i.swing_mode}}:null}}U=new WeakMap,Mt=new WeakMap,ft=new WeakMap,Oe=new WeakMap,Ft=new WeakMap,Fe=new WeakMap,Ne=new WeakMap,Ze=new WeakMap,O=new WeakMap,F=new WeakMap,We=new WeakMap,Ye=new WeakMap,Ge=new WeakMap,Ue=new WeakMap,Ht=new WeakMap,Xe=new WeakMap,ne=new WeakMap,N=new WeakMap,mt=new WeakMap,Ke=new WeakMap,Je=new WeakMap,Qe=new WeakMap,gt=new WeakMap,Nt=new WeakMap,ae=new WeakMap,ti=new WeakMap,ei=new WeakMap,ii=new WeakMap,ri=new WeakMap,si=new WeakMap,Fi=new WeakMap,ni=new WeakMap,Ni=new WeakSet,as=function(e){return Math.max(0,Math.min(100,(e-t(this,gt))/(t(this,Nt)-t(this,gt))*100))},wr=new WeakSet,Hs=function(e){const i=t(this,gt)+e/100*(t(this,Nt)-t(this,gt)),s=Math.round(i/t(this,ae))*t(this,ae);return Math.max(t(this,gt),Math.min(t(this,Nt),+s.toFixed(10)))},Cr=new WeakSet,Es=function(e){if(t(this,Xe)===e){h(this,ai,Vr).call(this);return}n(this,Xe,e);let i=[],s=null,a="",o="";switch(e){case"mode":i=t(this,ei),s=t(this,mt),a="set_hvac_mode",o="hvac_mode";break;case"fan":i=t(this,ii),s=t(this,Ke),a="set_fan_mode",o="fan_mode";break;case"preset":i=t(this,ri),s=t(this,Je),a="set_preset_mode",o="preset_mode";break;case"swing":i=t(this,si),s=t(this,Qe),a="set_swing_mode",o="swing_mode";break}if(!i.length||!t(this,Ht))return;t(this,Ht).innerHTML=i.map(d=>`
        <button class="hrv-cf-option" data-active="${d===s}" type="button">
          ${l(Me(d))}
        </button>
      `).join(""),t(this,Ht).querySelectorAll(".hrv-cf-option").forEach((d,p)=>{d.addEventListener("click",()=>{this.config.card?.sendCommand(a,{[o]:i[p]}),h(this,ai,Vr).call(this)})}),t(this,Ht).removeAttribute("hidden");const c=d=>{d.composedPath().some(f=>f===this.root||f===this.root.host)||h(this,ai,Vr).call(this)};n(this,ne,c),document.addEventListener("pointerdown",c,!0)},ai=new WeakSet,Vr=function(){n(this,Xe,null),t(this,Ht)?.setAttribute("hidden",""),t(this,ne)&&(document.removeEventListener("pointerdown",t(this,ne),!0),n(this,ne,null))},Zi=new WeakSet,os=function(e){const i=Math.round((t(this,N)+e*t(this,ae))*100)/100;n(this,N,Math.max(t(this,gt),Math.min(t(this,Nt),i))),h(this,oi,Or).call(this),t(this,ni).call(this)},oi=new WeakSet,Or=function(){const e=h(this,Ni,as).call(this,t(this,N)),i=at*(1-e/100),s=et(R-e/100*w);t(this,Mt)?.setAttribute("stroke-dashoffset",String(i)),t(this,ft)?.setAttribute("cx",String(s.x)),t(this,ft)?.setAttribute("cy",String(s.y)),t(this,Oe)?.setAttribute("cx",String(s.x)),t(this,Oe)?.setAttribute("cy",String(s.y));const[a,o]=t(this,N).toFixed(1).split(".");t(this,Ne)&&(t(this,Ne).textContent=a),t(this,Ze)&&(t(this,Ze).textContent=`.${o}`)},_r=new WeakSet,Ts=function(e){n(this,Ft,!0),t(this,U)?.setPointerCapture(e.pointerId),h(this,Yi,ds).call(this,e)},Ar=new WeakSet,qs=function(e){t(this,Ft)&&h(this,Yi,ds).call(this,e)},Wi=new WeakSet,hs=function(e){if(t(this,Ft)){n(this,Ft,!1);try{t(this,U)?.releasePointerCapture(e.pointerId)}catch{}t(this,Mt)&&(t(this,Mt).style.transition=""),t(this,ft)&&(t(this,ft).style.transition="")}},Yi=new WeakSet,ds=function(e){if(!t(this,U))return;const i=t(this,U).getBoundingClientRect(),s=i.left+i.width/2,a=i.top+i.height/2,o=e.clientX-s,c=-(e.clientY-a);let d=Math.atan2(c,o)*180/Math.PI;d<0&&(d+=360);let p=R-d;p<0&&(p+=360),p>w&&(p=p>w+(360-w)/2?0:w),n(this,N,h(this,wr,Hs).call(this,p/w*100)),t(this,Mt)&&(t(this,Mt).style.transition="none"),t(this,ft)&&(t(this,ft).style.transition="none"),h(this,oi,Or).call(this),t(this,ni).call(this)},Sr=new WeakSet,Ds=function(){this.config.card?.sendCommand("set_temperature",{temperature:t(this,N)})},$r=new WeakSet,Is=function(){const e=(i,s)=>{if(!i)return;const a=i.querySelector(".hrv-cf-value");a&&(a.textContent=Me(s??"None"))};e(t(this,We),t(this,mt)),e(t(this,Ye),t(this,Ke)),e(t(this,Ge),t(this,Je)),e(t(this,Ue),t(this,Qe))};const an=`
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
  `;class on extends g{constructor(){super(...arguments);r(this,bt,null)}render(){const e=this.def.capabilities==="read-write",i=this.def.friendly_name;this.root.innerHTML=`
        <style>${this.getSharedStyles()}${an}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(i)}</span>
          </div>
          <div part="card-body">
            <button part="trigger-button" type="button"
              aria-label="${l(i)}"
              title="${e?l(i):"Read-only"}"
              ${e?"":"disabled"}>
              <span part="btn-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,bt,this.root.querySelector("[part=trigger-button]")),this.renderIcon(this.def.icon_state_map?.idle??this.def.icon??"mdi:play","btn-icon"),t(this,bt)&&e&&this._attachGestureHandlers(t(this,bt),{onTap:()=>{const s=this.config.gestureConfig?.tap;if(s){this._runAction(s);return}t(this,bt).disabled=!0,this.config.card?.sendCommand("trigger",{})}}),this.renderCompanions(),W(this.root)}applyState(e,i){const s=e==="triggered";t(this,bt)&&(t(this,bt).setAttribute("data-state",e),this.def.capabilities==="read-write"&&(t(this,bt).disabled=s));const a=this.def.icon_state_map?.[e]??this.def.icon??"mdi:play";this.renderIcon(a,"btn-icon"),s&&this.announceState(`${this.def.friendly_name}, ${this.i18n.t("state.triggered")}`)}predictState(e,i){return e!=="trigger"?null:{state:"triggered",attributes:{}}}}bt=new WeakMap;const hn=`
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
  `;class dn extends g{constructor(){super(...arguments);r(this,oe,null)}render(){this.root.innerHTML=`
        <style>${this.getSharedStyles()}${hn}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-bs-circle" data-on="false"
              role="img" aria-label="${l(this.def.friendly_name)}">
              <span part="state-icon" aria-hidden="true"></span>
            </div>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,oe,this.root.querySelector(".hrv-bs-circle")),this.renderIcon(this.def.icon_state_map?.off??this.def.icon??"mdi:radiobox-blank","state-icon"),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){const s=e==="on",a=this.i18n.t(`state.${e}`)!==`state.${e}`?this.i18n.t(`state.${e}`):e;t(this,oe)&&(t(this,oe).setAttribute("data-on",String(s)),t(this,oe).setAttribute("aria-label",`${this.def.friendly_name}: ${a}`));const o=this.def.icon_state_map?.[e]??this.def.icon??(s?"mdi:radiobox-marked":"mdi:radiobox-blank");this.renderIcon(o,"state-icon"),this.announceState(`${this.def.friendly_name}, ${a}`)}}oe=new WeakMap;const ln='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 14h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V10z" opacity="0.3"/><path d="M3 4h18v2H3V4zm0 16h18v2H3v-2z"/></svg>',cn='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',pn='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>',un=`
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
  `;class vn extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,hi);r(this,Lr);r(this,he,null);r(this,yt,null);r(this,L,null);r(this,de,null);r(this,le,null);r(this,ce,null);r(this,Et,!1);r(this,xt,0);r(this,Gi,"closed");r(this,Ui,{});r(this,Xi,void 0);n(this,Xi,Rt(h(this,Lr,Ps).bind(this),300))}render(){const e=this.def.capabilities==="read-write",s=(this.config.displayHints??{}).show_position!==!1&&this.def.supported_features?.includes("set_position"),a=!this.def.supported_features||this.def.supported_features.includes("buttons");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${un}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${s?`
              <div class="hrv-cover-slider-wrap" title="${e?"Drag to set position":"Read-only"}">
                <div class="hrv-cover-slider-track" ${e?"":'style="cursor:not-allowed"'}>
                  <div class="hrv-cover-slider-fill" style="width:0%"></div>
                  <div class="hrv-cover-slider-thumb" style="left:0%;${e?"":"cursor:not-allowed;pointer-events:none"}"></div>
                </div>
              </div>
            `:""}
            ${e&&a?`
              <div class="hrv-cover-btns">
                <button class="hrv-cover-btn" data-action="open" type="button"
                  title="Open cover" aria-label="Open cover">${ln}</button>
                <button class="hrv-cover-btn" data-action="stop" type="button"
                  title="Stop cover" aria-label="Stop cover">${cn}</button>
                <button class="hrv-cover-btn" data-action="close" type="button"
                  title="Close cover" aria-label="Close cover">${pn}</button>
              </div>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,he,this.root.querySelector(".hrv-cover-slider-track")),n(this,yt,this.root.querySelector(".hrv-cover-slider-fill")),n(this,L,this.root.querySelector(".hrv-cover-slider-thumb")),n(this,de,this.root.querySelector("[data-action=open]")),n(this,le,this.root.querySelector("[data-action=stop]")),n(this,ce,this.root.querySelector("[data-action=close]")),t(this,he)&&t(this,L)&&e){const o=d=>{n(this,Et,!0),t(this,L).style.transition="none",t(this,yt).style.transition="none",h(this,hi,Fr).call(this,d),t(this,L).setPointerCapture(d.pointerId)};t(this,L).addEventListener("pointerdown",o),t(this,he).addEventListener("pointerdown",d=>{d.target!==t(this,L)&&(n(this,Et,!0),t(this,L).style.transition="none",t(this,yt).style.transition="none",h(this,hi,Fr).call(this,d),t(this,L).setPointerCapture(d.pointerId))}),t(this,L).addEventListener("pointermove",d=>{t(this,Et)&&h(this,hi,Fr).call(this,d)});const c=()=>{t(this,Et)&&(n(this,Et,!1),t(this,L).style.transition="",t(this,yt).style.transition="",t(this,Xi).call(this))};t(this,L).addEventListener("pointerup",c),t(this,L).addEventListener("pointercancel",c)}[t(this,de),t(this,le),t(this,ce)].forEach(o=>{if(!o)return;const c=o.getAttribute("data-action");o.addEventListener("click",()=>{this.config.card?.sendCommand(`${c}_cover`,{})}),o.addEventListener("pointerdown",()=>o.setAttribute("data-pressing","true")),o.addEventListener("pointerup",()=>o.removeAttribute("data-pressing")),o.addEventListener("pointerleave",()=>o.removeAttribute("data-pressing")),o.addEventListener("pointercancel",()=>o.removeAttribute("data-pressing"))}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,Gi,e),n(this,Ui,{...i});const s=e==="opening"||e==="closing",a=i.current_position;t(this,de)&&(t(this,de).disabled=!s&&a===100),t(this,le)&&(t(this,le).disabled=!s),t(this,ce)&&(t(this,ce).disabled=!s&&e==="closed"),i.current_position!==void 0&&!t(this,Et)&&(n(this,xt,i.current_position),t(this,yt)&&(t(this,yt).style.width=`${t(this,xt)}%`),t(this,L)&&(t(this,L).style.left=`${t(this,xt)}%`)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){const s={...t(this,Ui)};return e==="open_cover"?(s.current_position=100,{state:"open",attributes:s}):e==="close_cover"?(s.current_position=0,{state:"closed",attributes:s}):e==="stop_cover"?{state:t(this,Gi),attributes:s}:e==="set_cover_position"&&i.position!==void 0?(s.current_position=i.position,{state:i.position>0?"open":"closed",attributes:s}):null}}he=new WeakMap,yt=new WeakMap,L=new WeakMap,de=new WeakMap,le=new WeakMap,ce=new WeakMap,Et=new WeakMap,xt=new WeakMap,Gi=new WeakMap,Ui=new WeakMap,Xi=new WeakMap,hi=new WeakSet,Fr=function(e){const i=t(this,he).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,xt,Math.round(s)),t(this,yt).style.width=`${t(this,xt)}%`,t(this,L).style.left=`${t(this,xt)}%`},Lr=new WeakSet,Ps=function(){this.config.card?.sendCommand("set_cover_position",{position:t(this,xt)})};const fn=`
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
  `;class mn extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,kr);r(this,Mr);r(this,Gt);r(this,li);r(this,Hr);r(this,Ut);r(this,pe,null);r(this,Tt,null);r(this,T,null);r(this,D,null);r(this,di,null);r(this,Zt,null);r(this,Wt,null);r(this,qt,!1);r(this,q,0);r(this,X,0);r(this,rt,100);r(this,Dt,1);r(this,Yt,void 0);n(this,Yt,Rt(h(this,Hr,Rs).bind(this),300))}render(){const e=this.def.capabilities==="read-write",s=(this.config.displayHints?.display_mode??null)!=="buttons";n(this,X,this.def.feature_config?.min??0),n(this,rt,this.def.feature_config?.max??100),n(this,Dt,this.def.feature_config?.step??1);const a=this.def.unit_of_measurement??"";if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${fn}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e?`
              ${s?`
                <div class="hrv-num-slider-wrap" title="Drag to set value">
                  <div class="hrv-num-slider-track">
                    <div class="hrv-num-slider-fill" style="width:0%"></div>
                    <div class="hrv-num-slider-thumb" style="left:0%"></div>
                  </div>
                </div>
              `:""}
              <div class="hrv-num-input-row">
                <button class="hrv-num-btn" type="button" part="dec-btn"
                  aria-label="Decrease ${l(this.def.friendly_name)}">-</button>
                <input class="hrv-num-input" type="number"
                  min="${t(this,X)}" max="${t(this,rt)}" step="${t(this,Dt)}"
                  title="Enter value" aria-label="${l(this.def.friendly_name)} value">
                <button class="hrv-num-btn" type="button" part="inc-btn"
                  aria-label="Increase ${l(this.def.friendly_name)}">+</button>
                ${a?`<span class="hrv-num-unit">${l(a)}</span>`:""}
              </div>
            `:`
              <div class="hrv-num-readonly">
                <span class="hrv-num-readonly-val">-</span>
                ${a?`<span class="hrv-num-readonly-unit">${l(a)}</span>`:""}
              </div>
            `}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,pe,this.root.querySelector(".hrv-num-slider-track")),n(this,Tt,this.root.querySelector(".hrv-num-slider-fill")),n(this,T,this.root.querySelector(".hrv-num-slider-thumb")),n(this,D,this.root.querySelector(".hrv-num-input")),n(this,di,this.root.querySelector(".hrv-num-readonly-val")),n(this,Zt,this.root.querySelector("[part=dec-btn]")),n(this,Wt,this.root.querySelector("[part=inc-btn]")),t(this,pe)&&t(this,T)){const o=d=>{n(this,qt,!0),t(this,T).style.transition="none",t(this,Tt).style.transition="none",h(this,li,Nr).call(this,d),t(this,T).setPointerCapture(d.pointerId)};t(this,T).addEventListener("pointerdown",o),t(this,pe).addEventListener("pointerdown",d=>{d.target!==t(this,T)&&(n(this,qt,!0),t(this,T).style.transition="none",t(this,Tt).style.transition="none",h(this,li,Nr).call(this,d),t(this,T).setPointerCapture(d.pointerId))}),t(this,T).addEventListener("pointermove",d=>{t(this,qt)&&h(this,li,Nr).call(this,d)});const c=()=>{t(this,qt)&&(n(this,qt,!1),t(this,T).style.transition="",t(this,Tt).style.transition="",t(this,Yt).call(this))};t(this,T).addEventListener("pointerup",c),t(this,T).addEventListener("pointercancel",c)}t(this,D)&&t(this,D).addEventListener("input",()=>{const o=parseFloat(t(this,D).value);isNaN(o)||(n(this,q,Math.max(t(this,X),Math.min(t(this,rt),o))),h(this,Gt,Hi).call(this),h(this,Ut,Ei).call(this),t(this,Yt).call(this))}),t(this,Zt)&&t(this,Zt).addEventListener("click",()=>{n(this,q,+Math.max(t(this,X),t(this,q)-t(this,Dt)).toFixed(10)),h(this,Gt,Hi).call(this),t(this,D)&&(t(this,D).value=String(t(this,q))),h(this,Ut,Ei).call(this),t(this,Yt).call(this)}),t(this,Wt)&&t(this,Wt).addEventListener("click",()=>{n(this,q,+Math.min(t(this,rt),t(this,q)+t(this,Dt)).toFixed(10)),h(this,Gt,Hi).call(this),t(this,D)&&(t(this,D).value=String(t(this,q))),h(this,Ut,Ei).call(this),t(this,Yt).call(this)}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){const s=parseFloat(e);if(isNaN(s))return;n(this,q,s),t(this,qt)||(h(this,Gt,Hi).call(this),t(this,D)&&!this.isFocused(t(this,D))&&(t(this,D).value=String(s))),h(this,Ut,Ei).call(this),t(this,di)&&(t(this,di).textContent=String(s));const a=this.def.unit_of_measurement??"";this.announceState(`${this.def.friendly_name}, ${s}${a?` ${a}`:""}`)}predictState(e,i){return e==="set_value"&&i.value!==void 0?{state:String(i.value),attributes:{}}:null}}pe=new WeakMap,Tt=new WeakMap,T=new WeakMap,D=new WeakMap,di=new WeakMap,Zt=new WeakMap,Wt=new WeakMap,qt=new WeakMap,q=new WeakMap,X=new WeakMap,rt=new WeakMap,Dt=new WeakMap,Yt=new WeakMap,kr=new WeakSet,zs=function(e){const i=t(this,rt)-t(this,X);return i===0?0:Math.max(0,Math.min(100,(e-t(this,X))/i*100))},Mr=new WeakSet,Bs=function(e){const i=t(this,X)+e/100*(t(this,rt)-t(this,X)),s=Math.round(i/t(this,Dt))*t(this,Dt);return Math.max(t(this,X),Math.min(t(this,rt),+s.toFixed(10)))},Gt=new WeakSet,Hi=function(){const e=h(this,kr,zs).call(this,t(this,q));t(this,Tt)&&(t(this,Tt).style.width=`${e}%`),t(this,T)&&(t(this,T).style.left=`${e}%`)},li=new WeakSet,Nr=function(e){const i=t(this,pe).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,q,h(this,Mr,Bs).call(this,s)),h(this,Gt,Hi).call(this),t(this,D)&&(t(this,D).value=String(t(this,q))),h(this,Ut,Ei).call(this)},Hr=new WeakSet,Rs=function(){this.config.card?.sendCommand("set_value",{value:t(this,q)})},Ut=new WeakSet,Ei=function(){t(this,Zt)&&(t(this,Zt).disabled=t(this,q)<=t(this,X)),t(this,Wt)&&(t(this,Wt).disabled=t(this,q)>=t(this,rt))};const gn=`
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
  `;class bn extends g{constructor(){super(...arguments);r(this,Er);r(this,Ji);r(this,ci,null);r(this,wt,null);r(this,Ki,"");r(this,It,[]);r(this,ue,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${gn}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-is-selected" type="button"
              ${e?'title="Select an option"':'data-readonly="true" title="Read-only" disabled'}
              aria-label="${l(this.def.friendly_name)}">
              <span class="hrv-is-label">-</span>
              ${e?'<span class="hrv-is-arrow" aria-hidden="true">&#9660;</span>':""}
            </button>
            ${e?'<div class="hrv-is-dropdown" hidden></div>':""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,ci,this.root.querySelector(".hrv-is-selected")),n(this,wt,this.root.querySelector(".hrv-is-dropdown")),t(this,ci)&&e&&t(this,ci).addEventListener("click",()=>{t(this,ue)?h(this,Ji,ls).call(this):h(this,Er,js).call(this)}),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,Ki,e),n(this,It,i?.options??t(this,It));const s=this.root.querySelector(".hrv-is-label");s&&(s.textContent=e),t(this,ue)&&t(this,wt)?.querySelectorAll(".hrv-is-option").forEach((a,o)=>{a.setAttribute("data-active",String(t(this,It)[o]===e))}),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e==="select_option"&&i.option!==void 0?{state:String(i.option),attributes:{}}:null}}ci=new WeakMap,wt=new WeakMap,Ki=new WeakMap,It=new WeakMap,ue=new WeakMap,Er=new WeakSet,js=function(){if(!t(this,wt)||!t(this,It).length)return;t(this,wt).innerHTML=t(this,It).map(i=>`
        <button class="hrv-is-option" type="button"
          data-active="${i===t(this,Ki)}"
          title="${l(i)}">
          ${l(i)}
        </button>
      `).join(""),t(this,wt).querySelectorAll(".hrv-is-option").forEach((i,s)=>{i.addEventListener("click",()=>{this.config.card?.sendCommand("select_option",{option:t(this,It)[s]}),h(this,Ji,ls).call(this)})});const e=this.root.querySelector("[part=card]");e&&(e.style.overflow="visible"),t(this,wt).removeAttribute("hidden"),n(this,ue,!0)},Ji=new WeakSet,ls=function(){t(this,wt)?.setAttribute("hidden","");const e=this.root.querySelector("[part=card]");e&&(e.style.overflow=""),n(this,ue,!1)};const yn=`
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
  `;class xn extends g{constructor(e,i,s,a){super(e,i,s,a);r(this,vi);r(this,Tr);r(this,Pt,null);r(this,pi,null);r(this,ui,null);r(this,ve,null);r(this,fe,null);r(this,Ct,null);r(this,k,null);r(this,me,null);r(this,ge,null);r(this,be,!1);r(this,_t,0);r(this,zt,!1);r(this,ye,"idle");r(this,xe,{});r(this,Qi,void 0);n(this,Qi,this.debounce(h(this,Tr,Vs).bind(this),200))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=this.config.displayHints??{},a=s.show_transport!==!1,o=s.show_volume!==!1&&i.includes("volume_set"),c=i.includes("previous_track");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${yn}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-mp-info">
              <div class="hrv-mp-artist" title="Artist"></div>
              <div class="hrv-mp-title" title="Title"></div>
            </div>
            ${e&&a?`
              <div class="hrv-mp-controls">
                ${c?`
                  <button class="hrv-mp-btn" data-role="prev" type="button"
                    title="Previous track">
                    <span part="prev-icon" aria-hidden="true"></span>
                  </button>
                `:""}
                <button class="hrv-mp-btn" data-role="play" type="button"
                  title="Play">
                  <span part="play-icon" aria-hidden="true"></span>
                </button>
                ${c?`
                  <button class="hrv-mp-btn" data-role="next" type="button"
                    title="Next track">
                    <span part="next-icon" aria-hidden="true"></span>
                  </button>
                `:""}
              </div>
            `:""}
            ${o?`
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
      `,n(this,Pt,this.root.querySelector("[data-role=play]")),n(this,pi,this.root.querySelector("[data-role=prev]")),n(this,ui,this.root.querySelector("[data-role=next]")),n(this,ve,this.root.querySelector(".hrv-mp-mute")),n(this,fe,this.root.querySelector(".hrv-mp-slider-track")),n(this,Ct,this.root.querySelector(".hrv-mp-slider-fill")),n(this,k,this.root.querySelector(".hrv-mp-slider-thumb")),n(this,me,this.root.querySelector(".hrv-mp-artist")),n(this,ge,this.root.querySelector(".hrv-mp-title")),this.renderIcon("mdi:play","play-icon"),this.renderIcon("mdi:skip-previous","prev-icon"),this.renderIcon("mdi:skip-next","next-icon"),this.renderIcon("mdi:volume-high","mute-icon"),e&&(t(this,Pt)?.addEventListener("click",()=>{this.config.card?.sendCommand("media_play_pause",{})}),t(this,pi)?.addEventListener("click",()=>this.config.card?.sendCommand("media_previous_track",{})),t(this,ui)?.addEventListener("click",()=>this.config.card?.sendCommand("media_next_track",{})),[t(this,Pt),t(this,pi),t(this,ui)].forEach(d=>{d&&(d.addEventListener("pointerdown",()=>d.setAttribute("data-pressing","true")),d.addEventListener("pointerup",()=>d.removeAttribute("data-pressing")),d.addEventListener("pointerleave",()=>d.removeAttribute("data-pressing")),d.addEventListener("pointercancel",()=>d.removeAttribute("data-pressing")))}),t(this,ve)?.addEventListener("click",()=>this.config.card?.sendCommand("volume_mute",{is_volume_muted:!t(this,be)})),t(this,fe)&&t(this,k))){const d=f=>{n(this,zt,!0),t(this,k).style.transition="none",t(this,Ct).style.transition="none",h(this,vi,Zr).call(this,f),t(this,k).setPointerCapture(f.pointerId)};t(this,k).addEventListener("pointerdown",d),t(this,fe).addEventListener("pointerdown",f=>{f.target!==t(this,k)&&(n(this,zt,!0),t(this,k).style.transition="none",t(this,Ct).style.transition="none",h(this,vi,Zr).call(this,f),t(this,k).setPointerCapture(f.pointerId))}),t(this,k).addEventListener("pointermove",f=>{t(this,zt)&&h(this,vi,Zr).call(this,f)});const p=()=>{t(this,zt)&&(n(this,zt,!1),t(this,k).style.transition="",t(this,Ct).style.transition="",t(this,Qi).call(this))};t(this,k).addEventListener("pointerup",p),t(this,k).addEventListener("pointercancel",p)}this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,ye,e),n(this,xe,i);const s=e==="playing",a=e==="paused";if(t(this,me)){const c=i.media_artist??"";t(this,me).textContent=c,t(this,me).title=c||"Artist"}if(t(this,ge)){const c=i.media_title??"";t(this,ge).textContent=c,t(this,ge).title=c||"Title"}if(t(this,Pt)){t(this,Pt).setAttribute("data-playing",String(s));const c=s?"mdi:pause":"mdi:play";this.renderIcon(c,"play-icon"),this.def.capabilities==="read-write"&&(t(this,Pt).title=s?"Pause":"Play")}if(n(this,be,!!i.is_volume_muted),t(this,ve)){const c=t(this,be)?"mdi:volume-off":"mdi:volume-high";this.renderIcon(c,"mute-icon"),this.def.capabilities==="read-write"&&(t(this,ve).title=t(this,be)?"Unmute":"Mute")}i.volume_level!==void 0&&!t(this,zt)&&(n(this,_t,Math.round(i.volume_level*100)),t(this,Ct)&&(t(this,Ct).style.width=`${t(this,_t)}%`),t(this,k)&&(t(this,k).style.left=`${t(this,_t)}%`));const o=i.media_title??"";this.announceState(`${this.def.friendly_name}, ${e}${o?` - ${o}`:""}`)}predictState(e,i){return e==="media_play_pause"?{state:t(this,ye)==="playing"?"paused":"playing",attributes:t(this,xe)}:e==="volume_mute"?{state:t(this,ye),attributes:{...t(this,xe),is_volume_muted:!!i.is_volume_muted}}:e==="volume_set"?{state:t(this,ye),attributes:{...t(this,xe),volume_level:i.volume_level}}:null}}Pt=new WeakMap,pi=new WeakMap,ui=new WeakMap,ve=new WeakMap,fe=new WeakMap,Ct=new WeakMap,k=new WeakMap,me=new WeakMap,ge=new WeakMap,be=new WeakMap,_t=new WeakMap,zt=new WeakMap,ye=new WeakMap,xe=new WeakMap,Qi=new WeakMap,vi=new WeakSet,Zr=function(e){const i=t(this,fe).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,_t,Math.round(s)),t(this,Ct).style.width=`${t(this,_t)}%`,t(this,k).style.left=`${t(this,_t)}%`},Tr=new WeakSet,Vs=function(){this.config.card?.sendCommand("volume_set",{volume_level:t(this,_t)/100})};const wn=`
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
  `;class Cn extends g{constructor(){super(...arguments);r(this,fi,null)}render(){const e=this.def.capabilities==="read-write",i=this.config.tapAction?.data?.command??"power";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${wn}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <button class="hrv-remote-circle" type="button"
              title="${e?l(i):"Read-only"}"
              aria-label="${l(this.def.friendly_name)} - ${l(i)}"
              ${e?"":"disabled"}>
              <span part="remote-icon" aria-hidden="true"></span>
            </button>
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,fi,this.root.querySelector(".hrv-remote-circle"));const s=this.resolveIcon(this.def.icon,"mdi:remote");this.renderIcon(s,"remote-icon"),t(this,fi)&&e&&this._attachGestureHandlers(t(this,fi),{onTap:()=>{const a=this.config.gestureConfig?.tap;if(a){this._runAction(a);return}const o=this.config.tapAction?.data?.command??"power",c=this.config.tapAction?.data?.device??void 0,d=c?{command:o,device:c}:{command:o};this.config.card?.sendCommand("send_command",d)}}),this.renderCompanions(),W(this.root)}applyState(e,i){const s=this.def.icon_state_map?.[e]??this.def.icon??"mdi:remote";this.renderIcon(this.resolveIcon(s,"mdi:remote"),"remote-icon"),this.announceState(`${this.def.friendly_name}, ${e}`)}}fi=new WeakMap;const _n=`
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
  `;class An extends g{constructor(){super(...arguments);r(this,mi,null);r(this,gi,null)}render(){const e=this.def.unit_of_measurement??"";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${_n}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" title="${l(this.def.friendly_name)}">
            <span class="hrv-sensor-val" aria-live="polite">-</span>
            ${e?`<span class="hrv-sensor-unit" title="${l(e)}">${l(e)}</span>`:""}
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,mi,this.root.querySelector(".hrv-sensor-val")),n(this,gi,this.root.querySelector(".hrv-sensor-unit")),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){t(this,mi)&&(t(this,mi).textContent=e),t(this,gi)&&i.unit_of_measurement!==void 0&&(t(this,gi).textContent=i.unit_of_measurement);const s=i.unit_of_measurement??this.def.unit_of_measurement??"",a=this.root.querySelector("[part=card-body]");a&&(a.title=`${e}${s?` ${s}`:""}`),this.announceState(`${this.def.friendly_name}, ${e}${s?` ${s}`:""}`)}}mi=new WeakMap,gi=new WeakMap;const Sn=`
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
  `;class fs extends g{constructor(){super(...arguments);r(this,At,null);r(this,bi,null);r(this,we,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Sn}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e?`
              <button class="hrv-switch-track" type="button" data-on="false"
                title="Toggle" aria-label="${l(this.def.friendly_name)} - Toggle">
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
      `,n(this,At,this.root.querySelector(".hrv-switch-track")),n(this,bi,this.root.querySelector(".hrv-switch-ro")),t(this,At)&&e&&this._attachGestureHandlers(t(this,At),{onTap:()=>{const i=this.config.gestureConfig?.tap;if(i){this._runAction(i);return}this.config.card?.sendCommand("toggle",{})}}),this.renderCompanions(),W(this.root)}applyState(e,i){n(this,we,e==="on");const s=e==="unavailable"||e==="unknown";t(this,At)&&(t(this,At).setAttribute("data-on",String(t(this,we))),t(this,At).title=t(this,we)?"On - click to turn off":"Off - click to turn on",t(this,At).disabled=s),t(this,bi)&&(t(this,bi).textContent=Me(e)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,we)?"off":"on",attributes:{}}}}At=new WeakMap,bi=new WeakMap,we=new WeakMap;const $n=`
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
  `;function or(u){u<0&&(u=0);const v=Math.floor(u/3600),e=Math.floor(u%3600/60),i=Math.floor(u%60),s=a=>String(a).padStart(2,"0");return v>0?`${v}:${s(e)}:${s(i)}`:`${s(e)}:${s(i)}`}function ms(u){if(typeof u=="number")return u;if(typeof u!="string")return 0;const v=u.split(":").map(Number);return v.length===3?v[0]*3600+v[1]*60+v[2]:v.length===2?v[0]*60+v[1]:v[0]||0}class Ln extends g{constructor(){super(...arguments);r(this,qr);r(this,Dr);r(this,Ir);r(this,_e);r(this,J,null);r(this,Bt,null);r(this,Xt,null);r(this,Kt,null);r(this,Ce,null);r(this,yi,"idle");r(this,xi,{});r(this,st,null);r(this,wi,null)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${$n}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-timer-display" title="Time remaining">00:00</span>
            ${e?`
              <div class="hrv-timer-controls">
                <button class="hrv-timer-btn" data-action="playpause" type="button"
                  title="Start" aria-label="${l(this.def.friendly_name)} - Start">
                  <span part="playpause-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="cancel" type="button"
                  title="Cancel" aria-label="${l(this.def.friendly_name)} - Cancel">
                  <span part="cancel-icon" aria-hidden="true"></span>
                </button>
                <button class="hrv-timer-btn" data-action="finish" type="button"
                  title="Finish" aria-label="${l(this.def.friendly_name)} - Finish">
                  <span part="finish-icon" aria-hidden="true"></span>
                </button>
              </div>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,J,this.root.querySelector(".hrv-timer-display")),n(this,Bt,this.root.querySelector("[data-action=playpause]")),n(this,Xt,this.root.querySelector("[data-action=cancel]")),n(this,Kt,this.root.querySelector("[data-action=finish]")),this.renderIcon("mdi:play","playpause-icon"),this.renderIcon("mdi:stop","cancel-icon"),this.renderIcon("mdi:check-circle","finish-icon"),e&&(t(this,Bt)?.addEventListener("click",()=>{const i=t(this,yi)==="active"?"pause":"start";this.config.card?.sendCommand(i,{})}),t(this,Xt)?.addEventListener("click",()=>{this.config.card?.sendCommand("cancel",{})}),t(this,Kt)?.addEventListener("click",()=>{this.config.card?.sendCommand("finish",{})}),[t(this,Bt),t(this,Xt),t(this,Kt)].forEach(i=>{i&&(i.addEventListener("pointerdown",()=>i.setAttribute("data-pressing","true")),i.addEventListener("pointerup",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointerleave",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointercancel",()=>i.removeAttribute("data-pressing")))})),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){n(this,yi,e),n(this,xi,{...i}),n(this,st,i.finishes_at??null),n(this,wi,i.remaining!=null?ms(i.remaining):null),h(this,qr,Os).call(this,e),h(this,Dr,Fs).call(this,e),e==="active"&&t(this,st)?h(this,Ir,Ns).call(this):h(this,_e,nr).call(this),t(this,J)&&t(this,J).setAttribute("data-paused",String(e==="paused"))}predictState(e,i){const s={...t(this,xi)};return e==="start"?{state:"active",attributes:s}:e==="pause"?(t(this,st)&&(s.remaining=Math.max(0,(new Date(t(this,st)).getTime()-Date.now())/1e3)),{state:"paused",attributes:s}):e==="cancel"||e==="finish"?{state:"idle",attributes:s}:null}}J=new WeakMap,Bt=new WeakMap,Xt=new WeakMap,Kt=new WeakMap,Ce=new WeakMap,yi=new WeakMap,xi=new WeakMap,st=new WeakMap,wi=new WeakMap,qr=new WeakSet,Os=function(e){const i=e==="idle",s=e==="active";if(t(this,Bt)){const a=s?"mdi:pause":"mdi:play",o=s?"Pause":e==="paused"?"Resume":"Start";this.renderIcon(a,"playpause-icon"),t(this,Bt).title=o,t(this,Bt).setAttribute("aria-label",`${this.def.friendly_name} - ${o}`)}t(this,Xt)&&(t(this,Xt).disabled=i),t(this,Kt)&&(t(this,Kt).disabled=i),this.announceState(`${this.def.friendly_name}, ${e}`)},Dr=new WeakSet,Fs=function(e){if(t(this,J)){if(e==="idle"){const i=t(this,xi).duration;t(this,J).textContent=i?or(ms(i)):"00:00";return}if(e==="paused"&&t(this,wi)!=null){t(this,J).textContent=or(t(this,wi));return}if(e==="active"&&t(this,st)){const i=Math.max(0,(new Date(t(this,st)).getTime()-Date.now())/1e3);t(this,J).textContent=or(i)}}},Ir=new WeakSet,Ns=function(){h(this,_e,nr).call(this),n(this,Ce,setInterval(()=>{if(!t(this,st)||t(this,yi)!=="active"){h(this,_e,nr).call(this);return}const e=Math.max(0,(new Date(t(this,st)).getTime()-Date.now())/1e3);t(this,J)&&(t(this,J).textContent=or(e)),e<=0&&h(this,_e,nr).call(this)},1e3))},_e=new WeakSet,nr=function(){t(this,Ce)&&(clearInterval(t(this,Ce)),n(this,Ce,null))};const kn=`
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
  `;class Mn extends g{constructor(){super(...arguments);r(this,Ci,null);r(this,St,null);r(this,Ae,!1);r(this,Se,!1)}render(){const e=this.def.capabilities==="read-write";n(this,Se,!1),this.root.innerHTML=`
        <style>${this.getSharedStyles()}${kn}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <span class="hrv-generic-state" title="${l(this.def.friendly_name)}">-</span>
            ${e?`
              <button class="hrv-generic-toggle" type="button" data-on="false"
                title="Toggle" aria-label="${l(this.def.friendly_name)} - Toggle"
                hidden>
                <div class="hrv-generic-knob"></div>
              </button>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,Ci,this.root.querySelector(".hrv-generic-state")),n(this,St,this.root.querySelector(".hrv-generic-toggle")),t(this,St)&&e&&this._attachGestureHandlers(t(this,St),{onTap:()=>{const i=this.config.gestureConfig?.tap;if(i){this._runAction(i);return}this.config.card?.sendCommand("toggle",{})}}),this.renderCompanions(),W(this.root)}applyState(e,i){const s=e==="on"||e==="off";n(this,Ae,e==="on"),t(this,Ci)&&(t(this,Ci).textContent=Me(e)),t(this,St)&&(s&&!t(this,Se)&&(t(this,St).removeAttribute("hidden"),n(this,Se,!0)),t(this,Se)&&(t(this,St).setAttribute("data-on",String(t(this,Ae))),t(this,St).title=t(this,Ae)?"On - click to turn off":"Off - click to turn on")),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,Ae)?"off":"on",attributes:{}}}}Ci=new WeakMap,St=new WeakMap,Ae=new WeakMap,Se=new WeakMap;const gs={sunny:"M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z","clear-night":"M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z",partlycloudy:"M12.74,5.47C15.1,6.5 16.35,9.03 15.92,11.46C17.19,12.56 18,14.19 18,16V16.17C18.31,16.06 18.65,16 19,16A3,3 0 0,1 22,19A3,3 0 0,1 19,22H6A4,4 0 0,1 2,18A4,4 0 0,1 6,14H6.27C5,12.45 4.6,10.24 5.5,8.26C6.72,5.5 9.97,4.24 12.74,5.47M11.93,7.3C10.16,6.5 8.09,7.31 7.31,9.07C6.85,10.09 6.93,11.22 7.41,12.13C8.5,10.83 10.16,10 12,10C12.7,10 13.38,10.12 14,10.34C13.94,9.06 13.18,7.86 11.93,7.3M13.55,3.64C13,3.4 12.45,3.23 11.88,3.12L14.37,1.82L15.27,4.71C14.76,4.29 14.19,3.93 13.55,3.64M6.09,4.44C5.6,4.79 5.17,5.19 4.8,5.63L4.91,2.82L7.87,3.5C7.25,3.71 6.65,4.03 6.09,4.44M18,9.71C17.91,9.12 17.78,8.55 17.59,8L19.97,9.5L17.92,11.73C18.03,11.08 18.05,10.4 18,9.71M3.04,11.3C3.11,11.9 3.24,12.47 3.43,13L1.06,11.5L3.1,9.28C3,9.93 2.97,10.61 3.04,11.3M19,18H16V16A4,4 0 0,0 12,12A4,4 0 0,0 8,16H6A2,2 0 0,0 4,18A2,2 0 0,0 6,20H19A1,1 0 0,0 20,19A1,1 0 0,0 19,18Z",cloudy:"M6,19A5,5 0 0,1 1,14A5,5 0 0,1 6,9C7,6.65 9.3,5 12,5C15.43,5 18.24,7.66 18.5,11.03L19,11A4,4 0 0,1 23,15A4,4 0 0,1 19,19H6M19,13H17V12A5,5 0 0,0 12,7C9.5,7 7.45,8.82 7.06,11.19C6.73,11.07 6.37,11 6,11A3,3 0 0,0 3,14A3,3 0 0,0 6,17H19A2,2 0 0,0 21,15A2,2 0 0,0 19,13Z",fog:"M3,15H13A1,1 0 0,1 14,16A1,1 0 0,1 13,17H3A1,1 0 0,1 2,16A1,1 0 0,1 3,15M16,15H21A1,1 0 0,1 22,16A1,1 0 0,1 21,17H16A1,1 0 0,1 15,16A1,1 0 0,1 16,15M1,12A5,5 0 0,1 6,7C7,4.65 9.3,3 12,3C15.43,3 18.24,5.66 18.5,9.03L19,9C21.19,9 22.97,10.76 23,13H21A2,2 0 0,0 19,11H17V10A5,5 0 0,0 12,5C9.5,5 7.45,6.82 7.06,9.19C6.73,9.07 6.37,9 6,9A3,3 0 0,0 3,12C3,12.35 3.06,12.69 3.17,13H1.1L1,12M3,19H5A1,1 0 0,1 6,20A1,1 0 0,1 5,21H3A1,1 0 0,1 2,20A1,1 0 0,1 3,19M8,19H21A1,1 0 0,1 22,20A1,1 0 0,1 21,21H8A1,1 0 0,1 7,20A1,1 0 0,1 8,19Z",rainy:"M6,14.03A1,1 0 0,1 7,15.03C7,15.58 6.55,16.03 6,16.03C3.24,16.03 1,13.79 1,11.03C1,8.27 3.24,6.03 6,6.03C7,3.68 9.3,2.03 12,2.03C15.43,2.03 18.24,4.69 18.5,8.06L19,8.03A4,4 0 0,1 23,12.03C23,14.23 21.21,16.03 19,16.03H18C17.45,16.03 17,15.58 17,15.03C17,14.47 17.45,14.03 18,14.03H19A2,2 0 0,0 21,12.03A2,2 0 0,0 19,10.03H17V9.03C17,6.27 14.76,4.03 12,4.03C9.5,4.03 7.45,5.84 7.06,8.21C6.73,8.09 6.37,8.03 6,8.03A3,3 0 0,0 3,11.03A3,3 0 0,0 6,14.03M12,14.15C12.18,14.39 12.37,14.66 12.56,14.94C13,15.56 14,17.03 14,18C14,19.11 13.1,20 12,20A2,2 0 0,1 10,18C10,17.03 11,15.56 11.44,14.94C11.63,14.66 11.82,14.4 12,14.15M12,11.03L11.5,11.59C11.5,11.59 10.65,12.55 9.79,13.81C8.93,15.06 8,16.56 8,18A4,4 0 0,0 12,22A4,4 0 0,0 16,18C16,16.56 15.07,15.06 14.21,13.81C13.35,12.55 12.5,11.59 12.5,11.59",pouring:"M9,12C9.53,12.14 9.85,12.69 9.71,13.22L8.41,18.05C8.27,18.59 7.72,18.9 7.19,18.76C6.65,18.62 6.34,18.07 6.5,17.54L7.78,12.71C7.92,12.17 8.47,11.86 9,12M13,12C13.53,12.14 13.85,12.69 13.71,13.22L11.64,20.95C11.5,21.5 10.95,21.8 10.41,21.66C9.88,21.5 9.56,20.97 9.7,20.43L11.78,12.71C11.92,12.17 12.47,11.86 13,12M17,12C17.53,12.14 17.85,12.69 17.71,13.22L16.41,18.05C16.27,18.59 15.72,18.9 15.19,18.76C14.65,18.62 14.34,18.07 14.5,17.54L15.78,12.71C15.92,12.17 16.47,11.86 17,12M17,10V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.43 4,15.6 3.5,15.32V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12C23,13.5 22.2,14.77 21,15.46V15.46C20.5,15.73 19.91,15.57 19.63,15.09C19.36,14.61 19.5,14 20,13.72V13.73C20.6,13.39 21,12.74 21,12A2,2 0 0,0 19,10H17Z",snowy:"M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M7.88,18.07L10.07,17.5L8.46,15.88C8.07,15.5 8.07,14.86 8.46,14.46C8.85,14.07 9.5,14.07 9.88,14.46L11.5,16.07L12.07,13.88C12.21,13.34 12.76,13.03 13.29,13.17C13.83,13.31 14.14,13.86 14,14.4L13.41,16.59L15.6,16C16.14,15.86 16.69,16.17 16.83,16.71C16.97,17.24 16.66,17.79 16.12,17.93L13.93,18.5L15.54,20.12C15.93,20.5 15.93,21.15 15.54,21.54C15.15,21.93 14.5,21.93 14.12,21.54L12.5,19.93L11.93,22.12C11.79,22.66 11.24,22.97 10.71,22.83C10.17,22.69 9.86,22.14 10,21.6L10.59,19.41L8.4,20C7.86,20.14 7.31,19.83 7.17,19.29C7.03,18.76 7.34,18.21 7.88,18.07Z","snowy-rainy":"M4,16.36C3.86,15.82 4.18,15.25 4.73,15.11L7,14.5L5.33,12.86C4.93,12.46 4.93,11.81 5.33,11.4C5.73,11 6.4,11 6.79,11.4L8.45,13.05L9.04,10.8C9.18,10.24 9.75,9.92 10.29,10.07C10.85,10.21 11.17,10.78 11,11.33L10.42,13.58L12.67,13C13.22,12.83 13.79,13.15 13.93,13.71C14.08,14.25 13.76,14.82 13.2,14.96L10.95,15.55L12.6,17.21C13,17.6 13,18.27 12.6,18.67C12.2,19.07 11.54,19.07 11.15,18.67L9.5,17L8.89,19.27C8.75,19.83 8.18,20.14 7.64,20C7.08,19.86 6.77,19.29 6.91,18.74L7.5,16.5L5.26,17.09C4.71,17.23 4.14,16.92 4,16.36M1,10A5,5 0 0,1 6,5C7,2.65 9.3,1 12,1C15.43,1 18.24,3.66 18.5,7.03L19,7A4,4 0 0,1 23,11A4,4 0 0,1 19,15A1,1 0 0,1 18,14A1,1 0 0,1 19,13A2,2 0 0,0 21,11A2,2 0 0,0 19,9H17V8A5,5 0 0,0 12,3C9.5,3 7.45,4.82 7.06,7.19C6.73,7.07 6.37,7 6,7A3,3 0 0,0 3,10C3,10.85 3.35,11.61 3.91,12.16C4.27,12.55 4.26,13.16 3.88,13.54C3.5,13.93 2.85,13.93 2.47,13.54C1.56,12.63 1,11.38 1,10M14.03,20.43C14.13,20.82 14.5,21.04 14.91,20.94L16.5,20.5L16.06,22.09C15.96,22.5 16.18,22.87 16.57,22.97C16.95,23.08 17.35,22.85 17.45,22.46L17.86,20.89L19.03,22.05C19.3,22.33 19.77,22.33 20.05,22.05C20.33,21.77 20.33,21.3 20.05,21.03L18.89,19.86L20.46,19.45C20.85,19.35 21.08,18.95 20.97,18.57C20.87,18.18 20.5,17.96 20.09,18.06L18.5,18.5L18.94,16.91C19.04,16.5 18.82,16.13 18.43,16.03C18.05,15.92 17.65,16.15 17.55,16.54L17.14,18.11L15.97,16.95C15.7,16.67 15.23,16.67 14.95,16.95C14.67,17.24 14.67,17.7 14.95,17.97L16.11,19.14L14.54,19.55C14.15,19.65 13.92,20.05 14.03,20.43Z",hail:"M6,14A1,1 0 0,1 7,15A1,1 0 0,1 6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14M10,18A2,2 0 0,1 12,20A2,2 0 0,1 10,22A2,2 0 0,1 8,20A2,2 0 0,1 10,18M14.5,16A1.5,1.5 0 0,1 16,17.5A1.5,1.5 0 0,1 14.5,19A1.5,1.5 0 0,1 13,17.5A1.5,1.5 0 0,1 14.5,16M10.5,12A1.5,1.5 0 0,1 12,13.5A1.5,1.5 0 0,1 10.5,15A1.5,1.5 0 0,1 9,13.5A1.5,1.5 0 0,1 10.5,12Z",lightning:"M6,16A5,5 0 0,1 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16H18A1,1 0 0,1 17,15A1,1 0 0,1 18,14H19A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11A3,3 0 0,0 6,14H7A1,1 0 0,1 8,15A1,1 0 0,1 7,16H6M12,11H15L13,15H15L11.25,22L12,17H9.5L12,11Z","lightning-rainy":"M4.5,13.59C5,13.87 5.14,14.5 4.87,14.96C4.59,15.44 4,15.6 3.5,15.33V15.33C2,14.47 1,12.85 1,11A5,5 0 0,1 6,6C7,3.65 9.3,2 12,2C15.43,2 18.24,4.66 18.5,8.03L19,8A4,4 0 0,1 23,12A4,4 0 0,1 19,16A1,1 0 0,1 18,15A1,1 0 0,1 19,14A2,2 0 0,0 21,12A2,2 0 0,0 19,10H17V9A5,5 0 0,0 12,4C9.5,4 7.45,5.82 7.06,8.19C6.73,8.07 6.37,8 6,8A3,3 0 0,0 3,11C3,12.11 3.6,13.08 4.5,13.6V13.59M9.5,11H12.5L10.5,15H12.5L8.75,22L9.5,17H7L9.5,11M17.5,18.67C17.5,19.96 16.5,21 15.25,21C14,21 13,19.96 13,18.67C13,17.12 15.25,14.5 15.25,14.5C15.25,14.5 17.5,17.12 17.5,18.67Z",windy:"M4,10A1,1 0 0,1 3,9A1,1 0 0,1 4,8H12A2,2 0 0,0 14,6A2,2 0 0,0 12,4C11.45,4 10.95,4.22 10.59,4.59C10.2,5 9.56,5 9.17,4.59C8.78,4.2 8.78,3.56 9.17,3.17C9.9,2.45 10.9,2 12,2A4,4 0 0,1 16,6A4,4 0 0,1 12,10H4M19,12A1,1 0 0,0 20,11A1,1 0 0,0 19,10C18.72,10 18.47,10.11 18.29,10.29C17.9,10.68 17.27,10.68 16.88,10.29C16.5,9.9 16.5,9.27 16.88,8.88C17.42,8.34 18.17,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H5A1,1 0 0,1 4,13A1,1 0 0,1 5,12H19M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z","windy-variant":"M6,6L6.69,6.06C7.32,3.72 9.46,2 12,2A5.5,5.5 0 0,1 17.5,7.5L17.42,8.45C17.88,8.16 18.42,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H6A4,4 0 0,1 2,10A4,4 0 0,1 6,6M6,8A2,2 0 0,0 4,10A2,2 0 0,0 6,12H19A1,1 0 0,0 20,11A1,1 0 0,0 19,10H15.5V7.5A3.5,3.5 0 0,0 12,4A3.5,3.5 0 0,0 8.5,7.5V8H6M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",exceptional:"M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.5 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20Z"},Hn=gs.cloudy,En="M12,3.77L11.25,4.61C11.25,4.61 9.97,6.06 8.68,7.94C7.39,9.82 6,12.07 6,14.23A6,6 0 0,0 12,20.23A6,6 0 0,0 18,14.23C18,12.07 16.61,9.82 15.32,7.94C14.03,6.06 12.75,4.61 12.75,4.61L12,3.77M12,1A1,1 0 0,1 13,2L13,2.01C13,2.01 14.35,3.56 15.72,5.55C17.09,7.54 18.5,9.93 18.5,12.5A6.5,6.5 0 0,1 12,19A6.5,6.5 0 0,1 5.5,12.5C5.5,9.93 6.91,7.54 8.28,5.55C9.65,3.56 11,2.01 11,2.01L11,2A1,1 0 0,1 12,1Z",Tn="M4,10A1,1 0 0,1 3,9A1,1 0 0,1 4,8H12A2,2 0 0,0 14,6A2,2 0 0,0 12,4C11.45,4 10.95,4.22 10.59,4.59C10.2,5 9.56,5 9.17,4.59C8.78,4.2 8.78,3.56 9.17,3.17C9.9,2.45 10.9,2 12,2A4,4 0 0,1 16,6A4,4 0 0,1 12,10H4M19,12A1,1 0 0,0 20,11A1,1 0 0,0 19,10C18.72,10 18.47,10.11 18.29,10.29C17.9,10.68 17.27,10.68 16.88,10.29C16.5,9.9 16.5,9.27 16.88,8.88C17.42,8.34 18.17,8 19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14H5A1,1 0 0,1 4,13A1,1 0 0,1 5,12H19M18,18H4A1,1 0 0,1 3,17A1,1 0 0,1 4,16H18A3,3 0 0,1 21,19A3,3 0 0,1 18,22C17.17,22 16.42,21.66 15.88,21.12C15.5,20.73 15.5,20.1 15.88,19.71C16.27,19.32 16.9,19.32 17.29,19.71C17.47,19.89 17.72,20 18,20A1,1 0 0,0 19,19A1,1 0 0,0 18,18Z",qn="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12C20,14.4 19,16.5 17.3,18C15.9,16.7 14,16 12,16C10,16 8.2,16.7 6.7,18C5,16.5 4,14.4 4,12A8,8 0 0,1 12,4M14,5.89C13.62,5.9 13.26,6.15 13.1,6.54L11.58,10C10.6,10.18 9.81,10.79 9.4,11.6L6.27,11.29C5.82,11.25 5.4,11.54 5.29,11.97C5.18,12.41 5.4,12.86 5.82,13.04L8.88,14.31C9.16,15.29 9.93,16.08 10.92,16.35L11.28,19.39C11.33,19.83 11.7,20.16 12.14,20.16C12.18,20.16 12.22,20.16 12.27,20.15C12.75,20.09 13.1,19.66 13.04,19.18L12.68,16.19C13.55,15.8 14.15,14.96 14.21,14H17.58C18.05,14 18.44,13.62 18.44,13.14C18.44,12.67 18.05,12.29 17.58,12.29H14.21C14.15,11.74 13.93,11.24 13.59,10.84L15.07,7.42C15.27,6.97 15.07,6.44 14.63,6.24C14.43,6 14.21,5.88 14,5.89Z",Dn=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];function Gr(u,v){const e=gs[u]??Hn;return`<svg viewBox="0 0 24 24" width="${v}" height="${v}" aria-hidden="true" focusable="false"><path d="${e}" fill="currentColor"/></svg>`}function Ur(u){return`<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="${u}" fill="currentColor"/></svg>`}const In=`
    [part=card] {
      padding-bottom: 0 !important;
    }

    [part=card-body] {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 0 16px;
      min-width: 0;
      overflow: hidden;
    }

    .hrv-weather-main {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hrv-weather-icon {
      color: var(--hrv-color-state-on, #1976d2);
      flex-shrink: 0;
      line-height: 0;
    }

    .hrv-weather-temp {
      font-size: 48px;
      font-weight: 300;
      color: var(--hrv-color-text, #fff);
      line-height: 1;
    }

    .hrv-weather-unit {
      font-size: 18px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
    }

    .hrv-weather-cond {
      font-size: 13px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
      text-transform: capitalize;
    }

    .hrv-weather-stats {
      display: flex;
      justify-content: center;
      gap: 16px;
      width: 100%;
      padding-top: 8px;
      margin-top: 4px;
      border-top: 1px solid var(--hrv-ex-outline, rgba(255,255,255,0.15));
    }

    .hrv-weather-stat {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
    }

    .hrv-weather-stat svg {
      color: var(--hrv-color-icon, rgba(255,255,255,0.6));
      flex-shrink: 0;
    }

    .hrv-forecast-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border: 1px solid var(--hrv-ex-outline, rgba(255,255,255,0.15));
      border-radius: 12px;
      background: none;
      font-size: 10px;
      font-weight: 500;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
      cursor: pointer;
      font-family: inherit;
      margin-top: 4px;
    }
    .hrv-forecast-toggle:hover {
      background: rgba(255,255,255,0.08);
    }
    .hrv-forecast-toggle:empty { display: none; }

    .hrv-forecast-strip {
      width: 100%;
      padding-top: 8px;
      margin-top: 4px;
      border-top: 1px solid var(--hrv-ex-outline, rgba(255,255,255,0.15));
    }

    .hrv-forecast-strip:empty { display: none; }

    .hrv-forecast-strip[data-mode=daily] {
      display: flex;
      justify-content: space-between;
      gap: 4px;
    }

    .hrv-forecast-strip[data-mode=hourly] {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      scrollbar-width: none;
      width: 0;
      min-width: 100%;
    }
    .hrv-forecast-strip[data-mode=hourly]::-webkit-scrollbar { display: none; }

    .hrv-forecast-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex: 0 0 auto;
      min-width: 42px;
    }
    .hrv-forecast-strip[data-mode=daily] .hrv-forecast-day {
      flex: 1;
      min-width: 0;
    }

    .hrv-forecast-day-name {
      font-size: 10px;
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
      font-weight: 500;
    }

    .hrv-forecast-day svg {
      color: var(--hrv-color-icon, rgba(255,255,255,0.6));
    }

    .hrv-forecast-temps {
      font-size: 10px;
      color: var(--hrv-color-text, #fff);
      white-space: nowrap;
    }

    .hrv-forecast-lo {
      color: var(--hrv-color-text-secondary, rgba(255,255,255,0.7));
    }

    .hrv-forecast-scroll-track {
      width: 100%;
      align-self: stretch;
      height: 3px;
      border-radius: 2px;
      background: var(--hrv-color-surface-alt, rgba(255,255,255,0.10));
      position: relative;
      margin-top: 4px;
      cursor: pointer;
    }
    .hrv-forecast-scroll-track[hidden] { display: none; }
    .hrv-forecast-scroll-thumb {
      position: absolute;
      top: 0;
      height: 100%;
      border-radius: 2px;
      background: var(--hrv-color-text-secondary, rgba(255,255,255,0.30));
      transition: left 80ms linear;
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

    @media (prefers-reduced-motion: reduce) {
      [part=card] * { transition: none !important; }
    }
  `;class Pn extends g{constructor(){super(...arguments);r(this,Z);r(this,tr);r(this,er);r(this,ir);r(this,Pr);r(this,_i,null);r(this,$e,null);r(this,Ai,null);r(this,Si,null);r(this,$i,null);r(this,Li,null);r(this,Q,null);r(this,$t,null);r(this,tt,null);r(this,ki,null);r(this,Le,null);r(this,ke,null)}render(){this.root.innerHTML=`
        <style>${this.getSharedStyles()}${In}${K}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${l(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            <div class="hrv-weather-main">
              <span class="hrv-weather-icon">${Gr("cloudy",44)}</span>
              <span class="hrv-weather-temp">--<span class="hrv-weather-unit"></span></span>
            </div>
            <span class="hrv-weather-cond" aria-live="polite">--</span>
            <div class="hrv-weather-stats">
              <span class="hrv-weather-stat" data-stat="humidity">
                ${Ur(En)}
                <span data-value>--</span>
              </span>
              <span class="hrv-weather-stat" data-stat="wind">
                ${Ur(Tn)}
                <span data-value>--</span>
              </span>
              <span class="hrv-weather-stat" data-stat="pressure">
                ${Ur(qn)}
                <span data-value>--</span>
              </span>
            </div>
            <button class="hrv-forecast-toggle" type="button"></button>
            <div class="hrv-forecast-strip" data-mode="daily" role="list"></div>
            <div class="hrv-forecast-scroll-track" hidden><div class="hrv-forecast-scroll-thumb"></div></div>
          </div>
          ${this.renderHistoryZoneHTML()}
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,_i,this.root.querySelector(".hrv-weather-icon")),n(this,$e,this.root.querySelector(".hrv-weather-temp")),n(this,Ai,this.root.querySelector(".hrv-weather-cond")),n(this,Si,this.root.querySelector("[data-stat=humidity] [data-value]")),n(this,$i,this.root.querySelector("[data-stat=wind] [data-value]")),n(this,Li,this.root.querySelector("[data-stat=pressure] [data-value]")),n(this,Q,this.root.querySelector(".hrv-forecast-strip")),n(this,$t,this.root.querySelector(".hrv-forecast-toggle")),n(this,tt,this.root.querySelector(".hrv-forecast-scroll-track")),n(this,ki,this.root.querySelector(".hrv-forecast-scroll-thumb")),t(this,Q)&&t(this,Q).addEventListener("scroll",()=>h(this,ir,us).call(this),{passive:!0}),t(this,tt)&&t(this,tt).addEventListener("pointerdown",e=>h(this,Pr,Zs).call(this,e)),this.renderCompanions(),W(this.root),this._attachGestureHandlers(this.root.querySelector("[part=card]"))}applyState(e,i){const s=e||"cloudy";t(this,_i)&&(t(this,_i).innerHTML=Gr(s,44));const a=this.i18n.t(`weather.${s}`)!==`weather.${s}`?this.i18n.t(`weather.${s}`):s.replace(/-/g," ");t(this,Ai)&&(t(this,Ai).textContent=a);const o=i.temperature??i.native_temperature,c=i.temperature_unit??"";if(t(this,$e)){const p=t(this,$e).querySelector(".hrv-weather-unit");t(this,$e).firstChild.textContent=o!=null?Math.round(Number(o)):"--",p&&(p.textContent=c?` ${c}`:"")}if(t(this,Si)){const p=i.humidity;t(this,Si).textContent=p!=null?`${p}%`:"--"}if(t(this,$i)){const p=i.wind_speed,f=i.wind_speed_unit??"";t(this,$i).textContent=p!=null?`${p} ${f}`.trim():"--"}if(t(this,Li)){const p=i.pressure,f=i.pressure_unit??"";t(this,Li).textContent=p!=null?`${p} ${f}`.trim():"--"}const d=(this.config.displayHints??this.def.display_hints??{}).show_forecast===!0;n(this,Le,d?i.forecast_daily??i.forecast??null:null),n(this,ke,d?i.forecast_hourly??null:null),h(this,tr,cs).call(this),h(this,er,ps).call(this),this.announceState(`${this.def.friendly_name}, ${a}, ${o??"--"} ${c}`)}}_i=new WeakMap,$e=new WeakMap,Ai=new WeakMap,Si=new WeakMap,$i=new WeakMap,Li=new WeakMap,Q=new WeakMap,$t=new WeakMap,tt=new WeakMap,ki=new WeakMap,Z=new WeakSet,Jt=function(){return this.config._forecastMode??"daily"},Wr=function(e){this.config._forecastMode=e},Le=new WeakMap,ke=new WeakMap,tr=new WeakSet,cs=function(){if(!t(this,$t))return;const e=Array.isArray(t(this,Le))&&t(this,Le).length>0,i=Array.isArray(t(this,ke))&&t(this,ke).length>0;if(!e&&!i){t(this,$t).textContent="";return}e&&!i&&n(this,Z,"daily",Wr),!e&&i&&n(this,Z,"hourly",Wr),e&&i?(t(this,$t).textContent=t(this,Z,Jt)==="daily"?"Hourly":"5-Day",t(this,$t).onclick=()=>{n(this,Z,t(this,Z,Jt)==="daily"?"hourly":"daily",Wr),h(this,tr,cs).call(this),h(this,er,ps).call(this)}):(t(this,$t).textContent="",t(this,$t).onclick=null)},er=new WeakSet,ps=function(){if(!t(this,Q))return;const e=t(this,Z,Jt)==="hourly"?t(this,ke):t(this,Le);if(t(this,Q).setAttribute("data-mode",t(this,Z,Jt)),!Array.isArray(e)||e.length===0){t(this,Q).innerHTML="",t(this,tt)&&(t(this,tt).hidden=!0);return}const i=t(this,Z,Jt)==="daily"?e.slice(0,5):e;t(this,Q).innerHTML=i.map(s=>{const a=new Date(s.datetime);let o;t(this,Z,Jt)==="hourly"?o=a.toLocaleTimeString([],{hour:"numeric"}):o=Dn[a.getDay()]??"";const c=(s.temperature??s.native_temperature)!=null?Math.round(s.temperature??s.native_temperature):"--",d=(s.templow??s.native_templow)!=null?Math.round(s.templow??s.native_templow):null;return`
          <div class="hrv-forecast-day" role="listitem">
            <span class="hrv-forecast-day-name">${l(String(o))}</span>
            ${Gr(s.condition||"cloudy",18)}
            <span class="hrv-forecast-temps">
              ${l(String(c))}${d!=null?`/<span class="hrv-forecast-lo">${l(String(d))}</span>`:""}
            </span>
          </div>`}).join(""),t(this,Z,Jt)==="hourly"?requestAnimationFrame(()=>h(this,ir,us).call(this)):t(this,tt)&&(t(this,tt).hidden=!0)},ir=new WeakSet,us=function(){const e=t(this,Q),i=t(this,tt),s=t(this,ki);if(!e||!i||!s)return;const a=e.scrollWidth>e.clientWidth?e.clientWidth/e.scrollWidth:1;if(a>=1){i.hidden=!0;return}i.hidden=!1;const o=i.clientWidth,c=Math.max(20,a*o),d=o-c,p=e.scrollLeft/(e.scrollWidth-e.clientWidth);s.style.width=`${c}px`,s.style.left=`${p*d}px`},Pr=new WeakSet,Zs=function(e){const i=t(this,Q),s=t(this,tt),a=t(this,ki);if(!i||!s||!a)return;e.preventDefault();const o=s.getBoundingClientRect(),c=parseFloat(a.style.width)||20,d=x=>{const b=x-o.left-c/2,M=o.width-c,S=Math.max(0,Math.min(1,b/M));i.scrollLeft=S*(i.scrollWidth-i.clientWidth)};d(e.clientX);const p=x=>d(x.clientX),f=()=>{window.removeEventListener("pointermove",p),window.removeEventListener("pointerup",f)};window.addEventListener("pointermove",p),window.addEventListener("pointerup",f)},y._packs=y._packs||{};const zn=document.currentScript&&document.currentScript.dataset.packId||"minimus";y._packs[zn]={light:Qs,fan:en,climate:nn,harvest_action:on,binary_sensor:dn,cover:vn,input_boolean:fs,input_number:mn,input_select:bn,media_player:xn,remote:Cn,sensor:An,switch:fs,timer:Ln,weather:Pn,generic:Mn,_capabilities:{fan:{display_modes:["on-off","continuous","stepped","cycle"]},input_number:{display_modes:["slider","buttons"]},light:{features:["brightness","color_temp","rgb"]},climate:{features:["hvac_modes","presets","fan_mode","swing_mode"]},cover:{features:["position","tilt"]},media_player:{features:["transport","volume","source"]}}}})();})();
