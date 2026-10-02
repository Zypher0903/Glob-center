const fs=require('fs');
let src=['00_config','01_core','02_systems'].map(f=>fs.readFileSync('src/'+f+'.js','utf8')).join('\n');
src += `
var Player={sitting:true};
// Monte-Carlo: simulate policies
function sim(policy, day, n){
  let sales=0, sus=0, pat=0, ab=0, money=0, turns=0, baited=0;
  for(let i=0;i<n;i++){
    DaySystem.setup(day); G.mode='play'; TimeSystem.running=false;
    const c=NPCSystem.next(day); CallSystem.state='ringing'; CallSystem.incoming=c; CallSystem.answer();
    let guard=0;
    while(CallSystem.state==='active' && guard++<40){
      const call=CallSystem.active; const a=policy(call); CallSystem.choose(a);
    }
    if(CallSystem.state==='active') CallSystem.choose('end');
    const r=CallSystem.result; turns+=r.turns; 
    if(r.reason==='sale'){sales++; money+=r.money;} else if(r.reason==='suspicion') sus++; else if(r.reason==='patience') pat++; else if(r.reason==='baited') baited++; else ab++;
    CallSystem.dismissResult();
  }
  return {sales:(sales/n).toFixed(2), sus:(sus/n).toFixed(2), pat:(pat/n).toFixed(2), ab:(ab/n).toFixed(2), baited:(baited/n).toFixed(2), avgMoney:Math.round(money/Math.max(1,sales)), turns:(turns/n).toFixed(1)};
}
const rnd=()=>U.pick(['friendly','confident','pressure','reassure','change']);
// smart policy: choose approach maximizing local heuristic using effect table
function smart(call){
  const c=call.caller;
  if(call.stage>=3 && DialogueSystem.successChance(call)>0.55) return 'close';
  let best=null,bs=-1e9;
  for(const a of ['friendly','confident','pressure','reassure','change']){
    const e=EFFECTS[a][call.intent]||EFFECTS[a].objection; const m=c.arch.resp[a];
    const score=e[0]*(e[0]>0?m:2-m)*1 - e[1]*(e[1]>0?c.arch.paranoia*(2-m):m)*1.2 + e[2]*0.3 + e[3]*(e[3]>0?m:1)*0.6 - (c.suspicion>45? -e[1]*1:0);
    if(score>bs){bs=score;best=a;}
  }
  return best;
}
for(const d of [1,3,6]){
 console.log('day',d,'random', JSON.stringify(sim(call=>rnd(),d,600)));
 console.log('day',d,'smart ', JSON.stringify(sim(smart,d,600)));
 console.log('day',d,'closeAt2', JSON.stringify(sim(call=>call.turns>=2?'close':'friendly',d,600)));
}
`;
eval(src);
