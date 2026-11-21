const toRadians = Math.PI / 180;
// Jeju's WMM2025 magnetic declination rounded to a degree for a phone compass.
// https://www.magnetic-declination.com/KOREA%20(SOUTH)/JEJU/1415016.html
const jejuDeclination = -8 * toRadians;

export const sensorCopy = {
  ko: ['폰 방향 따라보기', '기기 나침반 · 근사 방위', '나침반을 사용할 수 없어요. 화면을 끌어 둘러보세요.', '나침반 연결 중'],
  en: ['Follow phone', 'Device compass · approximate', 'Compass unavailable. Drag to look around.', 'Connecting compass'],
  ja: ['端末の向きに合わせる', '端末コンパス・概算方位', 'コンパスを利用できません。ドラッグして見渡してください。', 'コンパス接続中'],
  zh: ['跟随手机朝向', '设备指南针 · 近似方位', '指南针不可用，请拖动屏幕查看。', '正在连接指南针'],
  tw: ['跟隨手機朝向', '裝置指南針 · 近似方位', '無法使用指南針，請拖曳畫面查看。', '正在連接指南針'],
};

export function readDeviceHeading(event) {
  const tilt = Number.isFinite(event.beta) && Number.isFinite(event.gamma);
  const b = tilt ? event.beta * toRadians : Math.PI / 2;
  const g = tilt ? event.gamma * toRadians : 0;
  const pitch = Math.asin(Math.max(-1, Math.min(1, -Math.cos(b) * Math.cos(g))));
  if (Number.isFinite(event.webkitCompassHeading) && event.webkitCompassHeading >= 0 &&
      (event.webkitCompassAccuracy == null || (event.webkitCompassAccuracy >= 0 && event.webkitCompassAccuracy <= 60))) {
    return { yaw: event.webkitCompassHeading * toRadians + jejuDeclination, pitch };
  }
  if (!(event.absolute || event.type === 'deviceorientationabsolute') || !Number.isFinite(event.alpha)) return null;
  const a = event.alpha * toRadians;
  // W3C Device Orientation A.1. Project the rear-camera axis into the east/north
  // plane, independent of portrait/landscape screen rotation.
  const east = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const north = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
  if (Math.hypot(east, north) < 0.12) return null;
  return { yaw: Math.atan2(east, north), pitch };
}

// Call start() in the click handler to preserve iOS user activation.
export function deviceTracker(onReading, onState) {
  let token = 0, timer, state = 'off';
  const stop = () => {
    token++;
    clearTimeout(timer);
    window.removeEventListener('deviceorientationabsolute', onEvent);
    window.removeEventListener('deviceorientation', onEvent);
    if (state !== 'off') { state = 'off'; onState(state); }
  };
  const expire = () => { stop(); onState('unavailable'); };
  function onEvent(event) {
    const reading = readDeviceHeading(event);
    if (!reading) return;
    clearTimeout(timer);
    if (state !== 'on') { state = 'on'; onState(state); }
    onReading(reading);
  }
  async function start() {
    if (state !== 'off') { stop(); return; }
    const sensor = window.DeviceOrientationEvent;
    if (!window.isSecureContext || !sensor) { onState('unavailable'); return; }
    const version = ++token;
    state = 'pending'; onState(state);
    try {
      if (typeof sensor.requestPermission === 'function') {
        const result = await sensor.requestPermission(true);
        if (version !== token) return;
        if (result !== 'granted') { expire(); return; }
      }
      window.addEventListener('deviceorientationabsolute', onEvent);
      window.addEventListener('deviceorientation', onEvent);
      timer = setTimeout(expire, 5000);
    } catch { if (version === token) expire(); }
  }
  return { start, stop, get state() { return state; } };
}
