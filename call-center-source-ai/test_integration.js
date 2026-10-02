global.fetch = () => Promise.reject(new Error('offline test'));
const fs=require('fs');
const errors=[]; const origErr=console.error; console.error=(...a)=>{errors.push(a.map(String).join(' ')); };
// ---------- DOM stub ----------
const listeners={}; const els={};
function ctx2d(){ return new Proxy({}, {get:(t,p)=> p==='createRadialGradient'||p==='createLinearGradient'? ()=>({addColorStop(){}}) : p==='createImageData'? ()=>({data:new Array(4*160*120)}) : p in t? t[p] : ()=>{}, set:(t,p,v)=>{t[p]=v;return true;}}); }
function mkEl(id){
  const cls=new Set(id==='menu'?['modal','show']:[]);
  const el={ id, style:{}, dataset:{}, children:[], value:'', textContent:'', innerHTML:'', width:100,height:100, _l:{},
    classList:{add:(...c)=>c.forEach(x=>cls.add(x)), remove:(...c)=>c.forEach(x=>cls.delete(x)), contains:c=>cls.has(c), toggle:(c,f)=>{ if(f===undefined) f=!cls.has(c); f?cls.add(c):cls.delete(c); }},
    addEventListener(t,f){ (this._l[t]=this._l[t]||[]).push(f); }, appendChild(c){ this.children.push(c); return c;}, remove(){}, insertAdjacentHTML(){},
    querySelector(){ return mkEl('q'); }, querySelectorAll(){ return []; }, getContext(){ return ctx2d(); }, closest(){ return null; },
    get firstChild(){ const s=this; return {remove(){ s.children.shift(); }}; }, requestPointerLock(){ return Promise.resolve(); }, blur(){}, click(){ (this._l.click||[]).forEach(f=>f({target:this})); } };
  Object.defineProperty(el,'clientWidth',{value:1000});
  return el;
}
global.document={ querySelectorAll(){ return []; }, getElementById:id=>els[id]||(els[id]=mkEl(id)), createElement:t=>mkEl(t), body:mkEl('body'), pointerLockElement:null, exitPointerLock(){}, hidden:false,
  addEventListener(t,f){ (listeners[t]=listeners[t]||[]).push(f); } };
global.window={ innerWidth:1280, innerHeight:720, devicePixelRatio:1, addEventListener(t,f){ (listeners['w_'+t]=listeners['w_'+t]||[]).push(f); } };
global.localStorage={ _d:{}, getItem(k){ return this._d[k]||null; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
let raf=null; global.requestAnimationFrame=f=>{ raf=f; }; global.performance={ _t:0, now(){ return this._t; } };
global.setTimeout=(f,ms)=>{ pend.push(f); return pend.length; }; global.clearTimeout=()=>{}; global.setInterval=()=>1; global.clearInterval=()=>{};
const pend=[];
// ---------- THREE stub ----------
class V3{ constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} setScalar(s){this.x=this.y=this.z=s;return this;} copy(v){return this.set(v.x,v.y,v.z);} }
class Col{ set(){return this;} setHex(){return this;} setRGB(){return this;} multiplyScalar(){return this;} setScalar(){return this;} }
class Obj{ constructor(){ this.position=new V3(); this.rotation=new V3(); this.scale=new V3(1,1,1); this.children=[]; this.userData={}; this.visible=true; }
  add(c){ this.children.push(c); return this; } remove(c){ this.children=this.children.filter(x=>x!==c); } traverse(f){ f(this); this.children.forEach(c=>c.traverse?c.traverse(f):f(c)); } lookAt(){} }
class Mesh extends Obj{ constructor(g,m){ super(); this.geometry=g; this.material=m; this.isMesh=true; } }
class Geo{ constructor(){ this.attributes={uv:{count:0,getX(){return 0},getY(){return 0},setXY(){},needsUpdate:false}}; } }
class Mat{ constructor(o){ Object.assign(this,o||{}); this.color=new Col(); } }
class Tex{ constructor(){ this.repeat=new V3(); this.offset=new V3(); this.image={getContext:()=>ctx2d()}; } clone(){ return new Tex(); } }
class Light extends Obj{ constructor(){ super(); this.color=new Col(); this.intensity=1; } }
global.THREE={ Vector3:V3, Group:Obj, Mesh, Scene:class extends Obj{}, Color:Col, FogExp2:class{},
  PerspectiveCamera:class extends Obj{ constructor(){ super(); this.rotation.order='YXZ'; this.rotation.set=function(x,y,z){this.x=x;this.y=y;this.z=z;return this;}; } updateProjectionMatrix(){} },
  WebGLRenderer:class{ constructor(){ this.domElement=mkEl('canvas'); } setPixelRatio(){} setSize(){} render(){} },
  BoxGeometry:Geo, PlaneGeometry:Geo, CylinderGeometry:Geo, CircleGeometry:Geo, TorusGeometry:Geo, TubeGeometry:Geo, CatmullRomCurve3:class{},
  MeshLambertMaterial:Mat, MeshBasicMaterial:Mat, CanvasTexture:Tex, PointLight:Light, HemisphereLight:Light, RepeatWrapping:1,
  Raycaster:class{ setFromCamera(){} intersectObjects(){ return []; } } };
const src=fs.readFileSync('bundle.js','utf8');
const fn=new Function('console',src+`
 ;return {Game,G,CallSystem,EventSystem,BossSystem,TimeSystem,Player,World,UI,DaySystem,NPCSystem,SaveSystem,Input,PROG,APPROACHES,MoneySystem,Interaction};`);
const X=fn(console);
(listeners['w_load']||[]).forEach(f=>f());
const $=id=>document.getElementById(id);
function frames(n,dt=0.05){ for(let i=0;i<n;i++){ performance._t+=dt*1000; const f=raf; f&&f(performance._t); while(pend.length) pend.shift()(); } }
function click(id){ $(id).click(); while(pend.length) pend.shift()(); }
console.log('ready', X.Game.ready, 'employees', X.World.employees.length);
click('b-new'); console.log('mode',X.G.mode); click('b-clockin'); console.log('mode',X.G.mode);
console.log("pre-frames"); frames(1); console.log("f1"); frames(19); console.log("frames ok");
// fast play: force ringing & play calls
let sales=0, calls=0;
function playCall(){
  X.CallSystem.state==='idle' && X.CallSystem.startRing(X.NPCSystem.next(X.G.day));
  if(X.CallSystem.state!=='ringing') return;
  X.Interaction.target=null;
  X.CallSystem.answer(); frames(2);
  let g=0;
  while(X.CallSystem.state==='active' && g++<30){
    const call=X.CallSystem.active; const opts=['friendly','confident','reassure','friendly','change'];
    X.UI.pick(X.CallSystem.state==='active' && call.stage>=3 ? 'close':opts[g%opts.length]);
    frames(30);
  }
  frames(10);
  if(X.CallSystem.state==='result'){ calls++; if(X.CallSystem.result.good) sales++; click('b-result'); }
}
for(let d=0; d<2; d++){
  // trigger every event once
  for(const e of ['crash','network','overload','argument','spill','suspicious','angrycall','server','fired','flicker','printer','meeting']){
    console.log('ev',e); X.EventSystem.trigger(e); frames(40); if(e==='meeting'){ click('b-meeting'); } 
    for(const id of Object.keys(X.EventSystem.active)) X.EventSystem.active[id]=0.01; frames(5);
  }
  X.BossSystem.startVisit(); frames(400); // boss walks
  console.log('boss state', X.BossSystem.state);
  let guard=0;
  while(X.G.mode==='play' && guard++<60){ playCall(); frames(60); X.TimeSystem.add(10); frames(5); }
  console.log('day',X.G.day,'mode',X.G.mode,'money',X.G.today.money,'calls',calls,'sales',sales);
  if(X.G.mode==='review'){ console.log('review shown; saved:', JSON.stringify(X.SaveSystem.load()).slice(0,120)); click('b-next'); click('b-clockin'); frames(10); }
}
// save mid-day & continue
X.DaySystem.saveMid(); click('b-quit'); console.log('menu mode', X.G.mode); click('b-cont'); console.log('after continue', X.G.mode, X.G.day, X.TimeSystem.minutes); click('b-clockin'); frames(10);
// pause flow
X.Game.pauseMenu(); console.log('paused', X.Game.isPaused); click('b-resume'); console.log('resumed', X.Game.isPaused);
// computer apps
for(const a of ['calls','customers','notes','stats','target','status']){ $('computer').classList.add('show'); X.UI.openApp(a); X.UI.tickApp(); }
console.log('ERRORS', errors.length); errors.slice(0,10).forEach(e=>console.log(' -',e.slice(0,300)));
