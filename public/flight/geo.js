export const fullFlightRadiusMeters = 3000;

// WGS84 virtual viewpoints. Physical check-in coordinates are maintained separately
// in verified-summits.json. A mapped peak alone does not establish trail access.
export const pointAttribution = {
  name: '© OpenStreetMap contributors',
  license: 'ODbL 1.0',
  url: 'https://www.openstreetmap.org/copyright',
  extract: 'https://download.geofabrik.de/asia/south-korea.html',
  timestamp: '2026-11-18T21:21:02Z',
};

const ttarabiSource = 'https://www.jeju.go.kr/is/oreum/info/jejuoreum/view.wp?oreumId=121';
const villageAreas = {
  jocheon: ['조천', '조천읍'],
  gujwa: ['구좌', '구좌읍'],
  seongsan: ['성산', '성산읍'],
  pyoseon: ['표선', '표선면'],
  namwon: ['남원', '남원읍'],
  udo: ['우도', '우도면'],
};

function point(id, area, village, lat, lon, names, aliases, lookAt, visitId, source) {
  const [ko, en, ja, zh, tw] = names;
  return {
    id, area, village, lat, lon, name: ko, names: { ko, en, ja, zh, tw },
    aliases, lookAt,
    coordinateType: source ? 'official-feature' : 'mapped-peak',
    source: source || `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
    tourismSource: visitId ? `https://www.visitjeju.net/kr/detail/view?contentsid=${visitId}` : undefined,
  };
}

// East Jeju named peaks in jejumap's geological feature extract, including the
// provincial oreum inventory point for Ttarabi. Elevations come from the DEM.
export const launchPoints = [
  point('jimi', 'gujwa', '종달리', 33.499265, 126.902365,
    ['지미봉', 'Jimi-bong', 'チミ峰', '地尾峰', '地尾峰'], ['지미오름', '지미봉오름', 'Jimibong'], 'seongsan', 'CONT_000000000500610'),
  point('ttarabi', 'pyoseon', '가시리', 33.38871, 126.7529,
    ['따라비오름', 'Ttarabi Oreum', 'タラビオルム', 'Ttarabi 火山丘', 'Ttarabi 火山丘'], ['따라비', '따라비악'], 'keunsaseumi', 'CONT_000000000500168', ttarabiSource),
  point('siksan', 'seongsan', '오조리', 33.465698, 126.919888,
    ['식산봉', 'Siksan-bong', 'シクサン峰', '食山峰', '食山峰'], ['바우오름', 'Siksanbong'], 'seongsan'),
  point('yongnuni', 'gujwa', '종달리', 33.459907, 126.832502,
    ['용눈이오름', 'Yongnuni Oreum', 'ヨンヌニオルム', '龙眼岳', '龍眼岳'], ['용눈이', '용눈오름', '용와악', 'Yongnuni'], 'darangshi', 'CONT_000000000500466'),
  point('darangshi', 'gujwa', '세화리', 33.477712, 126.821528,
    ['다랑쉬오름', 'Darangshi Oreum', 'タランシオルム', '月郎峰', '月郎峰'], ['다랑쉬', '월랑봉', '월랑봉(다랑쉬오름)', 'Darangsi Oreum'], 'akkeun-darangshi', 'CONT_000000000500118'),
  point('seoubong', 'jocheon', '함덕리', 33.545845, 126.677582,
    ['서우봉', 'Seoubong', 'ソウ峰', '犀牛峰', '犀牛峰'], ['서모봉', '함덕서우봉', 'Seou-bong'], 'ip-san', 'CONT_000000000500335'),
  point('seongsan', 'seongsan', '성산리', 33.458889, 126.940818,
    ['성산일출봉', 'Seongsan Ilchulbong', '城山日出峰', '城山日出峰', '城山日出峰'], ['일출봉', 'Seongsan Ilchulbong Peak'], 'udobong', 'CONT_000000000500349'),
  point('udobong', 'udo', '연평리', 33.491629, 126.964946,
    ['우도봉', 'Udobong', '牛島峰', '牛岛峰', '牛島峰'], ['소머리오름', '쇠머리오름', '우두봉', 'Someori Oreum', 'Udo-bong'], 'seongsan', 'CNTS_000000000022519'),
  point('abu', 'gujwa', '송당리', 33.447565, 126.77968,
    ['아부오름', 'Abu Oreum', 'アブオルム', 'Abu 火山丘', 'Abu 火山丘'], ['앞오름', '아부악', '압오름'], 'andol', 'CONT_000000000500407'),
  point('ip-san', 'gujwa', '김녕리', 33.547585, 126.758236,
    ['입산봉', 'Ipsan-bong', 'イプサン峰', '笠山峰', '笠山峰'], ['삿갓오름', '입산', 'Ipsanbong'], 'seoubong', 'CONT_000000000500515'),
  point('yeongju', 'pyoseon', '성읍리', 33.404623, 126.79626,
    ['영주산', 'Yeongjusan', '瀛洲山', '瀛洲山', '瀛洲山'], ['Yeongju-san'], 'ttarabi', 'CONT_000000000500449'),
  point('keunjigeuri', 'jocheon', '교래리', 33.443783, 126.645261,
    ['큰지그리오름', 'Keunjigeuri Oreum', 'クンジグリオルム', 'Keunjigeuri 火山丘', 'Keunjigeuri 火山丘'], ['큰지그리'], 'hallasan'),
  point('mulyeongari', 'namwon', '수망리', 33.368406, 126.692076,
    ['물영아리오름', 'Mulyeongari Oreum', 'ムルヨンアリオルム', 'Mulyeongari 火山丘', 'Mulyeongari 火山丘'], ['물영아리', '수령악', 'Mulyeongari'], 'keunsaseumi'),
  point('akkeun-darangshi', 'gujwa', '세화리', 33.474645, 126.831494,
    ['아끈다랑쉬오름', 'Akkeun Darangshi Oreum', 'アックンタランシオルム', 'Akkeun Darangshi 火山丘', 'Akkeun Darangshi 火山丘'], ['아끈다랑쉬', '작은다랑쉬'], 'darangshi'),
  point('andol', 'gujwa', '송당리', 33.457659, 126.755832,
    ['안돌오름', 'Andol Oreum', 'アンドルオルム', 'Andol 火山丘', 'Andol 火山丘'], ['안돌'], 'batdol', 'CONT_000000000500413'),
  point('batdol', 'gujwa', '송당리', 33.460738, 126.760381,
    ['밧돌오름', 'Batdol Oreum', 'パットルオルム', 'Batdol 火山丘', 'Batdol 火山丘'], ['밧돌'], 'andol'),
  point('daesusan', 'seongsan', '고성리', 33.440017, 126.901296,
    ['대수산봉', 'Daesusan-bong', '大水山峰', '大水山峰', '大水山峰'], ['큰물뫼', '큰물메', 'Daesusanbong'], 'seongsan', 'CONT_000000000500134'),
  point('dokja', 'seongsan', '신산리', 33.388003, 126.853552,
    ['독자봉', 'Dokja-bong', 'トクチャ峰', '独子峰', '獨子峰'], ['독자오름', 'Dokjabong'], 'tong', 'CONT_000000000500145'),
  point('tong', 'seongsan', '난산리', 33.392189, 126.853115,
    ['통오름', 'Tong Oreum', 'トンオルム', 'Tong 火山丘', 'Tong 火山丘'], ['통악'], 'dokja', 'CONT_000000000500655'),
  point('keunsaseumi', 'pyoseon', '가시리', 33.399524, 126.729155,
    ['큰사슴이오름', 'Keunsaseumi Oreum', 'クンサスミオルム', '大鹿山', '大鹿山'], ['큰사슴이', '대록산', '큰사스미오름', 'Daeroksan'], 'ttarabi'),
];

export const landmarks = [
  point('hallasan', 'jeju', '', 33.361431, 126.529419,
    ['한라산', 'Hallasan', '漢拏山', '汉拿山', '漢拏山'], [], null),
];

// The catalog keeps the inventory's stable application IDs. Some differ from
// short flight IDs or are generated for names without an English inventory ID.
const catalogIds = {
  'keunjigeuri': 'keun-jigeuri',
  'batdol': 'gujwa-55d0c35fb5',
  'andol': 'gujwa-859c71dea3',
  'ip-san': 'gujwa-44acdb9f4a',
  'keunsaseumi': 'keun-saseumi',
  'yeongju': 'yeongjusan',
  'seongsan': 'seongsan-ilchulbong',
};

// Face a real neighboring feature on first render. Bearings are clockwise from
// geographic north. No compass or device orientation reading is implied.
const allPoints = new Map([...launchPoints, ...landmarks].map(item => [item.id, item]));
for (const origin of launchPoints) {
  origin.catalogId = catalogIds[origin.id] || origin.id;
  const target = allPoints.get(origin.lookAt);
  const rad = Math.PI / 180;
  const start = origin.lat * rad;
  const end = target.lat * rad;
  const east = (target.lon - origin.lon) * rad;
  const y = Math.sin(east) * Math.cos(end);
  const x = Math.cos(start) * Math.sin(end) - Math.sin(start) * Math.cos(end) * Math.cos(east);
  origin.heading = (Math.atan2(y, x) / rad + 360) % 360;
}

function normalize(value) {
  return typeof value === 'string' ? value.normalize('NFKC').toLowerCase().replace(/[\s·-]+/gu, '') : '';
}

const byName = new Map();
for (const item of launchPoints) {
  for (const label of [item.id, item.catalogId, ...Object.values(item.names), ...item.aliases]) {
    const key = normalize(label);
    if (!byName.has(key)) byName.set(key, new Set());
    byName.get(key).add(item);
  }
}

function labelVariants(value) {
  if (typeof value !== 'string') return [];
  const parts = [value, ...value.split(/[()（）/]/u)];
  return parts.map(normalize).filter(Boolean);
}

export function resolveFlightPoint(input) {
  if (!input) return null;
  const entry = typeof input === 'string' ? { name: input } : input;
  const stableId = launchPoints.find(item => item.id === entry.id || item.catalogId === entry.id);
  if (stableId) return stableId;
  const area = normalize(entry.area || entry.areaId);
  const matches = new Set();
  const names = typeof entry.name === 'object' && entry.name ? Object.values(entry.name) : [entry.name];
  const aliases = Array.isArray(entry.aliases) ? entry.aliases : [entry.aliases];
  for (const label of [entry.id, ...names, ...aliases].flatMap(labelVariants)) {
    // These descriptive aliases can refer to different hills elsewhere on Jeju.
    if (['앞오름', '삿갓오름', '압오름'].includes(label) && !area) continue;
    for (const item of byName.get(label) || []) {
      const validArea = !area || [item.area, ...villageAreas[item.area]].some(value => normalize(value) === area);
      if (validArea) matches.add(item);
    }
  }
  return matches.size === 1 ? [...matches][0] : null;
}
