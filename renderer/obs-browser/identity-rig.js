// Reactions share the registered base illustration instead of swapping anatomy.
export function consistentPortrait(selected,config){
 if(!['rage','headbutt','shouting','sleep','exhausted'].includes(selected.name))return selected;
 return {...selected,path:config.idleFrame,authored:false,coherent:true};
}
export function reactionPose(pose,selected,state,config,wall){
 if(!selected.coherent)return 0;
 const name=selected.name;
 if(name==='shouting'){pose.jaw=Math.max(pose.jaw,.9);pose.brow=-1;return 1;}
 const spec=config.animations[name],duration=spec.frames.reduce((n,f)=>n+f.duration,0);
 const age=Math.max(0,wall-(state.command?.startedAt??wall));
 const t=(state.command?.repeat?age%duration:Math.min(age,duration))/duration;
 const edge=Math.min(1,t/.12,(1-t)/.16),weight=Math.max(0,edge*edge*(3-2*edge));
 if(name==='rage'||name==='headbutt'){
  const nod=Math.sin(Math.PI*Math.max(0,Math.min(1,(t-.32)/.43)));
  pose.head.y+=nod*26*weight;pose.head.rotation+=Math.sin(t*Math.PI*8)*2*weight;
  pose.jaw=Math.max(pose.jaw,(t<.4?.95:.45)*weight);pose.brow=-weight;
  pose.body.y+=nod*3*weight;
 }
 if(name==='exhausted'){pose.brow=-.65*weight;pose.head.y+=5*weight;}
 return weight;
}
