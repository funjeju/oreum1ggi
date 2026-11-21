import { fullFlightRadiusMeters, launchPoints, landmarks, resolveFlightPoint } from './geo.js';
import { loadTerrain, makeWorld, localTextures, terrainRenderer, viewCamera, project, radians, clamp } from './renderer.js';
import { flightLanguage, flightWords } from './words.js';
import { photoViewer } from './panorama.js';
import { deviceTracker, sensorCopy } from './orientation.js';
export { launchPoints, resolveFlightPoint };

const base = new URL('.', import.meta.url);
const css = new URL('flight.css', base).href;
const photos = new Set(['ttarabi', 'siksan']);
const previewRadius = 450, fullRadius = fullFlightRadiusMeters;
const fullTurn = Math.PI * 2;
const distanceText = d => d >= 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d / 5) * 5 + ' m';
const icons = {
  back: 'M14 6l-6 6 6 6', mountain:'m2 19 7-12 5 8 3-5 5 9Z', flight:'M2 9l8 1 2-7 2 7 8-1-7 6-3 6-3-6Z',
  photo: 'M3 7h4l2-3h6l2 3h4v13H3z M15.5 13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0',
  compass:'m15.5 8.5-2 5-5 2 2-5Z M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  pin:'M19 10c0 6-7 11-7 11S5 16 5 10a7 7 0 0 1 14 0z M14 10a2 2 0 1 1-4 0 2 2 0 1 1 4 0',
  flag:'M6 21V4 M6 5c4-4 8 4 13 0v9c-4 4-9-4-13 0', right:'m9 5 7 7-7 7', left:'m15 5-7 7 7 7',
  play:'m8 5 11 7-11 7z',pause:'M8 5v14 M16 5v14', x:'m6 6 12 12 M18 6 6 18',
  save:'M6 4h12v17l-6-4-6 4z',check:'m4 12 5 5L20 6', info:'M12 11v6 M12 7v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
}
function icon(key) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'), path = document.createElementNS(ns, 'path');
  svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true');
  path.setAttribute('d',icons[key]); svg.append(path); return svg;
}
function control(title, glyph, action, className = '', text = true) {
  const el = element('button',className); el.type='button'; el.title=title; el.setAttribute('aria-label',title);
  el.append(icon(glyph)); if (text) el.append(element('span','',title)); el.addEventListener('click', action); return el;
}
function localName(p, lang) {
  const names = p.names || (typeof p.name === 'object' ? p.name : {});
  return names[lang] || names[lang === 'tw' ? 'zh-TW' : lang] || p.name?.ko || (typeof p.name === 'string' ? p.name : '') || p.title || p.id;
}
function categoryKey(place) {
  const k = String(place.category || place.kind || '').toLowerCase();
  return ({ food:'meal',restaurant:'meal',eat:'meal',drink:'cafe',coffee:'cafe',lodging:'stay',sleep:'stay',tour:'attraction',activity:'experience',beach:'sea' })[k] || k || 'attraction';
}
function visible(world, camera, spot) {
  const dx=spot.x-camera.x, dz=spot.z-camera.z, d=Math.hypot(dx,dz);
  const count=Math.min(70,Math.ceil(d/100));
  for(let i=1;i<count;i++) {
    const t=i/count;
    if(world.altitude(camera.x+dx*t,camera.z+dz*t)>camera.y+(spot.y-camera.y)*t+5) return false;
  }
  return true;
}
let checkpoints;
function eligibleCheckpoints() {
  if (!checkpoints) checkpoints=fetch(new URL('verified-summits.json',base)).then(r=>{
    if(!r.ok) throw Error(r.status); return r.json();
  }).catch(error=>{checkpoints=undefined;throw error;});
  return checkpoints;
}

export function mountFlight(container, options = {}) {
  if(!document.querySelector('link[data-oreum-flight]')) {
    const link=element('link');link.rel='stylesheet';link.href=css;link.dataset.oreumFlight='';document.head.append(link);
  }
  const lang=flightLanguage(options.locale), t=flightWords(lang), origin=resolveFlightPoint(options.oreum);
  const root=element('section','of-scene'); root.setAttribute('aria-label',t.terrain);root.tabIndex=0;
  container.replaceChildren(root);
  let active=true, frame=0, timer=0, observer, renderer, photo, photoRequested=false, touch=null, detach=()=>{};
  const previousFocus=document.activeElement;
  const cleanup=()=>{
    if(!active)return; active=false; cancelAnimationFrame(frame); clearTimeout(timer); observer?.disconnect();detach();photo?.dispose();renderer?.dispose();root.remove();
    if(previousFocus?.isConnected && !container.contains(previousFocus)) previousFocus.focus({preventScroll:true});
  };
  cleanup.setUnlocked=()=>{};
  cleanup.setSaved=()=>{};
  const quit=()=>{ if(options.onExit) options.onExit(); else cleanup(); };
  const back=control(t.back,'back',quit,'of-icon of-back',false);
  root.append(back);
  if(!origin) { root.append(element('p','of-error',t.unsupported)); root.focus({preventScroll:true});return cleanup; }
  const isReduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let worldCanvas=element('canvas','of-canvas');
  const sky=element('div','of-sky'), photograph=element('div','of-photo');
  photograph.setAttribute('role','img');photograph.setAttribute('aria-label',t.photoNote+' · '+localName(origin,lang));
  const viewport=element('div','of-viewport'), markers=element('div','of-markers'), avatar=element('img','of-pilot');
  avatar.alt='';avatar.src=new URL('wingsuit.webp',base).href;avatar.hidden=true;
  viewport.append(sky,worldCanvas,photograph,markers,avatar);
  const header=element('div','of-header'), sub=element('div','of-sub','JEJU  /  OREUM ATLAS'), title=element('h2','',localName(origin,lang));
  header.append(sub,title);
  const modeBar=element('div','of-modes');modeBar.setAttribute('role','group');modeBar.setAttribute('aria-label',t.legend);
  const heading=element('div','of-heading'), compass=element('div','of-compass'), meter=element('div','of-meter');
  heading.append(compass,meter);
  const sheet=element('section','of-sheet'); sheet.hidden=true;
  const toast=element('div','of-toast');toast.setAttribute('role','status');toast.hidden=true;
  const status=element('div','of-loading',t.loading);status.setAttribute('role','status');
  const foot=element('div','of-foot'), countText=element('div','of-range'), controls=element('div','of-controls');
  const credit=element('a','of-credit',t.credits+' ↗');credit.href=new URL('credits.html',base).href;credit.target='_blank';credit.rel='noopener noreferrer';
  const footer=element('div','of-bottomline');footer.append(countText,credit);
  foot.append(controls,footer);
  root.prepend(viewport);root.append(header,modeBar,heading,foot,sheet,toast,status);
  let world, points=[], localPlaces=[], checkpoint=null, unlocked=options.unlocked===true;
  let mode='terrain',playing=false,dirty=true, last=0,lastLabels=0,labelUpdate=true,lastHud='',pitch=-.065,yaw=origin.heading*radians;
  let x=0,z=0,photoYaw=0,photoPitch=0, width=1,height=1,altitude=0,placeSelection=null,selectedPeak=null;
  const saved=new Set(), keys=new Set(), allModes={};
  const radius=()=>unlocked?fullRadius:previewRadius;
  cleanup.setUnlocked=value=>{
    const next=value===true;
    if(!active || next===unlocked)return;
    unlocked=next;
    if(!unlocked){
      const length=Math.hypot(x,z);
      if(length>previewRadius){x*=previewRadius/length;z*=previewRadius/length;playing=false;}
    }
    renderControls();redraw();
  };
  cleanup.setSaved=ids=>{
    if(!active)return;
    saved.clear();
    for(const id of ids||[]){
      if(typeof id==='string')saved.add(id.startsWith('place:')?id.slice(6):id);
    }
    if(placeSelection && !sheet.hidden)placeSheet(placeSelection);
  };
  cleanup.setSaved(options.savedIds);
  const notify=(value)=>{ toast.textContent=value;toast.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{toast.hidden=true;},3600); };
  const deviceLabels=sensorCopy[lang];
  let lastReading=0;
  const tracker=deviceTracker(reading=>{
    if(!active||mode!=='terrain')return;
    const now=performance.now();
    if(now-lastReading<27)return;
    lastReading=now;yaw=reading.yaw;pitch=clamp(reading.pitch,-.8,.5);redraw(false);
  },state=>{
    if(!active)return;
    if(state==='unavailable')notify(deviceLabels[2]);
    renderControls();redraw();
  });
  const mobileControls=()=>navigator.maxTouchPoints>0||window.matchMedia('(pointer: coarse)').matches;
  function redraw(withLabels=true){ dirty=true;if(withLabels)labelUpdate=true;if(!frame && active)frame=requestAnimationFrame(tick); }
  worldCanvas.addEventListener('webglcontextlost',event=>{
    if(!active || !world || !renderer)return;
    event.preventDefault();const replacement=element('canvas','of-canvas');
    replacement.hidden=mode==='photo';worldCanvas.replaceWith(replacement);worldCanvas=replacement;
    renderer.dispose();renderer=terrainRenderer(replacement,world,[],true);redraw();
  },{once:true});
  function hideSheet(){sheet.hidden=true;placeSelection=null;selectedPeak=null;redraw();}
  function switchMode(next) {
    if(next==='photo'&&!photos.has(origin.id))return;
    tracker.stop();
    mode=next;playing=false;x=0;z=0;yaw=origin.heading*radians;pitch=mode==='glide'?-.29:-.065;
    photoYaw=0;photoPitch=origin.id==='ttarabi'?-.22:-.07;
    if(mode==='photo') {
      const url=new URL(origin.id+'-360.webp',base).href;
      photograph.style.backgroundImage='url("'+url+'")';
      markers.replaceChildren();
      if(!photoRequested){
        photoRequested=true;
        photoViewer(photograph,url).then(viewer=>{if(!active){viewer?.dispose();return;}photo=viewer;redraw();}).catch(()=>{});
      }
    }
    root.dataset.mode=mode;photograph.hidden=mode!=='photo';avatar.hidden=mode!=='glide';worldCanvas.hidden=mode==='photo';
    for(const [id,b] of Object.entries(allModes)) b.setAttribute('aria-pressed',String(id===mode));
    hideSheet();renderControls();redraw();
  }
  for(const [key, text, glyph] of [['terrain',t.terrain,'mountain'],['glide',t.glide,'flight'],['photo',t.photo,'photo']]) {
    if(key==='photo'&&!photos.has(origin.id))continue;
    allModes[key]=control(text,glyph,()=>switchMode(key),'of-mode');modeBar.append(allModes[key]);
  }
  function stepTurn(sign){tracker.stop();if(mode==='photo') photoYaw+=sign*.23;else yaw+=sign*.23;redraw();}
  function play(){ if(mode!=='glide' || !world)return; playing=!playing;renderControls();hideSheet();root.focus({preventScroll:true});redraw();}
  function renderControls(){
    const items=[];
    if(mode==='glide') {
      items.push(control(t.turnLeft,'left',()=>stepTurn(-1),'of-icon',false),control(playing?t.pause:t.start,playing?'pause':'play',play,'of-action of-primary'),control(t.turnRight,'right',()=>stepTurn(1),'of-icon',false));
    }else items.push(control(t.turnLeft,'left',()=>stepTurn(-1),'of-icon',false),control(mode==='photo'?t.photoHint:t.hint,'compass',()=>notify(mode==='photo'?t.photoHint:t.hint),'of-guide'),control(t.turnRight,'right',()=>stepTurn(1),'of-icon',false));
    if(mode==='terrain'&&mobileControls()){
      const toggle=control(tracker.state==='pending'?deviceLabels[3]:deviceLabels[0],'compass',()=>tracker.start(),'of-action of-sensor');
      toggle.setAttribute('aria-pressed',String(tracker.state!=='off'));items.push(toggle);
    }
    if(mode!=='photo')items.push(control(t.places,'pin',()=>openPlaces(),'of-action of-places'));
    controls.replaceChildren(...items);
    const text=mode==='photo'?t.photoNote:(unlocked?t.visited:t.preview)+'  ·  '+t.radius+' '+distanceText(radius());
    countText.replaceChildren(element('span','',text));
    if(!unlocked && checkpoint && options.onVerify && mode!=='photo') {
      const checkpointLabel=checkpoint.checkpointNames?.[lang] || checkpoint.checkpointName;
      const btn=element('button','of-verify',checkpointLabel+' · '+t.verify); btn.type='button';btn.onclick=async()=>{
        btn.disabled=true;
        try{const ok=await options.onVerify(origin.id); if(!active)return;if(ok===true){unlocked=true;renderControls();redraw();} else notify(t.checkFail);}
        catch{if(active)notify(t.checkFail);}finally{btn.disabled=false;}
      };countText.append(btn);
    }
  }
  function openSheet(titleText, subtitle=''){
    playing=false;renderControls();sheet.replaceChildren();sheet.hidden=false;root.dataset.sheet='open';
    const titleRow=element('div','of-sheet-head'); const body=element('div');
    if(subtitle)body.append(element('div','of-sheet-meta',subtitle));body.append(element('h3','',titleText));titleRow.append(body,control(t.close,'x',()=>{hideSheet();root.focus({preventScroll:true});},'of-icon',false));sheet.append(titleRow);sheet.querySelector('button')?.focus({preventScroll:true});
  }
  function lookAt(spot) {
    tracker.stop();
    if(mode==='photo')switchMode('terrain');
    const dx=spot.x-x,dz=spot.z-z; yaw=Math.atan2(dx,dz);
    pitch=clamp(Math.atan2(spot.y-altitude,Math.hypot(dx,dz)),-.65,.28);
    hideSheet();redraw();
  }
  function placeSheet(spot){
    placeSelection=spot;selectedPeak=null;
    const place=spot.item,key=categoryKey(place);openSheet(localName(place,lang),(t[key]||t.attraction)+'  ·  '+distanceText(spot.d));
    const address=typeof place.address==='string'?place.address:place.address?.[lang]||place.address?.ko;
    if(address)sheet.append(element('p','of-address',address));
    const row=element('div','of-sheet-actions');
    row.append(control(t.go,'compass',()=>lookAt(spot),'of-sheet-button'));
    if(options.onSave){
      const btn=control(saved.has(place.id)?t.saved:t.save,saved.has(place.id)?'check':'save',async()=>{
        btn.disabled=true;
        try {const result=await options.onSave(place);if(result===false)throw Error();saved.add(place.id);if(active && placeSelection===spot)placeSheet(spot);}
        catch{if(active)notify(t.saveFail);}finally{btn.disabled=saved.has(place.id);}
      },'of-sheet-button of-primary');btn.disabled=saved.has(place.id);row.append(btn);
    }
    sheet.append(row);
  }
  function openPlaces(){
    placeSelection=null;selectedPeak=null;openSheet(t.places,t.distance+' '+distanceText(fullRadius));
    const list=element('div','of-list');
    for(const spot of localPlaces){
      const button=element('button','of-place');button.type='button';
      const name=element('span');name.append(element('small','',t[categoryKey(spot.item)]||t.attraction),element('b','',localName(spot.item,lang)));
      button.append(name,element('span','of-km',distanceText(spot.d)),icon('right'));button.onclick=()=>placeSheet(spot);list.append(button);
    }
    if(!localPlaces.length)list.append(element('p','of-address',t.empty));
    sheet.append(list);
  }
  function showPeak(spot) {
    selectedPeak=spot;placeSelection=null;openSheet(localName(spot.item,lang),t.peak+'  ·  '+distanceText(spot.d));
    sheet.append(element('p','of-address',spot.item.lat.toFixed(4)+'° N  ·  '+spot.item.lon.toFixed(4)+'° E'));
    sheet.append(control(t.go,'compass',()=>lookAt(spot),'of-sheet-button'));
  }
  function drawMarkers(camera,view){
    markers.replaceChildren();
    if(mode==='photo')return;
    const used=[];
    const candidates=mode==='glide'?[...localPlaces.filter(p=>p.d<=fullRadius),...points]:points;
    const prioritized=[...candidates].sort((a,b)=>(a.item.id===origin.lookAt?-1:b.item.id===origin.lookAt?1:0) || a.d-b.d);
    for(const spot of prioritized) {
      const screen=project(camera,view,spot);
      if(!screen || screen.x<.06||screen.x>.94||screen.y<.18||screen.y>.83)continue;
      const lineClear=visible(world,camera,spot);
      // A crater label can fall behind the near rim. Preserve its geographic bearing and identify the occlusion.
      if(!lineClear && (spot.isPlace || spot.item.id!==origin.lookAt))continue;
      const pos=screen.x*width,ground=screen.y*height;
      const labelWidth=Math.min(171,Math.max(86,Array.from(localName(spot.item,lang)).length*(lang==='en'?8:11)+30));
      const labelX=clamp(pos,labelWidth/2+8,width-labelWidth/2-8);
      const labelY=ground-35;
      if(used.some(a=>Math.abs(a.x-labelX)<(a.w+labelWidth)*.5+8 && Math.abs(a.y-labelY)<48))continue;
      used.push({x:labelX,y:labelY,w:labelWidth});
      const pin=element('button','of-marker'+(spot.isPlace?' of-poi':''));pin.type='button';
      const behind={ko:'능선 너머',en:'Beyond ridge',ja:'稜線の向こう',zh:'山脊后方',tw:'山脊後方'};
      const prefix=!lineClear?behind[lang]:spot.isPlace?t[categoryKey(spot.item)]||t.attraction:'';
      const info=element('span','of-marker-info');info.append(element('b','',localName(spot.item,lang)),element('small','',(prefix?prefix+' · ':'')+distanceText(Math.hypot(spot.x-x,spot.z-z))));
      pin.append(info);pin.style.left=labelX+'px';pin.style.top=labelY+'px';pin.style.setProperty('--stem-x',(pos-labelX)+'px');
      pin.onclick=()=>spot.isPlace?placeSheet(spot):showPeak(spot);markers.append(pin);
      if(used.length>= (width<600?3:6))break;
    }
  }
  function move(dt,sign) {
    const nextX=x+Math.sin(yaw)*dt*sign*58,nextZ=z+Math.cos(yaw)*dt*sign*58;
    const range=Math.hypot(nextX,nextZ);
    if(range>radius()){
      const factor=radius()/range;x=nextX*factor;z=nextZ*factor;
      if(playing || !keys.has('edge')){playing=false;keys.add('edge');renderControls();notify(t.edge);}
    }else{x=nextX;z=nextZ;keys.delete('edge');}
  }
  function tick(now) {
    frame=0;if(!active)return;
    if(!world || !renderer)return;
    const dt=Math.min((now-last)/1000||0,.065);last=now;
    let moved=false;
    if(keys.has('left')||keys.has('right')){
      const delta=((keys.has('right')?1:0)-(keys.has('left')?1:0))*dt*1.25;
      if(mode==='photo')photoYaw+=delta;else yaw+=delta;moved=true;
    }
    if(mode==='glide' && (playing || keys.has('up') || keys.has('down'))){
      move(dt,keys.has('down')?-1:1);moved=true;
    }else if(mode!=='glide' && (keys.has('up') || keys.has('down'))){
      const p=((keys.has('up')?1:0)-(keys.has('down')?1:0))*dt*.7;
      if(mode==='photo')photoPitch=clamp(photoPitch+p,-.8,.7);else pitch=clamp(pitch+p,-.9,.6);moved=true;
    }
    if(dirty || moved) {
      if (mode==='photo') {
        if(photo)photo.draw(width,height,photoYaw,photoPitch);
        const tile=Math.max(width*2.7,height*3.2), texH=tile/2;
        photograph.style.backgroundSize=tile+'px '+texH+'px';
        photograph.style.backgroundPosition=(width*.5-tile*(.5+photoYaw/fullTurn))+'px '+(height*.5-texH*(.5-photoPitch/Math.PI))+'px';
        compass.textContent='360°';meter.textContent=t.photo;
      } else {
        altitude=world.altitude(x,z)+(mode==='glide'?195:7);
        const camera={x,z,y:altitude,yaw,pitch}, view=viewCamera(camera,width,height);
        // The sky texture is decorative. Peak labels use world geometry and the same camera matrix as the DEM.
        const skyW=Math.max(width*2.4,height*3);
        sky.style.backgroundSize=skyW+'px '+(skyW/2)+'px';
        sky.style.backgroundPosition=(width*.5-skyW*(.5+yaw/fullTurn))+'px '+(height*.5-skyW*.25+height*Math.tan(pitch)/(2*view.tanV))+'px';
        renderer.draw(camera,view,width,height);
        if(labelUpdate||now-lastLabels>135){drawMarkers(camera,view);lastLabels=now;labelUpdate=false;}
        const deg=((Math.round(yaw/radians)%360)+360)%360;
        const hud=['N','NE','E','SE','S','SW','W','NW'][Math.round(deg/45)%8]+'  '+String(deg).padStart(3,'0')+'°';
        if(hud!==lastHud || compass.textContent!==hud){compass.textContent=hud;lastHud=hud;}
        meter.textContent=mode==='glide'?t.distance+' '+distanceText(Math.hypot(x,z)):tracker.state==='on'?deviceLabels[1]:t.alt+' '+Math.round(world.altitude(0,0))+' m';
      }
      dirty=false;
    }
    if(playing||[...keys].some(k=>k!=='edge')||dirty)frame=requestAnimationFrame(tick);
  }
  const keymap={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down'};
  const keydown=event=>{
    if(event.key==='Escape'){event.preventDefault();if(!sheet.hidden)hideSheet();else quit();return;}
    if(!sheet.hidden) return;
    if(event.code==='Space' && event.target===root && mode==='glide'){event.preventDefault();if(!event.repeat)play();return;}
    const key=keymap[event.key]||keymap[event.key.toLowerCase()];
    if(key){tracker.stop();event.preventDefault();keys.add(key);redraw();}
  };
  const keyup=event=>{const key=keymap[event.key]||keymap[event.key.toLowerCase()];if(key)keys.delete(key);};
  const stopInput=()=>{keys.clear();touch=null;if(playing){playing=false;renderControls();redraw();}};
  root.addEventListener('keydown',keydown);root.addEventListener('keyup',keyup);
  viewport.addEventListener('pointerdown',event=>{
    if(event.target.closest('button')||event.button!==0)return;
    tracker.stop();
    touch={id:event.pointerId,x:event.clientX,y:event.clientY};viewport.setPointerCapture(event.pointerId);root.focus({preventScroll:true});
  });
  viewport.addEventListener('pointermove',event=>{
    if(!touch || touch.id!==event.pointerId)return;
    const dx=(event.clientX-touch.x)/Math.max(300,width)*2.7,dy=(event.clientY-touch.y)/Math.max(260,height)*1.6;
    if(mode==='photo'){photoYaw-=dx;photoPitch=clamp(photoPitch+dy,-.8,.7);}
    else{yaw-=dx;pitch=clamp(pitch+dy,-.9,.6);}touch.x=event.clientX;touch.y=event.clientY;redraw();
  });
  const endPointer=()=>{touch=null;};
  viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);
  const onVisibility=()=>{if(document.hidden){tracker.stop();stopInput();}};
  window.addEventListener('blur',stopInput);document.addEventListener('visibilitychange',onVisibility);
  const onMotion=()=>{if(isReduced.matches)stopInput();};isReduced.addEventListener?.('change',onMotion);
  detach=()=>{tracker.stop();window.removeEventListener('blur',stopInput);document.removeEventListener('visibilitychange',onVisibility);isReduced.removeEventListener?.('change',onMotion);};
  function resize(){width=Math.max(root.clientWidth,1);height=Math.max(root.clientHeight,1);redraw();}
  observer=new ResizeObserver(resize);observer.observe(root);
  const startMode=options.initialMode==='glide'?'glide':options.initialMode==='photo'&&photos.has(origin.id)?'photo':'terrain';
  switchMode(startMode);root.focus({preventScroll:true});resize();
  eligibleCheckpoints().then(items=>{if(active){checkpoint=items.find(p=>p.id===origin.id&&p.checkInEnabled);renderControls();}}).catch(()=>{});
  async function init(){
    try{
      const data=await loadTerrain(); if(!active)return;
      world=makeWorld(data,origin);
      const tiles=await localTextures(world);if(!active)return;
      renderer=terrainRenderer(worldCanvas,world,tiles);
      const spot=(item,isPlace=false)=>{
        const lat=Number(item.lat??item.latitude),lon=Number(item.lon??item.lng??item.longitude);
        const p=world.loc(lat,lon);
        return {...p,y:world.altitude(p.x,p.z)+(isPlace?8:5),d:Math.hypot(p.x,p.z),item,isPlace};
      };
      points=[...launchPoints,...landmarks].filter(p=>p.id!==origin.id).map(p=>spot(p)).filter(p=>p.d<54000);
      localPlaces=(options.places||[]).filter(p=>p && (p.lat??p.latitude)!=null && (p.lon??p.lng??p.longitude)!=null)
        .map(p=>spot(p,true)).filter(p=>Number.isFinite(p.d)&&p.d<=fullRadius).sort((a,b)=>a.d-b.d);
      status.hidden=true;redraw();
    }catch{
      if(!active)return;status.replaceChildren(element('span','',t.err),control(t.retry,'compass',()=>{status.textContent=t.loading;init();},'of-action'));
    }
  }
  init();return cleanup;
}
