'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, MapPin, Maximize, Minimize, Mountain } from 'lucide-react';
import catalog from '../../app-data/catalog.json';
import { resolveFlightPoint } from '../../public/flight/geo.js';
import { word } from './words';
import css from './FlightView.module.css';

const copy = {
  map: ['오름 지도', 'Oreum map', 'オルム地図', '山丘地图', '山丘地圖'],
  village: ['마을 둘러보기', 'Explore the village', '村を巡る', '逛逛村庄', '逛逛村莊'],
  expand: ['전체 화면', 'Full screen', '全画面', '全屏', '全螢幕'],
  collapse: ['전체 화면 닫기', 'Exit full screen', '全画面を終了', '退出全屏', '退出全螢幕'],
  loading: ['지형을 여는 중…', 'Opening the terrain…', '地形を読み込み中…', '正在载入地形…', '正在載入地形…'],
  unsupported: ['이 오름의 조망 자료를 준비하고 있어요.', 'The viewpoint for this oreum is being prepared.', 'このオルムの展望は準備中です。', '此山丘的观景资料准备中。', '此山丘的觀景資料準備中。'],
  failed: ['비행 화면을 열지 못했어요.', 'The flight view could not open.', '飛行画面を開けませんでした。', '未能打开飞行画面。', '未能開啟飛行畫面。'],
  retry: ['다시 열기', 'Try again', '再試行', '重试', '重試'],
  dismiss: ['닫기', 'Dismiss', '閉じる', '关闭', '關閉'],
  'location-denied': ['위치 접근을 허용하면 지정 지점에서 방문을 인증할 수 있어요.', 'Allow location access at the marked checkpoint.', '訪問チェックポイントで位置情報を許可してください。', '请在指定到访点允许位置访问。', '請在指定到訪點允許位置存取。'],
  'outside-summit': ['지도에 표시된 방문 인증 지점에서 다시 시도해 주세요.', 'Try again at the marked visit checkpoint.', '表示された訪問チェックポイントで再度お試しください。', '请在标出的到访验证点重试。', '請在標示的到訪驗證點重試。'],
  'location-inaccurate': ['GPS 오차가 커요. 신호가 안정되면 다시 시도해 주세요.', 'GPS accuracy is low. Try again when the signal settles.', 'GPSが安定してから再度お試しください。', '请在定位准确后重试。', '請在定位準確後重試。'],
  unavailable: ['방문 인증을 완료하지 못했어요. 비행 미리보기는 계속 이용할 수 있어요.', 'Visit verification is unavailable. You can keep exploring the preview.', '訪問を確認できません。プレビューは引き続き利用できます。', '暂时无法验证到访，可继续预览飞行。', '暫時無法驗證到訪，可繼續預覽飛行。'],
};

export default function FlightView({id, mode, lang, travel, onNavigate, onModeChange}) {
  const section = useRef(null);
  const host = useRef(null);
  const controller = useRef(null);
  const latest = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState('loading');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const peak = resolveFlightPoint(catalog.oreums.find(record => record.id === id) || id);
  const t = key => word(lang, ...copy[key]);

  const closeFull = useCallback(() => {
    setExpanded(false);
    if (document.fullscreenElement === section.current) document.exitFullscreen?.().catch(() => {});
  }, []);
  const navigate = (view, params) => {
    closeFull();
    onNavigate(view, params);
  };
  latest.current = {travel, mode, lang, onModeChange, navigate, expanded};

  useEffect(() => {
    const changed = () => setExpanded(document.fullscreenElement === section.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);
  async function toggleFull() {
    if (expanded) return closeFull();
    setExpanded(true);
    if (section.current?.requestFullscreen) {
      try { await section.current.requestFullscreen(); }
      catch { /* Embedded browsers can still expand the scene within the page. */ }
    }
  }

  useEffect(() => {
    let alive = true;
    let cleanup;
    setStatus(peak ? 'loading' : 'unsupported');
    setNotice('');
    if (!peak) return;
    async function mount() {
      const {mountFlight} = await import(/* webpackIgnore: true */ '/flight/index.js');
      if (!alive) return;
      const current = latest.current;
      cleanup = mountFlight(host.current, {
        oreum: peak,
        locale: lang,
        places: catalog.places,
        initialMode: current.mode,
        unlocked: current.travel.visited.includes(peak.id),
        savedIds: current.travel.saved.filter(key => key.startsWith('place:')).map(key => key.slice(6)),
        onModeChange: next => latest.current.onModeChange?.(next),
        onOpenPlace: place => latest.current.navigate('places', {area: place.areaId, place: place.id}),
        onSave: place => {
          const state = latest.current.travel;
          if (!state.saved.includes('place:' + place.id)) state.toggleSaved('place:' + place.id);
        },
        onExit: () => {
          if (latest.current.expanded) closeFull();
          else latest.current.navigate('map', {area: peak.area});
        },
        onVerify: async visitId => {
          try {
            await latest.current.travel.checkIn(visitId);
            if (alive) setNotice('');
            return true;
          } catch (error) {
            if (!alive) return false;
            if (error.code === 'auth-required') latest.current.navigate('login');
            else setNotice(copy[error.code] ? error.code : 'unavailable');
            return false;
          }
        },
      });
      controller.current = cleanup;
      setStatus('ready');
    }
    mount().catch(() => { if (alive) setStatus('failed'); });
    return () => { alive = false; controller.current = null; cleanup?.(); };
  }, [peak, lang, attempt, closeFull]);
  useEffect(() => { controller.current?.setMode?.(mode || 'terrain'); }, [mode]);
  useEffect(() => { if (peak) controller.current?.setUnlocked?.(travel.visited.includes(peak.id)); }, [peak, travel.visited]);
  useEffect(() => { controller.current?.setSaved?.(travel.saved.filter(key => key.startsWith('place:')).map(key => key.slice(6))); }, [travel.saved]);
  useEffect(() => {
    if (!expanded) return;
    const keydown = event => {
      if (event.key === 'Escape' && !document.fullscreenElement && !event.defaultPrevented) closeFull();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [expanded, closeFull]);

  return <section ref={section} className={css.page} data-expanded={expanded}>
    <nav className={css.bar} aria-label={t('map')}>
      <button onClick={() => navigate('map', peak ? {area: peak.area} : {})}><ArrowLeft size={17}/>{t('map')}</button>
      <div className={css.tools}>
        {peak && <button onClick={() => navigate('oreum', {id: peak.catalogId, section:'nearby'})}><MapPin size={16}/>{t('village')}</button>}
        <button onClick={toggleFull} aria-pressed={expanded} aria-label={t(expanded?'collapse':'expand')} title={t(expanded?'collapse':'expand')}>
          {expanded ? <Minimize size={17}/> : <Maximize size={17}/>}<span className={css.fullText}>{t(expanded?'collapse':'expand')}</span>
        </button>
      </div>
    </nav>
    <div className={css.stage}>
      <div className={css.host} ref={host}/>
      {status !== 'ready' && <div className={css.load} role="status"><Mountain size={26}/><span>{t(status)}</span>
        {status==='failed' && <button onClick={() => setAttempt(n => n + 1)}>{t('retry')}</button>}
        {status==='unsupported' && <button onClick={() => navigate('map')}>{t('map')}</button>}
      </div>}
      {notice && <div className={css.notice} role="status">{t(notice)}<button onClick={() => setNotice('')} aria-label={t('dismiss')}>×</button></div>}
    </div>
  </section>;
}
