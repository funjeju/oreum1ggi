// Build the application catalogue from the checked-in gazetteer, itineraries and VisitJeju snapshot.
//   node scripts/build-catalog.mjs
//   node scripts/build-catalog.mjs --peaks ../jejumap/public/geo/features.json
// The optional refresh matches summit features to independently located tourism records.
// The saved summit points are a separate attributed OpenStreetMap-derived dataset.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const dataPath = file => new URL('app-data/' + file, root);
function optionPath(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  if (!process.argv[index + 1] || process.argv[index + 1].startsWith('--')) throw Error('Missing path for ' + flag);
  return resolve(process.argv[index + 1]);
}
const editorial = JSON.parse(await readFile(dataPath('editorial.json'), 'utf8'));
const sourceText = (await readFile(optionPath('--snapshot', new URL('east-places.js', root)), 'utf8')).trim();
const sourcePrefix = 'window.EAST_PLACES=';
if (!sourceText.startsWith(sourcePrefix) || !sourceText.endsWith(';')) throw Error('Invalid VisitJeju index format');
const snapshot = JSON.parse(sourceText.slice(sourcePrefix.length, -1));
const areas = editorial.regions.map(({id,name,center}) => ({id,name,center}));
const areaIds = new Set(areas.map(a => a.id));
const locales = ['ko','en','ja','zh','tw'];
const compact = value => value.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
const unique = values => [...new Set(values.filter(Boolean))];

function aliasesFor(name) {
  const names = [name, name.replace(/\s*\([^()]*\)\s*$/u, '').trim()];
  for (const [, alias] of name.matchAll(/\(([^()]+)\)/gu)) names.push(alias.replace(/^구[.\s]+/u, '').trim());
  return unique(names);
}
function checkIds(records, type) {
  if (records.some(row => !row.id) || new Set(records.map(row => row.id)).size !== records.length) {
    throw Error('Missing or duplicate ' + type + ' ID');
  }
}
function finiteCoords(p) {
  return Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
}
function mapPlace(row, featured, publicId = row.id) {
  const address = row.address || '';
  return {
    id: publicId, name: row.name, areaId: row.area, category: row.category, village: row.village || '',
    address, lat: row.lat ?? null, lon: row.lon ?? null, url: row.url, featured,
    aliases: aliasesFor(row.name).filter(n => n !== row.name),
  };
}
function publicId(p) {
  return new URL(p.url).searchParams.get('contentsid') || (/^C(NTS|ONT)_/.test(p.id) ? p.id : '');
}
function nameKeys(p) {
  return aliasesFor(p.name).map(name => [p.area,p.village,compact(name)].join('|'));
}
const apiById = new Map(snapshot.items.map(p => [publicId(p),p]));
const names = new Map();
for (const p of snapshot.items) {
  for (const key of nameKeys(p)) names.set(key, names.has(key) ? null : p);
}
const merged = new Set();
const picks = editorial.picks.items.map(p => {
  const id = publicId(p);
  const api = id ? apiById.get(id) : nameKeys(p).map(k => names.get(k)).find(Boolean);
  if (!api) return mapPlace(p,true);
  merged.add(api.id);
  // A held-back pin stays held back when the other source supplies a location.
  const position = finiteCoords(api) && finiteCoords(p) ? {lat:p.lat,lon:p.lon} : {lat:null,lon:null};
  const place = mapPlace({...api,...p,address:api.address,...position},true,api.id);
  place.officialUrl = api.url;
  place.aliases = unique([...place.aliases,...aliasesFor(api.name)]).filter(n => n !== place.name);
  return place;
});
const places = [...picks,...snapshot.items.filter(p => !merged.has(p.id)).map(p => mapPlace(p,false))];
checkIds(places,'place');
if (!places.every(p => areaIds.has(p.areaId) && ((p.lat === null && p.lon === null) || finiteCoords(p)))) {
  throw Error('Invalid place area or coordinate pair');
}

const namedIds = {
  '식산봉':'siksan','따라비':'ttarabi','지미봉':'jimi','용눈이오름':'yongnuni','다랑쉬':'darangshi',
  '성산일출봉':'seongsan-ilchulbong','서우봉':'seoubong','아부오름':'abu','아끈다랑쉬':'akkeun-darangshi',
  '쇠머리오름':'udobong','거문오름':'geomun','큰지그리':'keun-jigeuri','두산봉':'dusan',
  '대수산봉':'daesusan','소수산봉':'sosusan','거슨세미':'geoseun-saemi','대록산':'keun-saseumi',
  '물영아리':'mulyeongari','영주산':'yeongjusan','백약이오름':'baegyak','독자봉':'dokja',
  '통오름':'tong','이승악':'iseung','토산봉':'tosan',
};
function peakId(p) {
  return namedIds[p.name] || p.area + '-' + createHash('sha256')
    .update([p.area,p.village,p.name].join('/')).digest('hex').slice(0,10);
}
const oreums = editorial.inventory.items.map(p => {
  const additional = p.name === '이승악' ? ['이승이오름'] : [];
  return {id:peakId(p), name:p.name, areaId:p.area, village:p.village, aliases:unique([...p.aliases,...additional]),
    lat:null, lon:null, elevation:null};
});
checkIds(oreums,'oreum');
const normPeak = s => compact(s).replace(/오름$/u,'');
const namesOf = p => unique([p.name,...(p.aliases || [])].flatMap(aliasesFor).map(normPeak));
function shareName(a, b) {
  const existing = new Set(namesOf(a));
  return namesOf(b).some(n => existing.has(n));
}
function km(a,b) {
  const rad = Math.PI/180;
  const dy = (b.lat-a.lat)*rad, dx=(b.lon-a.lon)*rad;
  const h=Math.sin(dy/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dx/2)**2;
  return 6371*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
const sourceAttribution = {
  osm:{title:'© OpenStreetMap contributors',url:'https://www.openstreetmap.org/copyright',
    license:'ODbL 1.0',download:'https://download.geofabrik.de/asia/south-korea.html'},
  jeju:{title:'제주특별자치도 오름탐방',url:'https://www.jeju.go.kr/is/oreum/info/jejuoreum/view.wp?oreumId=121'},
  photo:{title:'제주특별자치도 오름항공뷰',url:'https://www.data.go.kr/data/15096349/fileData.do'},
};
let ledger;
if (process.argv[2] === '--peaks') {
  if (!process.argv[3]) throw Error('Pass the source features.json path after --peaks');
  const geo=JSON.parse(await readFile(resolve(process.argv[3]),'utf8'));
  const coords=[];
  for (const peak of oreums) {
    // Corroborate local name with an independently listed attraction in the same administrative district.
    // A tourism point may be an entrance, so use it only to disambiguate the geographic feature.
    const witnesses=places.filter(p => p.areaId===peak.areaId && p.category==='sight' && finiteCoords(p)
      && (!p.village || normVillage(p.village)===normVillage(peak.village)) && shareName(peak,p));
    const candidates=geo.oreums.filter(g => finiteCoords(g) && shareName(peak,g));
    let eligible=candidates.filter(g => witnesses.some(w => km(g,w)<=5));
    if (peak.id==='siksan') {
      // Geotagged aerial viewpoint at Siksan, corroborated by the 제주도 2021 source.
      eligible=candidates.filter(g => km(g,{lat:33.4665439,lon:126.9227228})<=1);
    }
    if (eligible.length!==1) continue;
    const point=eligible[0];
    const witness=witnesses.filter(w=>km(point,w)<=5).sort((a,b)=>km(point,a)-km(point,b))[0];
    coords.push({id:peak.id,lat:point.lat,lon:point.lon,elevation:Number.isFinite(point.elevation)?point.elevation:null,
      source:point.source?'jeju':'osm',corroboration:witness?.url || sourceAttribution.photo.url});
  }
  ledger={sources:sourceAttribution,derivedFrom:geo.source,sourceDate:geo.timestamp,points:coords};
  await writeFile(dataPath('peak-points.json'),JSON.stringify(ledger,null,2)+'\n');
} else {
  ledger=JSON.parse(await readFile(dataPath('peak-points.json'),'utf8'));
}
function normVillage(s) {
  return s.replace(/^[동서]김녕리$/u,'김녕리').replace(/([가-힣])\d리$/u,'$1리');
}
const peaksById=new Map(oreums.map(p=>[p.id,p]));
for (const point of ledger.points) {
  const peak=peaksById.get(point.id);
  if (!peak || !finiteCoords(point)) throw Error('Unknown mapped summit or coordinates');
  Object.assign(peak,{lat:point.lat,lon:point.lon,elevation:point.elevation,coordinateSource:point.source});
}
function linksForNames(input, rows, nameFn) {
  return unique(input.flatMap(name => {
    const target=compact(name);
    const exact=rows.filter(p=>nameFn(p).map(compact).includes(target));
    return exact.length===1 ? [exact[0].id] : [];
  }));
}
const routes=editorial.regions.flatMap(a=>a.routes.map(r=>{
  if (!locales.every(l=>r.title[l] && r.accessI18n[l])) throw Error('Incomplete translations for '+r.id);
  const sources=unique([r.source,...(r.sources||[])]).map(url=>({url}));
  const localOreums=oreums.filter(p=>p.areaId===a.id);
  const oreumIds=unique(r.oreum.flatMap(n=>{
    const exact=localOreums.filter(o=>shareName(o,{name:n}));
    // Harye's walk names both branches of Geolseo-ak together.
    return exact.length===1 || (n==='걸서악' && exact.every(o=>o.village==='하례리')) ? exact.map(o=>o.id) : [];
  }));
  const placeIds=linksForNames(r.places,places.filter(p=>p.areaId===a.id),p=>[p.name,...p.aliases]);
  return {...r,areaId:a.id,sources,oreumIds,placeIds};
}));
checkIds(routes,'route');
const metadata={
  retrievedAt:snapshot.retrievedAt,source:snapshot.source,sourceUrl:snapshot.sourceUrl,
  inventorySource:editorial.inventory.source,mapCredits:ledger.sources,mapSourceDate:ledger.sourceDate,
  counts:{areas:areas.length,oreums:oreums.length,routes:routes.length,places:places.length,
    featured:picks.length,locatedPlaces:places.filter(finiteCoords).length,locatedOreums:ledger.points.length},
};
const catalogue={metadata,areas,routes,oreums,places};
await writeFile(optionPath('--output', dataPath('catalog.json')),JSON.stringify(catalogue)+'\n');
console.log(JSON.stringify(metadata.counts));
