export const languageList = [['ko','한국어','KO'],['en','English','EN'],['ja','日本語','JA'],['zh','简体中文','简'],['tw','繁體中文','繁']];
const ix={ko:0,en:1,ja:2,zh:3,tw:4};
export const word=(lang,...values)=>values[ix[lang]]||values[0];
export const areaName=(area,lang)=>area?.name?.[lang]||area?.name?.ko||'';
export const titleOf=(record,lang)=>record?.title?.[lang]||record?.title?.ko||'';
export const localePath=lang=>({ko:'/ko',en:'/en',ja:'/ja',zh:'/zh-Hans',tw:'/zh-Hant'}[lang]||'/ko');
export const names={
home:['여행 홈','Discover','旅のホーム','旅行首页','旅行首頁'],map:['오름 지도','Oreum map','オルム地図','山丘地图','山丘地圖'],courses:['마을 코스','Village routes','村のコース','村庄路线','村莊路線'],trips:['내 여행','My trips','旅の保存','我的旅行','我的旅行'],places:['여행 장소','Places','旅のスポット','旅行地点','旅行地點'],
food:['오름한끼','Local food','村のごはん','村里吃饭','村裡吃飯'],cafe:['오름한잔','Cafés','カフェ','喝一杯','喝一杯'],stay:['오름푹잠','Stays','宿泊','住一晚','住一晚'],experience:['마을체험','Experiences','村の体験','村庄体验','村莊體驗'],sight:['관광·바다','Sights & sea','観光・海','景点与海','景點與海']
};
export const navTitle=(k,l)=>word(l,...names[k]);
export const cleanRegion=s=>s?.replace(/(읍|면)$/u,'')||'';
