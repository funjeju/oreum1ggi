"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import catalog from "../../app-data/catalog.json";
import { resolveFlightPoint, fullFlightRadiusMeters } from "../../public/flight/geo.js";
import checkpoints from "../../public/flight/verified-summits.json";
import css from "./Explore.module.css";

const { areas, routes, places } = catalog;
const checkpointById = new Map(checkpoints.map(cp=>[cp.id,cp]));
const oreums = catalog.oreums.map(item=>{
  const flight=resolveFlightPoint(item);
  return flight?{...item,flight,names:flight.names,lat:item.lat??flight.lat,lon:item.lon??flight.lon}:item;
});
const languages = ["ko", "en", "ja", "zh", "tw"];
const copy = {
  unlocked: ["방문한 오름의 비행 권역", "Flight zones unlocked", "訪問済みの飛行エリア", "已解锁飞行区", "已解鎖飛行區"],
  mapTitle: ["제주 동부 지도", "Eastern Jeju map", "済州東部マップ", "济州东部地图", "濟州東部地圖"],
  mapSub: ["오름과 마을을 지도에서 골라보세요.", "Find the hills and villages you want to visit.", "オルムと村を地図で探しましょう。", "在地图上寻找想去的山丘与村落。", "在地圖上尋找想去的山丘與村落。"],
  placesTitle: ["마을에서 갈 곳", "Places in the village", "村で立ち寄る場所", "村里的好去处", "村裡的好去處"],
  placesSub: ["오름에서 내려와 먹고, 쉬고, 머물 곳을 찾아보세요.", "Find a meal, a coffee or a place to stay after your walk.", "オルムを下りたら、村の食卓やカフェ、宿へ。", "下山后，寻一家餐馆、咖啡馆或旅宿。", "下山後，尋一家餐館、咖啡館或旅宿。"],
  tripsTitle: ["내 여행", "My trip", "私の旅", "我的旅行", "我的旅行"],
  tripsSub: ["마음에 담아둔 코스와 장소, 다녀온 오름을 한곳에서.", "Your saved routes, places and visited hills.", "保存したコースやスポット、訪れたオルム。", "收藏的路线和地点，以及到访过的山丘。", "收藏的路線和地點，以及到訪過的山丘。"],
  all: ["전체", "All", "すべて", "全部", "全部"], areas: ["지역", "Area", "エリア", "区域", "地區"],
  allEast: ["동부 전체", "All eastern Jeju", "東部全域", "东部全域", "東部全域"],
  oreums: ["오름", "Oreums", "オルム", "山丘", "山丘"],
  routes: ["마을 코스", "Village routes", "村のコース", "村庄路线", "村落路線"],
  places: ["여행 장소", "Places", "スポット", "旅行地点", "旅行地點"],
  saved: ["저장한 여행", "Saved", "保存済み", "已收藏", "已收藏"],
  visited: ["다녀온 오름", "Visited hills", "訪れたオルム", "到访山丘", "到訪山丘"],
  allPlaces: ["모든 장소", "All places", "全スポット", "所有地点", "所有地點"],
  food: ["오름한끼", "Eat", "ごはん", "当地美食", "在地美食"],
  cafe: ["오름한잔", "Drink", "カフェ", "咖啡茶饮", "咖啡茶飲"],
  stay: ["오름푹잠", "Stay", "宿", "住宿", "住宿"],
  experience: ["마을체험", "Experiences", "村の体験", "乡村体验", "農村體驗"],
  sight: ["관광·바다", "Sights & sea", "名所・海", "景点与海岸", "景點與海岸"],
  search: ["검색", "Search", "検索", "搜索", "搜尋"],
  mapQuery: ["오름 이름, 마을 또는 장소 검색", "Search hills, villages or places", "オルム・村・スポットを検索", "搜索山丘、村庄或地点", "搜尋山丘、村落或地點"],
  placesQuery: ["가게 이름, 마을, 주소 검색", "Search a business, village or address", "店名・村・住所で検索", "搜索店名、村庄或地址", "搜尋店名、村落或地址"],
  reset: ["초기화", "Reset", "リセット", "重置", "重設"],
  empty: ["조건에 맞는 결과가 없어요.", "No matches for these filters.", "該当する結果がありません。", "没有符合条件的结果。", "沒有符合條件的結果。"],
  more: ["더 보기", "Show more", "もっと見る", "查看更多", "顯示更多"],
  featured: ["추천 장소", "Our picks", "おすすめ", "推荐地点", "推薦地點"],
  save: ["저장", "Save", "保存", "收藏", "收藏"], remove: ["저장 해제", "Remove", "保存を解除", "取消收藏", "取消收藏"],
  detail: ["자세히 보기", "View details", "詳細を見る", "查看详情", "查看詳情"],
  openMap: ["지도에서 보기", "Open map", "地図で見る", "打开地图", "開啟地圖"],
  official: ["공식 안내", "Official guide", "公式案内", "官方介绍", "官方介紹"],
  address: ["한국어 주소", "Address in Korean", "韓国語の住所", "韩文地址", "韓文地址"],
  village: ["마을", "Village", "村", "村落", "村落"],
  close: ["닫기", "Close", "閉じる", "关闭", "關閉"],
  mapLegend: ["읍면 위치", "Area centres", "エリアの代表点", "区域中心", "地區中心"],
  markerNote: ["좌표가 있는 곳을 표시해요.", "Pins show places with coordinates.", "位置確認済みの地点を表示。", "仅标注有坐标的地点。", "僅標示有座標的地點。"],
  zoomIn: ["확대", "Zoom in", "拡大", "放大", "放大"], zoomOut: ["축소", "Zoom out", "縮小", "缩小", "縮小"],
  resetMap: ["전체 지도", "Reset map", "地図を戻す", "重置地图", "重設地圖"],
  sources: ["지도 출처", "Map credits", "地図の出典", "地图来源", "地圖來源"],
  bundle: ["주변 지점 보기", "Explore nearby pins", "周辺の地点を見る", "查看附近标记", "查看附近標記"],
  emptySaved: ["첫 여행을 담아보세요", "Save your first stop", "最初の旅を保存しましょう", "收藏第一站", "收藏第一站"],
  emptyText: ["코스와 장소의 북마크를 누르면 여기에 모여요.", "Tap the bookmark on a route or place to keep it here.", "コースやスポットのブックマークを押すとここに集まります。", "点按路线或地点的书签即可收藏。", "點選路線或地點的書籤即可收藏。"],
  explore: ["오름 지도 둘러보기", "Explore the map", "オルム地図を開く", "探索山丘地图", "探索山丘地圖"],
  noVisits: ["아직 기록한 오름이 없어요", "No visits recorded yet", "まだ訪問の記録はありません", "暂无到访记录", "尚無到訪紀錄"],
  visitHelp: ["현장 인증을 마친 오름이 여기에 표시돼요.", "Hills appear here after an on-site check-in.", "現地でチェックインしたオルムが表示されます。", "完成现场签到的山丘会出现在这里。", "完成現場簽到的山丘會顯示於此。"],
  onDevice: ["이 기기에 저장 중", "Saved on this device", "この端末に保存", "保存在此设备", "儲存在此裝置"],
  onAccount: ["계정에 저장 중", "Saved to your account", "アカウントに保存", "已同步至账户", "已同步至帳戶"],
  syncPending: ["동기화 중", "Syncing…", "同期中", "正在同步", "正在同步"],
  syncError: ["기기 저장 · 동기화 대기", "On device · sync pending", "端末に保存・同期待ち", "设备已保存 · 等待同步", "裝置已儲存 · 等待同步"],
  login: ["구글 로그인", "Sign in with Google", "Google ログイン", "使用 Google 登录", "使用 Google 登入"],
  savedCount: ["저장", "Saved", "保存", "已收藏", "已收藏"], see: ["코스 보기", "See route", "コースを見る", "查看路线", "查看路線"],
  popup: ["선택한 지점", "Selected pin", "選択地点", "所选地点", "選取地點"],
  mapAria: ["제주 동부 지형 지도. 방향키로 이동할 수 있어요.", "Eastern Jeju relief map. Use arrow keys to pan.", "済州東部の地形図。矢印キーで移動できます。", "济州东部地形图。可用方向键移动。", "濟州東部地形圖。可用方向鍵移動。"],
  above: ["검색 결과", "Results", "検索結果", "搜索结果", "搜尋結果"]
};
const cats = ["food","cafe","stay","experience","sight"];
const areaById = new Map(areas.map(a => [a.id, a]));
const listType = {routes:"course", oreums:"oreum", places:"place"};
const categoryIcon = {food:"food",cafe:"cup",stay:"bed",experience:"experience",sight:"waves"};
const geom = {west:126.1, east:127.03, north:33.62, south:33.1, cos:0.835};
const mapHome = {lat:33.411,lon:126.791,z:1};
const normalized = str => String(str || "").normalize("NFKC").toLowerCase().replace(/\s+/g,"");
const localName = (value, lang) => typeof value === "string" ? value : value?.[lang] || value?.en || value?.ko || "";
const hasPoint = item => Number.isFinite(item.lat) && Number.isFinite(item.lon);
const recType = (kind) => kind === "course" ? routes : kind === "oreum" ? oreums : places;

function Icon({name, size=20, filled=false}) {
  const paths = {
    pin:<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.1"/></>,
    peak:<><path d="M2.5 18 9 7l4 6 2.5-4 6 9Z"/><path d="m6.8 10.9 2.4 1.3 1.8-1.4"/></>,
    bookmark:<path d="M6 4.5h12v16l-6-4-6 4z"/>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/></>,
    arrow:<path d="m9 5 7 7-7 7"/>,
    outward:<><path d="M6 18 18 6M7 6h11v11"/></>,
    route:<><circle cx="5.5" cy="6" r="1.8"/><circle cx="18.5" cy="18" r="1.8"/><path d="M7.5 6H15a3.5 3.5 0 0 1 0 7H9a2.5 2.5 0 0 0 0 5h7.5"/></>,
    locate:<><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></>,
    plus:<path d="M12 5v14M5 12h14"/>,minus:<path d="M5 12h14"/>, x:<path d="m6 6 12 12M18 6 6 18"/>,
    food:<><path d="M3 12h15c-.5 4.9-3.3 7-7.5 7S3.5 17 3 12ZM6 21h9M12 9l7-6m-4 7 7-5"/></>,
    cup:<><path d="M4 8h12v6a6 6 0 0 1-12 0zM16 9h2a3 3 0 0 1 0 6h-2M4 21h15M7 3v2m4-2v2"/></>,
    bed:<><path d="M3 4v15m18-9v9M3 15h18M5 8h5v4H5zM12 8h6a3 3 0 0 1 3 3v1h-9z"/></>,
    waves:<><path d="M2 15q2.5-3 5 0t5 0 5 0 5 0M2 19q2.5-3 5 0t5 0 5 0 5 0"/><circle cx="13" cy="7" r="3.5"/></>,
    experience:<><path d="m12 2 3.2 6.7 6.8 1-5 4.8 1.2 7-6.2-3.4-6.2 3.4 1.2-7-5-4.8 6.8-1z"/></>,
    filter:<><path d="M3 6h18M3 12h18M3 18h18"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></>,
    map:<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16m6-14v16"/>
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill={filled?"currentColor":"none"} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{paths[name]||paths.pin}</svg>;
}

function RegionFilter({current, choose, lang, t}) {
  return <div className={css.selectRow} aria-label={t("areas")}>
    <button type="button" aria-pressed={!current} onClick={()=>choose("")}>{t("allEast")}</button>
    {areas.map(a=><button type="button" key={a.id} aria-pressed={current===a.id} onClick={()=>choose(a.id)}>{localName(a.name,lang)}</button>)}
  </div>;
}
function SearchBox({query, change, placeholder, t}) {
  return <label className={css.search}><Icon name="search" size={19}/><input type="search" aria-label={placeholder} placeholder={placeholder} value={query} onChange={e=>change(e.target.value)}/>{query&&<button type="button" onClick={()=>change("")} aria-label={t("reset")}><Icon name="x" size={15}/></button>}</label>;
}
function SaveButton({kind, item, t, travel}) {
  const key=kind+":"+item.id, active=travel.saved?.includes(key);
  return <button className={css.saveButton} type="button" data-active={Boolean(active)} aria-label={t(active?"remove":"save")+" · "+(item.name||item.title?.ko||"")} aria-pressed={Boolean(active)} onClick={()=>travel.toggleSaved(key)}><Icon name="bookmark" size={17} filled={active}/></button>;
}
function Categories({category,onChange,t}) {
  return <div className={css.categories}><button type="button" aria-pressed={category==="all"} onClick={()=>onChange("all")}>{t("allPlaces")}</button>{cats.map(c=><button aria-pressed={c===category} type="button" key={c} onClick={()=>onChange(c)}><Icon name={categoryIcon[c]} size={16}/>{t(c)}</button>)}</div>;
}
function Result({item,kind,onOpen,lang,t,travel}) {
  const area=localName(areaById.get(item.areaId)?.name,lang), category=kind==="place"?t(item.category):kind==="oreum"?t("oreums"):t("routes");
  const minor=[area, item.checkpointName||item.village].filter(Boolean).join(" · ");
  return <article className={css.result}>
    <button type="button" className={css.resultOpen} onClick={()=>onOpen(kind,item)}>
      {kind==="course"?<img src={"/media/"+item.areaId+".webp"} className={css.routeThumb} alt="" loading="lazy" />:<span className={css.kindIcon} data-kind={item.category||kind}><Icon name={kind==="oreum"?"peak":categoryIcon[item.category]} size={22}/></span>}
      <span className={css.resultText}><span className={css.meta}>{category}<i/> {minor}</span><strong>{localName(item.title||item.names||item.name,lang)}</strong>{kind==="place"&&<span className={css.addressLine}>{item.address||item.village||area}</span>}</span>
    </button><SaveButton {...{kind,item,t,travel}}/>
  </article>;
}

function MapCanvas({selectedArea, setArea, kind, items, visits, lang,t,onOpen}) {
  const ref=useRef(null), drag=useRef(null);
  const [size,setSize]=useState({w:620,h:520}),[cam,setCam]=useState(mapHome),[info,setInfo]=useState(false);
  useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([entry])=>setSize({w:entry.contentRect.width,h:entry.contentRect.height}));observer.observe(ref.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{const a=areaById.get(selectedArea);if(!a){setCam(mapHome);return;}
    const points=places.filter(p=>p.areaId===a.id&&hasPoint(p));
    if(points.length){const lat=points.map(p=>p.lat).sort((x,y)=>x-y),lon=points.map(p=>p.lon).sort((x,y)=>x-y);
      setCam({lat:lat[Math.floor(lat.length*.5)],lon:lon[Math.floor(lon.length*.5)],z:a.id==="udo"?5:2.4});}
    else setCam({lat:a.center[0],lon:a.center[1],z:2.4});
  },[selectedArea]);
  const scale=Math.min((size.w-42)/.435,(size.h-88)/(.315/geom.cos))*cam.z;
  const point=(lat,lon)=>({x:size.w/2+(lon-cam.lon)*scale,y:size.h/2+(cam.lat-lat)*scale/geom.cos});
  const topLeft=point(geom.north,geom.west),imgW=(geom.east-geom.west)*scale,imgH=(geom.north-geom.south)*scale/geom.cos;
  const unlockedDiameter=2*fullFlightRadiusMeters*scale/(111195*geom.cos);
  const bound=(lat,lon,z)=>({lat:Math.min(33.61,Math.max(33.16,lat)),lon:Math.min(127.01,Math.max(126.43,lon)),z:Math.max(.9,Math.min(15,z))});
  function zoom(by,at=cam){setCam(bound(at.lat,at.lon,cam.z*by));}
  const groups=new Map();
  if(kind!=="routes"){
    for(const item of items){if(!hasPoint(item))continue;const {x,y}=point(item.lat,item.lon);if(x<5||y<8||x>size.w-5||y>size.h-8)continue;
      const box=cam.z>5?33:48,key=Math.floor(x/box)+"/"+Math.floor(y/box);let group=groups.get(key);if(!group){group={key,items:[],x:0,y:0};groups.set(key,group);}group.items.push(item);group.x+=x;group.y+=y;}
  }
  const pan=(dx,dy)=>setCam(c=>bound(c.lat+dy*geom.cos/scale,c.lon-dx/scale,c.z));
  const handleKey=e=>{const delta={ArrowLeft:[45,0],ArrowRight:[-45,0],ArrowUp:[0,45],ArrowDown:[0,-45]}[e.key];if(delta){e.preventDefault();pan(...delta);}if(e.key==="+")zoom(1.4);if(e.key==="-")zoom(1/1.4);};
  function start(e){if(e.target.closest("button,a,details,summary")||e.button!==0)return;drag.current={x:e.clientX,y:e.clientY,lat:cam.lat,lon:cam.lon};e.currentTarget.setPointerCapture(e.pointerId);}
  function move(e){let d=drag.current;if(d){const dx=e.clientX-d.x,dy=e.clientY-d.y;setCam(bound(d.lat+dy*geom.cos/scale,d.lon-dx/scale,cam.z));}}
  return <div className={css.mapPane}>
    <div className={css.mapCanvas} role="region" ref={ref} tabIndex={0} aria-label={t("mapAria")} onKeyDown={handleKey} onPointerDown={start} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
      <img src="/atlas/east-relief.webp" alt="" draggable="false" className={css.relief} style={{left:topLeft.x,top:topLeft.y,width:imgW,height:imgH}}/>
      {visits.map(({item})=>{
        if(!item.flight)return null;
        const p=point(item.flight.lat,item.flight.lon);
        return <div className={css.flightZone} key={item.id} style={{left:p.x,top:p.y,width:unlockedDiameter,height:unlockedDiameter}}>
          {kind==="routes"&&<button type="button" className={css.zonePin} aria-label={t("unlocked")+" · "+localName(item.names,lang)} onClick={()=>onOpen("oreum",item)}><Icon name="peak" size={13}/></button>}
        </div>;
      })}
      <span className={css.compass} aria-hidden="true"><b>N</b><i/></span>
      {[...groups.values()].map(g=>{let n=g.items.length,x=g.x/n,y=g.y/n,s=g.items[0],name=n>1?t("bundle")+" · "+n:s.name;
        return <button type="button" className={n>1?css.cluster:css.pinDot} style={{left:x,top:y}} aria-label={name} title={name} key={g.key} onClick={()=>{if(n===1){onOpen(listType[kind],s);return;}
          if(cam.z>=14){onOpen("cluster",g.items);return;}zoom(1.9,{lat:g.items.reduce((sum,v)=>sum+v.lat,0)/n,lon:g.items.reduce((sum,v)=>sum+v.lon,0)/n});}}>{n>1?n:<Icon name={kind==="oreums"?"peak":"pin"} size={13}/>}</button>;})}
      {areas.filter(a=>kind==="routes"||!selectedArea).map(a=>{const p=point(a.center[0],a.center[1]);if(p.x<15||p.y<15||p.x>size.w-15||p.y>size.h-15)return null;
        return <button type="button" className={css.regionPin} data-selected={selectedArea===a.id} key={a.id} style={{left:p.x,top:p.y}} onClick={()=>setArea(a.id)}><i/>{localName(a.name,lang)}</button>;})}
      <div className={css.mapTools}><button aria-label={t("zoomIn")} type="button" onClick={()=>zoom(1.45)}><Icon name="plus" size={19}/></button><button aria-label={t("zoomOut")} type="button" onClick={()=>zoom(1/1.45)}><Icon name="minus" size={19}/></button><button aria-label={t("resetMap")} type="button" onClick={()=>{setArea("");setCam(mapHome);}}><Icon name="locate" size={18}/></button></div>
      <div className={css.mapNote}><span><i/>{visits.length?t("unlocked")+" · "+visits.length:kind==="routes"?t("mapLegend"):t("markerNote")}</span><div className={css.creditBar}><a href={catalog.metadata.mapCredits.osm.url} target="_blank" rel="noreferrer">© OpenStreetMap</a><button type="button" onClick={()=>setInfo(!info)} aria-expanded={info}>{t("sources")}</button></div></div>
      {info&&<div className={css.mapSources}><button type="button" aria-label={t("close")} onClick={()=>setInfo(false)}><Icon name="x" size={14}/></button>{Object.entries(catalog.metadata.mapCredits).map(([key,source])=><a key={key} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}<span>Relief produced using Copernicus WorldDEM-30 © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA; all rights reserved.</span><a href="https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf" target="_blank" rel="noreferrer">Copernicus DEM license ↗</a></div>}
    </div></div>;
}

function Modal({children,onClose,title}) {
  const ref=useRef(null);
  useEffect(()=>{const d=ref.current;if(d&&!d.open)d.showModal();return()=>{if(d?.open)d.close();};},[]);
  return <dialog ref={ref} className={css.dialog} aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className={css.dialogContent}>{children}</div></dialog>;
}

export default function Explore({tab="map",lang="ko",area="",onNavigate,travel={},initialQuery="",initialCategory="all",place,id}) {
  const l=languages.includes(lang)?lang:({ "zh-Hans":"zh","zh-Hant":"tw" }[lang]||"ko"),i=languages.indexOf(l);
  const t=k=>copy[k]?.[i]||copy[k]?.[0]||k;
  const [query,setQuery]=useState(initialQuery||""),[region,setRegion]=useState(area||""),[category,setCategory]=useState(initialCategory||"all");
  const [mapKind,setMapKind]=useState("routes"),[picks,setPicks]=useState(false),[limit,setLimit]=useState(18),[dialog,setDialog]=useState(null),[tripTab,setTripTab]=useState("saved");
  useEffect(()=>{setQuery(initialQuery||"");setCategory(cats.includes(initialCategory)?initialCategory:"all");setRegion(areaById.has(area)?area:"");setLimit(18);setDialog(null);setPicks(false);},[tab,area,initialQuery,initialCategory]);
  useEffect(()=>{const key=place||id;if(tab==="places"&&key){const item=places.find(p=>p.id===key);if(item)setDialog({kind:"place",item});}},[place,id,tab]);
  useEffect(()=>{setLimit(18);},[region,query,mapKind,category,picks,tab]);
  const go=(kind,item)=>{if(kind==="place"||kind==="cluster"){setDialog({kind,item});return;}onNavigate(kind,{id:item.id,area:item.areaId});};
  const source=tab==="map"?(mapKind==="routes"?routes:mapKind==="oreums"?oreums:places):places;
  const filtered=useMemo(()=>{const term=normalized(query);return source.filter(r=>{
    if(region&&r.areaId!==region)return false;
    if(source===places&&((picks&&!r.featured)||(category!=="all"&&r.category!==category)))return false;
    if(!term)return true;const a=areaById.get(r.areaId);return normalized([r.name,...Object.values(r.title||{}),...Object.values(r.names||{}),...Object.values(a?.name||{}),r.village,r.address,...(r.aliases||[]),...(r.oreum||[]),...(r.places||[]),...(r.themes||[])].filter(Boolean).join(" ")).includes(term);
  });},[source,region,picks,query,category]);
  const reset=()=>{setQuery("");setRegion("");setPicks(false);setCategory("all");};
  const saved=travel.saved||[], visited=travel.visited||[];
  const savedRows=saved.flatMap(key=>{const cut=key.indexOf(":");if(cut<0)return [];const kind=key.slice(0,cut),id=key.slice(cut+1);const item=recType(kind).find(r=>r.id===id);return item?[{kind,item}]:[];});
  const visits=visited.flatMap(id=>{
    const item=oreums.find(r=>r.flight?.id===id||r.id===id);
    return item?[{kind:"oreum",item:{...item,checkpointName:checkpointById.get(id)?.checkpointName}}]:[];
  });
  const placeDetail=dialog?.kind==="place"?dialog.item:null, title=tab==="map"?t("mapTitle"):tab==="places"?t("placesTitle"):t("tripsTitle");
  const resultKind=tab==="map"?listType[mapKind]:"place";
  function rows(data,kind){return data.map(r=><Result key={r.id} item={r} kind={kind} onOpen={go} lang={l} t={t} travel={travel}/>);}
  const drawSearch=(placeholder)=> <SearchBox query={query} change={setQuery} placeholder={placeholder} t={t}/>;
  const drawRegion=()=> <RegionFilter current={region} choose={setRegion} lang={l} t={t}/>;
  const resultBody=<>{filtered.length?rows(filtered.slice(0,limit),resultKind):<div className={css.noResults}><strong>{t("empty")}</strong><button type="button" onClick={reset}>{t("reset")}</button></div>}{filtered.length>limit&&<button type="button" className={css.more} onClick={()=>setLimit(v=>v+24)}>{t("more")} <span>{Math.min(filtered.length,limit)} / {filtered.length.toLocaleString()}</span></button>}</>;
  return <section className={css.page}>
    <header className={css.head}><div><h1>{title}</h1><p>{t(tab==="map"?"mapSub":tab==="places"?"placesSub":"tripsSub")}</p></div>
      {tab==="trips"&&<div className={css.accountStatus}><i/>{t(travel.syncState==="error"?"syncError":travel.syncState==="pending"?"syncPending":travel.user?"onAccount":"onDevice")}</div>}</header>
    {tab==="map"&&<>
      {drawRegion()}
      <div className={css.atlas}>
        <MapCanvas selectedArea={region} setArea={setRegion} kind={mapKind} items={filtered} visits={visits} lang={l} t={t} onOpen={go}/>
        <aside className={css.atlasPanel}><div className={css.panelHead}><div className={css.segment}>{["routes","oreums","places"].map(k=><button type="button" key={k} aria-pressed={mapKind===k} onClick={()=>{setMapKind(k);setPicks(false);setCategory("all");}}>{t(k)}</button>)}</div>{drawSearch(t("mapQuery"))}{mapKind==="places"&&<Categories category={category} onChange={setCategory} t={t}/>}</div>
          <div className={css.panelResults} key={[mapKind,region,query,category].join("|")}><div className={css.count} aria-live="polite">{t(mapKind)} <strong>{filtered.length.toLocaleString()}</strong></div>{resultBody}</div>
        </aside>
      </div>
    </>}
    {tab==="places"&&<>
      <div className={css.discoveryFilters}><div className={css.searchBar}>{drawSearch(t("placesQuery"))}<button className={css.picks} type="button" aria-pressed={picks} onClick={()=>setPicks(v=>!v)}><Icon name="bookmark" size={16}/>{t("featured")}</button></div>{drawRegion()}<Categories category={category} onChange={setCategory} t={t}/></div>
      <div className={css.count} aria-live="polite">{t("above")} <strong>{filtered.length.toLocaleString()}</strong></div>
      <div className={css.grid}>{resultBody}</div>
    </>}
    {tab==="trips"&&<>
      <div className={css.tripTabs}>{[["saved",savedRows.length],["visited",visits.length]].map(([key,n])=><button key={key} type="button" aria-pressed={tripTab===key} onClick={()=>setTripTab(key)}>{t(key)} <span>{n}</span></button>)}</div>
      {(tripTab==="saved"?savedRows:visits).length?<div className={css.grid}>{(tripTab==="saved"?savedRows:visits).map(({kind,item})=><Result key={kind+item.id} {...{kind,item,t,travel}} lang={l} onOpen={go}/>)}</div>:<div className={css.emptyTrip}><div className={css.tripPhoto}><img src="/media/gujwa.webp" alt=""/><div><Icon name={tripTab==="saved"?"bookmark":"peak"} size={30}/></div></div><div><h2>{t(tripTab==="saved"?"emptySaved":"noVisits")}</h2><p>{t(tripTab==="saved"?"emptyText":"visitHelp")}</p><button type="button" className={css.primary} onClick={()=>onNavigate("map",{})}>{t("explore")}<Icon name="arrow" size={15}/></button></div></div>}
    </>}
    {dialog&&<Modal title={placeDetail?.name||t("bundle")} onClose={()=>setDialog(null)}>
      <div className={css.dialogTop}><span>{placeDetail?localName(areaById.get(placeDetail.areaId)?.name,l):t("bundle")}</span><button className={css.iconBtn} type="button" aria-label={t("close")} onClick={()=>setDialog(null)}><Icon name="x"/></button></div>
      {placeDetail?<><div className={css.dialogCategory}><Icon name={categoryIcon[placeDetail.category]} size={16}/>{t(placeDetail.category)}{placeDetail.featured&&<em>{t("featured")}</em>}</div>
      <h2>{placeDetail.name}</h2><dl className={css.placeDetails}>{placeDetail.village&&<><dt>{t("village")}</dt><dd>{placeDetail.village}</dd></>}{placeDetail.address&&<><dt>{t("address")}</dt><dd>{placeDetail.address}</dd></>}</dl>
      <div className={css.dialogActions}><button type="button" className={css.primary} aria-pressed={saved.includes("place:"+placeDetail.id)} onClick={()=>travel.toggleSaved("place:"+placeDetail.id)}><Icon name="bookmark" size={17} filled={saved.includes("place:"+placeDetail.id)}/>{t(saved.includes("place:"+placeDetail.id)?"remove":"save")}</button>{hasPoint(placeDetail)&&<a className={css.secondary} href={`https://map.kakao.com/link/map/${encodeURIComponent(placeDetail.name)},${placeDetail.lat},${placeDetail.lon}`} target="_blank" rel="noreferrer">{t("openMap")}<Icon name="outward" size={14}/></a>}</div>{placeDetail.url&&<a className={css.sourceLink} href={placeDetail.url} target="_blank" rel="noreferrer">{t("official")}<Icon name="outward" size={13}/></a>}</>:<><h2>{t("bundle")}</h2><div className={css.clusterList}>{dialog.item.map(r=><Result key={r.id} item={r} kind={mapKind==="oreums"?"oreum":"place"} t={t} lang={l} travel={travel} onOpen={go}/>)}</div></>}
    </Modal>}
  </section>;
}
