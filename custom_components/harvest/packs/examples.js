(()=>{var wr=(g,m,h)=>{if(!m.has(g))throw TypeError("Cannot "+h)};var t=(g,m,h)=>(wr(g,m,"read from private field"),h?h.call(g):m.get(g)),r=(g,m,h)=>{if(m.has(g))throw TypeError("Cannot add the same private member more than once");m instanceof WeakSet?m.add(g):m.set(g,h)},n=(g,m,h,Pt)=>(wr(g,m,"write to private field"),Pt?Pt.call(g,h):m.set(g,h),h);var d=(g,m,h)=>(wr(g,m,"access private method"),h);(function(){"use strict";var It,$,di,q,et,W,F,ge,be,it,yt,xt,rt,Ft,N,G,st,Nt,hi,ye,xr,Us,k,Hi,zr,Di,Br,zi,Rr,Bi,jr,xe,hr,we,lr,Ri,Or,Yt,Mi,ji,Fr,Oi,Nr,li,_r,ci,Sr,Fi,Yr,wt,z,Ni,P,_e,Vt,nt,ot,at,I,x,Ht,_t,H,C,Wt,Y,pi,Se,cr,Zt,Ti,ui,$r,$e,pr,vi,kr,fi,Cr,Dt,ai,Yi,Vr,Vi,Wr,mi,Lr,gi,Ar,Wi,Zr,bi,Er,Zi,Ur,ke,St,dt,V,zt,Ce,Le,Ae,B,R,Ee,Me,Te,qe,$t,Pe,Ut,j,ht,Ie,He,De,lt,Bt,Xt,ze,Be,Re,je,Oe,yi,Fe,xi,Mr,Ui,Xr,Xi,Gr,Ne,ur,wi,Tr,Ye,vr,Gi,Kr,Ki,Jr,_i,qr,Si,Pr,Ji,Qr,Qi,ts,L,Gt,Kt,ct,_,Jt,Qt,te,kt,pt,$i,ki,Ci,Ve,fr,tr,es,ee,Ct,A,Z,We,Lt,At,K,Et,ie,Ze,er,is,ir,rs,Ue,mr,Xe,gr,rr,ss,Ge,ut,Li,Mt,re,sr,ns,Ai,Ir,vt,Ke,Je,se,ne,ft,S,oe,ae,de,mt,Tt,Ei,Qe,br,nr,os,O,ti,ei,gt,ii,he,U,qt,Rt,jt,le,ri,si,J,ni,or,as,ar,ds,dr,hs,ce,qi,oi,bt,pe,ue;const g=window.HArvest;if(!g||!g.renderers||!g.renderers.BaseCard){console.warn("[HArvest Examples] HArvest not found - pack not loaded.");return}const m=g.renderers.BaseCard;function h(c){return String(c??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Pt(c,p){let e=null;return function(...i){e&&clearTimeout(e),e=setTimeout(()=>{e=null,c.apply(this,i)},p)}}function ve(c){return c?c.charAt(0).toUpperCase()+c.slice(1).replace(/_/g," "):""}const ls=60,cs=60,Ot=48,D=225,b=270,tt=2*Math.PI*Ot*(b/360);function ps(c){return c*Math.PI/180}function X(c){const p=ps(c);return{x:ls+Ot*Math.cos(p),y:cs-Ot*Math.sin(p)}}function us(){const c=X(D),p=X(D-b);return`M ${c.x} ${c.y} A ${Ot} ${Ot} 0 1 1 ${p.x} ${p.y}`}const fe=us(),me=["brightness","temp","color"],Pi=120;function Hr(c){const p=b/Pi;let e="";for(let i=0;i<Pi;i++){const s=D-i*p,o=D-(i+1)*p,a=X(s),l=X(o),u=`M ${a.x} ${a.y} A ${Ot} ${Ot} 0 0 1 ${l.x} ${l.y}`,v=i===0||i===Pi-1?"round":"butt";e+=`<path d="${u}" stroke="${c(i/Pi)}" fill="none" stroke-width="8" stroke-linecap="${v}" />`}return e}const vs=Hr(c=>`hsl(${Math.round(c*360)},100%,50%)`),fs=Hr(c=>{const e=Math.round(143+112*c),i=Math.round(255*c);return`rgb(255,${e},${i})`}),yr=`
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

    [part=companion][data-on=true] { box-shadow: 0 0 0 3px #fff; }
    [part=companion][data-interactive=true] { cursor: pointer; }
    [part=companion][data-interactive=true]:hover { opacity: 0.88; }

    [part=companion-icon] { display: none; }
    [part=companion-state] { display: none; }

    .hrv-dial-wrap {
      position: relative;
      flex: 1;
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
      stroke: #fff;
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
      box-shadow: 0 0 0 3px #fff;
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
      box-shadow: 0 0 0 0 rgba(255,255,255,0);
      transition: box-shadow 200ms ease, opacity 200ms ease;
    }
    .hrv-light-ro-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px #fff;
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
      background: rgba(255,255,255,0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 600;
      color: #000;
      line-height: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      .hrv-dial-fill { transition: none; }
      .hrv-dial-thumb { transition: none; }
      .hrv-mode-switch-thumb { transition: none; }
    }
  `;class ms extends m{constructor(e,i,s,o){super(e,i,s,o);r(this,xr);r(this,Hi);r(this,Di);r(this,zi);r(this,Bi);r(this,xe);r(this,we);r(this,Ri);r(this,Yt);r(this,ji);r(this,Oi);r(this,li);r(this,ci);r(this,Fi);r(this,It,null);r(this,$,null);r(this,di,null);r(this,q,null);r(this,et,null);r(this,W,null);r(this,F,null);r(this,ge,null);r(this,be,null);r(this,it,0);r(this,yt,4e3);r(this,xt,0);r(this,rt,!1);r(this,Ft,!1);r(this,N,null);r(this,G,0);r(this,st,2e3);r(this,Nt,6500);r(this,hi,void 0);r(this,ye,new Map);r(this,k,[]);n(this,hi,Pt(d(this,Fi,Yr).bind(this),300))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=i.includes("brightness"),o=i.includes("color_temp"),a=i.includes("rgb_color"),l=e&&(s||o||a),u=[s,o,a].filter(Boolean).length,v=e&&u>1;n(this,st,this.def.feature_config?.min_color_temp_kelvin??2e3),n(this,Nt,this.def.feature_config?.max_color_temp_kelvin??6500);const w=X(D);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${yr}</style>
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
                    <g class="hrv-dial-segs hrv-dial-segs-color">${vs}</g>
                    <g class="hrv-dial-segs hrv-dial-segs-temp">${fs}</g>
                    <path class="hrv-dial-track" d="${fe}" />
                    <path class="hrv-dial-fill" d="${fe}"
                      stroke-dasharray="${tt}"
                      stroke-dashoffset="${tt}" />
                    <circle class="hrv-dial-thumb" r="7"
                      cx="${w.x}" cy="${w.y}" />
                    <circle class="hrv-dial-thumb-hit" r="16"
                      cx="${w.x}" cy="${w.y}" />
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
                  ${s?'<span class="hrv-light-ro-dot" data-attr="brightness" title="Brightness">-</span>':""}
                  ${o?'<span class="hrv-light-ro-dot" data-attr="temp" title="Color temperature">-</span>':""}
                  ${a?'<span class="hrv-light-ro-dot" data-attr="color" title="Color"></span>':""}
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
                  title="Turn ${h(this.def.friendly_name)} on / off"></button>
              </div>
            `:""}
          </div>
        </div>
      `,n(this,It,this.root.querySelector("[part=toggle-button]")),n(this,$,this.root.querySelector(".hrv-dial-fill")),n(this,di,this.root.querySelector(".hrv-dial-track")),n(this,q,this.root.querySelector(".hrv-dial-thumb")),n(this,et,this.root.querySelector(".hrv-dial-pct")),n(this,W,this.root.querySelector(".hrv-dial-wrap")),n(this,N,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,ge,this.root.querySelector(".hrv-dial-segs-color")),n(this,be,this.root.querySelector(".hrv-dial-segs-temp")),n(this,F,this.root.querySelector(".hrv-mode-switch")),t(this,It)&&t(this,It).addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),t(this,N)&&(t(this,N).addEventListener("pointerdown",d(this,ji,Fr).bind(this)),t(this,N).addEventListener("pointermove",d(this,Oi,Nr).bind(this)),t(this,N).addEventListener("pointerup",d(this,li,_r).bind(this)),t(this,N).addEventListener("pointercancel",d(this,li,_r).bind(this))),t(this,F)&&(t(this,F).addEventListener("click",d(this,Di,Br).bind(this)),t(this,F).addEventListener("keydown",d(this,Bi,jr).bind(this)),t(this,F).addEventListener("mousemove",d(this,zi,Rr).bind(this)),d(this,Hi,zr).call(this)),d(this,we,lr).call(this),this.root.querySelector("[part=ro-state-icon]")&&this.renderIcon(this.resolveIcon(this.def.icon,"mdi:lightbulb"),"ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach(E=>{E.title=E.getAttribute("aria-label")??"Companion";const M=E.getAttribute("data-entity");if(M&&t(this,ye).has(M)){const T=t(this,ye).get(M);E.setAttribute("data-on",String(T==="on"))}})}applyState(e,i){if(n(this,rt,e==="on"),n(this,it,i?.brightness??0),i?.color_temp_kelvin!==void 0?n(this,yt,i.color_temp_kelvin):i?.color_temp!==void 0&&i.color_temp>0&&n(this,yt,Math.round(1e6/i.color_temp)),i?.hs_color)n(this,xt,Math.round(i.hs_color[0]));else if(i?.rgb_color){const[o,a,l]=i.rgb_color;n(this,xt,ys(o,a,l))}t(this,It)&&t(this,It).setAttribute("aria-pressed",String(t(this,rt)));const s=this.root.querySelector(".hrv-light-ro-circle");if(s){s.setAttribute("data-on",String(t(this,rt)));const o=t(this,rt)?"mdi:lightbulb":"mdi:lightbulb-outline",a=this.def.icon_state_map?.[e]??this.def.icon_state_map?.["*"]??this.def.icon??o;this.renderIcon(this.resolveIcon(a,o),"ro-state-icon");const l=i?.color_mode,u=l==="color_temp",v=l&&l!=="color_temp",w=this.root.querySelector('[data-attr="brightness"]');w&&(w.textContent=t(this,rt)?`${Math.round(t(this,it)/255*100)}%`:"-");const E=this.root.querySelector('[data-attr="temp"]');E&&(E.textContent=`${t(this,yt)}K`,E.style.display=v?"none":"");const M=this.root.querySelector('[data-attr="color"]');if(M)if(M.style.display=u?"none":"",i?.rgb_color){const[T,f,y]=i.rgb_color;M.style.background=`rgb(${T},${f},${y})`}else M.style.background=`hsl(${t(this,xt)}, 100%, 50%)`}d(this,xe,hr).call(this)}predictState(e,i){return e==="toggle"?{state:t(this,rt)?"off":"on",attributes:{brightness:t(this,it)}}:e==="turn_on"&&i.brightness!==void 0?{state:"on",attributes:{brightness:i.brightness}}:null}updateCompanionState(e,i,s){t(this,ye).set(e,i),super.updateCompanionState(e,i,s)}}It=new WeakMap,$=new WeakMap,di=new WeakMap,q=new WeakMap,et=new WeakMap,W=new WeakMap,F=new WeakMap,ge=new WeakMap,be=new WeakMap,it=new WeakMap,yt=new WeakMap,xt=new WeakMap,rt=new WeakMap,Ft=new WeakMap,N=new WeakMap,G=new WeakMap,st=new WeakMap,Nt=new WeakMap,hi=new WeakMap,ye=new WeakMap,xr=new WeakSet,Us=function(){const e=this.def.supported_features??[],i=[];return e.includes("brightness")&&i.push("brightness"),e.includes("color_temp")&&i.push("temp"),e.includes("rgb_color")&&i.push("color"),i.length>0?i:["brightness"]},k=new WeakMap,Hi=new WeakSet,zr=function(){const e=this.def.supported_features??[],i=[e.includes("brightness"),e.includes("color_temp"),e.includes("rgb_color")];n(this,k,[]),i[0]&&t(this,k).push(0),i[1]&&t(this,k).push(1),i[2]&&t(this,k).push(2),t(this,k).length===0&&t(this,k).push(0)},Di=new WeakSet,Br=function(e){const i=t(this,F).getBoundingClientRect(),s=e.clientY-i.top,o=i.height/3;let a;s<o?a=0:s<o*2?a=1:a=2,a=Math.min(a,t(this,k).length-1),n(this,G,t(this,k)[a]),t(this,F).setAttribute("data-pos",String(a)),d(this,we,lr).call(this),d(this,xe,hr).call(this)},zi=new WeakSet,Rr=function(e){const i={brightness:"Brightness",temp:"Color Temperature",color:"Color"},s=t(this,F).getBoundingClientRect(),o=Math.min(Math.floor((e.clientY-s.top)/(s.height/t(this,k).length)),t(this,k).length-1),a=me[t(this,k)[Math.max(0,o)]];t(this,F).title=`Dial mode: ${i[a]??a}`},Bi=new WeakSet,jr=function(e){const i=t(this,k).indexOf(t(this,G));let s=i;if(e.key==="ArrowUp"||e.key==="ArrowLeft")s=Math.max(0,i-1);else if(e.key==="ArrowDown"||e.key==="ArrowRight")s=Math.min(t(this,k).length-1,i+1);else return;e.preventDefault(),n(this,G,t(this,k)[s]),t(this,F).setAttribute("data-pos",String(s)),d(this,we,lr).call(this),d(this,xe,hr).call(this)},xe=new WeakSet,hr=function(){t(this,q)&&(t(this,q).style.transition="none"),t(this,$)&&(t(this,$).style.transition="none"),d(this,Ri,Or).call(this),t(this,q)?.getBoundingClientRect(),t(this,$)?.getBoundingClientRect(),t(this,q)&&(t(this,q).style.transition=""),t(this,$)&&(t(this,$).style.transition="")},we=new WeakSet,lr=function(){if(!t(this,$))return;const e=me[t(this,G)],i=e==="color"||e==="temp";t(this,di).style.display=i?"none":"",t(this,$).style.display=i?"none":"",t(this,ge)&&t(this,ge).classList.toggle("hrv-dial-segs-visible",e==="color"),t(this,be)&&t(this,be).classList.toggle("hrv-dial-segs-visible",e==="temp"),e==="brightness"&&t(this,$).setAttribute("stroke-dasharray",String(tt));const s={brightness:"brightness",temp:"color temperature",color:"color"},o={brightness:"Drag to adjust brightness",temp:"Drag to adjust color temperature",color:"Drag to adjust color"};t(this,W)?.setAttribute("aria-label",`${h(this.def.friendly_name)} ${s[e]}`),t(this,W)&&(t(this,W).title=o[e])},Ri=new WeakSet,Or=function(){const e=me[t(this,G)];if(e==="brightness"){const i=t(this,rt)?t(this,it):0;d(this,Yt,Mi).call(this,Math.round(i/255*100))}else if(e==="temp"){const i=Math.round((t(this,yt)-t(this,st))/(t(this,Nt)-t(this,st))*100);d(this,Yt,Mi).call(this,Math.max(0,Math.min(100,i)))}else{const i=Math.round(t(this,xt)/360*100);d(this,Yt,Mi).call(this,i)}},Yt=new WeakSet,Mi=function(e){const i=me[t(this,G)],s=e/100*b,o=X(D-s);if(t(this,q)?.setAttribute("cx",String(o.x)),t(this,q)?.setAttribute("cy",String(o.y)),t(this,N)?.setAttribute("cx",String(o.x)),t(this,N)?.setAttribute("cy",String(o.y)),i==="brightness"){const a=tt*(1-e/100);t(this,$)?.setAttribute("stroke-dashoffset",String(a)),t(this,et)&&(t(this,et).textContent=e+"%"),t(this,W)?.setAttribute("aria-valuenow",String(e))}else if(i==="temp"){const a=Math.round(t(this,st)+e/100*(t(this,Nt)-t(this,st)));t(this,et)&&(t(this,et).textContent=a+"K"),t(this,W)?.setAttribute("aria-valuenow",String(a))}else t(this,et)&&(t(this,et).textContent=Math.round(e/100*360)+"°"),t(this,W)?.setAttribute("aria-valuenow",String(Math.round(e/100*360)))},ji=new WeakSet,Fr=function(e){n(this,Ft,!0),t(this,N)?.setPointerCapture(e.pointerId),d(this,ci,Sr).call(this,e)},Oi=new WeakSet,Nr=function(e){t(this,Ft)&&d(this,ci,Sr).call(this,e)},li=new WeakSet,_r=function(e){if(t(this,Ft)){n(this,Ft,!1);try{t(this,N)?.releasePointerCapture(e.pointerId)}catch{}t(this,hi).call(this)}},ci=new WeakSet,Sr=function(e){if(!t(this,W))return;const i=t(this,W).getBoundingClientRect(),s=i.left+i.width/2,o=i.top+i.height/2,a=e.clientX-s,l=-(e.clientY-o);let u=Math.atan2(l,a)*180/Math.PI;u<0&&(u+=360);let v=D-u;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b);const w=Math.round(v/b*100),E=me[t(this,G)];E==="brightness"?n(this,it,Math.round(w/100*255)):E==="temp"?n(this,yt,Math.round(t(this,st)+w/100*(t(this,Nt)-t(this,st)))):n(this,xt,Math.round(w/100*360)),t(this,$)&&(t(this,$).style.transition="none"),t(this,q)&&(t(this,q).style.transition="none"),d(this,Yt,Mi).call(this,w)},Fi=new WeakSet,Yr=function(){t(this,$)&&(t(this,$).style.transition=""),t(this,q)&&(t(this,q).style.transition="");const e=me[t(this,G)];e==="brightness"?t(this,it)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("turn_on",{brightness:t(this,it)}):e==="temp"?this.config.card?.sendCommand("turn_on",{color_temp_kelvin:t(this,yt)}):this.config.card?.sendCommand("turn_on",{hs_color:[t(this,xt),100]})};const gs=yr+`
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
    .hrv-fan-feat-btn[data-on=true]  { box-shadow: 0 0 0 3px #fff; opacity: 1; }
    .hrv-fan-feat-btn[data-on=false] { opacity: 0.45; box-shadow: none; }
    .hrv-fan-feat-btn:hover { opacity: 0.88; }
    .hrv-dial-controls [part=toggle-button] { margin-top: 8px; }
    .hrv-dial-controls { padding-bottom: var(--hrv-card-padding, 16px); }
    .hrv-fan-stepped-wrap {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .hrv-fan-speed-circle {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 4px solid #fff;
      background: transparent;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 2.2rem;
      font-weight: 300;
      line-height: 1;
      user-select: none;
      transition: border-color var(--hrv-transition-speed, 0.2s), opacity var(--hrv-transition-speed, 0.2s), color var(--hrv-transition-speed, 0.2s);
    }
    .hrv-fan-speed-circle[aria-pressed=false] {
      opacity: 0.35;
    }
    .hrv-fan-speed-circle:active {
      transition: none;
      border-color: var(--hrv-color-primary, #1976d2);
      color: var(--hrv-color-primary, #1976d2);
    }
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
      box-shadow: 0 0 0 0 rgba(255,255,255,0);
      transition: box-shadow 200ms ease, opacity 200ms ease;
    }
    .hrv-fan-ro-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px #fff;
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

    @media (prefers-reduced-motion: reduce) {
      .hrv-fan-hspeed-thumb { transition: none; }
      .hrv-fan-ro-circle[data-on=true] [part=ro-state-icon] svg { animation: none; }
    }
  `;class bs extends m{constructor(e,i,s,o){super(e,i,s,o);r(this,Se);r(this,Zt);r(this,ui);r(this,$e);r(this,vi);r(this,fi);r(this,Dt);r(this,Yi);r(this,Vi);r(this,mi);r(this,gi);r(this,Wi);r(this,bi);r(this,Zi);r(this,wt,null);r(this,z,null);r(this,Ni,null);r(this,P,null);r(this,_e,null);r(this,Vt,null);r(this,nt,null);r(this,ot,null);r(this,at,null);r(this,I,!1);r(this,x,0);r(this,Ht,!1);r(this,_t,"forward");r(this,H,null);r(this,C,[]);r(this,Wt,!1);r(this,Y,null);r(this,pi,void 0);n(this,pi,Pt(d(this,Wi,Zr).bind(this),300)),n(this,C,e.feature_config?.preset_modes??[])}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=i.includes("set_speed"),o=i.includes("oscillate"),a=i.includes("direction"),l=i.includes("preset_mode"),u=e&&s,v=u&&t(this,Zt,Ti),w=v&&!t(this,C).length,E=v&&!!t(this,C).length,M=X(D);this.root.innerHTML=`
        <style>${this.getSharedStyles()}${gs}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body" class="${u?"":"hrv-no-dial"}">
            ${u?`
              <div class="hrv-dial-column">
                ${w?`
                  <div class="hrv-fan-hspeed-wrap">
                    <div class="hrv-fan-hspeed-switch" role="group"
                      aria-label="${h(this.def.friendly_name)} speed"
                      data-on="false">
                      <div class="hrv-fan-hspeed-thumb"></div>
                      ${t(this,$e,pr).map((f,y)=>`
                        <div class="hrv-fan-hspeed-dot" data-pct="${f}" data-idx="${y}"
                          data-active="false"
                          role="button" tabindex="0"
                          aria-label="Speed ${y+1} (${f}%)"
                          title="Speed ${y+1} (${f}%)"></div>
                      `).join("")}
                    </div>
                  </div>
                `:E?`
                  <div class="hrv-fan-stepped-wrap">
                    <button class="hrv-fan-speed-circle" part="speed-circle" type="button"
                      aria-pressed="false"
                      title="Click to increase fan speed"
                      aria-label="Click to increase fan speed">+</button>
                  </div>
                `:`
                  <div class="hrv-dial-wrap" role="slider"
                    aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
                    aria-label="${h(this.def.friendly_name)} speed"
                    title="Drag to adjust fan speed">
                    <svg viewBox="0 0 120 120">
                      <path class="hrv-dial-track" d="${fe}" />
                      <path class="hrv-dial-fill" d="${fe}"
                        stroke-dasharray="${tt}"
                        stroke-dashoffset="${tt}" />
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
                  role="img" aria-label="${h(this.def.friendly_name)}"
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
                ${a?`
                  <button class="hrv-fan-feat-btn" data-feat="direction" type="button"
                    aria-label="Direction: forward" title="Direction: forward"></button>
                `:""}
                ${l?`
                  <button class="hrv-fan-feat-btn" data-feat="preset" type="button"
                    aria-label="Preset: none" title="Preset: none"></button>
                `:""}
                <button part="toggle-button" type="button"
                  aria-label="${h(this.def.friendly_name)} - toggle"
                  title="Turn ${h(this.def.friendly_name)} on / off"></button>
              </div>
            `:""}
          </div>
        </div>
      `,n(this,wt,this.root.querySelector("[part=toggle-button]")),n(this,z,this.root.querySelector(".hrv-dial-fill")),n(this,Ni,this.root.querySelector(".hrv-dial-track")),n(this,P,this.root.querySelector(".hrv-dial-thumb")),n(this,_e,this.root.querySelector(".hrv-dial-pct")),n(this,Vt,this.root.querySelector(".hrv-dial-wrap")),n(this,Y,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,nt,this.root.querySelector('[data-feat="oscillate"]')),n(this,ot,this.root.querySelector('[data-feat="direction"]')),n(this,at,this.root.querySelector('[data-feat="preset"]')),t(this,wt)?.addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),t(this,Y)&&(t(this,Y).addEventListener("pointerdown",d(this,Yi,Vr).bind(this)),t(this,Y).addEventListener("pointermove",d(this,Vi,Wr).bind(this)),t(this,Y).addEventListener("pointerup",d(this,mi,Lr).bind(this)),t(this,Y).addEventListener("pointercancel",d(this,mi,Lr).bind(this))),this.root.querySelector(".hrv-fan-speed-circle")?.addEventListener("click",()=>{const f=t(this,$e,pr);if(!f.length)return;let y;if(!t(this,I)||t(this,x)===0)y=f[0],n(this,I,!0),t(this,wt)?.setAttribute("aria-pressed","true");else{const Q=f.findIndex(Zs=>Zs>t(this,x));y=Q===-1?f[0]:f[Q]}n(this,x,y),d(this,vi,kr).call(this),this.config.card?.sendCommand("set_percentage",{percentage:y})}),this.root.querySelectorAll(".hrv-fan-hspeed-dot").forEach(f=>{const y=()=>{const Q=Number(f.getAttribute("data-pct"));t(this,I)||(n(this,I,!0),t(this,wt)?.setAttribute("aria-pressed","true")),n(this,x,Q),d(this,fi,Cr).call(this),this.config.card?.sendCommand("set_percentage",{percentage:Q})};f.addEventListener("click",y),f.addEventListener("keydown",Q=>{(Q.key==="Enter"||Q.key===" ")&&(Q.preventDefault(),y())})}),t(this,nt)?.addEventListener("click",()=>{this.config.card?.sendCommand("oscillate",{oscillating:!t(this,Ht)})}),t(this,ot)?.addEventListener("click",()=>{const f=t(this,_t)==="forward"?"reverse":"forward";n(this,_t,f),d(this,Dt,ai).call(this),this.config.card?.sendCommand("set_direction",{direction:f})}),t(this,at)?.addEventListener("click",()=>{if(t(this,C).length){if(t(this,ui,$r)){const f=t(this,H)??t(this,C)[0];this.config.card?.sendCommand("set_preset_mode",{preset_mode:f});return}if(t(this,H)){const f=t(this,C).indexOf(t(this,H));if(f===-1||f===t(this,C).length-1){n(this,H,null),d(this,Dt,ai).call(this);const y=t(this,Se,cr),Q=Math.floor(t(this,x)/y)*y||y;this.config.card?.sendCommand("set_percentage",{percentage:Q})}else{const y=t(this,C)[f+1];n(this,H,y),d(this,Dt,ai).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:y})}}else{const f=t(this,C)[0];n(this,H,f),d(this,Dt,ai).call(this),this.config.card?.sendCommand("set_preset_mode",{preset_mode:f})}}}),this.root.querySelector(".hrv-fan-ro-circle")&&this.renderIcon(this.def.icon??"mdi:fan","ro-state-icon"),this.renderCompanions(),this.root.querySelectorAll("[part=companion]").forEach(f=>{f.title=f.getAttribute("aria-label")??"Companion"})}applyState(e,i){n(this,I,e==="on"),n(this,x,i?.percentage??0),n(this,Ht,i?.oscillating??!1),n(this,_t,i?.direction??"forward"),n(this,H,i?.preset_mode??null),i?.preset_modes?.length&&n(this,C,i.preset_modes),t(this,wt)&&t(this,wt).setAttribute("aria-pressed",String(t(this,I)));const s=this.root.querySelector(".hrv-fan-ro-circle");s&&s.setAttribute("data-on",String(t(this,I))),t(this,Zt,Ti)&&!t(this,C).length?d(this,fi,Cr).call(this):t(this,Zt,Ti)?d(this,vi,kr).call(this):d(this,Zi,Ur).call(this),d(this,Dt,ai).call(this),this.announceState(`${this.def.friendly_name}, ${e}`+(t(this,x)>0?`, ${t(this,x)}%`:""))}predictState(e,i){return e==="toggle"?{state:t(this,I)?"off":"on",attributes:{percentage:t(this,x)}}:e==="set_percentage"?{state:"on",attributes:{percentage:i.percentage,oscillating:t(this,Ht),direction:t(this,_t),preset_mode:t(this,H),preset_modes:t(this,C)}}:null}}wt=new WeakMap,z=new WeakMap,Ni=new WeakMap,P=new WeakMap,_e=new WeakMap,Vt=new WeakMap,nt=new WeakMap,ot=new WeakMap,at=new WeakMap,I=new WeakMap,x=new WeakMap,Ht=new WeakMap,_t=new WeakMap,H=new WeakMap,C=new WeakMap,Wt=new WeakMap,Y=new WeakMap,pi=new WeakMap,Se=new WeakSet,cr=function(){const e=this.def?.feature_config;return e?.percentage_step>1?e.percentage_step:e?.speed_count>1?100/e.speed_count:1},Zt=new WeakSet,Ti=function(){return t(this,Se,cr)>1},ui=new WeakSet,$r=function(){return t(this,Zt,Ti)&&t(this,C).length>0},$e=new WeakSet,pr=function(){const e=t(this,Se,cr),i=[];for(let s=1;s*e<=100.001;s++)i.push(Math.floor(s*e*10)/10);return i},vi=new WeakSet,kr=function(){const e=this.root.querySelector(".hrv-fan-speed-circle");if(!e)return;e.setAttribute("aria-pressed",String(t(this,I)));const i=t(this,I)?"Click to increase fan speed":"Fan off - click to turn on";e.setAttribute("aria-label",i),e.title=i},fi=new WeakSet,Cr=function(){const e=this.root.querySelector(".hrv-fan-hspeed-switch");if(!e)return;const i=e.querySelector(".hrv-fan-hspeed-thumb"),s=t(this,$e,pr);let o=-1;if(t(this,I)&&t(this,x)>0){let a=1/0;s.forEach((l,u)=>{const v=Math.abs(l-t(this,x));v<a&&(a=v,o=u)})}e.setAttribute("data-on",String(o>=0)),i&&o>=0&&(i.style.left=`${2+o*32}px`),e.querySelectorAll(".hrv-fan-hspeed-dot").forEach((a,l)=>{a.setAttribute("data-active",String(l===o))})},Dt=new WeakSet,ai=function(){const e=t(this,ui,$r);if(t(this,nt)){const i=e||t(this,Ht),s=e?"Oscillate":`Oscillate: ${t(this,Ht)?"on":"off"}`;t(this,nt).setAttribute("data-on",String(i)),t(this,nt).setAttribute("aria-pressed",String(i)),t(this,nt).setAttribute("aria-label",s),t(this,nt).title=s}if(t(this,ot)){const i=t(this,_t)!=="reverse",s=`Direction: ${t(this,_t)}`;t(this,ot).setAttribute("data-on",String(i)),t(this,ot).setAttribute("aria-pressed",String(i)),t(this,ot).setAttribute("aria-label",s),t(this,ot).title=s}if(t(this,at)){const i=e||!!t(this,H),s=e?t(this,H)??t(this,C)[0]??"Preset":t(this,H)?`Preset: ${t(this,H)}`:"Preset: none";t(this,at).setAttribute("data-on",String(i)),t(this,at).setAttribute("aria-pressed",String(i)),t(this,at).setAttribute("aria-label",s),t(this,at).title=s}},Yi=new WeakSet,Vr=function(e){n(this,Wt,!0),t(this,Y)?.setPointerCapture(e.pointerId),d(this,gi,Ar).call(this,e)},Vi=new WeakSet,Wr=function(e){t(this,Wt)&&d(this,gi,Ar).call(this,e)},mi=new WeakSet,Lr=function(e){if(t(this,Wt)){n(this,Wt,!1);try{t(this,Y)?.releasePointerCapture(e.pointerId)}catch{}t(this,pi).call(this)}},gi=new WeakSet,Ar=function(e){if(!t(this,Vt))return;const i=t(this,Vt).getBoundingClientRect(),s=i.left+i.width/2,o=i.top+i.height/2,a=e.clientX-s,l=-(e.clientY-o);let u=Math.atan2(l,a)*180/Math.PI;u<0&&(u+=360);let v=D-u;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b),n(this,x,Math.round(v/b*100)),t(this,z)&&(t(this,z).style.transition="none"),t(this,P)&&(t(this,P).style.transition="none"),d(this,bi,Er).call(this,t(this,x))},Wi=new WeakSet,Zr=function(){t(this,z)&&(t(this,z).style.transition=""),t(this,P)&&(t(this,P).style.transition=""),t(this,x)===0?this.config.card?.sendCommand("turn_off",{}):this.config.card?.sendCommand("set_percentage",{percentage:t(this,x)})},bi=new WeakSet,Er=function(e){const i=tt*(1-e/100),s=X(D-e/100*b);t(this,z)?.setAttribute("stroke-dashoffset",String(i)),t(this,P)?.setAttribute("cx",String(s.x)),t(this,P)?.setAttribute("cy",String(s.y)),t(this,Y)?.setAttribute("cx",String(s.x)),t(this,Y)?.setAttribute("cy",String(s.y)),t(this,_e)&&(t(this,_e).textContent=`${e}%`),t(this,Vt)?.setAttribute("aria-valuenow",String(e))},Zi=new WeakSet,Ur=function(){t(this,P)&&(t(this,P).style.transition="none"),t(this,z)&&(t(this,z).style.transition="none"),d(this,bi,Er).call(this,t(this,I)?t(this,x):0),t(this,P)?.getBoundingClientRect(),t(this,z)?.getBoundingClientRect(),t(this,P)&&(t(this,P).style.transition=""),t(this,z)&&(t(this,z).style.transition="")};function ys(c,p,e){c/=255,p/=255,e/=255;const i=Math.max(c,p,e),s=Math.min(c,p,e),o=i-s;if(o===0)return 0;let a;return i===c?a=(p-e)/o%6:i===p?a=(e-c)/o+2:a=(c-p)/o+4,Math.round((a*60+360)%360)}const xs=yr+`
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
      border: 2px solid rgba(255,255,255,0.35);
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
      border-color: #fff;
      background: rgba(255,255,255,0.1);
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
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--hrv-radius-s, 8px);
      box-shadow: 0 -4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.12);
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
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .hrv-cf-option:hover { background: rgba(255,255,255,0.08); }
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
  `;class ws extends m{constructor(e,i,s,o){super(e,i,s,o);r(this,xi);r(this,Ui);r(this,Xi);r(this,Ne);r(this,wi);r(this,Ye);r(this,Gi);r(this,Ki);r(this,_i);r(this,Si);r(this,Ji);r(this,Qi);r(this,ke,null);r(this,St,null);r(this,dt,null);r(this,V,null);r(this,zt,!1);r(this,Ce,null);r(this,Le,null);r(this,Ae,null);r(this,B,null);r(this,R,null);r(this,Ee,null);r(this,Me,null);r(this,Te,null);r(this,qe,null);r(this,$t,null);r(this,Pe,null);r(this,Ut,null);r(this,j,20);r(this,ht,"off");r(this,Ie,null);r(this,He,null);r(this,De,null);r(this,lt,16);r(this,Bt,32);r(this,Xt,.5);r(this,ze,"°C");r(this,Be,[]);r(this,Re,[]);r(this,je,[]);r(this,Oe,[]);r(this,yi,{});r(this,Fe,void 0);n(this,Fe,Pt(d(this,Ji,Qr).bind(this),500))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features?.includes("target_temperature"),s=this.def.supported_features?.includes("fan_mode")||this.def.feature_config?.fan_modes?.length>0,o=this.def.supported_features?.includes("preset_mode")||this.def.feature_config?.preset_modes?.length>0,a=this.def.supported_features?.includes("swing_mode")||this.def.feature_config?.swing_modes?.length>0;n(this,lt,this.def.feature_config?.min_temp??16),n(this,Bt,this.def.feature_config?.max_temp??32),n(this,Xt,this.def.feature_config?.temp_step??.5),n(this,ze,this.def.unit_of_measurement??"°C"),n(this,Be,this.def.feature_config?.hvac_modes??["off","heat","cool","heat_cool","auto","dry","fan_only"]),n(this,Re,this.def.feature_config?.fan_modes??[]),n(this,je,this.def.feature_config?.preset_modes??[]),n(this,Oe,this.def.feature_config?.swing_modes??[]);const l=d(this,xi,Mr).call(this,t(this,j)),u=X(D),v=X(D-l/100*b),w=tt*(1-l/100),[E,M]=t(this,j).toFixed(1).split(".");this.root.innerHTML=`
        <style>${this.getSharedStyles()}${xs}</style>
        <div part="card">
          <div part="card-header">
            <span part="card-name">${h(this.def.friendly_name)}</span>
          </div>
          <div part="card-body">
            ${e&&i?`
              <div class="hrv-dial-wrap">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <path class="hrv-dial-track" d="${fe}"/>
                  <path class="hrv-dial-fill" d="${fe}"
                    stroke-dasharray="${tt}" stroke-dashoffset="${w}"/>
                  <circle class="hrv-dial-thumb" r="7" cx="${v.x}" cy="${v.y}"><title>Drag to set temperature</title></circle>
                  <circle class="hrv-dial-thumb-hit" r="16" cx="${v.x}" cy="${v.y}"><title>Drag to set temperature</title></circle>
                </svg>
                <div class="hrv-climate-center">
                  <span class="hrv-climate-state-text"></span>
                  <div class="hrv-climate-temp-row">
                    <span class="hrv-climate-temp-int">${h(E)}</span><span class="hrv-climate-temp-frac">.${h(M)}</span><span class="hrv-climate-temp-unit">${h(t(this,ze))}</span>
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
                  <span class="hrv-climate-ro-temp-int">${h(E)}</span><span class="hrv-climate-ro-temp-frac">.${h(M)}</span><span class="hrv-climate-ro-temp-unit">${h(t(this,ze))}</span>
                </div>
              </div>
            `:""}
            <div class="hrv-climate-grid">
              ${t(this,Be).length?`
                <button class="hrv-cf-btn" data-feat="mode" type="button"
                  ${e?'title="Change HVAC mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${o&&t(this,je).length?`
                <button class="hrv-cf-btn" data-feat="preset" type="button"
                  ${e?'title="Change preset mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Preset</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${s&&t(this,Re).length?`
                <button class="hrv-cf-btn" data-feat="fan" type="button"
                  ${e?'title="Change fan mode"':'data-readonly="true" title="Read-only"'}>
                  <span class="hrv-cf-label">Fan mode</span>
                  <span class="hrv-cf-value">-</span>
                </button>
              `:""}
              ${a&&t(this,Oe).length?`
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
      `,n(this,ke,this.root.querySelector(".hrv-dial-wrap")),n(this,St,this.root.querySelector(".hrv-dial-fill")),n(this,dt,this.root.querySelector(".hrv-dial-thumb")),n(this,V,this.root.querySelector(".hrv-dial-thumb-hit")),n(this,Ce,this.root.querySelector(".hrv-climate-state-text")),n(this,Le,this.root.querySelector(".hrv-climate-temp-int")),n(this,Ae,this.root.querySelector(".hrv-climate-temp-frac")),n(this,B,this.root.querySelector("[data-dir='-']")),n(this,R,this.root.querySelector("[data-dir='+']")),n(this,Ee,this.root.querySelector("[data-feat=mode]")),n(this,Me,this.root.querySelector("[data-feat=fan]")),n(this,Te,this.root.querySelector("[data-feat=preset]")),n(this,qe,this.root.querySelector("[data-feat=swing]")),n(this,$t,this.root.querySelector(".hrv-climate-dropdown")),t(this,V)&&(t(this,V).addEventListener("pointerdown",d(this,Gi,Kr).bind(this)),t(this,V).addEventListener("pointermove",d(this,Ki,Jr).bind(this)),t(this,V).addEventListener("pointerup",d(this,_i,qr).bind(this)),t(this,V).addEventListener("pointercancel",d(this,_i,qr).bind(this))),t(this,B)&&(t(this,B).addEventListener("click",()=>d(this,wi,Tr).call(this,-1)),t(this,B).addEventListener("pointerdown",()=>t(this,B).setAttribute("data-pressing","true")),t(this,B).addEventListener("pointerup",()=>t(this,B).removeAttribute("data-pressing")),t(this,B).addEventListener("pointerleave",()=>t(this,B).removeAttribute("data-pressing")),t(this,B).addEventListener("pointercancel",()=>t(this,B).removeAttribute("data-pressing"))),t(this,R)&&(t(this,R).addEventListener("click",()=>d(this,wi,Tr).call(this,1)),t(this,R).addEventListener("pointerdown",()=>t(this,R).setAttribute("data-pressing","true")),t(this,R).addEventListener("pointerup",()=>t(this,R).removeAttribute("data-pressing")),t(this,R).addEventListener("pointerleave",()=>t(this,R).removeAttribute("data-pressing")),t(this,R).addEventListener("pointercancel",()=>t(this,R).removeAttribute("data-pressing"))),e&&[t(this,Ee),t(this,Me),t(this,Te),t(this,qe)].forEach(T=>{if(!T)return;const f=T.getAttribute("data-feat");T.addEventListener("click",()=>d(this,Xi,Gr).call(this,f)),T.addEventListener("pointerdown",()=>T.setAttribute("data-pressing","true")),T.addEventListener("pointerup",()=>T.removeAttribute("data-pressing")),T.addEventListener("pointerleave",()=>T.removeAttribute("data-pressing")),T.addEventListener("pointercancel",()=>T.removeAttribute("data-pressing"))}),this.renderCompanions()}applyState(e,i){n(this,yi,{...i}),n(this,ht,e),n(this,Ie,i.fan_mode??null),n(this,He,i.preset_mode??null),n(this,De,i.swing_mode??null),!t(this,zt)&&i.temperature!==void 0&&(n(this,j,i.temperature),d(this,Ye,vr).call(this)),t(this,Ce)&&(t(this,Ce).textContent=ve(i.hvac_action??e));const s=this.root.querySelector(".hrv-climate-ro-temp-int"),o=this.root.querySelector(".hrv-climate-ro-temp-frac");if(s&&i.temperature!==void 0){n(this,j,i.temperature);const[u,v]=t(this,j).toFixed(1).split(".");s.textContent=u,o.textContent=`.${v}`}d(this,Qi,ts).call(this);const a=i.hvac_action??e,l=ve(a);this.announceState(`${this.def.friendly_name}, ${l}`)}predictState(e,i){const s={...t(this,yi)};return e==="set_hvac_mode"&&i.hvac_mode?{state:i.hvac_mode,attributes:s}:e==="set_temperature"&&i.temperature!==void 0?{state:t(this,ht),attributes:{...s,temperature:i.temperature}}:e==="set_fan_mode"&&i.fan_mode?{state:t(this,ht),attributes:{...s,fan_mode:i.fan_mode}}:e==="set_preset_mode"&&i.preset_mode?{state:t(this,ht),attributes:{...s,preset_mode:i.preset_mode}}:e==="set_swing_mode"&&i.swing_mode?{state:t(this,ht),attributes:{...s,swing_mode:i.swing_mode}}:null}}ke=new WeakMap,St=new WeakMap,dt=new WeakMap,V=new WeakMap,zt=new WeakMap,Ce=new WeakMap,Le=new WeakMap,Ae=new WeakMap,B=new WeakMap,R=new WeakMap,Ee=new WeakMap,Me=new WeakMap,Te=new WeakMap,qe=new WeakMap,$t=new WeakMap,Pe=new WeakMap,Ut=new WeakMap,j=new WeakMap,ht=new WeakMap,Ie=new WeakMap,He=new WeakMap,De=new WeakMap,lt=new WeakMap,Bt=new WeakMap,Xt=new WeakMap,ze=new WeakMap,Be=new WeakMap,Re=new WeakMap,je=new WeakMap,Oe=new WeakMap,yi=new WeakMap,Fe=new WeakMap,xi=new WeakSet,Mr=function(e){return Math.max(0,Math.min(100,(e-t(this,lt))/(t(this,Bt)-t(this,lt))*100))},Ui=new WeakSet,Xr=function(e){const i=t(this,lt)+e/100*(t(this,Bt)-t(this,lt)),s=Math.round(i/t(this,Xt))*t(this,Xt);return Math.max(t(this,lt),Math.min(t(this,Bt),+s.toFixed(10)))},Xi=new WeakSet,Gr=function(e){if(t(this,Pe)===e){d(this,Ne,ur).call(this);return}n(this,Pe,e);let i=[],s=null,o="",a="";switch(e){case"mode":i=t(this,Be),s=t(this,ht),o="set_hvac_mode",a="hvac_mode";break;case"fan":i=t(this,Re),s=t(this,Ie),o="set_fan_mode",a="fan_mode";break;case"preset":i=t(this,je),s=t(this,He),o="set_preset_mode",a="preset_mode";break;case"swing":i=t(this,Oe),s=t(this,De),o="set_swing_mode",a="swing_mode";break}if(!i.length||!t(this,$t))return;t(this,$t).innerHTML=i.map(u=>`
        <button class="hrv-cf-option" data-active="${u===s}" type="button">
          ${h(ve(u))}
        </button>
      `).join(""),t(this,$t).querySelectorAll(".hrv-cf-option").forEach((u,v)=>{u.addEventListener("click",()=>{this.config.card?.sendCommand(o,{[a]:i[v]}),d(this,Ne,ur).call(this)})}),t(this,$t).removeAttribute("hidden");const l=u=>{u.composedPath().some(w=>w===this.root||w===this.root.host)||d(this,Ne,ur).call(this)};n(this,Ut,l),document.addEventListener("pointerdown",l,!0)},Ne=new WeakSet,ur=function(){n(this,Pe,null),t(this,$t)?.setAttribute("hidden",""),t(this,Ut)&&(document.removeEventListener("pointerdown",t(this,Ut),!0),n(this,Ut,null))},wi=new WeakSet,Tr=function(e){const i=Math.round((t(this,j)+e*t(this,Xt))*100)/100;n(this,j,Math.max(t(this,lt),Math.min(t(this,Bt),i))),d(this,Ye,vr).call(this),t(this,Fe).call(this)},Ye=new WeakSet,vr=function(){const e=d(this,xi,Mr).call(this,t(this,j)),i=tt*(1-e/100),s=X(D-e/100*b);t(this,St)?.setAttribute("stroke-dashoffset",String(i)),t(this,dt)?.setAttribute("cx",String(s.x)),t(this,dt)?.setAttribute("cy",String(s.y)),t(this,V)?.setAttribute("cx",String(s.x)),t(this,V)?.setAttribute("cy",String(s.y));const[o,a]=t(this,j).toFixed(1).split(".");t(this,Le)&&(t(this,Le).textContent=o),t(this,Ae)&&(t(this,Ae).textContent=`.${a}`)},Gi=new WeakSet,Kr=function(e){n(this,zt,!0),t(this,V)?.setPointerCapture(e.pointerId),d(this,Si,Pr).call(this,e)},Ki=new WeakSet,Jr=function(e){t(this,zt)&&d(this,Si,Pr).call(this,e)},_i=new WeakSet,qr=function(e){if(t(this,zt)){n(this,zt,!1);try{t(this,V)?.releasePointerCapture(e.pointerId)}catch{}t(this,St)&&(t(this,St).style.transition=""),t(this,dt)&&(t(this,dt).style.transition="")}},Si=new WeakSet,Pr=function(e){if(!t(this,ke))return;const i=t(this,ke).getBoundingClientRect(),s=i.left+i.width/2,o=i.top+i.height/2,a=e.clientX-s,l=-(e.clientY-o);let u=Math.atan2(l,a)*180/Math.PI;u<0&&(u+=360);let v=D-u;v<0&&(v+=360),v>b&&(v=v>b+(360-b)/2?0:b),n(this,j,d(this,Ui,Xr).call(this,v/b*100)),t(this,St)&&(t(this,St).style.transition="none"),t(this,dt)&&(t(this,dt).style.transition="none"),d(this,Ye,vr).call(this),t(this,Fe).call(this)},Ji=new WeakSet,Qr=function(){this.config.card?.sendCommand("set_temperature",{temperature:t(this,j)})},Qi=new WeakSet,ts=function(){const e=(i,s)=>{if(!i)return;const o=i.querySelector(".hrv-cf-value");o&&(o.textContent=ve(s??"None"))};e(t(this,Ee),t(this,ht)),e(t(this,Me),t(this,Ie)),e(t(this,Te),t(this,He)),e(t(this,qe),t(this,De))};const _s=`
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
      box-shadow: 0 0 0 0 rgba(255,255,255,0);
      transition:
        box-shadow 200ms ease,
        background var(--hrv-transition-speed),
        opacity 80ms;
    }

    [part=trigger-button]:hover { opacity: 0.88; }

    [part=trigger-button][data-pressing=true] {
      box-shadow: 0 0 0 5px #fff;
      transition: box-shadow 0ms, background var(--hrv-transition-speed), opacity 80ms;
    }

    [part=trigger-button][data-state=triggered] {
      background: var(--hrv-color-success, #43a047);
    }

    [part=trigger-button]:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `;class Ss extends m{constructor(){super(...arguments);r(this,L,null)}render(){const e=this.def.capabilities==="read-write",i=this.def.friendly_name;this.root.innerHTML=`
        <style>${this.getSharedStyles()}${_s}</style>
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
      `,n(this,L,this.root.querySelector("[part=trigger-button]")),this.renderIcon(this.def.icon_state_map?.idle??this.def.icon??"mdi:play","btn-icon"),t(this,L)&&e&&(t(this,L).addEventListener("click",()=>{this.config.card?.sendCommand("trigger",{})}),t(this,L).addEventListener("pointerdown",()=>t(this,L).setAttribute("data-pressing","true")),t(this,L).addEventListener("pointerup",()=>t(this,L).removeAttribute("data-pressing")),t(this,L).addEventListener("pointerleave",()=>t(this,L).removeAttribute("data-pressing")),t(this,L).addEventListener("pointercancel",()=>t(this,L).removeAttribute("data-pressing"))),this.renderCompanions()}applyState(e,i){const s=e==="triggered";t(this,L)&&(t(this,L).setAttribute("data-state",e),this.def.capabilities==="read-write"&&(t(this,L).disabled=s));const o=this.def.icon_state_map?.[e]??this.def.icon??"mdi:play";this.renderIcon(o,"btn-icon"),s&&this.announceState(`${this.def.friendly_name}, ${this.i18n.t("state.triggered")}`)}predictState(e,i){return e!=="trigger"?null:{state:"triggered",attributes:{}}}}L=new WeakMap;const $s=`
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
      box-shadow: 0 0 0 0 rgba(255,255,255,0);
      transition:
        box-shadow 200ms ease,
        opacity 200ms ease;
    }

    .hrv-bs-circle[data-on=true] {
      opacity: 1;
      box-shadow: 0 0 0 5px #fff;
    }

    [part=state-icon] {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--hrv-color-on-primary, #fff);
      pointer-events: none;
    }
    [part=state-icon] svg { width: 40px; height: 40px; }
  `;class ks extends m{constructor(){super(...arguments);r(this,Gt,null)}render(){this.root.innerHTML=`
        <style>${this.getSharedStyles()}${$s}</style>
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
      `,n(this,Gt,this.root.querySelector(".hrv-bs-circle")),this.renderIcon(this.def.icon_state_map?.off??this.def.icon??"mdi:radiobox-blank","state-icon"),this.renderCompanions()}applyState(e,i){const s=e==="on",o=this.i18n.t(`state.${e}`)!==`state.${e}`?this.i18n.t(`state.${e}`):e;t(this,Gt)&&(t(this,Gt).setAttribute("data-on",String(s)),t(this,Gt).setAttribute("aria-label",`${this.def.friendly_name}: ${o}`));const a=this.def.icon_state_map?.[e]??this.def.icon??(s?"mdi:radiobox-marked":"mdi:radiobox-blank");this.renderIcon(a,"state-icon"),this.announceState(`${this.def.friendly_name}, ${o}`)}}Gt=new WeakMap;const Cs='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 14h18v2H3v-2zm0-4h18v2H3v-2zm0-4h18v2H3V10z" opacity="0.3"/><path d="M3 4h18v2H3V4zm0 16h18v2H3v-2z"/></svg>',Ls='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',As='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 4h18v2H3V4zm0 4h18v2H3V8zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>',Es=`
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
      background: rgba(255,255,255,0.15);
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
      border: 3px solid #fff;
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
      border: 2px solid rgba(255,255,255,0.35);
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
      border-color: #fff;
      transition: none;
    }
    .hrv-cover-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .hrv-cover-btn:disabled:active { background: transparent; border-color: rgba(255,255,255,0.35); }
  `;class Ms extends m{constructor(e,i,s,o){super(e,i,s,o);r(this,Ve);r(this,tr);r(this,Kt,null);r(this,ct,null);r(this,_,null);r(this,Jt,null);r(this,Qt,null);r(this,te,null);r(this,kt,!1);r(this,pt,0);r(this,$i,"closed");r(this,ki,{});r(this,Ci,void 0);n(this,Ci,Pt(d(this,tr,es).bind(this),300))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features?.includes("set_position"),s=!this.def.supported_features||this.def.supported_features.includes("buttons");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Es}</style>
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
            ${e&&s?`
              <div class="hrv-cover-btns">
                <button class="hrv-cover-btn" data-action="open" type="button"
                  title="Open cover" aria-label="Open cover">${Cs}</button>
                <button class="hrv-cover-btn" data-action="stop" type="button"
                  title="Stop cover" aria-label="Stop cover">${Ls}</button>
                <button class="hrv-cover-btn" data-action="close" type="button"
                  title="Close cover" aria-label="Close cover">${As}</button>
              </div>
            `:""}
          </div>
          ${this.renderAriaLiveHTML()}
          ${this.renderCompanionZoneHTML()}
          <div part="stale-indicator" aria-hidden="true"></div>
        </div>
      `,n(this,Kt,this.root.querySelector(".hrv-cover-slider-track")),n(this,ct,this.root.querySelector(".hrv-cover-slider-fill")),n(this,_,this.root.querySelector(".hrv-cover-slider-thumb")),n(this,Jt,this.root.querySelector("[data-action=open]")),n(this,Qt,this.root.querySelector("[data-action=stop]")),n(this,te,this.root.querySelector("[data-action=close]")),t(this,Kt)&&t(this,_)&&e){const o=l=>{n(this,kt,!0),t(this,_).style.transition="none",t(this,ct).style.transition="none",d(this,Ve,fr).call(this,l),t(this,_).setPointerCapture(l.pointerId)};t(this,_).addEventListener("pointerdown",o),t(this,Kt).addEventListener("pointerdown",l=>{l.target!==t(this,_)&&(n(this,kt,!0),t(this,_).style.transition="none",t(this,ct).style.transition="none",d(this,Ve,fr).call(this,l),t(this,_).setPointerCapture(l.pointerId))}),t(this,_).addEventListener("pointermove",l=>{t(this,kt)&&d(this,Ve,fr).call(this,l)});const a=()=>{t(this,kt)&&(n(this,kt,!1),t(this,_).style.transition="",t(this,ct).style.transition="",t(this,Ci).call(this))};t(this,_).addEventListener("pointerup",a),t(this,_).addEventListener("pointercancel",a)}[t(this,Jt),t(this,Qt),t(this,te)].forEach(o=>{if(!o)return;const a=o.getAttribute("data-action");o.addEventListener("click",()=>{this.config.card?.sendCommand(`${a}_cover`,{})}),o.addEventListener("pointerdown",()=>o.setAttribute("data-pressing","true")),o.addEventListener("pointerup",()=>o.removeAttribute("data-pressing")),o.addEventListener("pointerleave",()=>o.removeAttribute("data-pressing")),o.addEventListener("pointercancel",()=>o.removeAttribute("data-pressing"))}),this.renderCompanions()}applyState(e,i){n(this,$i,e),n(this,ki,{...i});const s=e==="opening"||e==="closing",o=i.current_position;t(this,Jt)&&(t(this,Jt).disabled=!s&&o===100),t(this,Qt)&&(t(this,Qt).disabled=!s),t(this,te)&&(t(this,te).disabled=!s&&e==="closed"),i.current_position!==void 0&&!t(this,kt)&&(n(this,pt,i.current_position),t(this,ct)&&(t(this,ct).style.width=`${t(this,pt)}%`),t(this,_)&&(t(this,_).style.left=`${t(this,pt)}%`)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){const s={...t(this,ki)};return e==="open_cover"?(s.current_position=100,{state:"open",attributes:s}):e==="close_cover"?(s.current_position=0,{state:"closed",attributes:s}):e==="stop_cover"?{state:t(this,$i),attributes:s}:e==="set_cover_position"&&i.position!==void 0?(s.current_position=i.position,{state:i.position>0?"open":"closed",attributes:s}):null}}Kt=new WeakMap,ct=new WeakMap,_=new WeakMap,Jt=new WeakMap,Qt=new WeakMap,te=new WeakMap,kt=new WeakMap,pt=new WeakMap,$i=new WeakMap,ki=new WeakMap,Ci=new WeakMap,Ve=new WeakSet,fr=function(e){const i=t(this,Kt).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,pt,Math.round(s)),t(this,ct).style.width=`${t(this,pt)}%`,t(this,_).style.left=`${t(this,pt)}%`},tr=new WeakSet,es=function(){this.config.card?.sendCommand("set_cover_position",{position:t(this,pt)})};const Ts=`
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

    .hrv-num-slider-wrap {
      padding: 20px 8px 12px;
    }
    .hrv-num-slider-track {
      position: relative;
      height: 6px;
      background: rgba(255,255,255,0.15);
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
      border: 3px solid #fff;
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
    .hrv-num-input {
      width: 72px;
      padding: 6px 8px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: var(--hrv-radius-s, 8px);
      background: rgba(255,255,255,0.08);
      color: var(--hrv-color-text, #fff);
      font-size: 15px;
      font-family: inherit;
      text-align: center;
      outline: none;
      transition: border-color 0.15s;
    }
    .hrv-num-input:focus { border-color: var(--hrv-color-primary, #1976d2); }
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
  `;class qs extends m{constructor(e,i,s,o){super(e,i,s,o);r(this,er);r(this,ir);r(this,Ue);r(this,Xe);r(this,rr);r(this,ee,null);r(this,Ct,null);r(this,A,null);r(this,Z,null);r(this,We,null);r(this,Lt,!1);r(this,At,0);r(this,K,0);r(this,Et,100);r(this,ie,1);r(this,Ze,void 0);n(this,Ze,Pt(d(this,rr,ss).bind(this),300))}render(){const e=this.def.capabilities==="read-write";n(this,K,this.def.feature_config?.min??0),n(this,Et,this.def.feature_config?.max??100),n(this,ie,this.def.feature_config?.step??1);const i=this.def.unit_of_measurement??"";if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ts}</style>
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
                <input class="hrv-num-input" type="number"
                  min="${t(this,K)}" max="${t(this,Et)}" step="${t(this,ie)}"
                  title="Enter value" aria-label="${h(this.def.friendly_name)} value">
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
      `,n(this,ee,this.root.querySelector(".hrv-num-slider-track")),n(this,Ct,this.root.querySelector(".hrv-num-slider-fill")),n(this,A,this.root.querySelector(".hrv-num-slider-thumb")),n(this,Z,this.root.querySelector(".hrv-num-input")),n(this,We,this.root.querySelector(".hrv-num-readonly-val")),t(this,ee)&&t(this,A)){const s=a=>{n(this,Lt,!0),t(this,A).style.transition="none",t(this,Ct).style.transition="none",d(this,Xe,gr).call(this,a),t(this,A).setPointerCapture(a.pointerId)};t(this,A).addEventListener("pointerdown",s),t(this,ee).addEventListener("pointerdown",a=>{a.target!==t(this,A)&&(n(this,Lt,!0),t(this,A).style.transition="none",t(this,Ct).style.transition="none",d(this,Xe,gr).call(this,a),t(this,A).setPointerCapture(a.pointerId))}),t(this,A).addEventListener("pointermove",a=>{t(this,Lt)&&d(this,Xe,gr).call(this,a)});const o=()=>{t(this,Lt)&&(n(this,Lt,!1),t(this,A).style.transition="",t(this,Ct).style.transition="",t(this,Ze).call(this))};t(this,A).addEventListener("pointerup",o),t(this,A).addEventListener("pointercancel",o)}t(this,Z)&&t(this,Z).addEventListener("input",()=>{const s=parseFloat(t(this,Z).value);isNaN(s)||(n(this,At,Math.max(t(this,K),Math.min(t(this,Et),s))),d(this,Ue,mr).call(this),t(this,Ze).call(this))}),this.renderCompanions()}applyState(e,i){const s=parseFloat(e);if(isNaN(s))return;n(this,At,s),t(this,Lt)||(d(this,Ue,mr).call(this),t(this,Z)&&!this.isFocused(t(this,Z))&&(t(this,Z).value=String(s))),t(this,We)&&(t(this,We).textContent=String(s));const o=this.def.unit_of_measurement??"";this.announceState(`${this.def.friendly_name}, ${s}${o?` ${o}`:""}`)}predictState(e,i){return e==="set_value"&&i.value!==void 0?{state:String(i.value),attributes:{}}:null}}ee=new WeakMap,Ct=new WeakMap,A=new WeakMap,Z=new WeakMap,We=new WeakMap,Lt=new WeakMap,At=new WeakMap,K=new WeakMap,Et=new WeakMap,ie=new WeakMap,Ze=new WeakMap,er=new WeakSet,is=function(e){const i=t(this,Et)-t(this,K);return i===0?0:Math.max(0,Math.min(100,(e-t(this,K))/i*100))},ir=new WeakSet,rs=function(e){const i=t(this,K)+e/100*(t(this,Et)-t(this,K)),s=Math.round(i/t(this,ie))*t(this,ie);return Math.max(t(this,K),Math.min(t(this,Et),+s.toFixed(10)))},Ue=new WeakSet,mr=function(){const e=d(this,er,is).call(this,t(this,At));t(this,Ct)&&(t(this,Ct).style.width=`${e}%`),t(this,A)&&(t(this,A).style.left=`${e}%`)},Xe=new WeakSet,gr=function(e){const i=t(this,ee).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,At,d(this,ir,rs).call(this,s)),d(this,Ue,mr).call(this),t(this,Z)&&(t(this,Z).value=String(t(this,At)))},rr=new WeakSet,ss=function(){this.config.card?.sendCommand("set_value",{value:t(this,At)})};const Ps=`
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
      background: rgba(255,255,255,0.10);
      color: var(--hrv-color-text, #fff);
      font-size: 14px;
      font-family: inherit;
      text-align: left;
      border: 1px solid rgba(255,255,255,0.12);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: background 0.15s;
    }
    .hrv-is-selected:hover { background: rgba(255,255,255,0.15); }
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
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: var(--hrv-radius-s, 8px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.12);
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
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .hrv-is-option:hover { background: rgba(255,255,255,0.08); }
    .hrv-is-option[data-active=true] { color: var(--hrv-color-primary, #1976d2); }
  `;class Is extends m{constructor(){super(...arguments);r(this,sr);r(this,Ai);r(this,Ge,null);r(this,ut,null);r(this,Li,"");r(this,Mt,[]);r(this,re,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ps}</style>
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
      `,n(this,Ge,this.root.querySelector(".hrv-is-selected")),n(this,ut,this.root.querySelector(".hrv-is-dropdown")),t(this,Ge)&&e&&t(this,Ge).addEventListener("click",()=>{t(this,re)?d(this,Ai,Ir).call(this):d(this,sr,ns).call(this)}),this.renderCompanions()}applyState(e,i){n(this,Li,e),n(this,Mt,i?.options??t(this,Mt));const s=this.root.querySelector(".hrv-is-label");s&&(s.textContent=e),t(this,re)&&t(this,ut)?.querySelectorAll(".hrv-is-option").forEach((o,a)=>{o.setAttribute("data-active",String(t(this,Mt)[a]===e))}),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e==="select_option"&&i.option!==void 0?{state:String(i.option),attributes:{}}:null}}Ge=new WeakMap,ut=new WeakMap,Li=new WeakMap,Mt=new WeakMap,re=new WeakMap,sr=new WeakSet,ns=function(){if(!t(this,ut)||!t(this,Mt).length)return;t(this,ut).innerHTML=t(this,Mt).map(i=>`
        <button class="hrv-is-option" type="button"
          data-active="${i===t(this,Li)}"
          title="${h(i)}">
          ${h(i)}
        </button>
      `).join(""),t(this,ut).querySelectorAll(".hrv-is-option").forEach((i,s)=>{i.addEventListener("click",()=>{this.config.card?.sendCommand("select_option",{option:t(this,Mt)[s]}),d(this,Ai,Ir).call(this)})});const e=this.root.querySelector("[part=card]");e&&(e.style.overflow="visible"),t(this,ut).removeAttribute("hidden"),n(this,re,!0)},Ai=new WeakSet,Ir=function(){t(this,ut)?.setAttribute("hidden","");const e=this.root.querySelector("[part=card]");e&&(e.style.overflow=""),n(this,re,!1)};const Hs=`
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
      box-shadow: 0 0 0 3px #fff;
    }
    .hrv-mp-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      box-shadow: none;
    }
    .hrv-mp-btn svg { width: 20px; height: 20px; }
    .hrv-mp-btn[data-role=play] { width: 48px; height: 48px; }
    .hrv-mp-btn[data-role=play] svg { width: 24px; height: 24px; }

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
    .hrv-mp-mute svg { width: 20px; height: 20px; }

    .hrv-mp-slider-wrap { flex: 1; padding: 4px 0; }
    .hrv-mp-slider-track {
      position: relative;
      height: 6px;
      background: rgba(255,255,255,0.15);
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
      background: #fff;
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
  `;class Ds extends m{constructor(e,i,s,o){super(e,i,s,o);r(this,Qe);r(this,nr);r(this,vt,null);r(this,Ke,null);r(this,Je,null);r(this,se,null);r(this,ne,null);r(this,ft,null);r(this,S,null);r(this,oe,null);r(this,ae,null);r(this,de,!1);r(this,mt,0);r(this,Tt,!1);r(this,Ei,void 0);n(this,Ei,this.debounce(d(this,nr,os).bind(this),200))}render(){const e=this.def.capabilities==="read-write",i=this.def.supported_features??[],s=i.includes("volume_set"),o=i.includes("previous_track");if(this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Hs}</style>
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
                ${o?`
                  <button class="hrv-mp-btn" data-role="prev" type="button"
                    title="Previous track">
                    <span part="prev-icon" aria-hidden="true"></span>
                  </button>
                `:""}
                <button class="hrv-mp-btn" data-role="play" type="button"
                  title="Play">
                  <span part="play-icon" aria-hidden="true"></span>
                </button>
                ${o?`
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
      `,n(this,vt,this.root.querySelector("[data-role=play]")),n(this,Ke,this.root.querySelector("[data-role=prev]")),n(this,Je,this.root.querySelector("[data-role=next]")),n(this,se,this.root.querySelector(".hrv-mp-mute")),n(this,ne,this.root.querySelector(".hrv-mp-slider-track")),n(this,ft,this.root.querySelector(".hrv-mp-slider-fill")),n(this,S,this.root.querySelector(".hrv-mp-slider-thumb")),n(this,oe,this.root.querySelector(".hrv-mp-artist")),n(this,ae,this.root.querySelector(".hrv-mp-title")),this.renderIcon("mdi:play","play-icon"),this.renderIcon("mdi:skip-previous","prev-icon"),this.renderIcon("mdi:skip-next","next-icon"),this.renderIcon("mdi:volume-high","mute-icon"),e&&(t(this,vt)?.addEventListener("click",()=>{const a=t(this,vt)?.getAttribute("data-playing")==="true";this.config.card?.sendCommand(a?"media_pause":"media_play",{})}),t(this,Ke)?.addEventListener("click",()=>this.config.card?.sendCommand("media_previous_track",{})),t(this,Je)?.addEventListener("click",()=>this.config.card?.sendCommand("media_next_track",{})),[t(this,vt),t(this,Ke),t(this,Je)].forEach(a=>{a&&(a.addEventListener("pointerdown",()=>a.setAttribute("data-pressing","true")),a.addEventListener("pointerup",()=>a.removeAttribute("data-pressing")),a.addEventListener("pointerleave",()=>a.removeAttribute("data-pressing")),a.addEventListener("pointercancel",()=>a.removeAttribute("data-pressing")))}),t(this,se)?.addEventListener("click",()=>this.config.card?.sendCommand("volume_mute",{is_volume_muted:!t(this,de)})),t(this,ne)&&t(this,S))){const a=u=>{n(this,Tt,!0),t(this,S).style.transition="none",t(this,ft).style.transition="none",d(this,Qe,br).call(this,u),t(this,S).setPointerCapture(u.pointerId)};t(this,S).addEventListener("pointerdown",a),t(this,ne).addEventListener("pointerdown",u=>{u.target!==t(this,S)&&(n(this,Tt,!0),t(this,S).style.transition="none",t(this,ft).style.transition="none",d(this,Qe,br).call(this,u),t(this,S).setPointerCapture(u.pointerId))}),t(this,S).addEventListener("pointermove",u=>{t(this,Tt)&&d(this,Qe,br).call(this,u)});const l=()=>{t(this,Tt)&&(n(this,Tt,!1),t(this,S).style.transition="",t(this,ft).style.transition="",t(this,Ei).call(this))};t(this,S).addEventListener("pointerup",l),t(this,S).addEventListener("pointercancel",l)}this.renderCompanions()}applyState(e,i){const s=e==="playing",o=e==="paused";if(t(this,oe)){const l=i.media_artist??"";t(this,oe).textContent=l,t(this,oe).title=l||"Artist"}if(t(this,ae)){const l=i.media_title??"";t(this,ae).textContent=l,t(this,ae).title=l||"Title"}if(t(this,vt)){t(this,vt).setAttribute("data-playing",String(s));const l=s?"mdi:pause":"mdi:play";this.renderIcon(l,"play-icon"),this.def.capabilities==="read-write"&&(t(this,vt).title=s?"Pause":"Play")}if(n(this,de,!!i.is_volume_muted),t(this,se)){const l=t(this,de)?"mdi:volume-off":"mdi:volume-high";this.renderIcon(l,"mute-icon"),this.def.capabilities==="read-write"&&(t(this,se).title=t(this,de)?"Unmute":"Mute")}i.volume_level!==void 0&&!t(this,Tt)&&(n(this,mt,Math.round(i.volume_level*100)),t(this,ft)&&(t(this,ft).style.width=`${t(this,mt)}%`),t(this,S)&&(t(this,S).style.left=`${t(this,mt)}%`));const a=i.media_title??"";this.announceState(`${this.def.friendly_name}, ${e}${a?` - ${a}`:""}`)}}vt=new WeakMap,Ke=new WeakMap,Je=new WeakMap,se=new WeakMap,ne=new WeakMap,ft=new WeakMap,S=new WeakMap,oe=new WeakMap,ae=new WeakMap,de=new WeakMap,mt=new WeakMap,Tt=new WeakMap,Ei=new WeakMap,Qe=new WeakSet,br=function(e){const i=t(this,ne).getBoundingClientRect(),s=Math.max(0,Math.min(100,(e.clientX-i.left)/i.width*100));n(this,mt,Math.round(s)),t(this,ft).style.width=`${t(this,mt)}%`,t(this,S).style.left=`${t(this,mt)}%`},nr=new WeakSet,os=function(){this.config.card?.sendCommand("volume_set",{volume_level:t(this,mt)/100})};const zs=`
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
      box-shadow: 0 0 0 5px #fff;
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
  `;class Bs extends m{constructor(){super(...arguments);r(this,O,null)}render(){const e=this.def.capabilities==="read-write",i=this.config.tapAction?.data?.command??"power";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${zs}</style>
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
      `,n(this,O,this.root.querySelector(".hrv-remote-circle"));const s=this.resolveIcon(this.def.icon,"mdi:remote");this.renderIcon(s,"remote-icon"),t(this,O)&&e&&(t(this,O).addEventListener("click",()=>{const o=this.config.tapAction?.data?.command??"power",a=this.config.tapAction?.data?.device??void 0,l=a?{command:o,device:a}:{command:o};this.config.card?.sendCommand("send_command",l)}),t(this,O).addEventListener("pointerdown",()=>t(this,O).setAttribute("data-pressing","true")),t(this,O).addEventListener("pointerup",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointerleave",()=>t(this,O).removeAttribute("data-pressing")),t(this,O).addEventListener("pointercancel",()=>t(this,O).removeAttribute("data-pressing"))),this.renderCompanions()}applyState(e,i){const s=this.def.icon_state_map?.[e]??this.def.icon??"mdi:remote";this.renderIcon(this.resolveIcon(s,"mdi:remote"),"remote-icon"),this.announceState(`${this.def.friendly_name}, ${e}`)}}O=new WeakMap;const Rs=`
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
  `;class js extends m{constructor(){super(...arguments);r(this,ti,null);r(this,ei,null)}render(){const e=this.def.unit_of_measurement??"";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Rs}</style>
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
      `,n(this,ti,this.root.querySelector(".hrv-sensor-val")),n(this,ei,this.root.querySelector(".hrv-sensor-unit")),this.renderCompanions()}applyState(e,i){t(this,ti)&&(t(this,ti).textContent=e),t(this,ei)&&i.unit_of_measurement!==void 0&&(t(this,ei).textContent=i.unit_of_measurement);const s=i.unit_of_measurement??this.def.unit_of_measurement??"",o=this.root.querySelector("[part=card-body]");o&&(o.title=`${e}${s?` ${s}`:""}`),this.announceState(`${this.def.friendly_name}, ${e}${s?` ${s}`:""}`)}}ti=new WeakMap,ei=new WeakMap;const Os=`
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
      background: rgba(255,255,255,0.25);
      border: 2px solid rgba(255,255,255,0.3);
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
      background: #fff;
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
  `;class Fs extends m{constructor(){super(...arguments);r(this,gt,null);r(this,ii,null);r(this,he,!1)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Os}</style>
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
      `,n(this,gt,this.root.querySelector(".hrv-switch-track")),n(this,ii,this.root.querySelector(".hrv-switch-ro")),t(this,gt)&&e&&t(this,gt).addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),this.renderCompanions()}applyState(e,i){n(this,he,e==="on");const s=e==="unavailable"||e==="unknown";t(this,gt)&&(t(this,gt).setAttribute("data-on",String(t(this,he))),t(this,gt).title=t(this,he)?"On - click to turn off":"Off - click to turn on",t(this,gt).disabled=s),t(this,ii)&&(t(this,ii).textContent=ve(e)),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,he)?"off":"on",attributes:{}}}}gt=new WeakMap,ii=new WeakMap,he=new WeakMap;const Ns=`
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
      box-shadow: 0 0 0 3px #fff;
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
  `;function Ii(c){c<0&&(c=0);const p=Math.floor(c/3600),e=Math.floor(c%3600/60),i=Math.floor(c%60),s=o=>String(o).padStart(2,"0");return p>0?`${p}:${s(e)}:${s(i)}`:`${s(e)}:${s(i)}`}function Dr(c){if(typeof c=="number")return c;if(typeof c!="string")return 0;const p=c.split(":").map(Number);return p.length===3?p[0]*3600+p[1]*60+p[2]:p.length===2?p[0]*60+p[1]:p[0]||0}class Ys extends m{constructor(){super(...arguments);r(this,or);r(this,ar);r(this,dr);r(this,ce);r(this,U,null);r(this,qt,null);r(this,Rt,null);r(this,jt,null);r(this,le,null);r(this,ri,"idle");r(this,si,{});r(this,J,null);r(this,ni,null)}render(){const e=this.def.capabilities==="read-write";this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Ns}</style>
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
      `,n(this,U,this.root.querySelector(".hrv-timer-display")),n(this,qt,this.root.querySelector("[data-action=playpause]")),n(this,Rt,this.root.querySelector("[data-action=cancel]")),n(this,jt,this.root.querySelector("[data-action=finish]")),this.renderIcon("mdi:play","playpause-icon"),this.renderIcon("mdi:stop","cancel-icon"),this.renderIcon("mdi:check-circle","finish-icon"),e&&(t(this,qt)?.addEventListener("click",()=>{const i=t(this,ri)==="active"?"pause":"start";this.config.card?.sendCommand(i,{})}),t(this,Rt)?.addEventListener("click",()=>{this.config.card?.sendCommand("cancel",{})}),t(this,jt)?.addEventListener("click",()=>{this.config.card?.sendCommand("finish",{})}),[t(this,qt),t(this,Rt),t(this,jt)].forEach(i=>{i&&(i.addEventListener("pointerdown",()=>i.setAttribute("data-pressing","true")),i.addEventListener("pointerup",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointerleave",()=>i.removeAttribute("data-pressing")),i.addEventListener("pointercancel",()=>i.removeAttribute("data-pressing")))})),this.renderCompanions()}applyState(e,i){n(this,ri,e),n(this,si,{...i}),n(this,J,i.finishes_at??null),n(this,ni,i.remaining!=null?Dr(i.remaining):null),d(this,or,as).call(this,e),d(this,ar,ds).call(this,e),e==="active"&&t(this,J)?d(this,dr,hs).call(this):d(this,ce,qi).call(this),t(this,U)&&t(this,U).setAttribute("data-paused",String(e==="paused"))}predictState(e,i){const s={...t(this,si)};return e==="start"?{state:"active",attributes:s}:e==="pause"?(t(this,J)&&(s.remaining=Math.max(0,(new Date(t(this,J)).getTime()-Date.now())/1e3)),{state:"paused",attributes:s}):e==="cancel"||e==="finish"?{state:"idle",attributes:s}:null}}U=new WeakMap,qt=new WeakMap,Rt=new WeakMap,jt=new WeakMap,le=new WeakMap,ri=new WeakMap,si=new WeakMap,J=new WeakMap,ni=new WeakMap,or=new WeakSet,as=function(e){const i=e==="idle",s=e==="active";if(t(this,qt)){const o=s?"mdi:pause":"mdi:play",a=s?"Pause":e==="paused"?"Resume":"Start";this.renderIcon(o,"playpause-icon"),t(this,qt).title=a,t(this,qt).setAttribute("aria-label",`${this.def.friendly_name} - ${a}`)}t(this,Rt)&&(t(this,Rt).disabled=i),t(this,jt)&&(t(this,jt).disabled=i),this.announceState(`${this.def.friendly_name}, ${e}`)},ar=new WeakSet,ds=function(e){if(t(this,U)){if(e==="idle"){const i=t(this,si).duration;t(this,U).textContent=i?Ii(Dr(i)):"00:00";return}if(e==="paused"&&t(this,ni)!=null){t(this,U).textContent=Ii(t(this,ni));return}if(e==="active"&&t(this,J)){const i=Math.max(0,(new Date(t(this,J)).getTime()-Date.now())/1e3);t(this,U).textContent=Ii(i)}}},dr=new WeakSet,hs=function(){d(this,ce,qi).call(this),n(this,le,setInterval(()=>{if(!t(this,J)||t(this,ri)!=="active"){d(this,ce,qi).call(this);return}const e=Math.max(0,(new Date(t(this,J)).getTime()-Date.now())/1e3);t(this,U)&&(t(this,U).textContent=Ii(e)),e<=0&&d(this,ce,qi).call(this)},1e3))},ce=new WeakSet,qi=function(){t(this,le)&&(clearInterval(t(this,le)),n(this,le,null))};const Vs=`
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
      border: 2px solid rgba(255,255,255,0.3);
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
      background: #fff;
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
  `;class Ws extends m{constructor(){super(...arguments);r(this,oi,null);r(this,bt,null);r(this,pe,!1);r(this,ue,!1)}render(){const e=this.def.capabilities==="read-write";n(this,ue,!1),this.root.innerHTML=`
        <style>${this.getSharedStyles()}${Vs}</style>
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
      `,n(this,oi,this.root.querySelector(".hrv-generic-state")),n(this,bt,this.root.querySelector(".hrv-generic-toggle")),t(this,bt)&&e&&t(this,bt).addEventListener("click",()=>{this.config.card?.sendCommand("toggle",{})}),this.renderCompanions()}applyState(e,i){const s=e==="on"||e==="off";n(this,pe,e==="on"),t(this,oi)&&(t(this,oi).textContent=ve(e)),t(this,bt)&&(s&&!t(this,ue)&&(t(this,bt).removeAttribute("hidden"),n(this,ue,!0)),t(this,ue)&&(t(this,bt).setAttribute("data-on",String(t(this,pe))),t(this,bt).title=t(this,pe)?"On - click to turn off":"Off - click to turn on")),this.announceState(`${this.def.friendly_name}, ${e}`)}predictState(e,i){return e!=="toggle"?null:{state:t(this,pe)?"off":"on",attributes:{}}}}oi=new WeakMap,bt=new WeakMap,pe=new WeakMap,ue=new WeakMap,g._packs=g._packs||{},g._packs.examples={light:ms,fan:bs,climate:ws,harvest_action:Ss,binary_sensor:ks,cover:Ms,input_number:qs,input_select:Is,media_player:Ds,remote:Bs,sensor:js,switch:Fs,timer:Ys,generic:Ws}})();})();
