'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Compass} from 'lucide-react';
import catalog from '../../app-data/catalog.json';
import {word} from './words';
const errors={
 'auth-required':['구글 로그인 후 방문을 기록해요.','Sign in to record your visit.','ログインして訪問を記録してください。','请先登录。','請先登入。'],
 'location-denied':['위치 접근을 허용하면 지정 지점의 방문을 확인할 수 있어요.','Enable location access to verify your visit at the checkpoint.','訪問チェックポイントでの確認には位置情報の利用を許可してください。','请允许使用位置信息以验证您已到访该点。','請允許使用定位資訊，以驗證您已到訪該處。'],
 'outside-summit':['오름에 표시된 방문 인증 지점에서 다시 시도해 주세요.','Try again at the marked visit checkpoint.','表示された訪問チェックポイントで再度お試しください。','请在标出的到访验证点重试。','請在標示的到訪驗證點再試一次。'],
 'location-inaccurate':['위치 오차가 커요. 위치가 안정된 뒤 다시 시도해 주세요.','GPS accuracy is low. Try again after the signal settles.','GPSが安定してから再度お試しください。','请在定位准确后重试。','請在定位準確後重試。']
};
export default function FlightView({id,mode,lang,travel,onNavigate}){
 const root=useRef(null),latest=useRef({travel,onNavigate}),flight=useRef(null),[message,setMessage]=useState('');latest.current={travel,onNavigate};const w=(...v)=>word(lang,...v);
 useEffect(()=>{let disposed=false,cleanup;setMessage('');
 async function mount(){
 const [{mountFlight},{resolveFlightPoint}]=await Promise.all([import(/* webpackIgnore: true */ '/flight/index.js'),import(/* webpackIgnore: true */ '/flight/geo.js')]);if(disposed)return;
 const oreum=catalog.oreums.find(o=>o.id===id)||{id,name:id};const point=resolveFlightPoint(oreum);
 if(!point){setMessage(w('이 오름의 정상 조망 자료를 준비하고 있어요.','Summit data for this oreum is being prepared.','このオルムの展望は準備中です。','此山丘观景资料准备中。','此山丘觀景資料準備中。'));return}
 cleanup=mountFlight(root.current,{oreum,locale:lang,places:catalog.places,initialMode:mode,unlocked:latest.current.travel.visited.includes(point.id),
 savedIds:latest.current.travel.saved.filter(key=>key.startsWith('place:')).map(key=>key.slice(6)),
 onSave:place=>{const t=latest.current.travel;if(!t.saved.includes('place:'+place.id))t.toggleSaved('place:'+place.id);},
 onExit:()=>latest.current.onNavigate('map'),onVerify:async visitId=>{try{await latest.current.travel.checkIn(visitId);setMessage('');return true}catch(e){if(e.code==='auth-required')latest.current.onNavigate('login');setMessage(word(lang,...(errors[e.code]||['지금은 방문을 확인할 수 없어요. 비행 미리보기를 이용해 주세요.','Visit verification is unavailable. You can still preview the flight.','訪問を確認できません。プレビューは利用可能です。','暂时无法验证到访，可预览飞行。','暫時無法驗證到訪，可預覽飛行。'])));return false}}});
 flight.current={cleanup,pointId:point.id};
 }
 mount().catch(()=>{if(!disposed)setMessage(w('이 기기에서 비행 화면을 열지 못했어요. 오름 지도로 돌아가 둘러볼 수 있어요.','Flight could not open on this device. You can explore the oreum map.','飛行を開けませんでした。地図から探索できます。','无法打开飞行，请返回地图。','無法開啟飛行，請返回地圖。'))});
 return()=>{disposed=true;flight.current=null;if(typeof cleanup==='function')cleanup();else cleanup?.destroy?.()};
 },[id,lang,mode]);
 useEffect(()=>{const active=flight.current;if(active)active.cleanup?.setUnlocked?.(travel.visited.includes(active.pointId));},[travel.visited]);
 useEffect(()=>{flight.current?.cleanup?.setSaved?.(travel.saved.filter(key=>key.startsWith('place:')).map(key=>key.slice(6)));},[travel.saved]);
 return <section className="flight-page"><div className="flight-page-head wrap"><button className="text-action" onClick={()=>onNavigate('map')}><ArrowLeft size={17}/>{w('오름 지도','Oreum map','オルム地図','山丘地图','山丘地圖')}</button><span><Compass size={16}/>{w('정상 조망 · 가상 비행','Summit view · Virtual flight','山頂の眺望・飛行','山顶观景 · 虚拟飞行','山頂觀景 · 虛擬飛行')}</span></div>{message&&<p role="status" className="flight-note">{message}</p>}<div ref={root} className="flight-host"/></section>
}
