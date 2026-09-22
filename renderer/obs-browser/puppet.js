import {consistentPortrait,reactionPose} from './identity-rig.js';
import {SmokeArm} from './smoke-arm.js';
import {mountStage} from './viewport.js';
import {facePatch} from './face-patches.js';
import {poseAt,PoseSmoother,MouthState,IdleBlink,speechDemoAt,inputStrike} from './puppet-model.js';
import {portraitFrame,portraitMode,portraitMotion,FACE_REGIONS,livingExpression,PortraitTransition,SmokeCycle} from './portrait-model.js';
import {PortraitGL} from './portrait-gl.js';
import {TiltVisual,FaceBlend} from './tilt-effects.js';
const stage=document.getElementById('stage'),preview=new URLSearchParams(location.search).has('preview');
if(preview)document.documentElement.style.background='repeating-conic-gradient(#192029 0% 25%,#1c242f 0% 50%) 50% /32px 32px';
const smokeCycle=new SmokeCycle();
const smoother=new PoseSmoother(),mouth=new MouthState(),blink=new IdleBlink(),images=new Map();
let state,settings,config,last=0,lastStateAt=performance.now(),demoUntil=0,demoType='',autoMood='',autoSince=0,showPivots=false,angryFace=false;
try{
 const boot=await fetch('/api/bootstrap').then(r=>r.json());config=boot.config;state=boot.state;
 settings=await fetch('/config/studio.json').then(r=>r.json());settings.micThreshold=config.micThreshold;
 const available=new Set(boot.assets.filter(a=>a.exists).map(a=>a.path));
 const needed=new Set([config.idleFrame,config.blinkFrame,...config.talkingFrames,...Object.values(config.expressionAssets||{}),...Object.values(config.modeAssets||{}).flatMap(m=>['base','talk','blink','body'].map(k=>m[k]).filter(Boolean)),...Object.entries(config.animations).filter(([name])=>!['rage','headbutt','sleep','exhausted'].includes(name)).flatMap(([,a])=>a.frames.map(f=>f.frame))]);
 await Promise.all([...available].filter(path=>needed.has(path)).map(async path=>{const img=new Image();img.src='/'+path;await img.decode();images.set(path,img);}));
 const auraCanvas=document.createElement('canvas');auraCanvas.width=auraCanvas.height=1024;auraCanvas.className='part';auraCanvas.dataset.part='tilt-aura';stage.append(auraCanvas);const tilt=new TiltVisual(auraCanvas),rageBlend=new FaceBlend();
 const frontCanvas=document.createElement('canvas');frontCanvas.width=frontCanvas.height=1024;frontCanvas.className='part';const front=frontCanvas.getContext('2d');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;canvas.className='part';canvas.dataset.part='original-portrait';stage.append(canvas);
 const fallback=document.createElement('canvas');fallback.width=fallback.height=1024;fallback.className='part';fallback.hidden=true;stage.append(fallback);const ctx=fallback.getContext('2d');
 const armCanvas=document.createElement('canvas');armCanvas.width=armCanvas.height=1024;armCanvas.className='part';stage.append(armCanvas);const armContext=armCanvas.getContext('2d'),smokeArm=new SmokeArm(images.get(config.modeAssets.smoke.base),images.get(config.modeAssets.smoke.body));
 const transitionCanvas=document.createElement('canvas');transitionCanvas.width=transitionCanvas.height=1024;transitionCanvas.className='part';transitionCanvas.style.pointerEvents='none';stage.append(transitionCanvas);
 const transitionContext=transitionCanvas.getContext('2d'),previousOverlay=document.createElement('canvas');previousOverlay.width=previousOverlay.height=1024;const previousContext=previousOverlay.getContext('2d');
 stage.append(frontCanvas);
 const transition=new PortraitTransition();let oldOpacity=0,previousAuthored=false,speechHand=0;
 const rig=new PortraitGL(canvas),base=images.get(config.idleFrame),closed=images.get(config.blinkFrame);
 if(!base||!closed)throw Error('Faltan las imágenes originales de reposo o parpadeo.');
 const dot=document.createElement('i');dot.className='pivot';dot.dataset.name='cabeza · movimiento limitado';dot.style.left='558px';dot.style.top='550px';dot.hidden=true;stage.append(dot);
 function frame(now){requestAnimationFrame(frame);const interval=1000/settings.renderFps,elapsed=now-last;if(elapsed<interval)return;last=now-elapsed%interval;
  let current=now-lastStateAt<2500?state:{effectiveState:'idle',performance:{comfort:state.performance?.comfort}};
  const demo=preview&&now<demoUntil;
  if(demo){const t=now/650,phrase=speechDemoAt(4000-(demoUntil-now));current={...current,
   micActive:demoType==='talk',level:demoType==='talk'?phrase.level:0,
   gameInput:demoType==='motion'?{connected:true,focused:true,keys:inputStrike(now,430,40),click:inputStrike(now,710,150),dx:(Math.floor(now/780)%3-1)*.7,dy:(Math.floor(now/1130)%3-1)*.35}:current.gameInput,
   performance:{comfort:current.performance?.comfort,shouting:demoType==='shout',mood:demoType==='shout'?'excited':'idle',tracking:demoType==='blink'?{blinkLeft:1,blinkRight:1}:null}};}
  const mood=current.performance?.mood||'idle';if(mood!==autoMood){autoMood=mood;autoSince=now;}
  let selected=consistentPortrait(portraitFrame(current,config,Date.now(),now-autoSince),config);
  if(!images.has(selected.path))selected={path:config.idleFrame,authored:false,name:'idle'};
  const target=poseAt(now,current,settings),b=blink.step(now,!!current.performance?.tracking,settings);target.blinkLeft=Math.max(target.blinkLeft,b);target.blinkRight=Math.max(target.blinkRight,b);
  const reactionName=selected.name;
  const reactionWeight=reactionPose(target,selected,current,config,Date.now());
  target.expression=livingExpression(now,target,current,settings,selected.name);
  const pose=smoother.step(target,now,settings.smoothingMs*(current.performance?.comfort?.motionSmoothing??1),settings);
  const expression=pose.expression;
  const mouthFrame=mouth.step(pose.jaw);let talk=images.get(config.talkingFrames[0])||base,talkOpen=images.get(config.talkingFrames[1])||talk,eyeSource=closed;
  const visual=tilt.step(current.appearance,now);
  if(visual.strength>.3)angryFace=true;else if(visual.strength<.08)angryFace=false;
  const customKind=portraitMode(selected,current,angryFace);
  const layout=customKind?config.modeAssets?.[customKind]:null;
  if(layout&&images.has(layout.base)){selected={...selected,path:layout.base,name:customKind==='smoke'?'smoking_idle':customKind,authored:false};talk=images.get(layout.talk)||images.get(layout.base);talkOpen=talk;eyeSource=images.get(layout.blink)||images.get(layout.base);}
  if(customKind==='tilt'){talk=images.get(config.expressionAssets.tiltTalk)||talk;talkOpen=talk;}
  const displayAction=selected.coherent?reactionName:selected.name!=='idle'?selected.name:pose.mood;
  const puff=smokeCycle.step(now,customKind==='smoke',settings);
  const useAngry=false;
  const rage=rageBlend.step(selected.coherent&&['rage','headbutt','shouting'].includes(reactionName)&&customKind!=='god'?reactionWeight:0,now);
  const face={...expression,drained:customKind==='tilt'?visual.strength:0,drainedImage:images.get(config.expressionAssets?.tilt)||base,rage:(!customKind||customKind==='tilt')?rage:0,expressionImage:images.get(customKind==='tilt'?config.expressionAssets?.tiltRage:config.expressionAssets?.rage)||images.get(config.expressionAssets?.rage)||base,layout,customKind,time:now,angry:false,brow:pose.brow,gaze:pose.pupilX,puff:puff.draw,jaw:puff.draw<.5?mouthFrame/2:0,left:pose.blinkLeft>.55?1:0,right:pose.blinkRight>.55?1:0};
  const registration=layout?.registration||[1,0,0];
  const source=(customKind==='smoke'?smokeArm.body:images.get(selected.path)),motion=portraitMotion(pose,selected.authored);
  if(layout){const strength=current.performance?.comfort?.movementAmount??settings.movementAmount??1;
   motion.head=[pose.head.x*.4,pose.head.y*.35,pose.head.rotation*.18*Math.PI/180];motion.breath=pose.body.y;
   if(customKind==='smoke'){motion.head[1]+=puff.draw*3;motion.head[2]-=puff.draw*.018;motion.breath-=puff.draw*2;}
   if(customKind==='god'){
    const power=(current.performance?.comfort?.godExpressionAmount??settings.godExpressionAmount??1.25)*strength;
    const charge=(.5+.5*Math.sin(now/1750)),speech=current.micActive?Math.sqrt(current.level||0):0;
    motion.head[2]*=2.4;motion.head[1]-=charge*power*2;
    motion.hands.forEach((h,i)=>{h[1]-=(charge*3+speech*3)*power;h[0]+=Math.sin(now/1500+i)*power;});
   }
   if(customKind==='laugh'){const beat=Math.max(0,Math.sin(now/140));motion.head[1]-=beat*6*strength;motion.head[2]+=Math.sin(now/280)*.012*strength;}
  }
  // A restrained conversational wrist gesture follows the visible mouth pose.
  // Smooth the hand, never the mouth texture; keep the cigarette hand on its authored path.
  const handTarget=current.micActive&&!selected.authored?face.jaw:0;
  speechHand+=(handTarget-speechHand)*(1-Math.exp(-Math.min(elapsed,100)/110));
  const handAmount=(current.performance?.comfort?.movementAmount??settings.movementAmount??1)*(current.performance?.comfort?.speechHandAmount??settings.speechHandAmount??1.2);
  motion.hands[1][0]+=speechHand*3*handAmount;
  motion.hands[1][1]-=speechHand*6*handAmount;
  if(customKind!=='smoke')motion.hands[0][1]-=speechHand*2*handAmount;
  if(selected.coherent){motion.head[1]+=pose.head.y*.3;motion.head[2]+=pose.head.rotation*.12*Math.PI/180;motion.head[0]+=Math.sin(now/45)*reactionWeight*1.4;}
  const blend=transition.step(selected.path,now,selected.authored&&previousAuthored?config.transitionMs:config.returnTransitionMs);
  if(blend.changed){previousContext.clearRect(0,0,1024,1024);previousContext.drawImage(transitionCanvas,0,0);transitionContext.clearRect(0,0,1024,1024);transitionContext.drawImage(canvas.hidden?fallback:canvas,0,0);transitionContext.drawImage(armCanvas,0,0);transitionContext.drawImage(frontCanvas,0,0);if(oldOpacity>0){transitionContext.globalAlpha=oldOpacity;transitionContext.drawImage(previousOverlay,0,0);transitionContext.globalAlpha=1;}}
  transitionCanvas.style.opacity=String(blend.opacity);oldOpacity=blend.opacity;previousAuthored=selected.authored;
  const rendered=rig.draw(source,talk,talkOpen,eyeSource,motion,face,0);canvas.hidden=!rendered;fallback.hidden=rendered;
  if(!rendered){ctx.clearRect(0,0,1024,1024);ctx.save();ctx.translate(registration[1],registration[2]);ctx.scale(registration[0],registration[0]);ctx.drawImage(source,0,0,1024,1024);if(face.drained>.01){ctx.globalAlpha=face.drained;ctx.drawImage(facePatch(face.drainedImage,source,[369,290,312,263],false),369,290);ctx.globalAlpha=1;}if(face.rage>=.5&&face.jaw===1){ctx.globalAlpha=1;const region=[395,420,165,125];ctx.drawImage(facePatch(face.expressionImage,source,region,false),region[0],region[1]);ctx.globalAlpha=1;}if(!selected.authored&&customKind!=='laugh'&&face.rage<.5){for(const [key,img,active] of [['mouth',talk,face.jaw>.1],['left',eyeSource,face.left],['right',eyeSource,face.right]])if(active){const region=layout?.[key]||FACE_REGIONS[key];ctx.globalAlpha=1;ctx.drawImage(facePatch(img,source,region,key!=='mouth',key==='mouth'&&face.jaw===.5,key==='mouth'),region[0],region[1]);ctx.globalAlpha=1;}}ctx.restore();}
  armContext.clearRect(0,0,1024,1024);armContext.save();armContext.translate(registration[1],registration[2]);armContext.scale(registration[0],registration[0]);const arm=customKind==='smoke'?smokeArm.draw(armContext,puff,now,motion):null;armContext.restore();
  tilt.foreground(front,now,customKind,layout,visual,current.level||0,{...puff,arm,eyes:[face.left,face.right]},motion,{...settings,godAuraMotion:current.performance?.comfort?.godAuraMotion??settings.godAuraMotion});
  stage.dataset.pose=JSON.stringify({renderer:rendered?'registered-portrait':'portrait-fallback',action:displayAction,frame:selected.path,customKind,coherent:!!selected.coherent,registration,puff,arm,expression,transition:blend.opacity,held:!!current.held,angryFace:useAngry,jaw:face.jaw,mouthFrame:mouthFrame,leftEye:face.left,rightEye:face.right,motion,tilt:visual,demo:demo?demoType:null});
  if(preview)parent.postMessage({type:'portrait-status',action:displayAction,frame:selected.path,renderer:rendered?'Movimiento local':'Sin WebGL · solo aura',demo:demo?demoType:null},location.origin);
 }
 const events=new EventSource('/api/events');events.onmessage=({data})=>{state=JSON.parse(data);lastStateAt=performance.now();};
 window.addEventListener('message',e=>{if(!preview||e.origin!==location.origin||e.source!==parent)return;
  if(e.data.type==='demo'){demoType=e.data.mode||'motion';demoUntil=performance.now()+(demoType==='blink'?350:demoType==='talk'?4000:demoType==='shout'?3000:8000);}
  if(e.data.type==='pivots'){showPivots=!!e.data.enabled;dot.hidden=!showPivots;}
 });

 mountStage(stage,1024,1024,6);requestAnimationFrame(frame);
}catch(error){document.getElementById('error').textContent='No se pudo cargar el personaje: '+error.message;}
