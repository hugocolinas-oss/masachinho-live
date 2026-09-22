import {clamp} from './tracking-math.js';
// Short strikes with a clear contact and recovery, separated by stillness.
export function inputStrike(now,period=430,offset=0){
 const t=((now+offset)%period+period)%period;
 return t<25?t/25:t<65?1:t<145?1-(t-65)/80:0;
}
export function poseAt(now,state,settings) {
  const p=state.performance||{},t=p.tracking;
  const amount=p.comfort?.movementAmount??settings.movementAmount??1;
  const mouthSensitivity=p.comfort?.mouthSensitivity??settings.mouthSensitivity??1;
  const deadzone=settings.trackingDeadzone??.015;
  const quiet=v=>Math.abs(v||0)<=deadzone?0:Math.sign(v)*(Math.abs(v)-deadzone)/(1-deadzone);
  const manual=!!state.activeAnimation||(!state.lounge&&!['idle','talking'].includes(state.effectiveState||'idle'));
  const mood=manual?state.effectiveState:(p.mood&&p.mood!=='idle'?p.mood:state.effectiveState||'idle');
  const sleep=mood==='sleep',rage=['rage','headbutt','excited'].includes(mood),smoke=mood==='smoking';
  const speech=state.micActive&&(state.effectiveState==='talking'||state.level>=(settings.micThreshold??.12))?clamp(state.level,0,1):0;
  // With a visible face, a closed jaw must win over microphone noise or release hold.
  const cameraJaw=typeof t?.jaw==='number'?clamp((t.jaw-(settings.cameraJawDeadzone??.08))/(1-(settings.cameraJawDeadzone??.08)),0,1):null;
  const liveJaw=cameraJaw===null?clamp(Math.pow(speech,.9)*1.08,0,.95):cameraJaw*(1+Math.sqrt(speech)*.55);
  const phase=now/(settings.breathingPeriodMs??5200)*Math.PI*2;
  const breath=(Math.sin(phase)+.12*Math.sin(phase*2))*settings.breathing;
  const gesture=p.profile==='chat'?1:.35;
  const hands=['left','right'].map((side,i)=>{
    const tracked=t?.hands?.find(h=>h.side===side);
    const gaming=!manual&&state.lounge!=='smoking'&&!sleep;
    // Independent rhythms: short key presses, slower mouse repositioning and clicks.
    const physical=gaming&&!tracked&&state.gameInput?.connected?state.gameInput:null;
    const activity=gaming&&!tracked?(p.comfort?.gamingHandAmount??settings.gamingHandAmount??1):0;
    const idleScale=physical?.35:1;
    const mouseX=(Math.floor(now/780)%3-1)*activity*16*idleScale;
    const mouseY=(Math.floor(now/1130)%3-1)*activity*5*idleScale;
    const keyLift=inputStrike(now,430,40)*activity*10*idleScale;
    const real=physical?.focused?physical:{keys:0,click:0,dx:0,dy:0};
    const handAmount=p.comfort?.gamingHandAmount??settings.gamingHandAmount??1;
    const gameX=physical?(i?real.dx*42:real.keys*7)*handAmount+(i?mouseX:Math.sin(now/1900)*activity*2):(i?mouseX:Math.sin(now/1900)*activity*5);
    const gameY=physical?(i?real.dy*28-real.click*22:-real.keys*24)*handAmount+(i?mouseY:-keyLift):(i?mouseY:-keyLift);
    const tap=gaming?(physical?(physical.focused?clamp(i?real.click:real.keys,0,1):0):inputStrike(now,i?710:430,i?150:40)):0;
    return {tap:tap*activity*amount,voiceGesture:side==='right'&&!tracked?Math.sqrt(speech)*(.55+.45*Math.sin(now/240))*(p.comfort?.speechHandAmount??settings.speechHandAmount??1.2):0,arm:tracked?quiet(tracked.y)*settings.armRotation:(rage?(i?-9:9):Math.sin(now/1600+i*2)*gesture),
      wrist:tracked?quiet(tracked.roll)*settings.wristRotation:Math.sin(now/1200+i*2)*gesture*2,
      x:tracked?tracked.x*12:gameX,y:tracked?-Math.max(0,tracked.y)*24:gameY,
      fingers:tracked?tracked.curls.map(c=>c*settings.fingerMotion):Array.from({length:5},(_,j)=>sleep?0:physical?(i?real.click:real.keys)*(j<4?settings.fingerMotion*1.8:2)*handAmount:inputStrike(now,i?710:430,(i?150:40)+j*27)*settings.fingerMotion*(activity?activity*(i?.8:1.8):0))};
  });
  if(manual&&!['smoking_idle','laugh'].includes(mood))hands[1].voiceGesture=0;
  if(smoke){hands[0].wrist=-5;hands[0].fingers=[3,0,0,8,9];}
  if(mood==='facepalm'){hands[1].arm=-30;hands[1].y=-90;}
  const pose={mood,chair:{x:0,y:0,rotation:0},body:{y:breath},
    head:{rotation:clamp(quiet(t?.roll)*settings.headRotation+(sleep?9:0)+speech*.8,-18,18),
      x:quiet(t?.yaw)*settings.headTravel,y:quiet(t?.pitch)*settings.headTravel+breath+speech*1.5},
    hands,jaw:smoke||sleep?0:clamp(liveJaw*mouthSensitivity,0,1),
    blinkLeft:sleep?1:t?.blinkLeft||0,blinkRight:sleep?1:t?.blinkRight||0,
    brow:rage?-.7:clamp((t?.brow||0)+speech*.35+(t?.smile||0)*.2,-1,1),pupilX:(t?.yaw||0)*2,
    shake:rage?Math.sin(now*.052)*(mood==='headbutt'?settings.rageShake*2:settings.rageShake):0};
  if(mood==='headbutt'){pose.head.y+=30+Math.sin(now/130)*20;pose.head.rotation+=8;}
  if(mood==='exhausted'){pose.head.rotation+=6;pose.head.y+=12;pose.blinkLeft=pose.blinkRight=.7;}
  if(mood==='smug')pose.head.rotation-=3;
  pose.body.y*=amount;
  for(const key of ['rotation','x','y'])pose.head[key]*=amount;
  pose.shake*=amount;
  for(const hand of hands){for(const key of ['arm','wrist','x','y'])hand[key]*=amount;hand.fingers=hand.fingers.map(v=>v*amount);hand.voiceGesture*=amount;}
  pose.smoke=smoke?1:0;pose.sleep=sleep?1:0;
  return pose;
}
// Facial timing is independent of body smoothing: a quick blink must survive a slow rig.
export class PoseSmoother {
  constructor(){this.previous=null;this.at=0;this.eyeHold={};}
  step(pose,now,ms,settings={}){
    const dt=Math.min(100,Math.max(0,now-this.at));this.at=now;
    const smooth=(a,b,path='')=>{
      if(typeof b==='number'&&typeof a==='number'){
        let duration=ms;
        if(/^hands\.\d+\.tap$/.test(path))duration=b>a?12:45;
        else if(/^hands\.\d+\.(x|y|fingers)/.test(path))duration=35;
        if(path==='jaw')duration=b>a?(settings.mouthAttackMs??45):(settings.mouthReleaseMs??105);
        if(path==='blinkLeft'||path==='blinkRight'){
          if(b>=.6)this.eyeHold[path]=now+(settings.blinkHoldMs??65);
          if(b<a&&now<(this.eyeHold[path]??0))b=Math.max(b,a);
          duration=b>a?(settings.eyeCloseMs??18):(settings.eyeOpenMs??65);
        }
        if(path==='smoke'||path==='sleep')duration=180;
        return a+(b-a)*(1-Math.exp(-dt/Math.max(1,duration)));
      }
      if(Array.isArray(b))return b.map((v,i)=>smooth(a?.[i],v,`${path}.${i}`));
      if(b&&typeof b==='object')return Object.fromEntries(Object.entries(b).map(([k,v])=>[k,smooth(a?.[k],v,path?`${path}.${k}`:k)]));
      return b;
    };
    const result=this.previous?smooth(this.previous,pose):structuredClone(pose);
    // Scripted poses retain their locks, even if the microphone is still loud.
    if(['sleep','smoking'].includes(pose.mood))result.jaw=0;
    if(pose.mood==='sleep')result.blinkLeft=result.blinkRight=1;
    this.previous=result;return result;
  }
}

// Different entry/exit thresholds stop tiny fluctuations from flickering the mouth.
export class MouthState {
  constructor(){this.value=0;}
  step(jaw){
    if(this.value===0&&jaw>=.15)this.value=1;
    if(this.value===1){if(jaw<.08)this.value=0;else if(jaw>=.30)this.value=2;}
    if(this.value===2&&jaw<.22)this.value=jaw<.08?0:1;
    return this.value;
  }
}

export class IdleBlink {
  constructor(random=Math.random){this.random=random;this.next=null;this.started=-Infinity;}
  step(now,tracked,settings){
    const schedule=()=>now+settings.blinkMinMs+this.random()*Math.max(0,settings.blinkMaxMs-settings.blinkMinMs);
    if(tracked){this.started=-Infinity;this.next=schedule();return 0;}
    if(this.next===null)this.next=schedule();
    if(now>=this.next){this.started=now;this.next=schedule();}
    const progress=(now-this.started)/Math.max(80,settings.blinkDurationMs);
    if(progress<0||progress>=1)return 0;
    // Fast close, short hold, slower reopen.
    return progress<.25?progress/.25:progress<.5?1:(1-progress)/.5;
  }
}

// A phrase with syllables and pauses, not a constant open-mouth microphone signal.
export function speechDemoAt(elapsed){
 if(elapsed<0||elapsed>=4000)return {jaw:0,level:0};
 const centers=[230,590,940,1530,1860,2470,2810,3310];
 const jaw=Math.max(0,...centers.map(c=>{const d=Math.abs(elapsed-c)/155;return d<1?Math.pow(Math.cos(d*Math.PI/2),2)*.8:0;}));
 return {jaw,level:jaw*.5};
}
