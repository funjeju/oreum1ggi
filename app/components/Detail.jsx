'use client';

import {useEffect, useMemo, useState} from 'react';
import {ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Bookmark, Coffee, Compass, ExternalLink, HandHeart, MapPin, Mountain, Navigation, Share2, Utensils, Waves} from 'lucide-react';
import catalog from '../../app-data/catalog.json';
import {resolveFlightPoint, fullFlightRadiusMeters} from '../../public/flight/geo.js';
import {areaName, localePath, navTitle, titleOf, word} from './words';
import css from './Detail.module.css';

const byId = (items) => new Map(items.map(item => [item.id, item]));
const areas = byId(catalog.areas);
const peaks = byId(catalog.oreums);
const routes = byId(catalog.routes);
const places = byId(catalog.places);
const categories = {food: Utensils, cafe: Coffee, stay: BedDouble, experience: HandHeart, sight: Waves};
const copy = {
  nearby: ['오름 내려서 어디 갈까?', 'Where to go after the walk', '下山したらどこへ行く？', '下山后去哪里？', '下山後去哪裡？'],
  direct: ['정상에서 가까운 순 · 직선거리 기준', 'Nearest to the summit by straight-line distance', '山頂からの直線距離が近い順', '按离山顶的直线距离排序', '按離山頂的直線距離排序'],
  unlocated: ['정상 좌표를 확인 중이라 같은 읍·면의 장소를 보여드려요.', 'The summit location is being verified. Showing places in the same district.', '山頂の座標を確認中のため、同じ地区のスポットを表示しています。', '山顶坐标正在核实，以下是同一地区的地点。', '山頂座標正在核實，以下是同一地區的地點。'],
  outside: ['이 반경에 확인된 장소가 없어 같은 읍·면의 장소를 보여드려요.', 'No mapped places match this radius and category. Showing places in the same district.', 'この範囲・条件に合うスポットがないため、同じ地区のスポットを表示しています。', '此半径及类别内没有已定位的地点，以下为同一地区的地点。', '此半徑及類別內沒有已定位的地點，以下為同一地區的地點。'],
  areaList: ['읍·면 추천', 'District picks', '地区のおすすめ', '地区推荐', '地區推薦'],
  noVenues: ['이 분류에 등록된 장소가 없어요.', 'No places listed in this category.', 'このカテゴリーには登録されたスポットがありません。', '此类别暂无地点。', '此類別暫無地點。'],
  all: ['전체', 'All', 'すべて', '全部', '全部'],
  morePlaces: ['장소 더 보기', 'More places', 'もっと見る', '更多地点', '更多地點'],
  map: ['오름 지도', 'Oreum map', 'オルム地図', '山丘地图', '山丘地圖'],
  courses: ['마을 코스', 'Village routes', '村のコース', '村落路线', '村落路線'],
  save: ['저장하기', 'Save', '保存する', '收藏', '收藏'],
  saved: ['저장됨', 'Saved', '保存済み', '已收藏', '已收藏'],
  share: ['공유하기', 'Share', '共有', '分享', '分享'],
  copied: ['링크를 복사했어요.', 'Link copied.', 'リンクをコピーしました。', '链接已复制。', '連結已複製。'],
  copy: ['공유 링크를 복사하세요.', 'Copy this link to share.', 'このリンクをコピーしてください。', '请复制此链接。', '請複製此連結。'],
  overview: ['오름에서 마을까지', 'From hill to village', 'オルムから村へ', '从山丘走进村落', '從山丘走進村落'],
  townRoute: ['마을 한 바퀴', 'Around the village', '村をひと巡り', '走逛村落', '走逛村落'],
  oreums: ['오름', 'Oreums', 'オルム', '山丘', '山丘'],
  village: ['마을에서 들를 곳', 'Village stops', '村の立ち寄り先', '村落游览点', '村落遊覽點'],
  guide: ['가는 길 메모', 'Before you go', '出発の前に', '出发前须知', '出發前須知'],
  general: ['탐방 입구와 개방 여부는 출발 전에 확인하세요.', 'Check the trail entrance and current access before setting out.', '出発前に登山口と開放状況をご確認ください。', '出发前请确认登山入口和开放情况。', '出發前請確認登山入口和開放情況。'],
  related: ['이 오름이 담긴 코스', 'Routes featuring this oreum', 'このオルムを巡るコース', '包含此山丘的路线', '包含此山丘的路線'],
  more: ['이 권역의 마을 코스', 'Village routes in this area', '周辺の村のコース', '本区村落路线', '本區村落路線'],
  around: ['마을에서 더 둘러보기', 'More in the area', 'この地域をもっと見る', '继续探索此区域', '繼續探索此區域'],
  villagePlaces: ['이 마을의 장소', 'Places in this village', 'この村のスポット', '这个村落的地点', '這個村落的地點'],
  flight: ['정상 뷰 미리보기', 'Preview summit view', '山頂ビューを試す', '预览山顶视角', '預覽山頂視角'],
  source: ['자료 출처', 'Sources', '情報源', '资料来源', '資料來源'],
  inventory: ['제주 오름 목록', 'Jeju oreum inventory', '済州オルム一覧', '济州山丘目录', '濟州山丘目錄'],
  coords: ['정상 위치', 'Summit coordinates', '山頂の座標', '山顶坐标', '山頂座標'],
  aliases: ['다른 이름', 'Also known as', '別名', '别名', '別名'],
  villageName: ['소재 마을', 'Village', '所在地', '所在村落', '所在村落'],
  guideUrl: ['장소 정보', 'Place details', 'スポット情報', '地点详情', '地點詳情'],
  none: ['이 항목을 찾을 수 없어요.', 'This entry could not be found.', 'この項目は見つかりませんでした。', '未找到此条目。', '未找到此條目。'],
};

function Internal({view, params = {}, lang, navigate, children, ...props}) {
  const query = new URLSearchParams({view, ...params});
  function follow(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(view, params);
  }
  return <a href={localePath(lang) + '?' + query} onClick={follow} {...props}>{children}</a>;
}

function Save({travel, kind, id, lang, iconOnly = false, label}) {
  const key = kind + ':' + id;
  const saved = travel.saved.includes(key);
  const text = word(lang, ...copy[saved ? 'saved' : 'save']);
  return <button type="button" className={iconOnly ? css.bookmark : css.save} aria-pressed={saved} aria-label={iconOnly ? text + ' · ' + label : text} onClick={() => travel.toggleSaved(key)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/>{!iconOnly && text}</button>;
}

function Share({title, lang}) {
  const [state, setState] = useState('');
  useEffect(() => { setState(''); }, [title]);
  async function share() {
    const url = window.location.href;
    if (window.navigator.share) {
      try { await window.navigator.share({title, url}); setState(''); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    try { await window.navigator.clipboard.writeText(url); setState('copied'); }
    catch { setState(url); }
  }
  return <div className={css.share}><button type="button" className={css.shareButton} onClick={share}><Share2 size={17}/>{word(lang, ...copy.share)}</button>
    <div className={css.shareStatus} role="status">{state === 'copied' ? word(lang, ...copy.copied) : state && <label>{word(lang, ...copy.copy)}<input readOnly value={state} onFocus={event => event.target.select()}/></label>}</div>
  </div>;
}

function Venue({place, lang, travel, navigate, distance}) {
  const Icon = categories[place.category] || MapPin;
  const detail=<><small>{navTitle(place.category, lang)}{distance!=null&&' · '+(distance<1000?Math.round(distance)+' m':(distance/1000).toFixed(1)+' km')}</small><strong>{place.name} <ArrowUpRight size={14}/></strong></>;
  return <div className={css.venue}><span className={css.placeIcon}><Icon size={18}/></span>{navigate?<Internal view="places" params={{area:place.areaId,place:place.id}} lang={lang} navigate={navigate}>{detail}</Internal>:<a href={place.url} target="_blank" rel="noopener noreferrer">{detail}</a>}<Save iconOnly kind="place" id={place.id} label={place.name} travel={travel} lang={lang}/></div>;
}

function distanceMeters(a,b) {
  const rad=Math.PI/180;
  const h=Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lon-a.lon)*rad/2)**2;
  return 12742017.6*Math.asin(Math.min(1,Math.sqrt(h)));
}
function Nearby({peak, point, lang, travel, navigate}) {
  const [radius,setRadius]=useState(fullFlightRadiusMeters),[category,setCategory]=useState('all'),[limit,setLimit]=useState(5);
  const t=key=>word(lang,...copy[key]);
  const ordered=useMemo(()=>point?catalog.places.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(place=>({place,distance:distanceMeters(point,place)})).sort((a,b)=>a.distance-b.distance):[],[point?.lat,point?.lon]);
  const accepts=place=>category==='all'||place.category===category;
  const within=ordered.filter(row=>row.distance<=radius&&accepts(row.place));
  const fallback=!within.length;
  const rows=fallback?catalog.places.filter(p=>p.areaId===peak.areaId&&accepts(p)).sort((a,b)=>Number(b.village===peak.village)-Number(a.village===peak.village)||Number(b.featured)-Number(a.featured)).map(place=>({place})):within;
  return <section className={css.nearby}>
    <div className={css.nearHead}><h2>{t('nearby')}</h2>{point&&<div className={css.radiusSwitch}>{[fullFlightRadiusMeters,5000].map(r=><button key={r} type="button" aria-pressed={radius===r} onClick={()=>{setRadius(r);setLimit(5)}}>{r/1000} km</button>)}</div>}</div>
    <div className={css.nearCats}>{['all',...Object.keys(categories)].map(c=><button key={c} type="button" aria-pressed={category===c} onClick={()=>{setCategory(c);setLimit(5)}}>{c==='all'?t('all'):navTitle(c,lang)}</button>)}</div>
    <div className={css.distanceNote} aria-live="polite">{fallback?<><b>{t('areaList')}</b> {t(point?'outside':'unlocated')}</>:t('direct')+' · '+within.length}</div>
    {rows.slice(0,limit).map(({place,distance})=><Venue key={place.id} {...{place,lang,travel,navigate,distance}}/>)}
    {!rows.length&&<p>{t('noVenues')}</p>}
    {rows.length>limit&&<button type="button" className={css.moreNearby} onClick={()=>setLimit(n=>n+10)}>{t('morePlaces')}<ArrowRight size={14}/></button>}
  </section>;
}

function Sources({route, peak, lang}) {
  const links = new Map();
  if (route) {
    for (const source of route.sources) {
      const place = catalog.places.find(p => p.url === source.url || p.officialUrl === source.url);
      const host = new URL(source.url).hostname.replace(/^www\./, '');
      links.set(source.url, place?.name || (host === 'visitjeju.net' ? 'VisitJeju' : host));
    }
  } else {
    links.set(catalog.metadata.inventorySource, word(lang, ...copy.inventory));
    const credit = catalog.metadata.mapCredits[peak.coordinateSource];
    if (credit) links.set(credit.url, credit.title);
  }
  return <div className={css.sources}><h3>{word(lang, ...copy.source)}</h3>
    {[...links.entries()].map(([url, text], index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer">{text}{text === 'VisitJeju' && links.size > 1 ? ' · ' + (index + 1) : ''}<ExternalLink size={12}/></a>)}
  </div>;
}

export default function Detail({type, id, lang = 'ko', onNavigate, travel}) {
  const t = key => word(lang, ...copy[key]);
  const isCourse = type === 'course';
  const record = (isCourse ? routes : peaks).get(id);
  const back = isCourse ? 'courses' : 'map';
  const common = {lang, navigate: onNavigate};
  if (!record) return <section className={css.empty}><h1>{t('none')}</h1><Internal {...common} view={back}><ArrowLeft size={16}/> {t(back)}</Internal></section>;
  const area = areas.get(record.areaId);
  const launch=!isCourse?resolveFlightPoint(record):null;
  const point=!isCourse&&Number.isFinite(record.lat)&&Number.isFinite(record.lon)?record:launch;
  const title = isCourse ? titleOf(record, lang) : (launch?.names[lang]||record.name);
  const nativeTitle=isCourse?record.title.ko:record.name;
  const titleKo = nativeTitle !== title ? nativeTitle : '';
  const related = isCourse ? [] : catalog.routes.filter(r => r.oreumIds.includes(id));
  const alternatives = related.length ? related : catalog.routes.filter(r => r.areaId === area.id).slice(0, 3);
  const coursePeaks = isCourse ? record.oreumIds.map(k => peaks.get(k)).filter(Boolean) : [];
  const localVenues = isCourse ? record.placeIds.map(k => places.get(k)).filter(Boolean) : [];
  const normalize = text => text.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
  const matchVenue = name => localVenues.find(p => [p.name, ...p.aliases].some(alias => normalize(alias) === normalize(name)));
  return <article className={css.page}>
    <div className={css.wrap}>
      <Internal {...common} view={back} className={css.back}><ArrowLeft size={15}/>{t(back)}</Internal>
      <header className={css.hero}>
        <div className={css.heroCopy}>
          <span className={css.region}><MapPin size={15}/>{areaName(area,lang)}{!isCourse && record.village && ' · ' + record.village}</span>
          <h1>{title}</h1>{titleKo && <p className={css.original} lang="ko">{titleKo}</p>}
          <div className={css.controls}><Save kind={isCourse ? 'course' : 'oreum'} id={id} travel={travel} lang={lang}/><Share lang={lang} title={title}/></div>
        </div>
        <div className={css.photo}><img src={'/media/' + area.id + '.webp'} alt="" fetchPriority="high"/><span><MapPin size={12}/>{areaName(area,lang)}</span></div>
      </header>
      <div className={css.columns}>
        <div className={css.content}>
          {isCourse ? <section>
            <h2>{t(record.oreum.length ? 'overview' : 'townRoute')}</h2>
            <div className={css.timeline}>
              {record.oreum.length > 0 && <div className={css.stage}><span className={css.marker}><Mountain size={17}/></span><div><h3>{t('oreums')}</h3><div className={css.peaks}>
                {coursePeaks.map(p => <Internal key={p.id} {...common} view="oreum" params={{id:p.id}}>{p.name}<ArrowUpRight size={15}/></Internal>)}
                {!coursePeaks.length && record.oreum.map(name => <strong key={name}>{name}</strong>)}
              </div></div></div>}
              <div className={css.stage}><span className={css.marker}><MapPin size={16}/></span><div><h3>{t('village')}</h3>
                <div className={css.placeList}>{record.places.map(name => {
                  const p = matchVenue(name);
                  return p ? <Venue key={name} place={p} lang={lang} travel={travel}/> : <div className={css.namedStop} key={name}><span/>{name}</div>;
                })}</div>
              </div></div>
            </div>
          </section> : <>
            <section className={css.facts}><h2>{t('oreums')}</h2><dl>
              {record.village && <><dt>{t('villageName')}</dt><dd>{record.village}</dd></>}
              {record.aliases.length > 0 && <><dt>{t('aliases')}</dt><dd>{record.aliases.join(' · ')}</dd></>}
              {point && <><dt>{t('coords')}</dt><dd>{point.lat.toFixed(4)}° N, {point.lon.toFixed(4)}° E</dd></>}
            </dl>{launch&&<Internal {...common} view="flight" params={{id}} className={css.flight}><Navigation size={17}/>{t('flight')}<ArrowRight size={16}/></Internal>}</section>
            <Nearby key={record.id} peak={record} point={point} {...common} travel={travel}/>
            {alternatives.length > 0 && <section className={css.related}><h2>{t(related.length ? 'related' : 'more')}</h2>
              {alternatives.map(r => <Internal key={r.id} {...common} view="course" params={{id:r.id}}><div><strong>{titleOf(r,lang)}</strong><small lang="ko">{r.places.join(' · ')}</small></div><ArrowRight size={18}/></Internal>)}
            </section>}
          </>}
        </div>
        <aside className={css.aside}>
          <div className={css.guide}><Compass size={24}/><h2>{t('guide')}</h2><p>{isCourse ? record.accessI18n[lang] || record.access : t('general')}</p><Sources route={isCourse && record} peak={!isCourse && record} lang={lang}/></div>
          <div className={css.browse}><h2>{t('around')}</h2>{Object.entries(categories).map(([category,Icon]) => <Internal key={category} {...common} view="places" params={{area:area.id,category}}><Icon size={17}/>{navTitle(category,lang)}<ArrowRight size={15}/></Internal>)}</div>
        </aside>
      </div>
    </div>
  </article>;
}
