// One original arm, continuously articulated over a clean body plate.
// Coordinates are in the shared 1024px canvas, never scaled independently.
export const SMOKE_SHOULDER=[342,595],SMOKE_FILTER=[220,356],SMOKE_EMBER=[148,327];
export function smokeArmPose(draw,now,motion={head:[0,0,0]}){
 const d=Math.max(0,Math.min(1,draw)),angle=d*65*Math.PI/180;
 const c=Math.cos(angle),s=Math.sin(angle);
 const transform=([x,y])=>[342+c*(x-342)-s*(y-595),595+s*(x-342)+c*(y-595)];
 const end=transform(SMOKE_FILTER),target=[498+(motion.head[0]||0),383+(motion.head[1]||0)];
 const offset=[(target[0]-end[0])*d,(target[1]-end[1])*d];
 const map=p=>{const q=transform(p);return [q[0]+offset[0],q[1]+offset[1]];};
 return {angle,offset,filter:map(SMOKE_FILTER),ember:map(SMOKE_EMBER)};
}
export class SmokeArm{
 constructor(original,plate){
  this.body=document.createElement('canvas');this.body.width=this.body.height=1024;
  const body=this.body.getContext('2d');body.drawImage(plate,0,0,1024,1024);
  // Generated content is needed only behind the smoking arm. Preserve the exact
  // original face, hat, glasses, torso and opposite hand for stable identity.
  body.save();body.beginPath();body.rect(354,0,670,1024);body.clip();body.drawImage(original,0,0,1024,1024);body.restore();
  this.layer=document.createElement('canvas');this.layer.width=this.layer.height=1024;
  const c=this.layer.getContext('2d');
  // Outer transparent contour and inner sleeve seam; no torso/face pixels in the piece.
  c.beginPath();c.moveTo(281,572);c.lineTo(345,581);c.bezierCurveTo(349,660,337,748,286,790);
  c.bezierCurveTo(245,828,149,805,89,792);c.bezierCurveTo(40,757,51,714,71,657);
  c.lineTo(106,550);c.lineTo(144,522);c.lineTo(125,477);c.lineTo(127,429);c.lineTo(168,370);
  c.lineTo(128,335);c.lineTo(140,311);c.lineTo(219,337);c.lineTo(245,329);c.lineTo(263,338);
  c.lineTo(256,356);c.lineTo(270,358);c.lineTo(273,377);c.lineTo(257,389);c.lineTo(271,434);
  c.lineTo(268,489);c.lineTo(246,525);c.lineTo(239,549);c.lineTo(257,553);c.closePath();
  c.clip();c.drawImage(original,0,0,1024,1024);
 }
 draw(c,puff,now,motion){
  const pose=smokeArmPose(puff.draw,now,motion);
  c.save();c.translate(342+pose.offset[0],595+pose.offset[1]);c.rotate(pose.angle);c.translate(-342,-595);c.drawImage(this.layer,0,0);c.restore();return pose;
 }
}
