export const clamp = (n, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : 0));
const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
export function faceParameters(result) {
  const p = result.faceLandmarks?.[0];
  if (!p?.[454]) return null;
  const blend = Object.fromEntries((result.faceBlendshapes?.[0]?.categories || []).map(c => [c.categoryName,c.score]));
  const left=p[33], right=p[263], nose=p[1], width=Math.max(.01, Math.hypot(right.x-left.x,right.y-left.y));
  return {yaw:clamp((nose.x-(left.x+right.x)/2)/width*3),
    pitch:clamp(((nose.y-(left.y+right.y)/2)/width-.45)*3),
    roll:clamp(Math.atan2(right.y-left.y,right.x-left.x)/.65),
    jaw:clamp(blend.jawOpen||0,0,1), blinkLeft:clamp(blend.eyeBlinkLeft||0,0,1),
    blinkRight:clamp(blend.eyeBlinkRight||0,0,1),
    brow:clamp((blend.browInnerUp||0)-(blend.browDownLeft||0)),
    smile:clamp(((blend.mouthSmileLeft||0)+(blend.mouthSmileRight||0))/2,0,1),hands:[]};
}
export function handParameters(result) {
  return (result.landmarks || []).map((p,i) => {
    const palm=Math.max(.01,distance(p[0],p[9]));
    const curls=[4,8,12,16,20].map((tip,j) => {
      const base=j===0?1:tip-3;
      const straight=distance(p[base],p[base+1])+distance(p[base+1],p[base+2])+distance(p[base+2],p[tip]);
      return clamp((1-distance(p[base],p[tip])/Math.max(.001,straight))*2.8,0,1);
    });
    return {side:result.handedness?.[i]?.[0]?.categoryName==='Left'?'left':'right',
      x:clamp((.5-p[0].x)*2),y:clamp((.75-p[0].y)*2),
      roll:clamp((p[9].x-p[0].x)/palm),curls};
  });
}
