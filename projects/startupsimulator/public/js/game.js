import { OBJECTS, TASKS, SAVE_KEY, START, newState, parseSave, findPath, canTravel, isWalkable, nearestWalkable, DAY_PROGRESS, VAULTABLE_TYPES, getCandidates, WORKER_UPGRADE_COSTS, FOUNDER_UPGRADES } from './world.js';
const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const ctx = canvas.getContext('2d');
let renderer;
async function getRenderer() { if (!renderer) { const { OfficeRenderer } = await import('./renderer.js'); renderer = new OfficeRenderer(canvas); } return renderer; }
let state = parseSave(localStorage.getItem(SAVE_KEY));
let path=[], pendingInteraction=null, clockAccumulator=0, saveAccumulator=0;
let energyDrainAccumulator=0, electricDrainAccumulator=0, workerEarnAccumulator=0;
let drainInterval=3, speed=2.65, peptideShots=0, lowEnergyWarned=false, lowElecWarned=false;
let direction={x:1,y:0}, sprinting=false, sprintDrainAccumulator=0;
let dashTrail=[], dashLocked=false, jumpState=null, vaultCooldown=0, hopSlowdown=0, blinkCooldown=0;
let sittingOnSofa=false, sofaRestAccumulator=0, sofaRecline=0;
let isCycling=false, pedalPower=0, bikeBreakdown=0, wonMillionDollar=false;
let isTreadmilling=false, runPower=0, treadmillBreakdown=0;
let isDancing=false;
let jumpscareCoolddown=0;
let deskSwapCountdown=0;
let audioContext, dialogAction=null, dialogCancelAction=null, dialogKind=null;
const keys=new Set(), dialog=$('#interaction-dialog'), hoverLabel=$('#hover-label'), nameInput=$('#dialog-name-input');
let hovered=null, hoverFloor=null, storageAvailable=false;
try{localStorage.setItem('_t','1');localStorage.removeItem('_t');storageAvailable=true;}catch{}
function getAudioContext(){if(!audioContext)audioContext=new(window.AudioContext||window.webkitAudioContext)();return audioContext;}

function playSound(type){
  if(!state.sound)return;
  try{
    const ac=getAudioContext(),o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);const t=ac.currentTime;
    if(type==='step'){o.type='triangle';o.frequency.setValueAtTime(180+Math.random()*40,t);g.gain.setValueAtTime(0.04,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.08);o.start(t);o.stop(t+0.08);}
    else if(type==='complete'){o.type='sine';o.frequency.setValueAtTime(520,t);o.frequency.setValueAtTime(780,t+0.07);g.gain.setValueAtTime(0.12,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);o.start(t);o.stop(t+0.22);}
    else if(type==='coffee'){o.type='sine';o.frequency.setValueAtTime(400,t);o.frequency.linearRampToValueAtTime(600,t+0.15);g.gain.setValueAtTime(0.1,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.3);o.start(t);o.stop(t+0.3);}
    else if(type==='vault'){o.type='square';o.frequency.setValueAtTime(320,t);o.frequency.setValueAtTime(640,t+0.04);g.gain.setValueAtTime(0.07,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.18);o.start(t);o.stop(t+0.18);}
    else if(type==='blink'){o.type='sawtooth';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(220,t+0.12);g.gain.setValueAtTime(0.09,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.14);o.start(t);o.stop(t+0.14);}
    else if(type==='run'){o.type='triangle';o.frequency.setValueAtTime(220+Math.random()*30,t);o.frequency.linearRampToValueAtTime(260,t+0.06);g.gain.setValueAtTime(0.055,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);o.start(t);o.stop(t+0.12);}
    else if(type==='dance'){o.type='sine';o.frequency.setValueAtTime(523,t);o.frequency.setValueAtTime(659,t+0.08);o.frequency.setValueAtTime(784,t+0.16);g.gain.setValueAtTime(0.10,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.35);o.start(t);o.stop(t+0.35);}
    else if(type==='doublejump'){o.type='sine';o.frequency.setValueAtTime(880,t);o.frequency.exponentialRampToValueAtTime(1320,t+0.08);o.frequency.exponentialRampToValueAtTime(1760,t+0.14);g.gain.setValueAtTime(0.13,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);o.start(t);o.stop(t+0.22);}
    else if(type==='scare'){
      /* harsh shriek: sawtooth + rapid pitch drop, punchy gain */
      o.type='sawtooth';
      o.frequency.setValueAtTime(1200,t);
      o.frequency.exponentialRampToValueAtTime(80,t+0.35);
      g.gain.setValueAtTime(0.55,t);
      g.gain.exponentialRampToValueAtTime(0.0001,t+0.4);
      o.start(t);o.stop(t+0.4);
      /* second oscillator: layered noise-like square for body */
      const o2=ac.createOscillator(),g2=ac.createGain();
      o2.connect(g2);g2.connect(ac.destination);
      o2.type='square';
      o2.frequency.setValueAtTime(900,t);
      o2.frequency.exponentialRampToValueAtTime(55,t+0.3);
      g2.gain.setValueAtTime(0.30,t);
      g2.gain.exponentialRampToValueAtTime(0.0001,t+0.35);
      o2.start(t);o2.stop(t+0.35);
    }
  }catch{}
}
let toastTimer; const toastEl=$('#toast');
function toast(msg){toastEl.textContent=msg;toastEl.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toastEl.hidden=true;},3200);}
function save(){if(!storageAvailable)return;try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}}
function complete(id){if(!state.completed.includes(id))state.completed=[...state.completed,id];}
function changeEnergy(a){state.energy=Math.max(0,Math.min(100,state.energy+a));}
function changeElec(a){state.elec=Math.max(0,Math.min(100,state.elec+a));}
function changeMoney(a){state.money=Math.max(0,(state.money??0)+a);if(!wonMillionDollar&&state.money>=1000000){wonMillionDollar=true;millionWin();}}
function hasUpgrade(id){return(state.founderUpgrades||[]).includes(id);}
function workEnergyCost(){if(hasUpgrade('deepwork'))return -5;if(hasUpgrade('focus'))return 8;return 12;}
function treadmillEnergyCost(){return 15;}
function staminaLv(){return state.staminaLevel||1;}
function workoutsNeeded(lv){return lv;} /* lv 1→2 needs 1, 2→3 needs 2, etc. */
function workMoneyMultiplier(){if(hasUpgrade('deepwork'))return 2.0;if(hasUpgrade('speeddesk'))return 1.5;return 1.0;}
function workerEarnings(w){const lv=w.level||1;return Math.round(w.earningsPerTick*Math.pow(1.5,lv-1)*10)/10;}
function workerUpgradeCost(w){const lv=w.level||1;if(lv>=3)return null;return WORKER_UPGRADE_COSTS[lv];}
function strikePayoff(w){return Math.round(workerEarnings(w)*40);}
function newStrikeCountdown(){return 60+Math.random()*120;}
function newDeskSwapCountdown(){return 25+Math.random()*50;}

const interactions = {
  plant:{icon:'plant',eyebrow:'YOUR LEAFY TEAMMATE',title:'Growth takes time.',description:'No pitch deck. No five-year plan.',detail:'Some days, a green leaf is enough.',action:'Appreciate the fern',perform(){toast('🌿 The fern is doing great.');},},
  plan:{
    icon:'board',eyebrow:'THE WHITEBOARD',
    get title(){return state.completed.includes('plan')?'Strategy locked in.':'The plan lives here.';},
    get description(){return state.completed.includes('plan')?'The roadmap is set. Now execute.':'Every startup begins with a whiteboard. Write the plan.';},
    detail:'Map out what you\'re building.',
    action:'Write the plan',
    perform(){complete('plan');toast('📋 Plan written. Now build it.');playSound('complete');},
  },
  coffee:{
    icon:'coffee',eyebrow:'THE COFFEE CORNER',
    get title(){return state.energy>80?'You\'re already wired.':'Fuel up.';},
    description:'The cabinet holds a modest espresso setup. Cheap beans, but they get the job done.',
    get detail(){return 'Restores 25 stamina \xb7 Current: '+Math.round(state.energy)+'/100';},
    action:'Brew a coffee',
    perform(){changeEnergy(25);complete('coffee');playSound('coffee');toast('☕ Coffee brewed. +25 stamina.');save();updateUI();},
  },
  sleep:{
    icon:'bed',eyebrow:'THE SLEEP CORNER',
    title:'End the day.',
    description:'A basic fold-out. Mattress quality: unknown. Sleep quality: essential.',
    get detail(){return 'DAY '+state.day+' / 10 \xb7 '+TASKS.filter(id=>state.completed.includes(id)).length+' of '+TASKS.length+' tasks done';},
    action:'Sleep and end the day',
    perform(){complete('sleep');save();setTimeout(()=>advanceDay(),400);},
  },
  sofa:{
    icon:'desk',eyebrow:'THE BREAK SOFA',
    get title(){return sittingOnSofa?'Taking a breather.':'Sit down for a bit.';},
    get description(){return sittingOnSofa?'Resting. Stamina slowly recovering.':'The sofa. Worn-in, comfortable. Sit here to passively recover stamina.';},
    detail:'Sit to recover +3 stamina every 2 seconds',
    get action(){return sittingOnSofa?'Stand up':'Sit down';},
    get cancelLabel(){return sittingOnSofa?'Stay seated':'Keep moving';},
    perform(){
      if(sittingOnSofa){sittingOnSofa=false;sofaRestAccumulator=0;sofaRecline=0;toast('🛋️ Back on your feet.');return;}
      sittingOnSofa=true;sofaRestAccumulator=0;sofaRecline=0;
      toast('🛋️ Sitting down. Stamina recovering slowly.');
    },
  },
  pills:{
    icon:'pills',eyebrow:'THE VITAMIN SHELF',
    title:'Vitamins.',
    description:'A cluster of supplement bottles. B12, D3, magnesium. The founder\'s pharmacy.',
    get detail(){return 'Restores 15 stamina \xb7 Current: '+Math.round(state.energy)+'/100';},
    action:'Take the vitamins',
    perform(){changeEnergy(15);complete('vitamins');playSound('complete');toast('💊 Vitamins taken. +15 stamina.');save();updateUI();},
  },
  peptide:{
    icon:'pills',eyebrow:'PEPTIDE KIT',
    get title(){return peptideShots>=2?'No more today.':peptideShots===1?'One shot left.':'Experimental edge.';},
    description:'A self-administered peptide kit. The kind tech founders whisper about at conferences.',
    get detail(){return peptideShots>=2?'Used both shots today':'Restores 40 stamina \xb7 '+peptideShots+'/2 used today';},
    get action(){return peptideShots>=2?'Used up for today':'Administer peptide';},
    perform(){
      if(peptideShots>=2){toast('💉 Already used both peptide shots today.');return;}
      peptideShots++;changeEnergy(40);playSound('complete');toast('💉 Peptide administered. +40 stamina.');save();updateUI();
    },
  },
  work:{
    icon:'desk',eyebrow:'YOUR WORKSTATION',
    title:'Time to build.',
    description:'The desk. The grind. Three monitors, a mechanical keyboard, and a half-eaten granola bar.',
    get detail(){
      const cost=workEnergyCost();const mult=workMoneyMultiplier();
      return (cost<0?'Gain '+Math.abs(cost)+' stamina':'Costs '+cost+' stamina')+' \xb7 Earns $'+(Math.round(10*mult))+' \xb7 '+Math.round(state.energy)+'/100 stamina';
    },
    get action(){return state.energy<workEnergyCost()?'Too tired to work':'Sit down and build';},
    perform(){
      const cost=workEnergyCost();
      if(state.energy<cost&&cost>0){toast('⚠️ Too tired to work. Grab a coffee first. ☕');return;}
      changeEnergy(-cost);const earned=Math.round(10*workMoneyMultiplier());changeMoney(earned);
      complete('work');playSound('complete');toast('💻 Working… +$'+earned+'. Stamina: '+Math.round(state.energy)+'.');
      save();updateUI();
    },
  },

  hire:{
    icon:'desk',eyebrow:'HIRING STATION',
    get title(){const w=state.workers||[];if(w.length>=2)return 'Team is full.';return 'Bring in a hire.';},
    get description(){
      const w=state.workers||[];if(w.length>=2)return 'You have two team members. The office is at capacity.';
      const candidates=getCandidates(state.day);const c=candidates[w.length];
      return c.emoji+' '+c.role+' \u2014 '+c.description+' Earns $'+c.earningsPerTick+'/s passively.';
    },
    get detail(){const w=state.workers||[];if(w.length>=2)return 'Max team size reached';const c=getCandidates(state.day)[w.length];return 'Cost: $'+WORKER_UPGRADE_COSTS[0]+' \xb7 Earns $'+c.earningsPerTick+'/s';},
    get action(){const w=state.workers||[];if(w.length>=2)return 'Team is full';const c=getCandidates(state.day)[w.length];return (state.money||0)<WORKER_UPGRADE_COSTS[0]?'Not enough cash (need $'+WORKER_UPGRADE_COSTS[0]+')':'Hire '+c.emoji+' '+c.name+' \u2014 $'+WORKER_UPGRADE_COSTS[0];},
    showNameInput:true,
    perform(){
      const w=state.workers||[];if(w.length>=2){toast('Team is already full.');return;}
      if((state.money||0)<WORKER_UPGRADE_COSTS[0]){toast('\ud83d\udcb8 Not enough cash to hire.');return;}
      const c=getCandidates(state.day)[w.length];const inputName=nameInput.value.trim();const name=inputName||c.name;
      changeMoney(-WORKER_UPGRADE_COSTS[0]);
      const newWorker={name,role:c.role,emoji:c.emoji,earningsPerTick:c.earningsPerTick,color:c.color,deskIndex:w.length,level:1,onStrike:false,strikeCountdown:newStrikeCountdown()};
      state.workers=[...w,newWorker];complete('hire');playSound('complete');
      toast(c.emoji+' '+name+' hired as '+c.role+"! They'll earn passively.");save();updateUI();
    },
  },

  ideas:{
    icon:'desk',eyebrow:'WORKER DESK',
    get title(){const w=state.workers?.find(w=>w.deskIndex===0);return w?(w.onStrike?w.name+' is on strike!':w.name+' is working.'):interactions.hire.title;},
    get description(){const w=state.workers?.find(w=>w.deskIndex===0);if(!w)return interactions.hire.description;if(w.onStrike)return w.name+' has downed tools. Walk over to resolve the dispute.';const uc=workerUpgradeCost(w);return w.emoji+' '+w.name+' \u2014 '+w.role+' (Lv '+(w.level||1)+'). Earning $'+workerEarnings(w).toFixed(1)+'/s.'+(uc?' Upgrade available.':'');},
    get detail(){const w=state.workers?.find(w=>w.deskIndex===0);if(!w)return interactions.hire.detail;if(w.onStrike)return 'On strike \xb7 Pay $'+strikePayoff(w)+' to resolve';const uc=workerUpgradeCost(w);return 'Lv '+(w.level||1)+' \xb7 $'+workerEarnings(w).toFixed(1)+'/s'+(uc?' \xb7 Upgrade: $'+uc:'');},
    get action(){const w=state.workers?.find(w=>w.deskIndex===0);if(!w)return interactions.hire.action;if(w.onStrike)return (state.money||0)>=strikePayoff(w)?'Resolve strike \u2014 $'+strikePayoff(w):"Can't afford resolution yet";const uc=workerUpgradeCost(w);if(uc)return (state.money||0)>=uc?'Upgrade '+w.name+' \u2014 $'+uc:'Keep working (upgrade costs $'+uc+')';return w.name+' is maxed out';},
    get cancelLabel(){const w=state.workers?.find(w=>w.deskIndex===0);return w?'Leave them be':'Not now';},
    showNameInput(){return !(state.workers?.find(w=>w.deskIndex===0));},
    perform(){
      const w=state.workers?.find(w=>w.deskIndex===0);if(!w){interactions.hire.perform();return;}
      if(w.onStrike){const pay=strikePayoff(w);if((state.money||0)<pay){toast('\ud83d\udcb8 Not enough to resolve the strike.');return;}changeMoney(-pay);state.workers=state.workers.map(wk=>wk.deskIndex===0?{...wk,onStrike:false,strikeCountdown:newStrikeCountdown()}:wk);toast(w.emoji+' '+w.name+' is back at work.');playSound('complete');save();updateUI();return;}
      const uc=workerUpgradeCost(w);if(!uc){toast(w.name+' is already at max level.');return;}if((state.money||0)<uc){toast('\ud83d\udcb8 Not enough cash to upgrade.');return;}
      changeMoney(-uc);state.workers=state.workers.map(wk=>wk.deskIndex===0?{...wk,level:(wk.level||1)+1}:wk);toast(w.emoji+' '+w.name+' upgraded to Lv '+(w.level+1)+'!');playSound('complete');save();updateUI();
    },
  },
  ideas2:{
    icon:'desk',eyebrow:'SECOND DESK',
    get title(){const w=state.workers?.find(w=>w.deskIndex===1);return w?(w.onStrike?w.name+' is on strike!':w.name+' is working.'):interactions.hire.title;},
    get description(){const w=state.workers?.find(w=>w.deskIndex===1);if(!w)return interactions.hire.description;if(w.onStrike)return w.name+' has downed tools. Walk over to resolve the dispute.';const uc=workerUpgradeCost(w);return w.emoji+' '+w.name+' \u2014 '+w.role+' (Lv '+(w.level||1)+'). Earning $'+workerEarnings(w).toFixed(1)+'/s.'+(uc?' Upgrade available.':'');},
    get detail(){const w=state.workers?.find(w=>w.deskIndex===1);if(!w)return interactions.hire.detail;if(w.onStrike)return 'On strike \xb7 Pay $'+strikePayoff(w)+' to resolve';const uc=workerUpgradeCost(w);return 'Lv '+(w.level||1)+' \xb7 $'+workerEarnings(w).toFixed(1)+'/s'+(uc?' \xb7 Upgrade: $'+uc:'');},
    get action(){const w=state.workers?.find(w=>w.deskIndex===1);if(!w)return interactions.hire.action;if(w.onStrike)return (state.money||0)>=strikePayoff(w)?'Resolve strike \u2014 $'+strikePayoff(w):"Can't afford resolution yet";const uc=workerUpgradeCost(w);if(uc)return (state.money||0)>=uc?'Upgrade '+w.name+' \u2014 $'+uc:'Keep working (upgrade costs $'+uc+')';return w.name+' is maxed out';},
    get cancelLabel(){const w=state.workers?.find(w=>w.deskIndex===1);return w?'Leave them be':'Not now';},
    showNameInput(){return !(state.workers?.find(w=>w.deskIndex===1));},
    perform(){
      const w=state.workers?.find(w=>w.deskIndex===1);if(!w){interactions.hire.perform();return;}
      if(w.onStrike){const pay=strikePayoff(w);if((state.money||0)<pay){toast('\ud83d\udcb8 Not enough to resolve the strike.');return;}changeMoney(-pay);state.workers=state.workers.map(wk=>wk.deskIndex===1?{...wk,onStrike:false,strikeCountdown:newStrikeCountdown()}:wk);toast(w.emoji+' '+w.name+' is back at work.');playSound('complete');save();updateUI();return;}
      const uc=workerUpgradeCost(w);if(!uc){toast(w.name+' is already at max level.');return;}if((state.money||0)<uc){toast('\ud83d\udcb8 Not enough cash to upgrade.');return;}
      changeMoney(-uc);state.workers=state.workers.map(wk=>wk.deskIndex===1?{...wk,level:(wk.level||1)+1}:wk);toast(w.emoji+' '+w.name+' upgraded to Lv '+(w.level+1)+'!');playSound('complete');save();updateUI();
    },
  },

  books:{
    icon:'board',eyebrow:'FOUNDER UPGRADES',
    title:'Level yourself up.',
    get description(){const ups=state.founderUpgrades||[];const avail=FOUNDER_UPGRADES.filter(u=>!ups.includes(u.id));if(avail.length===0)return 'All founder upgrades purchased. You\'re operating at peak capacity.';return avail.map(u=>u.label+': '+u.description).join(' ');},
    get detail(){const ups=state.founderUpgrades||[];const avail=FOUNDER_UPGRADES.filter(u=>!ups.includes(u.id));if(avail.length===0)return 'All upgrades purchased';return avail.map(u=>u.label+' $'+u.cost).join(' \xb7 ');},
    get action(){const ups=state.founderUpgrades||[];const avail=FOUNDER_UPGRADES.filter(u=>!ups.includes(u.id));if(avail.length===0)return 'Nothing left to buy';const next=avail[0];return (state.money||0)>=next.cost?'Buy: '+next.label+' \u2014 $'+next.cost:'Need $'+next.cost+' for '+next.label;},
    perform(){const ups=state.founderUpgrades||[];const avail=FOUNDER_UPGRADES.filter(u=>!ups.includes(u.id));if(avail.length===0){toast('All upgrades already purchased.');return;}const next=avail[0];if((state.money||0)<next.cost){toast('\ud83d\udcb8 Not enough cash for '+next.label+'.');return;}changeMoney(-next.cost);state.founderUpgrades=[...ups,next.id];playSound('complete');toast('\ud83d\udcda '+next.label+' unlocked!');save();updateUI();},
  },
  generator:{
    icon:'board',eyebrow:'POWER GENERATOR',
    title:'Backup power.',
    description:'A diesel generator in the corner. Loud, smelly, effective.',
    get detail(){return 'Charges electricity +5 \xb7 Current: '+Math.round(state.elec)+'/100';},
    action:'Pull the cord',
    perform(){changeElec(5);playSound('complete');toast('\u26a1 Generator pulled. +5 electricity.');save();updateUI();},
  },
  bike:{
    icon:'board',eyebrow:'CYCLING MACHINE',
    get title(){return isCycling?'Pedaling\u2026':'The cycling machine.';},
    description:'A stationary bike wired to the generator. Pedal to charge the office electricity.',
    detail:'SPACE to pedal \xb7 Stay below 100% \xb7 Charges electricity',
    get action(){return isCycling?'Already cycling':'Get on the bike';},
    perform(){if(isCycling){toast('Already on the bike!');return;}mountBike();},
  },
  lightswitch:{
    icon:'board',eyebrow:'LIGHT SWITCH',
    get title(){return state.lightOn?'Lights on.':'Lights off.';},
    get description(){return state.lightOn?'The overhead lights are on.':'The overhead lights are off. Electricity drain paused.';},
    get detail(){return state.lightOn?'Currently ON \xb7 Click to switch off':'Currently OFF \xb7 Click to switch on';},
    get action(){return state.lightOn?'Turn off':'Turn on';},
    perform(){state.lightOn=!state.lightOn;toast(state.lightOn?'\ud83d\udca1 Lights on.':'Lights off.');save();},
  },
  lamp:{
    icon:'board',eyebrow:'FLOOR LAMP',
    get title(){return state.lampOn?'Warm light.':'Lamp off.';},
    get description(){return state.lampOn?'A warm cone of light in the corner.':'The lamp is off.';},
    get detail(){return state.lampOn?'Currently ON \xb7 Click to switch off':'Currently OFF \xb7 Click to switch on';},
    get action(){return state.lampOn?'Turn off':'Turn on';},
    perform(){state.lampOn=!state.lampOn;toast(state.lampOn?'\ud83d\udca1 Lamp on.':'Lamp off.');save();},
  },
  cereal:{
    icon:'coffee',eyebrow:'CEREAL STATION',
    get title(){return state.cerealStock>0?'Stocked up.':'Empty bowls.';},
    get description(){return state.cerealStock>0?'Cereal boxes stocked. Eat a bowl for a quick energy boost.':'The cereal station is empty. Restock to keep the team fueled.';},
    get detail(){return state.cerealStock>0?'Eat a bowl: +20 stamina \xb7 '+state.cerealStock+' box'+(state.cerealStock===1?'':'es')+' left':'Restock: costs $50 for 3 boxes';},
    get action(){if(state.cerealStock>0)return 'Eat a bowl of cereal (+20 stamina)';return (state.money||0)>=50?'Restock cereal \u2014 $50':'Not enough cash to restock';},
    perform(){
      if(state.cerealStock>0){state.cerealStock--;changeEnergy(20);complete('cereal');playSound('coffee');toast('\ud83e\udd63 Cereal eaten. +20 stamina.');save();updateUI();return;}
      if((state.money||0)<50){toast('\ud83d\udcb8 Not enough cash to restock cereal.');return;}
      changeMoney(-50);state.cerealStock=3;playSound('complete');toast('\ud83d\uded2 Cereal restocked! 3 boxes ready.');save();updateUI();
    },
  },
  treadmill:{
    icon:'board',
    eyebrow:'TREADMILL',
    get title(){const s=state.treadmillSessions||0;if(s===0)return "You haven't run a step. Yet.";if(s<5)return 'Getting into the habit.';if(s<10)return "You're starting to feel it.";return 'Cardio is your religion now.';},
    get description(){
      const s=state.treadmillSessions||0;
      const lv=staminaLv();
      const lvBar='\u2605'.repeat(lv)+'\u2606'.repeat(5-lv);
      const progress=lv<5?'Lv '+lv+' \u2192 Lv '+(lv+1)+': '+(state.staminaWorkoutsAtLevel||0)+' / '+workoutsNeeded(lv)+' workout'+(workoutsNeeded(lv)===1?'':'s'):'MAX LEVEL';
      return 'A treadmill bolted to the corner. Old, loud, and utterly reliable. Tap SPACE to run \u2014 keep your pace in the zone to restore stamina. Push too hard and you\'ll overexert.'+(s>0?' Sessions logged: '+s+'.':'')+' Stamina '+lvBar+' \u00b7 '+progress+'.';
    },
    get detail(){const s=state.treadmillSessions||0;const lv=staminaLv();return 'SPACE to run \xb7 '+s+' session'+(s===1?'':'s')+' \xb7 Stamina Lv '+lv+(lv<5?' ('+workoutsNeeded(lv)+' workout'+(workoutsNeeded(lv)===1?' to':'s to')+' next level)':' MAX');},
    get action(){return state.energy<10?'Too drained to run right now':'Get on the treadmill \ud83c\udfc3';},
    cancelLabel:'Maybe tomorrow',
    perform(){if(state.energy<10){toast('\u26a0\ufe0f Not enough stamina. Grab a coffee first. \u2615\ufe0f');return;}mountTreadmill();},
  },
  order:{
    icon:'phone',
    eyebrow:'DELIVERY APP',
    get title(){
      const hour=Math.floor((state.minutes||540)/60);
      if(hour<10)return 'Too early for delivery.';
      if(hour>=22)return 'Kitchen\u2019s closed.';
      return 'What\u2019s on the menu?';
    },
    get description(){
      const hour=Math.floor((state.minutes||540)/60);
      if(hour<10)return 'No one delivers before 10 AM. Brew a coffee instead.';
      if(hour>=22)return 'Every kitchen in a 5-mile radius is closed. You should be sleeping anyway.';
      return 'A battered phone mounted to the wall, still logged into some delivery app. The office gets 40-minute delivery windows. Ordering doesn\u2019t actually do anything \u2014 it just feels productive.';
    },
    get detail(){
      const hour=Math.floor((state.minutes||540)/60);
      if(hour<10||hour>=22)return 'Unavailable right now';
      return 'Purely cosmetic \xb7 No stats affected \xb7 Very filling emotionally';
    },
    get action(){
      const hour=Math.floor((state.minutes||540)/60);
      if(hour<10)return 'Too early';
      if(hour>=22)return 'Closed for the night';
      return 'Place an order \ud83d\udcf1';
    },
    cancelLabel:'Actually, I\u2019m fine',
    perform(){
      const hour=Math.floor((state.minutes||540)/60);
      if(hour<10){toast('\ud83d\udcf1 No one delivers at this hour. Brew a coffee.');return;}
      if(hour>=22){toast('\ud83d\udcf1 Every kitchen is closed. You\u2019re on your own.');return;}
      const menu=[
        '\ud83c\udf55 Pizza ordered. 40 minutes. Somehow always 40 minutes.',
        '\ud83c\udf5c Ramen inbound. The spicy one. You need it.',
        '\ud83c\udf54 Burger + fries en route. Earned it.',
        '\ud83e\udd57 Salad ordered. Bold choice for someone running on caffeine.',
        '\ud83c\udf2f Burrito placed. The large one. Obviously.',
        '\ud83c\udf63 Sushi incoming. Technically an office expense.',
        '\ud83c\udf72 Pho on the way. Hot, fragrant, deeply necessary.',
        '\ud83e\udd6a Sandwich ordered. Classic. Timeless. Correct.',
        '\ud83c\udf5d Pasta placed. Carbs are valid when you\u2019re building a company.',
        '\ud83c\udf2e Tacos incoming. Three of them, obviously.',
        '\ud83e\udd50 Croissant ordered. Fancy but earned.',
        '\ud83e\udd5f Dumplings on the way. Twelve of them. This is not a problem.',
      ];
      const pick=menu[Math.floor(Math.random()*menu.length)];
      toast(pick);
      playSound('coffee');
    },
  },
  walk:{icon:'arrow',eyebrow:'FIRST STEPS',title:'Get moving.',description:"This office isn\u2019t going to walk itself.",detail:'Walk around the office to complete this task.',action:'Start exploring',perform(){toast('Walk around \u2014 use WASD or click the floor.');},},
};

function millionWin(){
  save();
  const overlay=$('#million-overlay');
  const day=state.day,workers=state.workers||[];
  const workerLine=workers.length>0?'With help from '+workers.map(w=>w.emoji+' '+w.name).join(' & ')+'.':'You did it alone. Respect.';
  $('#million-day').textContent='DAY '+day+' OF 10';
  $('#million-worker-line').textContent=workerLine;
  overlay.hidden=false;
  $('#million-btn').onclick=()=>{overlay.hidden=true;resetGame();};
}
function mountBike(){if(isCycling)return;isCycling=true;pedalPower=0;bikeBreakdown=0;$('#cycling-overlay').hidden=false;updateUI();toast('\ud83d\udeb4 On the bike. Press SPACE to pedal. ESC to stop.');}
function dismountBike(broken){isCycling=false;pedalPower=0;$('#cycling-overlay').hidden=true;updateUI();if(broken)toast('\ud83d\udd25 Generator overloaded! Chain snapped.');else toast('\ud83d\udeb4 Off the bike.');}
function mountTreadmill(){
  if(isTreadmilling)return;
  isTreadmilling=true;runPower=0;treadmillBreakdown=0;
  $('#treadmill-overlay').hidden=false;
  updateUI();
  toast('\ud83c\udfc3 On the treadmill. Press SPACE to run. ESC to stop.');
}
function dismountTreadmill(overexerted){
  isTreadmilling=false;runPower=0;
  $('#treadmill-overlay').hidden=true;
  $('#treadmill-overlay').classList.remove('overexerted');
  updateUI();
  if(overexerted){
    toast('\ud83d\ude24 Overexerted! Pushed too hard. Rest up.');
  } else {
    state.treadmillSessions=(state.treadmillSessions||0)+1;
    const s=state.treadmillSessions;
    /* ── Stamina level-up check ── */
    const lv=staminaLv();
    if(lv<5){
      state.staminaWorkoutsAtLevel=(state.staminaWorkoutsAtLevel||0)+1;
      const needed=workoutsNeeded(lv);
      if(state.staminaWorkoutsAtLevel>=needed){
        state.staminaLevel=lv+1;
        state.staminaWorkoutsAtLevel=0;
        const lvMsgs=['💪 Stamina Lv 2! You can feel the difference.','🔥 Stamina Lv 3! You\'re built different.','⚡ Stamina Lv 4! Pure cardio machine.','🏆 Stamina Lv 5! MAX LEVEL. You\'re unstoppable.'];
        toast(lvMsgs[lv-1]);
      } else {
        const msgs=['\ud83c\udfc3 One session down. Lungs burning in the best way.','\ud83c\udfc3 Session '+s+". You're building something here.","🏃 Session "+s+". The belt doesn't scare you anymore.",'\ud83c\udfc3 Session '+s+". Consistent. That's the whole game.",'\ud83c\udfc3 Session '+s+'. Cardio gains compounding daily.'];
        toast(msgs[Math.min(s-1,msgs.length-1)]);
      }
    } else {
      toast('\ud83c\udfc3 Session '+s+'. Already at max stamina level. Legend.');
    }
    playSound('complete');save();
  }
}

function advanceDay(){
  const completedDay=state.day,overlay=$('#day-end-overlay');
  const workerPassive=state.workers.reduce((s,w)=>s+workerEarnings(w),0);
  $('#day-end-progress').textContent='DAY '+completedDay+' / 10 COMPLETE';
  const fill=$('#day-end-bar-fill');fill.style.width='0%';
  setTimeout(()=>{fill.style.width=(completedDay/10*100)+'%';},80);
  const titles=['Day 1 complete.','Two down.','Halfway to halfway.','Day 4 done.','The halfway mark.','Day 6 in the books.','Seven days in.','Day 8 done.','One more day.','You built it.'];
  $('#day-end-title').textContent=titles[completedDay-1]||'Day done.';
  const bodies=['Not bad for day one.','Day two in the books.','Three days of building.','Four days down.','Halfway. Five days left.','Day six done.','Seven days of grinding.','Eight days. Almost there.','One more day. Tomorrow you ship.','Ten days. You built a startup.'];
  const workerLine=workerPassive>0?' Team earned $'+workerPassive.toFixed(1)+'/s passively.':'';
  $('#day-end-body').textContent=(bodies[completedDay-1]||'')+workerLine;
  overlay.hidden=false;
  const btn=$('#day-end-btn');
  if(completedDay>=10){btn.textContent='Play Again';btn.onclick=()=>{overlay.hidden=true;resetGame();};}
  else{btn.textContent='Start Day '+(completedDay+1);btn.onclick=()=>{overlay.hidden=true;state.day=completedDay+1;state.completed=[];state.energy=Math.min(100,state.energy+30);state.minutes=540;peptideShots=0;state.cerealStock=0;state.workers=state.workers.map(w=>({...w,onStrike:false,strikeCountdown:newStrikeCountdown()}));save();updateUI();};}
}
function resetGame(){
  state=newState();path=[];pendingInteraction=null;clockAccumulator=0;saveAccumulator=0;
  energyDrainAccumulator=0;electricDrainAccumulator=0;workerEarnAccumulator=0;
  drainInterval=3;speed=2.65;peptideShots=0;lowEnergyWarned=false;lowElecWarned=false;
  direction={x:1,y:0};sprinting=false;sprintDrainAccumulator=0;
  dashTrail=[];dashLocked=false;jumpState=null;vaultCooldown=0;hopSlowdown=0;blinkCooldown=0;
  sittingOnSofa=false;sofaRestAccumulator=0;sofaRecline=0;
  isCycling=false;pedalPower=0;bikeBreakdown=0;wonMillionDollar=false;
  isTreadmilling=false;runPower=0;treadmillBreakdown=0;isDancing=false;
  $('#cycling-overlay').hidden=true;$('#treadmill-overlay').hidden=true;
  save();updateUI();
}

function updateUI(){
  const ep=state.energy;
  $('#energy-fill').style.width=ep+'%';$('#energy-fill').classList.toggle('low',ep<20);
  $('#energy-value').textContent=Math.round(ep);$('#energy-bar').setAttribute('aria-valuenow',Math.round(ep));
  /* update ST label to show stamina level */
  const stLabel=document.querySelector('.hud-energy-label:first-of-type');
  if(stLabel)stLabel.textContent='Lv'+staminaLv();
  const el=state.elec;
  $('#elec-fill').style.width=el+'%';$('#elec-fill').classList.toggle('low',el<20);
  $('#elec-value').textContent=Math.round(el);$('#elec-bar').setAttribute('aria-valuenow',Math.round(el));
  $('#money-value').textContent='$'+Math.floor(state.money||0).toLocaleString();
  $('#hud-day').textContent='DAY '+state.day+' / 10';
  document.querySelectorAll('[data-task]').forEach(btn=>{const done=state.completed.includes(btn.dataset.task);btn.classList.toggle('complete',done);const dot=btn.querySelector('.hud-task-dot');if(dot)dot.style.background=done?'#58c858':'';});
  $('#sound-button').setAttribute('aria-pressed',String(state.sound));
  $('#sound-button').setAttribute('aria-label','Turn sound '+(state.sound?'off':'on'));
  if(isCycling){
    const pct=Math.min(100,pedalPower);
    $('#pedal-fill').style.width=pct+'%';$('#pedal-val').textContent=Math.round(pct);
    $('#pedal-bar').setAttribute('aria-valuenow',Math.round(pct));
    const cl=$('#cycling-charge-label');
    if(pedalPower<25)cl.textContent='GET UP TO SPEED';
    else if(pedalPower<50)cl.textContent='CHARGING \u26a1';
    else if(pedalPower<75)cl.textContent='DOUBLE CHARGE \u26a1\u26a1';
    else if(pedalPower<100)cl.textContent='TRIPLE CHARGE \u26a1\u26a1\u26a1';
    else cl.textContent='OVERLOAD! STOP NOW \ud83d\udd25';
    const pf=$('#pedal-fill');
    pf.className='pedal-fill'+(pedalPower>=100?' broken':pedalPower>=75?' triple':pedalPower>=50?' double':pedalPower>=25?' normal':'');
    $('#cycling-overlay').classList.toggle('overloaded',pedalPower>=100);
  }
  if(isTreadmilling){
    const pct=Math.min(100,runPower);
    $('#run-fill').style.width=pct+'%';$('#run-val').textContent=Math.round(pct);
    $('#run-bar').setAttribute('aria-valuenow',Math.round(pct));
    const rl=$('#treadmill-run-label');
    if(runPower<25){rl.textContent='STEP ON THE BELT';rl.className='treadmill-run-label';}
    else if(runPower<50){rl.textContent='LIGHT JOG \ud83d\udc5f';rl.className='treadmill-run-label jog';}
    else if(runPower<75){rl.textContent='GOOD PACE \ud83c\udfc3';rl.className='treadmill-run-label run';}
    else if(runPower<100){rl.textContent='SPRINT ZONE \ud83d\udd25';rl.className='treadmill-run-label sprint';}
    else{rl.textContent='OVEREXERTION! SLOW DOWN \ud83d\ude2e';rl.className='treadmill-run-label broken';}
    const rf=$('#run-fill');
    rf.className='run-fill'+(runPower>=100?' broken':runPower>=75?' sprint':runPower>=50?' run':runPower>=25?' jog':'');
    $('#treadmill-overlay').classList.toggle('overexerted',runPower>=100);
  }
}
function formatClock(m){const h=Math.floor(m/60),mn=m%60,ap=h>=12?'PM':'AM',hr=h%12||12;return hr+':'+(mn<10?'0':'')+mn+' '+ap;}
function goTo(destination,interaction){if(!destination)return;const target=nearestWalkable(destination.x,destination.y);if(!target)return;const newPath=findPath(state.founder,target);if(!newPath)return;path=newPath;pendingInteraction=interaction||null;if(sittingOnSofa){sittingOnSofa=false;sofaRestAccumulator=0;sofaRecline=0;}if(isCycling)dismountBike(false);if(isTreadmilling)dismountTreadmill(false);if(isDancing)isDancing=false;}
function visit(id){const obj=OBJECTS.find(o=>o.action===id||o.id===id);if(obj&&obj.target)goTo(obj.target,obj);}
function tryVault(){
  if(jumpState||vaultCooldown>0)return;
  if(state.energy<6){toast('Too drained to jump. Grab a coffee first. \u2615');return;}
  const isSprintJump=(sprinting||dashLocked)&&state.energy>1;
  const dx=direction.x,dy=direction.y,cx=state.founder.x,cy=state.founder.y,reach=isSprintJump?0.9:0.6;
  const vaultable=OBJECTS.filter(o=>VAULTABLE_TYPES.has(o.type));
  let hit=null;
  for(const o of vaultable){if(cx+dx*reach>o.x-0.1&&cx+dx*reach<o.x+o.w+0.1&&cy+dy*reach>o.y-0.1&&cy+dy*reach<o.y+o.d+0.1){hit=o;break;}}
  if(!hit){hopSlowdown=0.35;jumpState={height:0,vel:2.8,landing:false,doubleJumpUsed:false};changeEnergy(-2);return;}
  const land=nearestWalkable(cx+dx*(hit.w+1.2),cy+dy*(hit.d+1.2));if(!land)return;
  jumpState={height:0,vel:3.2,landing:false,target:land,doubleJumpUsed:false};changeEnergy(isSprintJump?-4:-3);playSound('vault');vaultCooldown=0.3;
}
function tryDoubleJump(){
  /* Requires stamina level 2+ (at least 1 completed workout) */
  if(!jumpState||jumpState.landing||jumpState.doubleJumpUsed)return false;
  if(staminaLv()<2){toast('\ud83c\udfc3 Train on the treadmill to unlock double jump!');return false;}
  if(state.energy<=50){toast('\u26a1 Need stamina above 50 to double-jump!');return false;}
  jumpState.vel=2.4;
  jumpState.doubleJumpUsed=true;
  changeEnergy(-5);
  playSound('doublejump');
  return true;
}
function tryBlink(){
  if(blinkCooldown>0){toast('Blink cooling down\u2026 ('+Math.ceil(blinkCooldown)+'s)');return;}
  if(state.energy<10){toast('Not enough stamina to blink. Need 10. \u26a1');return;}
  const tx=state.founder.x+direction.x*3.5,ty=state.founder.y+direction.y*3.5;
  const target=nearestWalkable(tx,ty);if(!target){toast('Nowhere to blink to.');return;}
  const trail=[];for(let i=1;i<=5;i++)trail.push({x:state.founder.x+(target.x-state.founder.x)*(i/5),y:state.founder.y+(target.y-state.founder.y)*(i/5),alpha:1-i/6});
  dashTrail=trail;state.founder=target;changeEnergy(-10);blinkCooldown=4;path=[];playSound('blink');
}

let lastTime=null,paused=false,stepTimer=0;
function tick(now){
  requestAnimationFrame(tick);if(!renderer)return;
  const dt=lastTime===null?0:Math.min((now-lastTime)/1000,0.1);lastTime=now;
  if(paused||dialog.open)return;
  clockAccumulator+=dt;if(clockAccumulator>=0.5){state.minutes=Math.min(1079,state.minutes+1);clockAccumulator-=0.5;$('#clock').textContent=formatClock(state.minutes);}
  saveAccumulator+=dt;if(saveAccumulator>=10){save();saveAccumulator=0;}
  energyDrainAccumulator+=dt;
  if(energyDrainAccumulator>=drainInterval){energyDrainAccumulator-=drainInterval;if(!sittingOnSofa&&!isTreadmilling){changeEnergy(-1);if(state.energy<=15&&!lowEnergyWarned){lowEnergyWarned=true;toast('\u26a0\ufe0f Low stamina! Brew a coffee.');}if(state.energy>20)lowEnergyWarned=false;}}
  if(state.lightOn||state.lampOn){electricDrainAccumulator+=dt;const interval=(state.lightOn&&state.lampOn)?4:6;if(electricDrainAccumulator>=interval){electricDrainAccumulator-=interval;changeElec(-1);if(state.elec<=15&&!lowElecWarned){lowElecWarned=true;toast('\u26a1 Low battery! Get on the cycling machine.');}if(state.elec>20)lowElecWarned=false;}}
  if(state.workers&&state.workers.length>0){workerEarnAccumulator+=dt;if(workerEarnAccumulator>=1){const ticks=Math.floor(workerEarnAccumulator);workerEarnAccumulator-=ticks;let total=0;for(const w of state.workers){if(!w.onStrike)total+=workerEarnings(w)*ticks;}if(total>0){changeMoney(total);$('#money-value').textContent='$'+Math.floor(state.money||0).toLocaleString();}}
    let strikeChanged=false;
    state.workers=state.workers.map(w=>{if(w.onStrike||!Number.isFinite(w.strikeCountdown))return w;const next=w.strikeCountdown-dt;if(next<=0){strikeChanged=true;toast('\u270a '+w.name+' is on strike! Walk to their desk to resolve it.');return{...w,onStrike:true,strikeCountdown:0};}return{...w,strikeCountdown:next};});
    if(strikeChanged){save();updateUI();}
    /* ── Desk-swap: workers switch seats periodically ─────────────────── */
    if(state.workers.length===2){
      if(deskSwapCountdown===0)deskSwapCountdown=newDeskSwapCountdown();
      deskSwapCountdown-=dt;
      if(deskSwapCountdown<=0){
        deskSwapCountdown=newDeskSwapCountdown();
        const [a,b]=state.workers;
        /* only swap if neither is on strike */
        if(!a.onStrike&&!b.onStrike){
          state.workers=[{...a,deskIndex:b.deskIndex},{...b,deskIndex:a.deskIndex}];
          toast(a.emoji+' '+a.name+' and '+b.emoji+' '+b.name+' swapped desks.');
        }
      }
    }
  }
  if(sittingOnSofa){sofaRestAccumulator+=dt;sofaRecline=Math.min(1,sofaRecline+dt*2);if(sofaRestAccumulator>=2){sofaRestAccumulator-=2;changeEnergy(3);updateUI();}}
  if(vaultCooldown>0)vaultCooldown-=dt;
  if(hopSlowdown>0)hopSlowdown=Math.max(0,hopSlowdown-dt*1.5);
  if(jumpState){jumpState.height+=jumpState.vel*dt*28;jumpState.vel-=12*dt;if(jumpState.vel<0&&jumpState.target&&!jumpState.landing){state.founder={...jumpState.target};path=[];jumpState.landing=true;}if(jumpState.height<=0&&jumpState.vel<0)jumpState=null;}
  if(blinkCooldown>0)blinkCooldown=Math.max(0,blinkCooldown-dt);
  for(const t of dashTrail)t.alpha=Math.max(0,t.alpha-dt*3);dashTrail=dashTrail.filter(t=>t.alpha>0);
  if(sprinting||dashLocked){sprintDrainAccumulator+=dt;if(sprintDrainAccumulator>=0.4){sprintDrainAccumulator-=0.4;changeEnergy(-2);if(state.energy<=0){sprinting=false;dashLocked=false;toast('Exhausted! Slow down.');}}}
  if(isTreadmilling){
    runPower=Math.max(0,runPower-dt*8);
    if(runPower>=25&&runPower<75){changeEnergy(dt*4);}
    if(runPower>=75){changeEnergy(-dt*6);}
    if(state.energy<=0){dismountTreadmill(true);updateUI();}
    else{updateUI();}
  }
  if(!sittingOnSofa&&!isCycling&&!isTreadmilling){
    const up=keys.has('ArrowUp')||keys.has('w')||keys.has('W');
    const down=keys.has('ArrowDown')||keys.has('s')||keys.has('S');
    const left=keys.has('ArrowLeft')||keys.has('a')||keys.has('A');
    const right=keys.has('ArrowRight')||keys.has('d')||keys.has('D');
    if(up||down||left||right){
      path=[];pendingInteraction=null;let dx=0,dy=0;
      if(up)dy-=1;if(down)dy+=1;if(left)dx-=1;if(right)dx+=1;
      if(dx!==0||dy!==0){const len=Math.hypot(dx,dy);dx/=len;dy/=len;direction={x:dx,y:dy};}
      const spd=(sprinting||dashLocked)?speed*1.8:speed*(1-hopSlowdown*0.4);
      const nx=state.founder.x+dx*spd*dt,ny=state.founder.y+dy*spd*dt;
      if(isWalkable(nx,ny)){state.founder={x:nx,y:ny};}else if(isWalkable(nx,state.founder.y)){state.founder={x:nx,y:state.founder.y};}else if(isWalkable(state.founder.x,ny)){state.founder={x:state.founder.x,y:ny};}
      stepTimer+=dt;if(stepTimer>=0.28){stepTimer=0;playSound('step');}complete('walk');
    }
  }
  if(path.length>0&&!sittingOnSofa){
    const target=path[0],tdx=target.x-state.founder.x,tdy=target.y-state.founder.y,dist=Math.hypot(tdx,tdy);
    const spd=speed*(1-hopSlowdown*0.4);
    if(dist<spd*dt+0.02){state.founder={...target};path.shift();if(path.length===0&&pendingInteraction){const pi=pendingInteraction;pendingInteraction=null;openInteraction(pi);}}
    else{const nx=state.founder.x+(tdx/dist)*spd*dt,ny=state.founder.y+(tdy/dist)*spd*dt;if(isWalkable(nx,ny)){state.founder={x:nx,y:ny};}else if(isWalkable(nx,state.founder.y)){state.founder={x:nx,y:state.founder.y};}else if(isWalkable(state.founder.x,ny)){state.founder={x:state.founder.x,y:ny};}
      if(tdx!==0||tdy!==0)direction={x:tdx/dist,y:tdy/dist};
      stepTimer+=dt;if(stepTimer>=0.28){stepTimer=0;playSound('step');}complete('walk');
    }
  }
  const moving=(path.length>0)||(keys.has('ArrowUp')||keys.has('w')||keys.has('W')||keys.has('ArrowDown')||keys.has('s')||keys.has('S')||keys.has('ArrowLeft')||keys.has('a')||keys.has('A')||keys.has('ArrowRight')||keys.has('d')||keys.has('D'));
  if(isDancing&&moving)isDancing=false;
  /* ── Ghost proximity jumpscare ──────────────────────────────────────── */
  if(jumpscareCoolddown>0)jumpscareCoolddown=Math.max(0,jumpscareCoolddown-dt);
  const _gt=now;
  const _gcx=1.5,_gcy=1.7;
  const _ghostX=_gcx+Math.sin(_gt/4200)*0.7+Math.sin(_gt/7300)*0.35;
  const _ghostY=_gcy+Math.cos(_gt/5100)*0.55+Math.cos(_gt/3800)*0.3;
  const _ghostDist=Math.hypot(state.founder.x-_ghostX,state.founder.y-_ghostY);
  const jumpscareActive=_ghostDist<1.5&&jumpscareCoolddown===0;
  if(jumpscareActive){
    jumpscareCoolddown=8;
    playSound('scare');
    toast('\ud83d\udc7b BOO.');
    const el=$('#jumpscare-overlay');
    el.hidden=false;
    el.classList.remove('active');
    void el.offsetWidth; // force reflow to restart animation
    el.classList.add('active');
    setTimeout(()=>{el.classList.remove('active');el.hidden=true;},620);
  }
  renderer.render({founder:state.founder,path,hovered,hoverFloor,direction,moving,time:now,jumpHeight:jumpState?jumpState.height:0,sprinting:sprinting||dashLocked,dashTrail,lightOn:state.lightOn!==false,lampOn:state.lampOn!==false,sittingOnSofa,sofaRecline,minutes:state.minutes,isCycling,pedalPower,bikeBreakdown,workers:state.workers||[],cerealStock:state.cerealStock||0,treadmillSessions:state.treadmillSessions||0,isTreadmilling,runPower,isDancing,jumpscareActive});
}

function openInteraction(o){
  const id=o.action||(o.type==='plant'?'plant':o.id);
  const config=interactions[id];if(!config)return;
  hoverLabel.hidden=true;keys.clear();dialogKind=id;
  $('#dialog-icon').innerHTML=config.icon==='plant'?'\ud83c\udf31':config.icon==='bed'?'\ud83d\udecf\ufe0f':config.icon==='pills'?'\ud83d\udc8a':config.icon==='phone'?'\ud83d\udcf1':'<svg><use href="#i-'+config.icon+'"/></svg>';
  $('#dialog-eyebrow').textContent=config.eyebrow;
  $('#dialog-title').textContent=config.title;
  $('#dialog-description').textContent=config.description;
  $('#dialog-detail').textContent=config.detail;
  $('#dialog-action').textContent=config.action;
  const cancelLabel=typeof config.cancelLabel==='function'?config.cancelLabel():(config.cancelLabel||'Maybe in a minute');
  $('#dialog-cancel').textContent=cancelLabel;
  const showNameInput=typeof config.showNameInput==='function'?config.showNameInput():config.showNameInput===true;
  nameInput.hidden=!showNameInput;
  nameInput.value='';
  if(showNameInput)setTimeout(()=>nameInput.focus(),80);
  dialogAction=()=>{const wasComplete=state.completed.length===TASKS.length;config.perform();updateUI();save();if(!wasComplete&&state.completed.length===TASKS.length)setTimeout(()=>advanceDay(),1800);};
  dialogCancelAction=config.performCancel||null;
  dialog.showModal();
}
function setPaused(v){paused=v;keys.clear();$('#pause-button').setAttribute('aria-pressed',String(v));$('#pause-button').setAttribute('aria-label',v?'Resume game':'Pause game');$('#pause-overlay').hidden=!v;}
function zoom(z){if(!renderer)return;renderer.zoom=Math.max(0.5,Math.min(2.5,z));$('#zoom-reset').textContent=Math.round(renderer.zoom*100)+'%';}
function pointerPosition(e){const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}

document.addEventListener('keydown',(e)=>{
  if(dialog.open)return;keys.add(e.key);
  if(e.key==='Escape'){if(paused)setPaused(false);return;}
  if(e.key==='p'||e.key==='P'){setPaused(!paused);return;}
  if(paused)return;
  if(e.key===' '){
    e.preventDefault();
    if(isTreadmilling){
      runPower=Math.min(105,runPower+16+Math.random()*6);
      if(runPower>=100){treadmillBreakdown++;if(treadmillBreakdown>=3){dismountTreadmill(true);return;}}
      playSound('run');updateUI();return;
    }
    if(isCycling){pedalPower=Math.min(105,pedalPower+18+Math.random()*6);if(pedalPower>=100){bikeBreakdown++;if(bikeBreakdown>=3){dismountBike(true);return;}}const rate=pedalPower<25?0:pedalPower<50?1:pedalPower<75?2:3;changeElec(rate);updateUI();return;}
    if(!tryDoubleJump())tryVault();return;
  }
  if((e.key==='q'||e.key==='Q')&&!isCycling&&!isTreadmilling){e.preventDefault();tryBlink();return;}
  if(e.key==='d'||e.key==='D'){
    /* tap d while stopped → toggle dance; hold/move → normal right-walk */
    const alreadyMoving=keys.has('ArrowUp')||keys.has('w')||keys.has('W')||keys.has('ArrowDown')||keys.has('s')||keys.has('S')||keys.has('ArrowLeft')||keys.has('a')||keys.has('A')||keys.has('ArrowRight');
    if(!isCycling&&!isTreadmilling&&!sittingOnSofa&&path.length===0&&!alreadyMoving){
      e.preventDefault();keys.delete('d');keys.delete('D');
      isDancing=!isDancing;
      if(isDancing){playSound('dance');toast('\ud83d\udd7a Bust a move. Press D again to stop.');}
      else{toast('\ud83d\udc4f Nice moves.');}
      return;
    }
    if(isDancing)isDancing=false;
  }
  if(e.key==='Shift'){sprinting=true;}
});
document.addEventListener('keyup',(e)=>{
  keys.delete(e.key);
  if(e.key==='Shift'){sprinting=false;sprintDrainAccumulator=0;}
  if(isCycling&&e.key==='Escape')dismountBike(false);
  if(isTreadmilling&&e.key==='Escape')dismountTreadmill(false);
});
canvas.addEventListener('pointermove',(e)=>{
  if(!renderer)return;
  const p=pointerPosition(e),object=renderer.hitTest(p.x,p.y);
  hovered=object?.id||null;hoverFloor=renderer.floorPoint(p.x,p.y);
  const onFloor=hoverFloor.x>=0&&hoverFloor.x<=16&&hoverFloor.y>=0&&hoverFloor.y<=12;
  canvas.style.cursor=object?'pointer':onFloor?'crosshair':'default';
  if(object){
    let label=object.label;
    if(object.id==='ideas'||object.id==='ideas2'){const di=object.id==='ideas'?0:1;const w=state.workers.find(w=>w.deskIndex===di);label=w?w.emoji+' '+w.name+' \xb7 '+w.role+' (Lv'+(w.level||1)+')':label;}
    hoverLabel.textContent=label;
    const small=document.createElement('small');
    const isVaultable=VAULTABLE_TYPES.has(object.type);
    small.textContent=object.id==='sofa'?(sittingOnSofa?'Click to stand up':'Click to sit down'):isVaultable?'Click to walk over · SPACE to vault':'Click to walk over';
    hoverLabel.append(small);hoverLabel.hidden=false;
    const half=hoverLabel.offsetWidth/2+8;
    const lx=Math.min(Math.max(p.x,half),canvas.clientWidth-half);
    hoverLabel.style.left=lx+'px';hoverLabel.style.top=(p.y-40)+'px';
  }else{hoverLabel.hidden=true;}
});
canvas.addEventListener('pointerleave',()=>{hovered=null;hoverFloor=null;hoverLabel.hidden=true;});

canvas.addEventListener('pointerdown',(e)=>{
  if(e.button!==0)return;
  const p=pointerPosition(e);if(!renderer)return;
  const object=renderer.hitTest(p.x,p.y);
  if(object){
    if(object.id==='sofa'&&sittingOnSofa){sittingOnSofa=false;sofaRestAccumulator=0;sofaRecline=0;toast('\ud83d\udecb\ufe0f Back on your feet.');return;}
    goTo(object.target||{x:object.x+object.w/2,y:object.y+object.d+0.5},object);return;
  }
  const wp=renderer.floorPoint(p.x,p.y);
  if(wp&&isWalkable(wp.x,wp.y)){
    if(sittingOnSofa){sittingOnSofa=false;sofaRestAccumulator=0;sofaRecline=0;}
    if(isCycling)dismountBike(false);
    if(isTreadmilling)dismountTreadmill(false);
    const target=nearestWalkable(wp.x,wp.y);
    if(target){const newPath=findPath(state.founder,target);if(newPath){path=newPath;pendingInteraction=null;}}
  }
});
$('#dialog-action').addEventListener('click',()=>{if(dialogAction){dialogAction();dialogAction=null;}dialog.close();});
$('#dialog-cancel').addEventListener('click',()=>{if(dialogCancelAction)dialogCancelAction();dialog.close();});
$('#dialog-close').addEventListener('click',()=>{if(dialogCancelAction)dialogCancelAction();dialog.close();});
dialog.addEventListener('close',()=>{dialogAction=null;dialogCancelAction=null;dialogKind=null;nameInput.hidden=true;});
$('#sound-button').addEventListener('click',()=>{state.sound=!state.sound;$('#sound-button').setAttribute('aria-pressed',String(state.sound));$('#sound-button').setAttribute('aria-label','Turn sound '+(state.sound?'off':'on'));save();});
$('#reset-button').addEventListener('click',()=>{if(confirm('Start a new game? All progress will be lost.'))resetGame();});
$('#zoom-in').addEventListener('click',()=>zoom(renderer?renderer.zoom+0.25:1));
$('#zoom-out').addEventListener('click',()=>zoom(renderer?renderer.zoom-0.25:1));
$('#zoom-reset').addEventListener('click',()=>zoom(1));
$('#pause-button').addEventListener('click',()=>setPaused(!paused));
$('#resume-button').addEventListener('click',()=>setPaused(false));
$('#dash-button').addEventListener('pointerdown',(e)=>{
  e.preventDefault();
  if(isTreadmilling){runPower=Math.min(105,runPower+16+Math.random()*6);if(runPower>=100){treadmillBreakdown++;if(treadmillBreakdown>=3){dismountTreadmill(true);return;}}playSound('run');updateUI();return;}
  if(isCycling){pedalPower=Math.min(105,pedalPower+18+Math.random()*6);if(pedalPower>=100){bikeBreakdown++;if(bikeBreakdown>=3){dismountBike(true);return;}}const rate=pedalPower<25?0:pedalPower<50?1:pedalPower<75?2:3;changeElec(rate);updateUI();return;}
  if(!dashLocked){dashLocked=true;$('#dash-button').setAttribute('aria-pressed','true');tryBlink();}else{dashLocked=false;$('#dash-button').setAttribute('aria-pressed','false');}
});
document.querySelectorAll('[data-destination]').forEach(btn=>{btn.addEventListener('click',()=>{const dest=btn.dataset.destination;visit(dest);});});
window.addEventListener('resize',()=>{if(renderer)renderer.resize();});
getRenderer().then(r=>{renderer=r;r.resize();requestAnimationFrame(tick);updateUI();});
