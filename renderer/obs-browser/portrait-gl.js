// Registered original artwork, with bounded local motion. No separate scaled body pieces.
const vertex=`attribute vec2 p; varying vec2 uv; void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv; uniform sampler2D base,mouth,mouthOpen,eyes,expressionFace; uniform float rage,drained; uniform sampler2D drainedFace;
uniform vec2 eyeOffset,mouthOffset,expression; uniform vec4 character; uniform float smokeTime,faceRoll,puff;
uniform vec4 leftHand,rightHand; uniform vec4 mouthRect,leftRect,rightRect,headRegion; uniform vec2 headPivot; uniform float custom,comic,powered,clockTime;
uniform vec3 registration; uniform vec3 head; uniform vec4 hands; uniform float fingers[10];
uniform float breath,jaw,blinkLeft,blinkRight,authored,robe;
float region(vec2 p,vec4 r){return 1.-smoothstep(.45,1.,length((p-r.xy)/r.zw));}
// Feathered oval patches avoid rectangular skin seams. Eye rim stays in the base.
float oval(vec2 p,vec4 r){float d=length((p-r.xy-r.zw*.5)/(r.zw*.5));return 1.-smoothstep(.65,1.,d);}
float eyeMask(vec2 p,vec4 r,vec4 original){
 float d=length((p-r.xy-r.zw*.5)/(r.zw*.5));
 vec3 rgb=original.rgb/max(original.a,.001);
 float ink=1.-smoothstep(.12,.28,max(rgb.r,max(rgb.g,rgb.b)));
 return (1.-smoothstep(.78,1.,d))*(1.-ink*smoothstep(.50,.75,d));
}
// Keep the moustache from the resting face. The lip boundary follows its curved edge.
float lipTop(vec2 p,vec4 r){float nx=(p.x-r.x-r.z*.5)/(r.z*.5);return r.y+r.w*(.16+.14*nx*nx);}
float lipMask(vec2 p,vec4 r){return oval(p,r)*smoothstep(lipTop(p,r),lipTop(p,r)+4.,p.y);}
vec2 mouthSample(vec2 p,vec4 r){
 if(jaw>.1&&jaw<.75){float top=lipTop(p,r)+4.;p.y=top+max(0.,p.y-top)*1.65;}
 return p/1024.;
}
float mouthMask(vec2 p,vec4 r){return lipMask(p,r)*oval(mouthSample(p,r)*1024.,r);}
void main(){
 vec2 q=(uv*1024.-registration.yz)/registration.x;
 if(q.x<0.||q.y<0.||q.x>1024.||q.y>1024.){gl_FragColor=vec4(0.);return;}
 if(authored<.5&&custom<.5){
  // Chair lies behind the right silhouette: weight falls to zero before its visible back.
  float rightEdge=q.y<420.?820.:mix(714.,665.,clamp((q.y-430.)/120.,0.,1.));
  float h=(1.-smoothstep(520.,620.,q.y))*(1.-smoothstep(rightEdge-12.,rightEdge,q.x))*smoothstep(300.,335.,q.x);
  vec2 delta=q-vec2(558.,550.);float a=-head.z*h;
  q=vec2(558.,550.)+mat2(cos(a),sin(a),-sin(a),cos(a))*delta-head.xy*h;
  q.y-=breath*region(q,vec4(565.,764.,235.,145.));
  q-=hands.xy*step(smokeTime,0.)*region(q,vec4(180.,821.,139.,77.));
  q-=hands.zw*region(q,vec4(727.,888.,136.,80.));
  q.y-=fingers[0]*region(q,vec4(107.,870.,15.,23.));
  q.y-=fingers[1]*region(q,vec4(135.,872.,14.,25.));
  q.y-=fingers[2]*region(q,vec4(163.,872.,14.,25.));
  q.y-=fingers[3]*region(q,vec4(194.,869.,15.,25.));
  q.y-=fingers[4]*region(q,vec4(244.,855.,21.,19.));
  q.y-=fingers[5]*region(q,vec4(614.,901.,18.,23.));
  q.y-=fingers[6]*region(q,vec4(649.,934.,18.,26.));
  q.y-=fingers[7]*region(q,vec4(686.,951.,17.,23.));
  q.y-=fingers[8]*region(q,vec4(731.,950.,18.,23.));
  q.y-=fingers[9]*region(q,vec4(770.,929.,17.,23.));
 }
 if(authored<.5&&custom<.5){
  vec2 f=q-eyeOffset;
  q.y+=expression.x*2.5*max(region(f,vec4(425.,325.,41.,19.)),region(f,vec4(561.,315.,47.,18.)));
  q.x-=expression.y*.6*max(region(f,vec4(434.,374.,23.,16.)),region(f,vec4(553.,362.,27.,18.)));
 }
 if(authored<.5&&custom<.5){
  vec2 e=q-eyeOffset;
  float eyesArea=max(region(e,vec4(434.,374.,22.,13.)),region(e,vec4(553.,362.,29.,16.)));
  float centerY=e.x<480.?374.:362.;
  q.y+=(e.y-centerY)*character.x*.75*eyesArea;
  q.y-=character.w*eyesArea;
  q.y+=character.y*4.*region(q-mouthOffset,vec4(500.,472.,19.,14.));
  q.y+=character.z*3.*region(e,vec4(561.,315.,47.,18.));
  if(smokeTime>0.)q.x+=sin(q.y*.026-smokeTime*1.4)*3.*region(q,vec4(175.,375.,100.,140.));
 }
 if(custom>.5){
  float weight=region(q,headRegion);vec2 delta=q-headPivot;float a=-head.z*weight;
  q=headPivot+mat2(cos(a),sin(a),-sin(a),cos(a))*delta-head.xy*weight;
  q.y-=breath*region(q,vec4(570.,750.,260.,190.));
  if(comic>.5){
   float bob=sin(clockTime*7.)*4.;q.y-=bob*region(q,vec4(500.,790.,150.,115.));
   vec2 center=mouthRect.xy+mouthRect.zw*.5;
   q.y+=(q.y-center.y)*(sin(clockTime*14.)*.12)*region(q,vec4(center,mouthRect.zw*.7));
  }else{
   vec2 lc=leftRect.xy+leftRect.zw*.5,rc=rightRect.xy+rightRect.zw*.5;
   q.x-=expression.y*.7*max(region(q,vec4(lc,leftRect.zw*.45)),region(q,vec4(rc,rightRect.zw*.45)));
   // Brows sit above the black rims, mouth corner stays inside its registered patch.
   q.y+=(expression.x*3.+character.z*2.)*region(q,vec4(lc.x,lc.y-leftRect.w*.85,leftRect.z*.65,14.));
   q.y+=(expression.x*3.-character.z*2.)*region(q,vec4(rc.x,rc.y-rightRect.w*.85,rightRect.z*.65,14.));
   q.y+=character.y*3.5*region(q,vec4(mouthRect.x+mouthRect.z*.78,mouthRect.y+mouthRect.w*.53,22.,14.));
   // Custom seated portraits keep the same continuous hand life as the base idle.
   if(smokeTime<=0.){q-=hands.xy*region(q,leftHand);q-=hands.zw*region(q,rightHand);}

  }
  if(smokeTime>0.)q.y-=hands.w*.5*region(q,vec4(550.,824.,145.,90.));
 }
 vec4 color=texture2D(base,q/1024.);
 // Soft face-only mask: preserve silhouette, hair, hat and glasses registration.
 if(drained>.001){float mask=oval(q,vec4(369.,290.,312.,263.));
  color=mix(color,texture2D(drainedFace,q/1024.),mask*drained);
 }
 if(authored<.5&&custom<.5){
  vec2 mq=q-mouthOffset,eq=q-eyeOffset;
  mat2 facialRotation=mat2(cos(faceRoll),sin(faceRoll),-sin(faceRoll),cos(faceRoll));
  eq=vec2(494.,374.)+facialRotation*(eq-vec2(494.,374.));
  mq=vec2(465.,476.)+facialRotation*(mq-vec2(465.,476.));
  // Discrete closed / half / open. Only the spatial skin boundary is feathered.
  if(jaw>.1)color=mix(color,texture2D(mouth,mouthSample(mq,vec4(395.,425.,145.,100.))),mouthMask(mq,vec4(395.,425.,145.,100.)));
  // Swap only the registered eye interior; preserve the base glasses.
  float e=max(eyeMask(eq,vec4(403.,354.,60.,42.),color)*blinkLeft,eyeMask(eq,vec4(507.,344.,88.,43.),color)*blinkRight);
  color=mix(color,texture2D(eyes,eq/1024.),e);
 }
 if(custom>.5&&comic<.5){
  if(jaw>.1)color=mix(color,texture2D(mouthOpen,mouthSample(q,mouthRect)),mouthMask(q,mouthRect));
  float eyelids=max(eyeMask(q,leftRect,color)*blinkLeft,eyeMask(q,rightRect,color)*blinkRight);
  if(powered>.5){
   // Fully replace the luminous lens interior on a blink; feathering white onto
   // closed skin would leave a bright crescent. Black frames remain untouched.
   vec3 rgb=color.rgb/max(color.a,.001);float white=smoothstep(.55,.85,min(rgb.r,min(rgb.g,rgb.b)));
   float l=step(leftRect.x,q.x)*step(q.x,leftRect.x+leftRect.z)*step(leftRect.y,q.y)*step(q.y,leftRect.y+leftRect.w);
   float r=step(rightRect.x,q.x)*step(q.x,rightRect.x+rightRect.z)*step(rightRect.y,q.y)*step(q.y,rightRect.y+rightRect.w);
   eyelids=max(eyelids,white*max(l*blinkLeft,r*blinkRight));
  }
  color=mix(color,texture2D(eyes,q/1024.),eyelids);
 }
 if(rage>.001){
  vec4 angry=texture2D(expressionFace,q/1024.);
  float brows=max(oval(q,vec4(379.,293.,102.,49.)),oval(q,vec4(480.,284.,131.,55.)));
  float iris=max(eyeMask(q,vec4(403.,354.,60.,42.),color)*(1.-blinkLeft),eyeMask(q,vec4(507.,344.,88.,43.),color)*(1.-blinkRight));
  float lips=oval(q,vec4(395.,420.,165.,125.))*min(1.,jaw);
  color=mix(color,angry,max(brows,iris)*rage);
  if(rage>=.5&&jaw>.5)color=mix(color,angry,lips);
 }
 // Select saturated golden cloth below the neck, preserving skin, hat and navy embroidery.
 vec3 raw=color.rgb/max(color.a,.001);
 float gold=smoothstep(.30,.49,raw.g-raw.b)*(1.-smoothstep(.29,.43,raw.r-raw.g))*(1.-smoothstep(.24,.38,raw.b));
 float garment=smoothstep(550.,605.,q.y);
 // Golden/navy robe stays golden/navy. Charcoal scorch replaces the old red tint.
 float soot=smoothstep(.18,.72,sin(q.x*.035+sin(q.y*.027)*2.)*sin(q.y*.041)*.5+.5);
 vec3 scorched=mix(raw*.76,vec3(.09,.065,.045),soot*.82);
 color.rgb=mix(raw,scorched,gold*garment*robe)*color.a;
 gl_FragColor=color;
}`;
export class PortraitGL{
 constructor(canvas){
  this.gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:false,preserveDrawingBuffer:true,depth:false,stencil:false});this.ready=false;this.cache=new Map();
  if(!this.gl)return;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;});
  canvas.addEventListener('webglcontextrestored',()=>{this.cache.clear();this.setup();});
  try{this.setup();}catch(error){console.error(error);}
 }
 setup(){const g=this.gl;
  const shader=(type,src)=>{const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s;};
  const v=shader(g.VERTEX_SHADER,vertex),f=shader(g.FRAGMENT_SHADER,fragment),p=this.program=g.createProgram();g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));g.useProgram(p);
  const b=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,b);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),g.STATIC_DRAW);const at=g.getAttribLocation(p,'p');g.enableVertexAttribArray(at);g.vertexAttribPointer(at,2,g.FLOAT,false,0,0);
  this.u=Object.fromEntries(['drained','drainedFace','rage','expressionFace','powered','leftHand','rightHand','registration','base','mouth','mouthOpen','eyes','head','hands','fingers[0]','breath','jaw','blinkLeft','blinkRight','authored','robe','eyeOffset','mouthOffset','expression','character','smokeTime','puff','faceRoll','mouthRect','leftRect','rightRect','headRegion','headPivot','custom','comic','clockTime'].map(k=>[k,g.getUniformLocation(p,k)]));g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);g.clearColor(0,0,0,0);this.ready=true;
 }
 texture(img,unit){const g=this.gl;g.activeTexture(g.TEXTURE0+unit);let t=this.cache.get(img);
  if(!t){t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,img);this.cache.set(img,t);}
  g.bindTexture(g.TEXTURE_2D,t);
 }
 draw(base,mouth,mouthOpen,eyes,m,face,robe=0){if(!this.ready)return false;const g=this.gl;
  g.uniform4fv(this.u.leftHand,face.layout?.leftHand||[180,821,139,77]);g.uniform4fv(this.u.rightHand,face.layout?.rightHand||[727,888,136,80]);
  g.uniform3fv(this.u.registration,face.layout?.registration||[1,0,0]);
  this.texture(face.drainedImage||base,5);g.uniform1i(this.u.drainedFace,5);g.uniform1f(this.u.drained,face.drained||0);
  this.texture(face.expressionImage||base,4);g.uniform1i(this.u.expressionFace,4);g.uniform1f(this.u.rage,face.rage||0);
  this.texture(base,0);this.texture(mouth,1);this.texture(eyes,2);this.texture(mouthOpen,3);
  // Bound GPU memory; retain all three textures used in this draw.
  for(const [image,t] of this.cache){if(this.cache.size<=7)break;if([base,mouth,mouthOpen,eyes,face.expressionImage,face.drainedImage].includes(image))continue;g.deleteTexture(t);this.cache.delete(image);}
  g.uniform1f(this.u.powered,face.customKind==='god'?1:0);g.uniform1f(this.u.puff,face.puff||0);const layout=face.layout;g.uniform1f(this.u.custom,layout&&face.customKind!=='tilt'?1:0);g.uniform1f(this.u.comic,face.customKind==='laugh'?1:0);g.uniform1f(this.u.clockTime,face.time/1000||0);
  g.uniform4fv(this.u.mouthRect,layout?.mouth||[395,425,145,100]);g.uniform4fv(this.u.leftRect,layout?.left||[403,354,60,42]);g.uniform4fv(this.u.rightRect,layout?.right||[507,344,88,43]);g.uniform4fv(this.u.headRegion,layout?.head||[558,300,240,280]);g.uniform2fv(this.u.headPivot,layout?.pivot||[558,550]);
  g.uniform1i(this.u.base,0);g.uniform1i(this.u.mouth,1);g.uniform1i(this.u.eyes,2);g.uniform1i(this.u.mouthOpen,3);g.uniform1f(this.u.robe,robe);g.uniform2fv(this.u.eyeOffset,face.angry?[-25,40]:face.smoking?[5,10]:[0,0]);g.uniform2fv(this.u.mouthOffset,face.angry?[-1,26]:face.smoking?[8,10]:[0,0]);g.uniform2f(this.u.expression,face.brow||0,face.gaze||0);g.uniform4f(this.u.character,face.squint||0,face.smirk||0,face.asymmetry||0,face.gazeY||0);g.uniform1f(this.u.faceRoll,face.angry?.09:0);g.uniform1f(this.u.smokeTime,face.customKind==='smoke'?face.time/1000:0);g.uniform3fv(this.u.head,m.head);g.uniform4fv(this.u.hands,m.hands.flat());g.uniform1fv(this.u['fingers[0]'],m.fingers);g.uniform1f(this.u.breath,m.breath);g.uniform1f(this.u.authored,m.authored?1:0);g.uniform1f(this.u.jaw,face.jaw);g.uniform1f(this.u.blinkLeft,face.left);g.uniform1f(this.u.blinkRight,face.right);g.viewport(0,0,1024,1024);g.clear(g.COLOR_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,6);return true;
 }
}
