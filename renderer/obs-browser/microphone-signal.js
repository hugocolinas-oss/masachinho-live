const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function percentile(values,p){const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.floor((sorted.length-1)*p)]:0;}
export function calibrateSilence(values){
 if(values.length<20)throw Error('No llegan suficientes muestras del micro. Vuelve a activarlo.');
 const floor=percentile(values,.95)*1.4;
 if(floor>.12)throw Error('Demasiado ruido o voz durante la calibración. Repite en silencio.');
 return clamp(floor,.001,.12);
}
export function calibrateVoice(values,noise){
 const voiced=values.filter(v=>Number.isFinite(v)&&v>noise*1.8);
 if(voiced.length<15)throw Error('No se oye voz suficiente. Acerca el micro y repite hablando.');
 return Math.round(clamp(.36/Math.max(.001,percentile(voiced,.75)-noise),1,16)*2)/2;
}
// Gate before gain: turning gain up cannot open the gate on calibrated room noise.
export class MicrophoneSignal{
 constructor(){this.reset();}
 reset(){this.open=false;this.quietAt=null;this.level=0;this.at=null;}
 step(raw,noise,gain,now,fresh=true){
  if(!fresh||!Number.isFinite(raw)||raw<0){this.reset();return 0;}
  const floor=clamp(Number(noise)||.001,.001,.2),dt=this.at===null?50:clamp(now-this.at,0,100);this.at=now;
  if(raw>=floor*1.45+.001){this.open=true;this.quietAt=null;}
  else if(raw<floor*1.15+.0005){this.quietAt??=now;if(now-this.quietAt>=40)this.open=false;}
  const target=this.open?clamp((raw-floor)*clamp(Number(gain)||1,1,16),0,1):0;
  this.level+=(target-this.level)*(1-Math.exp(-dt/(target>this.level?18:22)));
  if(this.level<.003)this.level=0;return this.level;
 }
}
