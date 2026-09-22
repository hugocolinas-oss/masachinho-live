// The original 1024px illustration is the registration for every facial feature.
export const FACE_REGIONS={mouth:[395,425,145,100],left:[403,354,60,42],right:[507,344,88,43]};
export function portraitMode(selected,state,appearanceActive){
 if(selected.name==='laugh')return 'laugh';
 // Reactions retain their own art; appearance may temporarily replace a lounge pose.
 if(appearanceActive&&!selected.authored)return state.appearance?.options?.style==='god'?'god':'tilt';
 if(['smoking','smoking_idle'].includes(selected.name))return 'smoke';
 return null;
}
export function portraitFrame(state,config,now,autoElapsed=0){
 const manual=!!state.activeAnimation||(!state.lounge&&!['idle','talking'].includes(state.effectiveState||'idle'));
 const automatic=state.performance?.mood;
 if(!manual&&state.performance?.shouting)return {path:config.animations.rage.frames[1].frame,name:'shouting',authored:true};
 const mood=manual?state.effectiveState:automatic&&automatic!=='idle'?automatic:state.lounge==='smoking'?'smoking_idle':null;
 const name=mood==='excited'?'rage':mood;
 const spec=config.animations[name];
 if(!spec)return {path:config.idleFrame,authored:false,name:'idle'};
 const elapsed=manual?Math.max(0,now-state.command.startedAt):autoElapsed;
 const total=spec.frames.reduce((sum,f)=>sum+f.duration,0);
 if(manual&&!state.command?.repeat&&elapsed>=(spec.loop?spec.autoReturnMs||Infinity:total)){
  // A delayed SSE update must not flash the gaming portrait before lounge resumes.
  const rest=state.lounge==='smoking'?config.animations.smoking_idle:null;
  return {path:rest?rest.frames[0].frame:config.idleFrame,authored:false,name:rest?'smoking_idle':'idle'};
 }
 let cursor=elapsed%total;
 for(const frame of spec.frames){if(cursor<frame.duration)return {path:frame.frame,authored:!spec.livePortrait&&!spec.procedural&&frame.frame!==config.idleFrame,name,effect:frame.effect||spec.effect};cursor-=frame.duration;}
 return {path:config.idleFrame,authored:false,name:'idle'};
}
export function portraitMotion(pose,authored=false){
 // Keep original anatomy: camera movements are intentionally small, with no part scaling.
 const clamp=(v,n)=>Math.max(-n,Math.min(n,v));
 return {head:[clamp(pose.head.x*.18,3),clamp(pose.head.y*.18,3),clamp(pose.head.rotation*.12,1.8)*Math.PI/180],
  breath:authored?0:clamp(pose.body.y*.3,.7),
  hands:pose.hands.map(h=>[clamp(clamp(h.x*.22,7)+(h.voiceGesture||0)*1.2,8),clamp(clamp((h.y-h.arm*.15)*.23,7)-(h.voiceGesture||0)*5+(h.tap||0)*8,12)]),
  fingers:pose.hands.flatMap(h=>h.fingers.map((v,i)=>clamp(clamp(v*.24,4.5)+(h.voiceGesture||0)*(i===1?1.5:.7)+(h.tap||0)*(i<3?4:1),7))),authored};
}

// Smooth deterministic attention shifts: irregular holds, never a metronomic eye wobble.
export function livingExpression(now,pose,state,settings,kind='idle'){
 const amount=state.performance?.comfort?.movementAmount??settings.movementAmount??1;
 const tracked=!!state.performance?.tracking,tilt=state.appearance?.options?.style==='god'?0:(state.appearance?.level||0)*(settings.tiltExpression??1.3);
 const seed=n=>{const x=Math.sin(n*127.1+19.7)*43758.5453;return (x-Math.floor(x))*2-1;};
 const segment=Math.floor(now/3400),phase=(now%3400)/3400;
 const t=Math.min(1,phase/.12),ease=t*t*(3-2*t);
 const gaze=seed(segment-1)+(seed(segment)-seed(segment-1))*ease;
 const sigh=Math.pow(Math.max(0,Math.sin(now/2400)),8)*tilt;
 const laugh=kind==='laugh'||pose.mood==='laugh';
 const god=state.appearance?.options?.style==='god'&&(state.appearance?.level||0)>.01;
 pose.pupilX+=gaze*(settings.idleGaze??1.8)*(tracked?.3:1)*(1+tilt*.9);
 if(!tracked){pose.head.rotation+=Math.sin(now/3100)*(settings.idleSway??.8)*amount;}
 pose.head.rotation+=tilt*(-4+Math.sin(now/4100)*2.2)*amount;pose.head.y+=(tilt*10+sigh*6)*amount;
 pose.body.y+=sigh*2*amount;const complaint=state.micActive?Math.min(1,(state.level||0)*2):0;
 pose.brow-=tilt*(.25+complaint*(.35+.25*Math.sin(now/530)));
 if(tilt>0&&!state.activeAnimation&&state.lounge!=='smoking'){pose.hands[0].wrist+=tilt*complaint*3;pose.hands[0].y-=tilt*complaint*3;pose.hands[1].voiceGesture*=1+tilt*.3;}
pose.blinkLeft=Math.max(pose.blinkLeft,sigh*.72);pose.blinkRight=Math.max(pose.blinkRight,sigh*.55);
 const power=god?(state.performance?.comfort?.godExpressionAmount??settings.godExpressionAmount??1.25)*amount:0;
 const voice=state.micActive?Math.sqrt(Math.max(0,state.level||0)):0;
 const confidence=.5+.5*Math.sin(now/2700);
 if(god){
  pose.head.y-=power*(4+Math.sin(now/1300)*2+voice*3);
  pose.head.rotation+=power*(Math.sin(now/2200)*1.7-voice*1.2);
  pose.brow=power*(-.65+confidence*.42+voice*.35);
  pose.body.y+=Math.sin(now/1100)*power*1.5;
  pose.hands.forEach((h,i)=>{h.y-=power*(2+voice*5+Math.sin(now/740+i)*1.5);});
 }
 if(laugh){const beat=Math.max(0,Math.sin(now/145));pose.jaw=Math.max(pose.jaw,beat*.8);pose.blinkLeft=Math.max(pose.blinkLeft,beat>.35?1:0);pose.blinkRight=Math.max(pose.blinkRight,beat>.35?1:0);pose.head.y-=beat*14*amount;pose.head.rotation+=Math.sin(now/210)*1.8*amount;pose.body.y-=beat*3*amount;pose.brow=.5;}
 return {squint:Math.min(.8,laugh?0:tilt*.45),smirk:tilt*.75+(laugh?.7:0)+power*(.25+confidence*.6+voice*.2),asymmetry:tilt*.6+power*confidence*.6,gazeY:tilt*Math.sin(now/4700),laugh,kind};
}
export class PortraitTransition{
 constructor(){this.path=null;this.at=0;this.duration=0;}
 step(path,now,duration){const changed=this.path!==null&&path!==this.path;if(changed){this.at=now;this.duration=duration;}this.path=path;
  const t=this.duration?Math.max(0,Math.min(1,(now-this.at)/this.duration)):1;
  return {changed,opacity:1-t*t*(3-2*t)};
 }
}

// A continuous lounge cycle: rest, draw, exhale, rest. Local to mode entry.
export class SmokeCycle {
 constructor(){this.started=null;}
 step(now,active,settings={}){
  if(!active){this.started=null;return {draw:0,exhale:0,phase:'rest'};}
  if(this.started===null)this.started=now;
  const period=Math.max(8000,settings.smokeCycleMs??16000),t=((now-this.started)%period)*16000/period;
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  const draw=smooth((t-4000)/1300)*(1-smooth((t-6500)/1300));
  const exhale=smooth((t-7600)/600)*(1-smooth((t-9000)/2200));
  return {draw,exhale,phase:draw>.05?'draw':exhale>.05?'exhale':'rest'};
 }
}
