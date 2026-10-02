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
 ;return {LLM,AISettings,Heur,Speech,Equip,DialogueSystem,Game,G,CallSystem,EventSystem,BossSystem,TimeSystem,Player,World,UI,DaySystem,NPCSystem,SaveSystem,Input,PROG,APPROACHES,MoneySystem,Interaction};`);
const X=fn(console);
(listeners['w_load']||[]).forEach(f=>f());
const $=id=>document.getElementById(id);
function frames(n,dt=0.05){ for(let i=0;i<n;i++){ performance._t+=dt*1000; const f=raf; f&&f(performance._t); while(pend.length) pend.shift()(); } }
function click(id){ $(id).click(); while(pend.length) pend.shift()(); }

const assert=(c,m)=>{ if(!c){ console.log('FAIL:',m); process.exitCode=1; } else console.log('ok  :',m); };
const flush=async()=>{ for(let i=0;i<10;i++){ await Promise.resolve(); await new Promise(r=>setImmediate(r)); while(pend.length) pend.shift()(); } };

// ---- mock Ollama
let mode='good', calls=[], nextReply={approach:'friendly',intent:'question',reply:'Hmm, what is this about?'};
global.fetch=async(url,opts)=>{
  calls.push({url,body:opts&&opts.body?JSON.parse(opts.body):null});
  if(mode==='down') throw new Error('connection refused');
  if(url.endsWith('/api/tags')) return {ok:true,json:async()=>({models:[{name:'llama3.2:3b'}]})};
  if(url.endsWith('/api/generate')) return {ok:true,json:async()=>({})};
  const b=JSON.parse(opts.body);
  if(b.messages[0].content.includes('THE BOSS')) return {ok:true,json:async()=>({message:{content:JSON.stringify({reply:'Why are you chatting?',annoy_delta:3})}})};
  const content = mode==='junk' ? 'sure! here you go {"approach":"pressure","intent":"angry","reply":"*sighs* CUSTOMER: Stop pushing me."} bye' : JSON.stringify(nextReply);
  return {ok:true,json:async()=>({message:{content}})};
};

click('b-new'); click('b-clockin'); frames(20);
const {CallSystem:CS,G,LLM,Heur,BossSystem:BS,Equip}=X;

function startCall(){
  X.CallSystem.state==='idle' && X.CallSystem.startRing(X.NPCSystem.next(G.day));
  X.CallSystem.answer(); frames(5);
  return X.CallSystem.active;
}
(async()=>{
  // 1. typed turn with AI
  let call=startCall(); call.stage=0;
  const t0=call.turns;
  await CS.submitText('Hello! Hope I am not bothering you.'); await flush();
  assert(call.turns===t0+1,'typed turn counted');
  assert(call.log.some(e=>e.who==='you'&&e.text.startsWith('Hello!')),'player text logged verbatim');
  assert(call.log.some(e=>e.who==='caller'&&e.text==='Hmm, what is this about?'),'AI reply used');
  assert(call.intent==='question','AI intent adopted');
  const body=calls.filter(c=>c.body&&c.body.messages).pop().body;
  assert(body.format&&body.format.properties&&body.format.properties.reply,'Ollama structured-output schema sent');
  assert(body.messages[0].content.includes(call.caller.name),'prompt has customer persona');
  assert(!call.thinking,'thinking flag cleared');

  // 2. junky model output still parsed + cleaned
  mode='junk'; await CS.submitText('Buy it right now or lose the offer!'); await flush(); mode='good';
  const last=call.log.filter(e=>e.who==='caller').pop();
  assert(call.over || last.text==='Stop pushing me.','junk JSON repaired and cleaned: '+(call.over?'(call ended)':last.text));

  // 3. offline fallback never breaks
  if(!call.over){
    mode='down'; LLM.warned=false;
    const before=call.turns; await CS.submitText('Thank you so much, I really appreciate your time.'); await flush();
    assert(call.over||call.turns===before+1,'offline: turn still processed');
    assert(call.over||call.log.filter(e=>e.who==='caller').length>=3,'offline: canned caller reply used');
    assert(LLM.online===false,'offline status flagged');
    mode='good';
  }
  // 4. goodbye ends call, false "end" does not
  while(CS.state!=='active'){ if(CS.state==='result'){ click('b-result'); } call=startCall(); }
  nextReply={approach:'end',intent:'stall',reply:'ok'}; 
  await CS.submitText('Let me tell you about our plan.'); await flush();
  assert(!call.over,'AI "end" ignored when player did not say goodbye');
  await CS.submitText('Alright, goodbye then.'); await flush();
  assert(call.over&&CS.result.reason==='abandoned','goodbye ends call');
  click('b-result');

  // 5. close with pre-rolled decision
  let sales=0,fails=0;
  for(let i=0;i<40;i++){
    call=startCall(); if(!call){ continue; }
    call.stage=3; call.progress=80; call.caller.trust=95; call.caller.suspicion=5; call.caller.patience=90; call.caller.arch.flags.baiter=false;
    nextReply={approach:'close',intent:'interest',reply:'Fine, sign me up.'};
    await CS.submitText('So shall we finalize the plan now?'); await flush();
    if(CS.state==='result'){ if(CS.result.reason==='sale'){sales++; assert(call.log.some(e=>e.text==='Fine, sign me up.'),'sale uses AI reply'); } else fails++; click('b-result'); }
    if(sales>=1&&i>6) break;
  }
  assert(sales>0,'close can produce a sale (sales='+sales+', fails='+fails+')');

  // 6. keyword fallback classifier
  assert(Heur.classify('Goodbye now')==='end','classify end');
  assert(Heur.classify('Shall we finalize this?')==='close','classify close');
  assert(Heur.classify('This expires today, decide now')==='pressure','classify pressure');
  assert(Heur.classify('No worries, there is no obligation')==='reassure','classify reassure');
  assert(Heur.classify('Tell me about it')==='confident','classify default');

  // 7. boss conversation
  mode='good'; for(const id of Object.keys(X.EventSystem.active)) delete X.EventSystem.active[id];
  while(CS.state!=='idle'){ if(CS.state==='result') click('b-result'); else if(CS.state==='ringing') CS.cancelRing(); else if(CS.state==='active') CS.choose('end'); frames(2); }
  X.UI.hideAllGame();
  BS.state='watching'; BS.watch=7; BS.evaluate(); await flush();
  assert(BS.chat&&BS.chat.history[0].text==='Why are you chatting?','boss opens chat with AI line');
  assert($('bosschat').classList.contains('show'),'boss modal visible');
  const a0=G.today.annoy; await BS.reply('Sorry boss, I will hit quota.'); await flush();
  assert(BS.chat.turns===1&&BS.chat.history.length===3,'boss replied');
  assert(G.today.annoy!==a0,'boss reply changed annoyance ('+a0+' -> '+G.today.annoy+')');
  const t1=X.TimeSystem.minutes; frames(60); assert(X.TimeSystem.minutes===t1,'game time frozen during boss chat');
  BS.closeChat(); await flush(); assert(!$('bosschat').classList.contains('show'),'boss modal closes');
  frames(120); assert(BS.state!=='watching','boss leaves after chat');

  // 8. settings + test connection
  const r=await LLM.test(); assert(r.ok,'test(): '+r.msg);
  X.AISettings.d.model='nope:1b'; const r2=await LLM.test(); assert(!r2.ok&&r2.msg.includes('ollama pull'),'test(): missing model hint'); X.AISettings.d.model='llama3.2:3b';
  X.AISettings.d.endpoint='http://localhost:1234/v1'; assert(LLM._openai(),'OpenAI-style endpoint detected'); X.AISettings.d.endpoint='http://localhost:11434';

  console.log('ERRORS', errors.length); errors.slice(0,8).forEach(e=>console.log(' -',e.slice(0,300)));
  if(errors.length) process.exitCode=1;
})();
