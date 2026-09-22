const clamp=v=>Math.max(0,Math.min(1,v));
export const ease=v=>{const t=clamp(v);return t*t*(3-2*t);};
export class FaceBlend{
 constructor(){this.value=0;this.at=null;}
 step(target,now){const dt=this.at===null?0:Math.min(100,Math.max(0,now-this.at));this.at=now;this.value+=(target-this.value)*(1-Math.exp(-dt/(target>this.value?40:45)));if(Math.abs(target-this.value)<.005)this.value=target;return this.value;}
}
export class TiltVisual{
 constructor(canvas){this.ctx=canvas.getContext('2d');this.level=0;this.aura=0;this.robe=0;this.god=0;this.at=null;}
 step(state,now){
  const dt=this.at===null?0:Math.min(100,Math.max(0,now-this.at));this.at=now;
  const alpha=1-Math.exp(-dt/100),options=state?.options||{};
  this.level+=((state?.level||0)-this.level)*alpha;
  this.aura+=((options.aura?1:0)-this.aura)*alpha;this.robe+=((options.robe?1:0)-this.robe)*alpha;
  this.god+=((options.style==='god'?1:0)-this.god)*alpha;
  const strength=ease(this.level);this.draw(now,strength*this.aura,this.god);
  return {strength,robe:strength*this.robe,aura:strength*this.aura,god:this.god};
 }
 flame(c,x,y,w,h,t,god=false){
  const bend=Math.sin(t)*w*.4,tip=x+bend;
  c.beginPath();c.moveTo(x-w,y);c.bezierCurveTo(x-w*1.5,y-h*.35,x+w*.2,y-h*.5,tip,y-h);
  c.bezierCurveTo(x+w*.95,y-h*.7,x+w*.25,y-h*.4,x+w,y-h*.56);
  c.bezierCurveTo(x+w*1.5,y-h*.2,x+w*.8,y-h*.08,x+w,y);c.closePath();
  c.fillStyle=god?'#2fffc8':'#f05a15';c.strokeStyle=god?'#087b70':'#772717';c.lineWidth=4;c.fill();c.stroke();
  c.beginPath();c.moveTo(x-w*.5,y);c.bezierCurveTo(x-w*.7,y-h*.25,x+w*.3,y-h*.42,tip*.45+x*.55,y-h*.72);
  c.bezierCurveTo(x+w*.65,y-h*.28,x+w*.5,y-h*.1,x+w*.48,y);c.closePath();c.fillStyle=god?'#d9ffe1':'#ffcf43';c.fill();
 }
 draw(now,strength,god){
  const c=this.ctx;c.clearRect(0,0,1024,1024);if(strength<.002||god<.002)return;strength*=god;god=1;
  c.save();c.globalAlpha=strength;
  for(const [powered,weight] of [[false,1-god],[true,god]]){
   if(weight<.01)continue;c.globalAlpha=strength*weight*.8;
   const glow=c.createRadialGradient(550,530,190,550,530,525);glow.addColorStop(0,powered?'#1ae6a800':'#ff551100');glow.addColorStop(.7,powered?'#1ae6a844':'#ff551144');glow.addColorStop(1,'#00000000');c.fillStyle=glow;c.fillRect(0,0,1024,1024);
   // Filled inked tongues of fire, continuously deformed rather than randomly flickered.
   for(let i=0;i<12;i++){const x=40+i*86,h=240+190*(.5+.5*Math.sin(i*1.71))+Math.sin(now/580+i)*30;this.flame(c,x,1010,48+i%3*9,h,now/800+i,powered);}
   for(let i=0;i<7;i++){const x=80+i*147;this.flame(c,x,760,24,190+80*Math.sin(i*2)+Math.sin(now/700+i)*20,now/900+i,powered);}
   if(powered){c.strokeStyle='#c5fff0';c.lineWidth=3;for(let i=0;i<4;i++){const y=1010-((now/3+i*200)%950);c.globalAlpha=strength*weight*.25;c.beginPath();c.ellipse(550,y,430,48,0,0,Math.PI*2);c.stroke();}}
  }
  for(let i=0;i<20;i++){const phase=(now/(2200+i*80)+i*.11)%1,x=60+i*48+Math.sin(now/1100+i)*15,y=980-phase*900;c.globalAlpha=strength*Math.sin(phase*Math.PI)*.7;c.fillStyle=god>.5?'#dcffe6':'#ffd470';c.fillRect(x,y,3,8);}
  // Fade the base of the aura so it does not create a rectangular stripe in OBS.
  c.globalAlpha=1;c.globalCompositeOperation='destination-in';const fade=c.createLinearGradient(0,0,0,1024);fade.addColorStop(0,'#fff');fade.addColorStop(.88,'#fff');fade.addColorStop(1,'#fff0');c.fillStyle=fade;c.fillRect(0,0,1024,1024);
  c.restore();
 }
 foreground(c,now,kind,layout,visual,voice,puff={draw:0,exhale:0},motion={head:[0,0,0]},settings={}){
  c.clearRect(0,0,1024,1024);c.save();const registration=layout?.registration||[1,0,0];c.translate(registration[1],registration[2]);c.scale(registration[0],registration[0]);
  if(kind==='smoke'){
   const [x,y]=puff.arm?.ember||layout.smokeAnchor;const drift=Math.sin(now/1200)*3;c.lineCap='round';
   for(let i=0;i<6;i++){const phase=(now/6000+i/6)%1,sy=y-phase*230;c.globalAlpha=Math.sin(phase*Math.PI)*.25;c.strokeStyle=i%2?'#e3e6ee':'#abb4c8';c.lineWidth=4+phase*13;c.beginPath();c.moveTo(x+drift,sy+35);c.bezierCurveTo(x-15,sy,x+22,sy-22,x+Math.sin(now/1100+i)*16,sy-60);c.stroke();}
   c.globalAlpha=.45+puff.draw*.5;c.fillStyle='#ff8b43';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();
  }
  if(kind==='smoke'&&puff.exhale>.001){
   const [mx,my,mw,mh]=layout.mouth;
   for(let i=0;i<9;i++){const t=(now/2600+i/9)%1;const x=mx+mw*.45-t*190,y=my+mh*.58-t*65+Math.sin(t*6+i)*7;
    c.globalAlpha=puff.exhale*Math.sin(t*Math.PI)*.16;c.fillStyle='#d9dce4';c.beginPath();c.ellipse(x,y,9+t*26,6+t*19,0,0,Math.PI*2);c.fill();}
  }
  
  if(kind==='god'){
   // Slow expanding power strokes, driven by speech without a strobe.
   const power=(settings.godAuraMotion??1)*visual.aura;
   for(let i=0;i<5;i++){
    const t=(now/3800+i/5)%1;c.globalAlpha=Math.sin(t*Math.PI)*power*(.12+Math.min(.16,voice*.2));
    c.strokeStyle='#a1ffe7';c.lineWidth=2.5*(1-t)+.5;c.beginPath();
    c.ellipse(560,700-t*240,290+t*115,45+t*20,-.12,Math.PI*.04,Math.PI*.94);c.stroke();
   }
   // No flashing: steady white eyes in the artwork with a gentle continuous halo.
   for(const [i,r] of [layout.left,layout.right].entries()){const x=r[0]+r[2]/2+motion.head[0],y=r[1]+r[3]/2+motion.head[1];c.globalAlpha=visual.strength*(1-(puff.eyes?.[i]||0))*(.13+.04*Math.sin(now/700)+Math.min(.1,voice*.12));const glow=c.createRadialGradient(x,y,4,x,y,70);glow.addColorStop(0,'#e9fff8');glow.addColorStop(1,'#92ffdf00');c.fillStyle=glow;c.fillRect(x-70,y-70,140,140);}
  }
  c.restore();
 }
}
