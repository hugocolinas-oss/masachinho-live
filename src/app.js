import {RoomModel,credentials} from './model.js';
import {MicrophoneSignal,calibrateSilence} from '/obs-browser/microphone-signal.js';
const $=id=>document.getElementById(id),overlay=location.pathname==='/overlay';
const random=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),x=>x.toString(16).padStart(2,'0')).join('');
const setStatus=text=>{$('connection').textContent=text;};
const fatal=text=>{$('fatal').hidden=false;$('fatal').textContent=text;};
const room=credentials(location.hash);
window.addEventListener('hashchange',()=>location.reload());
$('create').onclick=()=>{location.href='/control#'+new URLSearchParams({room:random(16),key:random(32)});};
if(!room){if(overlay)fatal('Falta el enlace completo de sala. Cópialo desde el panel.');else{$('welcome').hidden=false;setStatus('Sin sala');}}
else startRoom();
function startRoom(){
 const hash='#'+new URLSearchParams(room),obs=location.origin+'/overlay'+hash,control=location.origin+'/control'+hash;
 $('studio').hidden=false;document.body.classList.toggle('overlay',overlay);$('preview').src='/puppet';
 $('obsLink').value=obs;$('controlLink').value=control;
 for(const [id,text] of [['copyObs',obs],['copyControl',control]])$(id).onclick=async()=>{try{await navigator.clipboard.writeText(text);$('copyStatus').textContent='Enlace copiado.';}catch{$('copyStatus').textContent='Selecciona el enlace y cópialo con Ctrl+C.';}};
 $('check').onclick=()=>window.open(obs,'masachinho-obs','noopener');
 let latest=null,link=null,peer=null,ready=false,retry=null,closed=false,connecting=false,everConnected=false;
 const model=overlay?new RoomModel():null,clients=new Map();
 const send=(conn,msg)=>{if(!conn?.open||conn.dataChannel?.bufferedAmount>65536)return false;try{conn.send(msg);return true;}catch{return false;}};
 const render=state=>{
  latest=state;$('preview').contentWindow?.postMessage({type:'remote-state',state},location.origin);
  $('mood').textContent=state.appearance.options.style==='god'?'GOD':state.appearance.active?'TILT':state.lounge==='smoking'?'FUMANDO':'NORMAL';
  $('sourceStatus').textContent=state.performance.connected?'Micro conectado':'Sin micrófono · reposo';
  for(const b of document.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',String(state.settings.mode===b.dataset.mode));
  $('automatic').textContent='Tilt al gritar · '+(state.settings.auto?'ON':'OFF');$('automatic').setAttribute('aria-pressed',String(state.settings.auto));
  $('smoking').textContent='🚬 '+(state.settings.smoking?'ON':'OFF');$('smoking').setAttribute('aria-pressed',String(state.settings.smoking));
  for(const key of ['gain','threshold','mouthSensitivity','speechHandAmount','gamingHandAmount'])if(document.activeElement!==$(key))$(key).value=state.settings[key];
  $('gainOut').value=state.settings.gain+'×';$('thresholdOut').value=Math.round(state.settings.threshold*100)+'%';
  $('meter').value=state.level;
 };
 const disable=flag=>{for(const e of document.querySelectorAll('#controls button,#controls input'))e.disabled=flag;$('micStop').disabled=!stream;$('micStart').disabled=flag||!!stream;};
 const command=msg=>{if(ready)send(link,{type:'command',command:msg});};
 for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>command({type:'mode',value:b.dataset.mode==='god'&&latest?.settings.mode==='god'?'normal':b.dataset.mode});
 $('automatic').onclick=()=>command({type:'auto',value:!latest?.settings.auto});
 $('smoking').onclick=()=>command({type:'smoking',value:!latest?.settings.smoking});
 for(const key of ['gain','threshold','mouthSensitivity','speechHandAmount','gamingHandAmount'])$(key).oninput=()=>command({type:'setting',key,value:Number($(key).value)});
 let stream=null,context=null,node=null,source=null,micRun=0,micStarting=false,noise=.008,calibration=null;
 const signal=new MicrophoneSignal();
 async function stopMic(message='Micrófono detenido.'){
  micRun++;micStarting=false;node?.disconnect();source?.disconnect();stream?.getTracks().forEach(t=>t.stop());stream=null;node=source=null;
  const old=context;context=null;await old?.close().catch(()=>{});signal.reset();calibration=null;send(link,{type:'audio',active:false,level:0});
  $('micStart').disabled=!ready;$('micStop').disabled=true;$('device').disabled=false;$('audioStatus').textContent=message;
 }
 async function devices(){try{const selected=$('device').value;const ds=await navigator.mediaDevices.enumerateDevices();$('device').replaceChildren(new Option('Predeterminado',''));for(const d of ds.filter(d=>d.kind==='audioinput'))$('device').add(new Option(d.label||'Micrófono',d.deviceId));$('device').value=selected;}catch{}}
 $('micStart').onclick=async()=>{
  if(!ready||stream||micStarting)return;micStarting=true;const run=++micRun;$('micStart').disabled=true;$('micStop').disabled=false;$('audioStatus').textContent='Permite el acceso al micrófono…';
  try{
   context=new AudioContext();await context.resume();const ctx=context;
   const media=await navigator.mediaDevices.getUserMedia({video:false,audio:{...( $('device').value?{deviceId:{exact:$('device').value}}:{}),echoCancellation:true,noiseSuppression:true,autoGainControl:false}});
   if(run!==micRun){media.getTracks().forEach(t=>t.stop());return;}stream=media;
   await ctx.audioWorklet.addModule('/obs-browser/mic-worklet.js');if(run!==micRun)return;
   source=ctx.createMediaStreamSource(stream);node=new AudioWorkletNode(ctx,'rms-processor');
   node.port.onmessage=({data})=>{
    if(run!==micRun||!ready)return;const now=performance.now();
    if(calibration){calibration.values.push(data);if(now>=calibration.until){try{noise=calibrateSilence(calibration.values);$('audioStatus').textContent='Silencio calibrado. Ya puedes hablar.';}catch(e){$('audioStatus').textContent=e.message;}calibration=null;signal.reset();}}
    const level=signal.step(data,noise,latest?.settings.gain||4,now,ctx.state==='running');send(link,{type:'audio',active:true,level:calibration?0:level});
   };
   source.connect(node);node.connect(ctx.destination);for(const t of stream.getTracks())t.onended=()=>stopMic('Micro desconectado. Actívalo de nuevo.');
   micStarting=false;$('device').disabled=true;$('audioStatus').textContent='Micro activo. Solo se envía el nivel de voz, no el audio.';await devices();
  }catch(e){if(run===micRun)await stopMic('No se pudo activar el micro: '+e.message);}
 };
 $('micStop').onclick=()=>stopMic();$('calibrate').onclick=()=>{if(!stream){$('audioStatus').textContent='Activa primero el micrófono.';return;}calibration={values:[],until:performance.now()+3000};$('audioStatus').textContent='Guarda silencio durante 3 segundos…';};
 disable(true);if(!overlay)devices();
 let lastBroadcast=0;
 function broadcast(){const now=performance.now();if(now-lastBroadcast<45)return;lastBroadcast=now;const state=model.snapshot(now);render(state);for(const c of clients.values())if(c.authed)send(c.conn,{type:'state',state});}
 function accept(conn){
  if(clients.size>=8){conn.close();return;}
  const c={conn,authed:false,lastAudio:0};clients.set(conn.peer,c);const timeout=setTimeout(()=>{if(!c.authed)conn.close();},7000);
  conn.on('data',msg=>{
   if(!msg||typeof msg!=='object')return;
   if(!c.authed){if(msg.type!=='hello'||msg.key!==room.key){conn.close();return;}c.authed=true;clearTimeout(timeout);send(conn,{type:'state',state:model.snapshot(performance.now())});return;}
   if(msg.type==='command')model.command(msg.command);
   if(msg.type==='audio'){
    const now=performance.now();if(now-c.lastAudio<25)return;c.lastAudio=now;
    if(!model.audio(conn.peer,msg,now))send(conn,{type:'mic-busy'});
   }
   broadcast();
  });
  const drop=()=>{clearTimeout(timeout);clients.delete(conn.peer);model.disconnect(conn.peer);broadcast();};conn.on('close',drop);conn.on('error',drop);
 }
 const reconnect=()=>{if(closed||overlay||retry)return;retry=setTimeout(()=>{retry=null;connect();},3000);};
 function disconnected(){ready=false;connecting=false;disable(true);setStatus('Sin conexión con OBS · reintentando…');if(stream||micStarting)stopMic('Conexión interrumpida. Activa el micro al reconectar.');reconnect();}
 function connect(){
  if(closed||ready||connecting||!peer?.open)return;connecting=true;
  const conn=peer.connect('masa-'+room.room,{reliable:true,serialization:'json'});link=conn;
  const timer=setTimeout(()=>{if(!ready&&link===conn){conn.close();connecting=false;setStatus('No conecta: abre la URL de OBS. Si ya está abierta, la red puede bloquear WebRTC.');reconnect();}},12000);
  conn.on('open',()=>send(conn,{type:'hello',key:room.key}));
  conn.on('data',msg=>{
   if(link!==conn)return;
   if(msg?.type==='state'&&msg.state?.settings){clearTimeout(timer);connecting=false;ready=true;everConnected=true;disable(false);setStatus('Conectado a OBS · control en directo');render(msg.state);}
   if(msg?.type==='mic-busy')stopMic('El otro PC ya está usando el micrófono. Detén allí la captura antes de activarlo aquí.');
  });
  conn.on('close',()=>{clearTimeout(timer);if(link===conn)disconnected();});conn.on('error',()=>{clearTimeout(timer);if(link===conn)disconnected();});
 }
 try{
  peer=new Peer(overlay?'masa-'+room.room:undefined,{debug:0});
  peer.on('open',()=>{if(overlay){setStatus('Fuente OBS lista');$('fatal').hidden=true;}else{setStatus('Buscando la fuente OBS…');connect();}});
  peer.on('connection',conn=>{if(overlay)accept(conn);else conn.close();});
  peer.on('disconnected',()=>{if(closed)return;setStatus('Reconectando señalización…');setTimeout(()=>{if(!closed&&!peer.destroyed&&peer.disconnected)peer.reconnect();},2000);});
  peer.on('error',err=>{
   if(err.type==='unavailable-id'){fatal('Esta sala ya está abierta en otra fuente OBS. Cierra la vista de prueba o la fuente duplicada.');return;}
   if(!overlay&&!ready){connecting=false;setStatus('Esperando OBS. Abre su enlace o comprueba la conexión de red.');reconnect();}
   if(overlay&&!everConnected)fatal('No se ha podido conectar la sala: '+err.type+'. Comprueba Internet y recarga la fuente.');
  });
 }catch(e){fatal('No se pudo abrir la conexión: '+e.message);}
 const tick=setInterval(()=>{if(overlay)broadcast();else if(latest&&ready)$('preview').contentWindow?.postMessage({type:'remote-state',state:latest},location.origin);},100);
 window.addEventListener('pagehide',()=>{closed=true;clearInterval(tick);clearTimeout(retry);send(link,{type:'audio',active:false,level:0});stream?.getTracks().forEach(t=>t.stop());context?.close();peer?.destroy();});
}
