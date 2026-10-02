/* =====================================================================
   00_config.js  -  DATA ONLY. Edit this file to change callers, dialogue,
   balance, events and progression. No game logic lives here.
   All companies, people, numbers and money are FICTIONAL.
   ===================================================================== */

const CFG = {
  DAY_START: 8 * 60,          // 8:00 AM (minutes from midnight)
  DAY_END: 17 * 60,           // 5:00 PM
  SEC_PER_MIN: 0.8,           // real seconds per in-game minute
  TURN_MINUTES: 1.5,          // in-game minutes consumed per dialogue turn
  RING_TIMEOUT: 24,           // seconds before a ringing call is missed
  COMPANY: 'GLOBE-COM SOLUTIONS',
  PLAN: 'Priority Service Plan',
  WEALTH_PAY: [400, 700, 1100, 1700, 2600],   // base payout by wealth level 1..5
  SAVE_KEY: 'globecom_callcenter_v1',
  MAX_STRIKES: 3,
};

/* ---------- Progression: everything scales from the day number ---------- */
const PROG = {
  forDay(d) {
    return {
      day: d,
      quota: Math.round(5000 * Math.pow(1.15, d - 1) / 100) * 100,
      hard: Math.min(0.7, 0.09 * (d - 1)),                       // caller difficulty bias 0..0.7
      eventGap: [Math.max(22, 60 - d * 5), Math.max(40, 110 - d * 8)],   // seconds between events
      bossGap: [Math.max(50, 120 - d * 9), Math.max(80, 190 - d * 12)],  // seconds between boss visits
      bossDemand: 1 + 0.12 * (d - 1),
      unlocks: { breakRoom: d >= 2, serverRoom: d >= 3 },
    };
  },
  unlockText(d) {
    const out = [];
    if (d === 2) out.push('Break room unlocked (coffee, vending machine).');
    if (d === 3) out.push('Server room unlocked. Do not touch anything.');
    EQUIPMENT.filter(e => e.day === d).forEach(e => out.push('New equipment: ' + e.name + ' - ' + e.desc));
    if (d >= 2) out.push('Callers are getting harder. The boss is getting louder.');
    return out;
  },
};

const EQUIPMENT = [
  { id: 'headset', day: 2, name: 'Used Headset', desc: 'Callers notice your mistakes 10% less.' },
  { id: 'binder', day: 3, name: 'Laminated Script Binder', desc: 'Trust gains +10%.' },
  { id: 'analyzer', day: 4, name: 'Voice Stress Analyzer 1.0', desc: 'Shows sale odds on the Close button.' },
  { id: 'coffee', day: 5, name: 'Actual Coffee Machine', desc: 'Callers start with +8 patience.' },
];

/* ---------- Player conversation approaches ---------- */
const APPROACHES = [
  { id: 'friendly',  key: '1', label: 'Be friendly',     tip: 'Warm. Builds trust, wastes little.' },
  { id: 'confident', key: '2', label: 'Be confident',    tip: 'Firm and professional.' },
  { id: 'pressure',  key: '3', label: 'Apply pressure',  tip: 'Fast progress. Risky.' },
  { id: 'reassure',  key: '4', label: 'Reassure caller', tip: 'Calms doubts.' },
  { id: 'change',    key: '5', label: 'Change subject',  tip: 'Buys patience. Loses progress.' },
  { id: 'close',     key: '6', label: 'Close the sale',  tip: 'Go for the fee. Success depends on the call.' },
  { id: 'end',       key: '7', label: 'End call',        tip: 'Hang up. No money.' },
];

/* What the PLAYER says, by approach and conversation stage (0 intro .. 3 close) */
const PLAYER_LINES = {
  friendly: [
    ["Hi there! Globe-Com Solutions calling. Hope I'm not catching you at a bad time!", "Hello! This is Globe-Com Solutions, and you sound like a lovely person to talk to."],
    ["We're offering our Priority Service Plan to select customers. Honestly, it's a great deal.", "I'll keep it simple: the Priority Service Plan keeps everything running smoothly for you."],
    ["I totally get it. Tell me what matters most to you and I'll work with that.", "That's a fair point. Let's figure out what works for you."],
    ["It's a small fee, and I'll personally make sure you're looked after.", "You'd be in good hands. I'd hate for you to miss out."],
  ],
  confident: [
    ["Good day. This is Globe-Com Solutions. I'll be brief.", "Globe-Com Solutions. I'm calling about your account."],
    ["The Priority Service Plan is standard for accounts like yours. Let me walk you through it.", "This plan is what most of our long-term customers choose."],
    ["That's a common concern, and it's covered. Everything is in order.", "I understand the question. The answer is yes."],
    ["Everything is ready on my end. We just need your go-ahead.", "The paperwork is straightforward. Shall we proceed?"],
  ],
  pressure: [
    ["This is Globe-Com Solutions. I need a few minutes of your time right now.", "Globe-Com Solutions. This is time sensitive, so please stay on the line."],
    ["This offer expires today. I can't hold it past the end of this call.", "Slots for the Priority Service Plan are almost gone."],
    ["Other customers already signed up. You don't want to be left behind.", "Every minute you wait makes this more complicated."],
    ["I need a decision now. Yes or no?", "I can't keep this open. What's it going to be?"],
  ],
  reassure: [
    ["Hello, no need to worry. This is just a routine call from Globe-Com Solutions.", "Hi, nothing to be alarmed about. Globe-Com Solutions, just checking in."],
    ["It's all standard procedure. The plan just keeps your service running smoothly.", "There's nothing unusual here. It's a simple service upgrade."],
    ["Totally understandable. There's no obligation until you're comfortable.", "Your concerns are valid. Ask me anything."],
    ["Take your time. I'll stay on the line until you feel sure.", "There's no rush. I'll explain every step."],
  ],
  change: [
    ["Uh, Globe-Com Solutions. Anyway, how's the weather over there?", "Globe-Com Solutions. Sorry, long day. How's yours?"],
    ["Before the plan, did you catch the game last night?", "Funny thing, my lunch was terrible today. How's yours?"],
    ["Let's park that for a moment. How long have you lived in the area?", "Ha, let's set that aside. Any plans for the weekend?"],
    ["Sorry, tangent. Where were we?", "Right, right. Anyway. Where were we?"],
  ],
};
const CLOSE_LINE = "Shall I go ahead and finalize the Priority Service Plan for you?";
const END_LINE = "Thanks for your time. Goodbye.";

/* ---------- Effects: EFFECTS[approach][callerIntent] = [trust, suspicion, patience, progress] ---------- */
const EFFECTS = {
  friendly:  { greet:[8,-2,-2,8],  question:[6,-3,-3,7],  objection:[3,0,-4,4],   stall:[2,0,-3,2],   accuse:[-2,8,-6,-2],  interest:[7,-2,-2,12], confused:[3,-1,-3,3],  angry:[-3,4,-8,0],   overheard:[1,2,-2,1],  callback_greet:[3,0,-3,4] },
  confident: { greet:[5,0,-1,10],  question:[7,-4,-2,9],  objection:[2,3,-4,6],   stall:[0,2,-2,3],   accuse:[-4,10,-6,-3], interest:[8,-2,-1,14], confused:[-3,4,-5,0],  angry:[-5,6,-8,-2],  overheard:[-1,3,-2,1], callback_greet:[2,1,-2,6] },
  pressure:  { greet:[-3,8,-6,6],  question:[-5,8,-6,3],  objection:[-4,8,-8,4],  stall:[1,2,-2,8],   accuse:[-8,14,-12,-4],interest:[2,3,-3,18],  confused:[-6,8,-8,-2], angry:[-10,12,-15,-5],overheard:[-5,9,-6,2], callback_greet:[-4,9,-6,5] },
  reassure:  { greet:[5,-3,-1,3],  question:[8,-5,-2,5],  objection:[7,-6,-3,6],  stall:[3,-1,-4,2],  accuse:[4,-8,-5,0],   interest:[4,-3,-2,6],  confused:[8,-4,-2,4],  angry:[2,-3,-5,-1],  overheard:[3,-4,-2,1], callback_greet:[5,-4,-2,4] },
  change:    { greet:[-1,2,-2,-2], question:[-3,5,-3,-4],objection:[2,-1,-2,-2], stall:[2,-3,6,-3],   accuse:[2,-6,-4,-6],  interest:[-4,2,-3,-8], confused:[5,-5,3,-4],  angry:[3,-4,4,-6],   overheard:[3,-3,3,-2], callback_greet:[0,1,-1,-2] },
};

/* ---------- Caller archetypes ---------- */
/* resp: how strongly this personality responds to each approach (1 = average) */
const ARCHETYPES = [
  { id:'nervous_man', label:'Nervous Middle-Aged Man', g:'m', age:[42,56], minDay:1, tags:[],
    jobs:['Warehouse supervisor','Insurance clerk','Municipal accountant','Bus depot dispatcher'],
    trust:[30,45], sus:[15,30], pat:[55,75], wealth:[2,3], paranoia:1.0, impat:1.0, closeResist:0.1, base:'calm',
    resp:{friendly:1.2,confident:0.8,pressure:0.5,reassure:1.6,change:0.9},
    w:{question:3,objection:3,stall:2,accuse:1,interest:2,confused:1,angry:0.3}, flags:{callback:true},
    look:{skin:'#c8a583',hair:'#4a3a2e',style:'thin',glasses:false,beard:false,shirt:'#8b8f6a'} },
  { id:'suspicious_woman', label:'Suspicious Young Woman', g:'f', age:[24,33], minDay:1, tags:['suspicious'],
    jobs:['Paralegal','Graphic designer','Emergency nurse','Grad student'],
    trust:[15,30], sus:[30,45], pat:[45,65], wealth:[2,3], paranoia:1.4, impat:1.1, closeResist:0.3, base:'suspicious',
    resp:{friendly:0.7,confident:1.0,pressure:0.3,reassure:1.1,change:0.5},
    w:{question:3,objection:3,stall:1,accuse:3,interest:1,confused:0.3,angry:1}, flags:{},
    look:{skin:'#d3ad8f',hair:'#2c2320',style:'bob',glasses:false,beard:false,shirt:'#6a4b4b',female:true} },
  { id:'friendly_elder', label:'Friendly Elderly Man', g:'m', age:[67,82], minDay:1, tags:[],
    jobs:['Retired machinist','Retired teacher','Retired postal worker'],
    trust:[45,60], sus:[5,15], pat:[70,90], wealth:[3,4], paranoia:0.6, impat:0.6, closeResist:0.0, base:'friendly',
    resp:{friendly:1.6,confident:0.9,pressure:0.5,reassure:1.2,change:1.3},
    w:{question:2,objection:1,stall:3,accuse:0.3,interest:3,confused:1,angry:0.1}, flags:{chatty:true},
    look:{skin:'#d0ab8c',hair:'#b9b9b2',style:'bald',glasses:true,beard:false,shirt:'#66727a'} },
  { id:'confused_elder', label:'Confused Elderly Woman', g:'f', age:[70,88], minDay:1, tags:[],
    jobs:['Retired librarian','Retired seamstress','Retired shop owner'],
    trust:[35,50], sus:[10,20], pat:[60,85], wealth:[3,4], paranoia:0.8, impat:0.8, closeResist:0.05, base:'confused',
    resp:{friendly:1.3,confident:0.6,pressure:0.4,reassure:1.5,change:1.0},
    w:{question:2,objection:1,stall:2,accuse:0.5,interest:1,confused:4,angry:0.1}, flags:{},
    look:{skin:'#d6b394',hair:'#c9c9c4',style:'bun',glasses:true,beard:false,shirt:'#77607a',female:true} },
  { id:'angry_biz', label:'Angry Businessman', g:'m', age:[45,62], minDay:1, tags:['angry'],
    jobs:['Regional sales director','Construction firm owner','Logistics executive'],
    trust:[10,25], sus:[25,40], pat:[30,45], wealth:[4,5], paranoia:1.2, impat:1.6, closeResist:0.4, base:'angry',
    resp:{friendly:0.5,confident:1.4,pressure:0.6,reassure:0.8,change:0.4},
    w:{question:2,objection:3,stall:0.5,accuse:2,interest:1,confused:0.2,angry:4}, flags:{},
    look:{skin:'#c69a7c',hair:'#2f2a27',style:'short',glasses:false,beard:false,shirt:'#4a5563'} },
  { id:'exhausted', label:'Exhausted Office Worker', g:'f', age:[29,45], minDay:1, tags:[],
    jobs:['Data-entry clerk','Night-shift receptionist','Claims processor'],
    trust:[25,40], sus:[15,30], pat:[30,50], wealth:[1,2], paranoia:0.9, impat:1.5, closeResist:0.1, base:'calm',
    resp:{friendly:1.0,confident:1.1,pressure:0.7,reassure:1.3,change:1.1},
    w:{question:2,objection:3,stall:1,accuse:1,interest:1.5,confused:1,angry:1}, flags:{callback:true},
    look:{skin:'#c19f85',hair:'#5a3d2c',style:'long',glasses:false,beard:false,shirt:'#5e6e64',female:true} },
  { id:'techie', label:'Tech-Savvy Programmer', g:'m', age:[26,38], minDay:2, tags:['suspicious'],
    jobs:['Backend programmer','Systems administrator','Game developer'],
    trust:[15,30], sus:[35,50], pat:[50,70], wealth:[3,4], paranoia:1.5, impat:1.0, closeResist:0.4, base:'calm',
    resp:{friendly:0.8,confident:0.7,pressure:0.3,reassure:0.9,change:0.4},
    w:{question:4,objection:3,stall:1,accuse:3,interest:1,confused:0.2,angry:0.5}, flags:{},
    look:{skin:'#d1b092',hair:'#2a2a2c',style:'messy',glasses:true,beard:true,shirt:'#3f4a52'} },
  { id:'trusting', label:'Extremely Trusting Person', g:'f', age:[33,52], minDay:1, tags:[],
    jobs:['Kindergarten aide','Hair stylist','Volunteer coordinator'],
    trust:[55,70], sus:[0,10], pat:[70,90], wealth:[2,3], paranoia:0.5, impat:0.7, closeResist:0.0, base:'friendly',
    resp:{friendly:1.5,confident:1.0,pressure:0.7,reassure:1.4,change:1.0},
    w:{question:2,objection:1,stall:1,accuse:0.2,interest:4,confused:1,angry:0.1}, flags:{},
    look:{skin:'#d8b696',hair:'#7a5a3a',style:'curly',glasses:false,beard:false,shirt:'#8a7a5a',female:true} },
  { id:'paranoid', label:'Extremely Suspicious Person', g:'m', age:[35,60], minDay:2, tags:['suspicious'],
    jobs:['Freelance surveyor','Unemployed electrician','Night security guard'],
    trust:[5,15], sus:[45,60], pat:[40,60], wealth:[1,3], paranoia:1.7, impat:1.2, closeResist:0.6, base:'suspicious',
    resp:{friendly:0.5,confident:0.7,pressure:0.2,reassure:0.7,change:0.3},
    w:{question:3,objection:3,stall:1,accuse:4,interest:0.4,confused:0.5,angry:2}, flags:{},
    look:{skin:'#bf9b80',hair:'#3a352f',style:'short',glasses:false,beard:true,shirt:'#4b4f43'} },
  { id:'baiter', label:'Scam-Baiter', g:'m', age:[19,34], minDay:3, tags:[],
    jobs:['"Full-time content creator"','Podcast host','Bored student'],
    trust:[40,55], sus:[10,20], pat:[80,100], wealth:[2,4], paranoia:0.7, impat:0.5, closeResist:0.0, base:'amused',
    resp:{friendly:1.1,confident:1.0,pressure:0.8,reassure:1.1,change:1.0},
    w:{question:2,objection:1,stall:4,accuse:1,interest:3,confused:2,angry:0.2}, flags:{baiter:true},
    look:{skin:'#cfae90',hair:'#8a3f2e',style:'messy',glasses:false,beard:false,shirt:'#6a5f7a'} },
  { id:'aggressive', label:'Aggressive Customer', g:'f', age:[30,55], minDay:1, tags:['angry'],
    jobs:['Restaurant manager','Retail supervisor','Taxi dispatcher'],
    trust:[10,20], sus:[30,45], pat:[25,40], wealth:[1,3], paranoia:1.2, impat:1.7, closeResist:0.3, base:'angry',
    resp:{friendly:0.6,confident:1.2,pressure:0.5,reassure:0.9,change:0.5},
    w:{question:2,objection:3,stall:0.3,accuse:3,interest:0.8,confused:0.2,angry:5}, flags:{},
    look:{skin:'#c8a184',hair:'#1f1c1b',style:'bob',glasses:false,beard:false,shirt:'#7a4646',female:true} },
  { id:'confused_customer', label:'Confused Customer', g:'m', age:[30,55], minDay:1, tags:[],
    jobs:['Delivery driver','Plumber','Line cook'],
    trust:[30,45], sus:[10,25], pat:[55,75], wealth:[1,3], paranoia:0.9, impat:0.9, closeResist:0.1, base:'confused',
    resp:{friendly:1.2,confident:0.8,pressure:0.5,reassure:1.6,change:0.8},
    w:{question:3,objection:2,stall:2,accuse:0.5,interest:1,confused:4,angry:0.5}, flags:{callback:true},
    look:{skin:'#c3a084',hair:'#3d2f28',style:'cap',glasses:false,beard:true,shirt:'#5d6b52'} },
  { id:'chatty', label:'Lonely Chatterbox', g:'f', age:[55,75], minDay:2, tags:[],
    jobs:['Retired bookkeeper','Widowed shop owner'],
    trust:[50,65], sus:[5,15], pat:[85,100], wealth:[3,5], paranoia:0.6, impat:0.4, closeResist:0.0, base:'friendly',
    resp:{friendly:1.7,confident:0.7,pressure:0.3,reassure:1.2,change:1.6},
    w:{stall:5,question:2,interest:2,objection:0.5,accuse:0.2,confused:1,angry:0.1}, flags:{chatty:true},
    look:{skin:'#d4b092',hair:'#a9a29a',style:'curly',glasses:true,beard:false,shirt:'#8a6a5a',female:true} },
  { id:'broke_student', label:'Broke Student', g:'m', age:[19,24], minDay:1, tags:[],
    jobs:['Community college student','Part-time barista'],
    trust:[30,45], sus:[20,35], pat:[50,70], wealth:[1,1], paranoia:1.0, impat:1.0, closeResist:0.3, base:'calm',
    resp:{friendly:1.1,confident:0.9,pressure:0.6,reassure:1.1,change:1.0},
    w:{question:3,objection:4,stall:1,accuse:1,interest:0.8,confused:1,angry:1}, flags:{},
    look:{skin:'#c7a486',hair:'#282523',style:'messy',glasses:false,beard:false,shirt:'#55606b'} },
];

const NAMES = {
  m: ['Gareth','Walter','Dennis','Marcus','Leon','Ivan','Hector','Raymond','Oskar','Felix','Calvin','Desmond','Tobias','Arthur'],
  f: ['Marta','Priya','Helen','Rosa','Nadia','Claire','Ingrid','Dolores','Yvette','Tamsin','Odette','Lena','Greta','Bianca'],
  last: ['Pruitt','Hollis','Varga','Brannigan','Okafor','Lindqvist','Whitlock','Novak','Marsh','Abernathy','Sorensen','Delacroix','Kowalczyk','Reyes','Tanaka','Fenwick','Castellan','Dunmore'],
};

/* ---------- Caller dialogue ---------- */
const LINES = {
  generic: {
    greet: ["Hello? Who is this?", "Yes? What is this regarding?", "Oh. Okay. What's this about?"],
    question: ["Can you explain that again?", "What exactly does the plan include?", "Why are you calling me specifically?"],
    objection: ["I'm not sure I need this.", "That sounds expensive.", "I'd rather think about it.", "I've never heard of this."],
    stall: ["Hold on, someone's at the door...", "Sorry, what was that? Bad line.", "Let me find a pen. Hang on.", "One moment, the kettle's going."],
    accuse: ["This sounds like a scam to me.", "Are you trying to trick me?", "Something about this feels off.", "I'm going to look you up."],
    interest: ["Okay... go on, I'm listening.", "That actually sounds reasonable.", "How soon would this start?", "Tell me more."],
    confused: ["Sorry, I don't understand.", "Wait, what plan? I'm lost.", "Could you say that more slowly?"],
    angry: ["Who gave you my number?!", "Stop wasting my time!", "I don't have patience for this!", "Watch your tone with me."],
    agree: ["Fine. Put me down for it.", "Alright, let's do it.", "Okay, go ahead and set it up."],
    refuse: ["No. I'm not doing that.", "Absolutely not.", "I said I'm not interested."],
    hang_sus: ["I'm hanging up. Don't call again.", "That's it. I'm reporting this number. Goodbye."],
    hang_pat: ["I don't have time for this. Goodbye.", "I've got to go. Bye."],
    overheard: ["Is someone shouting on your end?", "What's all that noise behind you?", "It sounds like a very strange office."],
    callback_greet: ["You called earlier, didn't you?", "This is the number that rang me before..."],
  },
  by: {
    nervous_man: {
      greet:["Um, hello? Who is this?","Oh. Hi. Is everything okay?","Yes? Uh, is there a problem?"],
      question:["Is this going to cost me anything?","Am I in trouble?","Should I be writing this down?"],
      objection:["I don't know... my wife handles this stuff.","I really shouldn't. I'm not good with decisions.","Can I call you back? I'm sweating."],
      stall:["Sorry, I dropped my phone. Hold on...","Give me a second, I need some water."],
      accuse:["This isn't... one of those calls, is it?","My brother warned me about calls like this."],
      agree:["Oh, all right. I don't want any trouble. Do it.","Okay, okay. Just make it official."],
      refuse:["No, no, I can't. I'm sorry.","I don't feel good about this."],
      hang_sus:["I'm sorry, I have to go. Please don't call again."],
      hang_pat:["I need to lie down. Goodbye."],
    },
    suspicious_woman: {
      greet:["Who is this? I don't remember contacting you.","Where are you calling from, exactly?","I don't recognize this number."],
      question:["What's your full name and employee number?","Which department are you in? Spell it.","Why would I need this?"],
      objection:["I'll verify this myself, thanks.","That doesn't add up."],
      accuse:["You're reading from a script. I can hear it.","Nobody legit rushes people like this."],
      agree:["...Fine. But I'm keeping notes on this call.","Okay. Put it through. Slowly."],
      refuse:["No. I don't trust this.","Send me something in writing. Otherwise, no."],
      hang_sus:["I've recorded this. Goodbye.","Reported. Don't call this number again."],
      hang_pat:["I'm not doing this all afternoon. Bye."],
    },
    friendly_elder: {
      greet:["Well hello there, young fellow! Who's this?","Oh, hello! Nice to get a call. Who am I speaking to?","Hello, hello! Hold on, let me turn the TV down."],
      question:["Now what did you say the plan covers, son?","Is this about my grandson?"],
      objection:["Hmm. My pension's a little tight this year.","I ought to ask my neighbor Walt first."],
      stall:["Did I ever tell you about my '74 Buick?","Oh, hold on, the cat's on the keyboard. No, that's the remote."],
      accuse:["Now hang on, this doesn't sound right, son."],
      agree:["Oh, why not! You seem like a good kid.","Alright son, sign me up."],
      refuse:["No thank you, son. Not today.","I don't think so, friend."],
      hang_sus:["I'll tell the police chief. He's my nephew. Bye now."],
      hang_pat:["Well, my program's on. Goodbye now!"],
    },
    confused_elder: {
      greet:["Hello? Is this the pharmacy?","Who? Speak up, dear, I can't hear you.","Hello? Oh dear, which button do I press?"],
      question:["Now who are you with again, dear?","Is this about my television?"],
      objection:["I don't understand these things, dear.","My daughter usually reads the letters for me."],
      confused:["Pardon? Slower, dear.","I'm sorry, what plan?"],
      accuse:["This doesn't sound right. Which company is this?"],
      agree:["Oh, alright dear. If you say it's needed.","I suppose. Where do I sign, dear?"],
      refuse:["No, dear, I think I'll wait for my daughter."],
      hang_sus:["I'm calling my daughter. Goodbye."],
      hang_pat:["My soup is boiling over. Goodbye, dear."],
    },
    angry_biz: {
      greet:["Who gave you this number?","I'm in the middle of something. Talk fast.","Who is this and why are you wasting my time?"],
      question:["What's your name and your manager's name?","What's the catch?"],
      objection:["I don't buy from cold calls.","Send me a brochure and stop calling."],
      angry:["I will have your company shut down!","Do you know who I am?","I have lawyers, buddy."],
      accuse:["This is a scam. I know a scam."],
      agree:["Fine. Do it. Don't make me regret it.","Fine. But if this is garbage I'll be calling back."],
      refuse:["Absolutely not. Take me off your list.","No. Are you deaf?"],
      hang_sus:["My lawyers will hear about this. Goodbye."],
      hang_pat:["I don't have time for this. Goodbye."],
    },
    exhausted: {
      greet:["...Hello? Sorry, long shift.","Yeah? Make it quick. I'm barely awake.","Hi. What now?"],
      question:["Can you email this to me instead?","How long is this going to take?"],
      objection:["I really don't have the energy to think about this.","Can we do this some other day?"],
      stall:["Sorry, I keep zoning out. What was that?"],
      accuse:["Is this one of those robocalls?"],
      agree:["Ugh, fine. Whatever gets you off the phone.","Okay. Sure. Please make it quick."],
      refuse:["No. I can barely afford lunch."],
      hang_sus:["I'm too tired for this. Bye."],
      hang_pat:["I'm falling asleep. Goodbye."],
    },
    techie: {
      greet:["Hello? Caller ID says unknown.","Yeah? What's this regarding?","Globe-Com... never heard of you."],
      question:["What's your company's registration number?","What's the SLA on this plan, specifically?","Can you send documentation? Real documentation."],
      objection:["The pitch has holes in it.","That pricing model makes no sense."],
      accuse:["That's textbook social engineering. Nice try.","I've seen this playbook before."],
      agree:["...Fine. Statistically I'm being an idiot, but okay.","Alright. Mostly to see where this goes."],
      refuse:["No. Try somebody else."],
      hang_sus:["Flagging this number. Have a nice day."],
      hang_pat:["I have a deploy to watch. Bye."],
    },
    trusting: {
      greet:["Hello! Oh, how nice of you to call.","Hi there! Who's this?","Hello, sweetheart. Sorry, habit! Who is this?"],
      question:["Oh, that sounds nice. What do I need to do?","Is it hard to set up?"],
      objection:["Oh, I don't know... money's a bit tight this month.","Should I ask my husband first?"],
      accuse:["Oh... um... you're not one of those people, are you?"],
      agree:["Oh, of course! You've been so helpful.","Sure! Thank you for looking out for me."],
      refuse:["Oh, I'm so sorry, I just can't."],
      hang_sus:["Oh dear, I have to go. Goodbye."],
      hang_pat:["Oh, the kids are back. Goodbye!"],
    },
    paranoid: {
      greet:["Who's this? How did you find me?","...Yes?","Don't say my name. Who is this?"],
      question:["Why are you asking me that?","Who else is listening?","What do you want, exactly?"],
      objection:["They told me not to trust anyone.","No. This isn't right."],
      angry:["I know what you people do!"],
      accuse:["You're recording this. I know you are.","This is a setup."],
      agree:["...If I say yes, you leave me alone?","Fine. But I've written down your voice."],
      refuse:["No. Never. Delete my number."],
      hang_sus:["That's it. I'm changing my number. Goodbye."],
      hang_pat:["I'm done talking."],
    },
    baiter: {
      greet:["Hey! Oh my gosh, I've been waiting for your call.","Hello, this is definitely a normal person.","Yo! Is this Globe-Com? I'm SO excited."],
      question:["Ooh, tell me more. How does the hold music work?","Can you repeat the plan name? For my... notes."],
      objection:["Hmm. Hold on, my parrot needs to hear this.","What if I pay in... unusual ways?"],
      stall:["Sorry, is it okay if I put you on speaker? Just for the neighbors.","Hold on, I need to plug in a very important... microphone. Kettle. Kettle."],
      accuse:["Wait. Are you reading from a script? Say something off script."],
      agree:["Yes! Absolutely! ...Just kidding. This call is being streamed. Say hi to chat."],
      refuse:["Nope. Better luck next time, champ."],
      hang_sus:["Alright, that's a wrap. See you on the channel."],
      hang_pat:["Okay, this got boring. Bye!"],
    },
    aggressive: {
      greet:["What do you want?","You've got sixty seconds. Go.","Who is this?!"],
      question:["What's this about? Answer straight.","Are you serious right now?"],
      objection:["I don't buy stuff over the phone.","Take me off your list."],
      angry:["Stop calling me!","I'm writing this number down!"],
      accuse:["You people call every day. Is this a scam?"],
      agree:["Fine, fine, whatever. Do it."],
      refuse:["No. I said NO."],
      hang_sus:["Reporting you. Goodbye."],
      hang_pat:["I'm done. Don't call back."],
    },
    confused_customer: {
      greet:["Hello? I think I hit a wrong button.","Uh, hi? Is this about my delivery?","Wait, who is this?"],
      question:["Wait, so what am I supposed to do?","What plan? I didn't sign up for a plan."],
      objection:["Um, I'm not sure I follow. Sorry."],
      confused:["Sorry, could you repeat that? Slowly?","I'm lost. What's happening?"],
      accuse:["This doesn't feel right, man."],
      agree:["Uh, okay. If that's how it works.","Sure, I guess. Sounds fine."],
      refuse:["Nah. I don't get it. No."],
      hang_sus:["I'm gonna go. Weird call. Bye."],
      hang_pat:["I gotta get back to work. Bye."],
    },
    chatty: {
      greet:["Oh! A call! Hello! Hardly anyone calls anymore.","Hello dear! Who is this?"],
      question:["Are you calling from far? I have a cousin far away."],
      objection:["Oh, I'll have to think, dear. I'm slow at these things."],
      stall:["Did I ever tell you about my late husband's tomatoes?","Where was I? Oh yes, my knee. Have I told you about my knee?","Oh, that reminds me of the time..."],
      accuse:["Oh, now dear, that doesn't sound right."],
      agree:["Well, you've been such good company. Put me down.","Oh, why not, dear."],
      refuse:["Oh, no thank you, dear, but do call again."],
      hang_sus:["I've a bad feeling about this. Goodbye, dear."],
      hang_pat:["Oh, look at the time! Goodbye, dear."],
    },
    broke_student: {
      greet:["Uh, hi? Is this about my student loan?","Hello? Sorry, I'm at work. What's up?"],
      question:["How much is it, exactly?","Is there a student discount?"],
      objection:["I'm literally counting quarters right now.","Can't afford that. Sorry."],
      accuse:["Bro. This is a scam."],
      agree:["...Fine. Ramen for a month, I guess.","Okay. I'll skip a few lunches."],
      refuse:["Nope. Broke.","Can't. Sorry."],
      hang_sus:["Not falling for it. Bye."],
      hang_pat:["My break's over. Bye."],
    },
  },
};

/* ---------- Random office events ---------- */
const EVENTS = [
  { id:'crash',    name:'Computer Crash',        minDay:1, w:2, dur:12, text:'Your computer froze. Reboot in progress...' },
  { id:'network',  name:'Network Outage',        minDay:1, w:2, dur:22, text:'NETWORK OUTAGE: no new calls until the line is back.' },
  { id:'overload', name:'Phone System Overload', minDay:2, w:2, dur:40, text:'PHONE SYSTEM OVERLOAD: calls are flooding in.' },
  { id:'argument', name:'Employee Argument',     minDay:1, w:2, dur:14, text:'Two coworkers are screaming about a stapler.' },
  { id:'spill',    name:'Coffee Spill',          minDay:1, w:2, dur:45, text:'Someone spilled coffee in the aisle. Watch your step.' },
  { id:'suspicious',name:'Flagged Number',       minDay:1, w:2, dur:1,  text:'Dispatcher: the next number is flagged. Expect trouble.' },
  { id:'angrycall',name:'Angry Customer',        minDay:1, w:2, dur:1,  text:'Dispatcher: an unhappy customer is being routed to you.' },
  { id:'server',   name:'Server Problem',        minDay:2, w:2, dur:30, text:'SERVER PROBLEM: line quality is poor. Payouts reduced.' },
  { id:'meeting',  name:'Unexpected Meeting',    minDay:2, w:1, dur:1,  text:'Boss calls an all-hands meeting.' },
  { id:'fired',    name:'Employee Fired',        minDay:2, w:1, dur:1,  text:'' },
  { id:'flicker',  name:'Power Flicker',         minDay:1, w:2, dur:5,  text:'The lights flicker. The building groans.' },
  { id:'printer',  name:'Printer Malfunction',   minDay:1, w:2, dur:14, text:'The printer is making a noise no printer should make.' },
];

const FLAVOR = {
  sticky: ["Sticky note: 'Q3 target is a suggestion. Q3 target is also mandatory.'", "Sticky note: 'Do NOT eat Deborah's yogurt.'", "Sticky note: 'password is on the other sticky note'", "Sticky note: 'Sales = feelings'"],
  cabinet: ["The drawer is full of complaint forms. All unopened.", "Folders labeled 'DO NOT AUDIT'."],
  posters: ["TEAMWORK: because blame is better shared.", "QUOTA IS A STATE OF MIND.", "SMILE. THEY CAN HEAR IT. (They can't.)"],
  cooler: ["Water. It tastes like the pipe.", "The cooler gurgles ominously."],
  vending: ["OUT OF ORDER. Sign dated three years ago.", "It only accepts exact change and hope."],
  fridge: ["A Post-it on someone's lunch reads: 'DON'T.'", "Something in here is older than the company."],
  server: ["Fans screaming. Uptime: technically.", "Someone taped a sign on it: 'DO NOT REBOOT'.", "A cable labeled 'MYSTERY' runs into the ceiling."],
  camera: ["The camera swivels toward you. Somebody is watching.", "A red light blinks. Recording since 2009."],
  printer: ["Out of toner. Again.", "Paper jam. Tray 3. Tray 3 is not real."],
  boardroom: ["The whiteboard graph is pointing down. Someone drew a smiley on it.", "A dead plant in the corner. It was already dead when the boss moved in."],
};

const EMPLOYEE_NAMES = ['Deborah','Curtis','Priyanka','Lyle','Marjorie','Toby','Sandra','Wendell','Noor','Gus'];
