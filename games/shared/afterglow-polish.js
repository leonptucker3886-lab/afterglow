/* Afterglow polish layer - by Datasheet
   Intro screen, sound, win/lose effects, animated balance, keyboard shortcuts.
   Usage: <script src="../shared/afterglow-polish.js" data-title="Game Name"></script>
   data-mode="intro" = intro screen + credit only (non-casino games). */
(function(){
"use strict";
var me=document.currentScript||{};var ds=me.dataset||{};
var title=ds.title||(document.title.split(/\s[\u00b7\u2014-]\s/)[0]||'Afterglow');
var introOnly=ds.mode==='intro';
var RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
var css=document.createElement('style');
css.textContent=
'#agIntro{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:radial-gradient(ellipse at center,#2a0b45 0%,#07060f 70%);color:#f3eefe;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;cursor:pointer;transition:opacity .6s;padding:20px}'+
'#agIntro.out{opacity:0;pointer-events:none}'+
'#agIntro .k{letter-spacing:.45em;font-size:.8rem;opacity:0;color:#22e6ff;animation:agUp .7s .15s forwards}'+
'#agIntro .t{font-weight:900;font-size:clamp(2.2rem,9vw,4.4rem);letter-spacing:.06em;margin:.25em 0;color:#ff3df2;text-shadow:0 0 18px #ff3df2,0 0 50px rgba(255,61,242,.55);opacity:0;animation:agZoom .9s .45s cubic-bezier(.2,.9,.3,1.2) forwards}'+
'#agIntro .by{font-size:.95rem;letter-spacing:.3em;text-transform:uppercase;opacity:0;animation:agUp .7s 1s forwards}'+
'#agIntro .by b{background:linear-gradient(90deg,#ff3df2,#22e6ff);-webkit-background-clip:text;background-clip:text;color:transparent}'+
'#agIntro .bar{width:min(260px,60vw);height:4px;margin:26px auto 10px;border-radius:9px;background:#ffffff14;overflow:hidden}'+
'#agIntro .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff3df2,#22e6ff,#ffd25a);box-shadow:0 0 12px #ff3df2;animation:agBar 2.4s .3s ease-in-out forwards}'+
'#agIntro .sk{font-size:.75rem;opacity:.45}'+
'@keyframes agUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'+
'@keyframes agZoom{from{opacity:0;transform:scale(.6);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}'+
'@keyframes agBar{to{width:100%}}'+
'.agPop{display:inline-block;animation:agPop .45s}@keyframes agPop{40%{transform:scale(1.25);text-shadow:0 0 22px #ffd25a}}'+
'.agDown{display:inline-block;animation:agDown .45s}@keyframes agDown{40%{transform:scale(.9);color:#ff7aa8}}'+
'.agShake{animation:agShake .4s}@keyframes agShake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}'+
'button{transition:transform .08s,box-shadow .2s,filter .2s}button:not(:disabled):hover{box-shadow:0 0 16px rgba(34,230,255,.45);filter:brightness(1.12)}button:not(:disabled):active{transform:scale(.95)}'+
'button:focus-visible,a:focus-visible{outline:3px solid #ffd25a;outline-offset:3px}'+
'#agSnd{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:50;width:44px;height:44px;min-height:44px;padding:0;border-radius:50%;font-size:18px;background:#07060fcc;border:1.5px solid #22e6ff;color:#fff;cursor:pointer;backdrop-filter:blur(8px)}'+
'#agFx{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:60}'+
'.agBy{display:block;margin-top:4px;font-size:.75rem;letter-spacing:.25em;text-transform:uppercase;opacity:.6;text-shadow:none;color:#f3eefe;font-weight:600}'+
'@media (prefers-reduced-motion: reduce){#agIntro *,.agPop,.agDown,.agShake{animation-duration:.01s!important;animation-delay:0s!important}}';
document.head.appendChild(css);

/* ---------- Sound (synthesized, no files) ---------- */
var AC=null,on=true;try{on=localStorage.getItem('ag_sound')!=='off'}catch(e){}
function ctx(){if(!AC){var C=window.AudioContext||window.webkitAudioContext;if(C)AC=new C()}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,dur,type,vol,delay){if(!on)return;var a=ctx();if(!a)return;var t=a.currentTime+(delay||0);var o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(vol||.06,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(a.destination);o.start(t);o.stop(t+dur+.02)}
var sfx={
 click:function(){tone(520,.05,'triangle',.035)},
 win:function(){[523,659,784,1047].forEach(function(f,i){tone(f,.18,'triangle',.06,i*.08)})},
 big:function(){[523,659,784,1047,1319,1568].forEach(function(f,i){tone(f,.22,'square',.04,i*.07)})},
 lose:function(){tone(220,.18,'sawtooth',.03);tone(165,.25,'sawtooth',.03,.12)},
 intro:function(){tone(392,.25,'sine',.05);tone(587,.3,'sine',.05,.15);tone(784,.5,'triangle',.05,.3)}};

/* ---------- Intro screen ---------- */
var key='ag_intro_'+location.pathname;
function intro(){
  var seen=false;try{seen=!!sessionStorage.getItem(key)}catch(e){}
  var d=document.createElement('div');d.id='agIntro';d.setAttribute('role','dialog');d.setAttribute('aria-label','Loading '+title);
  d.innerHTML='<div><div class="k">AFTERGLOW CASINO PRESENTS</div><div class="t"></div><div class="by">a game by <b>Datasheet</b></div><div class="bar"><i></i></div><div class="sk">Tap to skip</div></div>';
  d.querySelector('.t').textContent=title;
  document.body.appendChild(d);
  if(seen){d.querySelectorAll('*').forEach(function(n){n.style.animationDelay='0s';n.style.animationDuration='.35s'});d.querySelector('.bar i').style.animationDuration='1s'}
  var ms=seen?1200:(RM?900:2900),done=false;
  function close(){if(done)return;done=true;try{sessionStorage.setItem(key,'1')}catch(e){}d.classList.add('out');setTimeout(function(){d.remove()},650);removeEventListener('keydown',kh,true)}
  function kh(e){if(e.key==='Escape'||e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();close()}}
  d.addEventListener('click',function(){sfx.intro();close()});addEventListener('keydown',kh,true);
  setTimeout(close,ms);
}
function credit(){var h=document.querySelector('main h1');if(h&&!h.querySelector('.agBy')){var s=document.createElement('span');s.className='agBy';s.textContent='by Datasheet';h.appendChild(s)}}

/* ---------- Confetti ---------- */
var cv,cx,parts=[],raf=0;
function burst(n){if(RM)return;if(!cv){cv=document.createElement('canvas');cv.id='agFx';document.body.appendChild(cv);cx=cv.getContext('2d')}
 var dpr=window.devicePixelRatio||1;cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
 var C=['#ff3df2','#22e6ff','#ffd25a','#ffffff'];
 for(var i=0;i<(n||70);i++)parts.push({x:innerWidth/2,y:innerHeight*.38,vx:(Math.random()-.5)*12,vy:-Math.random()*11-3,r:Math.random()*4+2,c:C[i%4],l:70+Math.random()*40,a:Math.random()*6});
 if(!raf)raf=requestAnimationFrame(step)}
function step(){cx.clearRect(0,0,innerWidth,innerHeight);
 parts=parts.filter(function(p){p.vy+=.32;p.x+=p.vx;p.y+=p.vy;p.vx*=.99;p.a+=.2;p.l--;cx.globalAlpha=Math.max(0,Math.min(1,p.l/30));cx.fillStyle=p.c;cx.save();cx.translate(p.x,p.y);cx.rotate(p.a);cx.fillRect(-p.r,-p.r/2,p.r*2,p.r);cx.restore();return p.l>0});
 raf=parts.length?requestAnimationFrame(step):0;if(!raf)cx.clearRect(0,0,innerWidth,innerHeight)}

/* ---------- Animated balance ---------- */
function balance(){var el=document.getElementById('bal');if(!el)return;var shown=parseInt(el.textContent.replace(/\D/g,''),10)||0,lock=false,anim=0;
 new MutationObserver(function(){if(lock)return;var target=parseInt(el.textContent.replace(/\D/g,''),10);if(!isFinite(target)||target===shown)return;
  var from=shown,diff=target-from;shown=target;el.classList.remove('agPop','agDown');void el.offsetWidth;el.classList.add(diff>0?'agPop':'agDown');
  if(RM)return;cancelAnimationFrame(anim);var t0=performance.now(),D=Math.min(900,250+Math.abs(diff)/2);
  (function f(t){var k=Math.min(1,(t-t0)/D),e=1-Math.pow(1-k,3);lock=true;el.textContent=Math.round(from+diff*e).toLocaleString();lock=false;if(k<1)anim=requestAnimationFrame(f)})(t0);
 }).observe(el,{childList:true,characterData:true,subtree:true})}

/* ---------- Win / lose reactions ---------- */
function reactions(){var m=document.getElementById('msg');if(!m)return;var last='';
 new MutationObserver(function(){var c=m.className,t=m.textContent;if(t===last)return;last=t;
  var amt=parseInt((t.match(/[\d,]+/)||['0'])[0].replace(/,/g,''),10)||0;
  if(/\bwin\b/.test(c)){var big=amt>=250||/blackjack|jackpot|x\b|\d+\s*\u00d7/i.test(t)&&amt>=100;(big?sfx.big:sfx.win)();burst(big?140:60)}
  else if(/\blose\b/.test(c)){sfx.lose();var tb=document.querySelector('.table');if(tb&&!RM){tb.classList.remove('agShake');void tb.offsetWidth;tb.classList.add('agShake')}}
 }).observe(m,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']})}

/* ---------- Clicks + keyboard ---------- */
function controls(){document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('button')&&e.target.id!=='agSnd')sfx.click()},true);
 addEventListener('keydown',function(e){if(document.getElementById('agIntro'))return;var tag=(e.target.tagName||'');if(/INPUT|TEXTAREA|SELECT|BUTTON|A/.test(tag))return;
  if(e.key===' '||e.key==='Enter'){var g=document.querySelector('button.go:not(:disabled)');if(g){e.preventDefault();g.click()}}});
 var b=document.createElement('button');b.id='agSnd';function u(){b.textContent=on?'\u{1F50A}':'\u{1F507}';b.setAttribute('aria-label',on?'Mute sound':'Unmute sound');b.title=b.getAttribute('aria-label')}u();
 b.onclick=function(){on=!on;try{localStorage.setItem('ag_sound',on?'on':'off')}catch(_){}u();if(on)sfx.click()};document.body.appendChild(b)}

window.AfterglowFX={sfx:sfx,burst:burst};
function init(){intro();credit();if(introOnly)return;balance();reactions();controls()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
