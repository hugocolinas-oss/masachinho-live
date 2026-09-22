const cache=new Map();
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function patchWeight(x,y,w,h,eye=false,brightness=1){
 const d=Math.hypot((x-w/2)/(w/2),(y-h/2)/(h/2));
 return (1-smooth(eye?.78:.65,1,d))*(eye?1-(1-smooth(.12,.28,brightness))*smooth(.5,.75,d):1);
}
export function lipTop(x,w,h){const nx=(x-w/2)/(w/2);return h*(.16+.14*nx*nx);}
export function lipWeight(x,y,w,h){return patchWeight(x,y,w,h)*smooth(lipTop(x,w,h),lipTop(x,w,h)+4,y);}
export function lipSampleY(x,y,w,h,half){const top=lipTop(x,w,h)+4;return half?top+Math.max(0,y-top)*1.65:y;}
export function facePatch(source,base,rect,eye,half=false,lips=false){
 const key=[source.src,base.src,rect.join(','),eye,half,lips].join('|');if(cache.has(key))return cache.get(key);
 const [x,y,w,h]=rect,c=document.createElement('canvas'),b=document.createElement('canvas');c.width=b.width=w;c.height=b.height=h;
 const ctx=c.getContext('2d'),bg=b.getContext('2d');
 for(const [context,img] of [[ctx,source],[bg,base]])context.drawImage(img,x/1024*img.width,y/1024*img.height,w/1024*img.width,h/1024*img.height,0,0,w,h);
 if(half&&lips){
  // Per-column sampling follows the lip arch, not a scaled rectangle of facial skin.
  ctx.clearRect(0,0,w,h);
  for(let i=0;i<w;i++){
   const top=lipTop(i+.5,w,h)+4;
   ctx.drawImage(source,(x+i)/1024*source.width,(y+top)/1024*source.height,source.width/1024,(h-top)*1.65/1024*source.height,i,top,1,h-top);
  }
 }
 const pixels=ctx.getImageData(0,0,w,h),original=bg.getImageData(0,0,w,h);
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const n=(j*w+i)*4;pixels.data[n+3]*=lips?lipWeight(i+.5,j+.5,w,h)*patchWeight(i+.5,lipSampleY(i+.5,j+.5,w,h,half),w,h):patchWeight(i+.5,j+.5,w,h,eye,Math.max(...original.data.subarray(n,n+3))/255);}
 ctx.putImageData(pixels,0,0);if(cache.size>24)cache.delete(cache.keys().next().value);cache.set(key,c);return c;
}
