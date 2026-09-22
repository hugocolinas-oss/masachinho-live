import {mkdir,copyFile,readFile} from 'node:fs/promises';import path from 'node:path';
const from=path.resolve('../vtuber'),to=path.resolve('renderer');const cfg=JSON.parse(await readFile(path.join(from,'obs-browser/config.json')));
const assets=[cfg.idleFrame,cfg.blinkFrame,...cfg.talkingFrames,...Object.values(cfg.expressionAssets),...Object.values(cfg.modeAssets).flatMap(m=>['base','talk','blink','body'].map(k=>m[k]).filter(Boolean))];
const files=[...assets,'config/studio.json',...['config.json','puppet.html','puppet.js','identity-rig.js','smoke-arm.js','viewport.js','face-patches.js','puppet-model.js','portrait-model.js','portrait-gl.js','tilt-effects.js','tracking-math.js','microphone-signal.js','mic-worklet.js'].map(f=>'obs-browser/'+f)];
for(const f of new Set(files)){await mkdir(path.dirname(path.join(to,f)),{recursive:true});await copyFile(path.join(from,f),path.join(to,f));}console.log('Renderer synchronized.');
