export function fitStage(width,height,baseWidth=1920,baseHeight=1080,padding=0){
 const scale=Math.max(0,Math.min((width-padding*2)/baseWidth,(height-padding*2)/baseHeight));
 return {scale,x:Math.max(0,(width-baseWidth*scale)/2),y:Math.max(0,(height-baseHeight*scale)/2)};
}
export function mountStage(stage,baseWidth,baseHeight,padding=0){
 const viewport=stage.parentElement;
 const resize=()=>{const rect=viewport.getBoundingClientRect(),v=window.visualViewport;
  const width=Math.min(rect.width,v?.width??rect.width),height=Math.min(rect.height,v?.height??rect.height);
  const f=fitStage(width,height,baseWidth,baseHeight,padding);
  stage.style.transform=`translate(${f.x}px,${f.y}px) scale(${f.scale})`;
 };
 const observer=new ResizeObserver(resize);observer.observe(viewport);window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);resize();
 return ()=>{observer.disconnect();window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);};
}
