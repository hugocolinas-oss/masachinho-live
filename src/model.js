export const freshSettings=()=>({mode:'normal',auto:true,smoking:false,threshold:.7,gain:4,mouthSensitivity:1,speechHandAmount:1.2,gamingHandAmount:1});
export class RoomModel{
 constructor(){this.settings=freshSettings();this.owner=null;this.audioAt=-Infinity;this.level=0;this.highAt=null;this.lowAt=null;this.shout=false;this.tiltUntil=0;}
 command(msg){
  if(msg?.type==='mode'&&['normal','tilt','god'].includes(msg.value)){if(this.settings.mode==='god'&&msg.value==='normal')this.settings.auto=true;this.settings.mode=msg.value;return true;}
  if(msg?.type==='auto'&&typeof msg.value==='boolean'){this.settings.auto=msg.value;if(this.settings.mode==='tilt')this.settings.mode='normal';return true;}
  if(msg?.type==='smoking'&&typeof msg.value==='boolean'){this.settings.smoking=msg.value;return true;}
  const ranges={threshold:[.3,.95],gain:[1,16],mouthSensitivity:[.5,2],speechHandAmount:[0,2],gamingHandAmount:[0,2]};
  if(msg?.type==='setting'&&Object.hasOwn(ranges,msg.key)&&Number.isFinite(msg.value)){const [lo,hi]=ranges[msg.key];this.settings[msg.key]=Math.max(lo,Math.min(hi,msg.value));return true;}
  return false;
 }
 audio(id,msg,now){
  if(typeof msg?.active!=='boolean'||!Number.isFinite(msg.level)||msg.level<0||msg.level>1)return false;
  if(this.owner&&this.owner!==id&&now-this.audioAt<900)return false;
  if(!msg.active){if(this.owner===id)this.disconnect(id);return true;}
  this.owner=id;this.audioAt=now;this.level=msg.level;return true;
 }
 disconnect(id){if(this.owner===id){this.owner=null;this.level=0;this.shout=false;this.highAt=this.lowAt=null;}}
 snapshot(now){
  if(now-this.audioAt>900)this.disconnect(this.owner);
  if(this.owner&&this.level>=this.settings.threshold){this.highAt??=now;this.lowAt=null;if(now-this.highAt>=550)this.shout=true;}
  else{this.highAt=null;if(this.level<this.settings.threshold*.82){this.lowAt??=now;if(now-this.lowAt>=350)this.shout=false;}}
  if(this.shout&&this.settings.auto)this.tiltUntil=now+5000;
  const god=this.settings.mode==='god';const tilted=this.settings.mode==='tilt'||(this.settings.auto&&now<this.tiltUntil);
  const active=god||tilted;const opts={mode:god||this.settings.mode==='tilt'?'on':this.settings.auto?'auto':'off',style:god?'god':'tilt',aura:true,robe:false,intensity:.9,holdMs:5000};
  return {effectiveState:this.level>.02?'talking':'idle',lounge:this.settings.smoking?'smoking':'gaming',micActive:this.level>.02,level:this.level,activeAnimation:null,
   appearance:{level:active?.9:0,active,options:opts,holdRemainingMs:Math.max(0,this.tiltUntil-now)},gameInput:{connected:false,focused:false},
   performance:{connected:!!this.owner,shouting:this.shout&&!god,mood:'idle',profile:this.settings.smoking?'chat':'game',comfort:{movementAmount:1,motionSmoothing:1,mouthSensitivity:this.settings.mouthSensitivity,speechHandAmount:this.settings.speechHandAmount,gamingHandAmount:this.settings.gamingHandAmount,godExpressionAmount:1.3,godAuraMotion:1}},settings:{...this.settings},micOwner:this.owner};
 }
}
export function credentials(hash){const p=new URLSearchParams(hash.replace(/^#/,'')),room=p.get('room'),key=p.get('key');return /^[a-f0-9]{32}$/.test(room||'')&&/^[a-f0-9]{64}$/.test(key||'')?{room,key}:null;}
