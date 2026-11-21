'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { travelFirebaseConfig as config, travelUserCollection } from './travel-firebase-config.mjs';

const configured = Boolean(config.apiKey && config.projectId && config.authDomain && config.appId);
const guestKey = 'oreum.travel.guest.v1';
const legacyMark = 'oreum.travel.legacy-imported.v1';
const base = { ready: false, configured, user: null, saved: [], visited: [],
  storageMode: 'device', syncState: 'device', errorCode: null };
let view = base;
let guest = new Set();
let booting, sdk, auth, db, active, authReady;
let generation = 0;
let confirmed = new Set(), pending = new Map(), busy = new Set(), listeners = [];
const subscribers = new Set();
const subscribe = fn => { subscribers.add(fn); return () => subscribers.delete(fn); };
const readView = () => view;
const initialView = () => base;
const valid = id => typeof id === 'string' && id.length > 0 && id.length <= 256;
const fault = code => Object.assign(new Error(code), { code });
const ownPrefix = uid => 'oreum.travel.' + encodeURIComponent(uid) + '.';
const opPrefix = uid => ownPrefix(uid) + 'write.';
const opKey = (uid, id) => opPrefix(uid) + encodeURIComponent(id);

function publish(change) {
  view = { ...view, ...change };
  subscribers.forEach(fn => fn());
}
function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); }
  catch { return fallback; }
}
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}
function storedIds(key) {
  const values = read(key, []);
  return new Set(Array.isArray(values) ? values.filter(valid) : []);
}
function projected() {
  const ids = new Set(confirmed);
  for (const [id, change] of pending) {
    if (change.present) ids.add(id);
    else ids.delete(id);
  }
  return Array.from(ids);
}
function guestMode(errorCode = null) {
  guest = storedIds(guestKey);
  publish({ ready:true, user:null, saved:[...guest], visited:[], storageMode:'device',
    syncState:'device', errorCode });
}

function loadPending(uid) {
  const found = new Map();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(opPrefix(uid))) continue;
      const change = read(key, null);
      if (valid(change?.id) && typeof change.present === 'boolean' && typeof change.token === 'string') {
        found.set(change.id, change);
      }
    }
  } catch { /* In-memory saves stay available when storage permission is denied. */ }
  return found;
}
function stage(uid, id, present) {
  const change = { id, present, token:crypto.randomUUID() };
  pending.set(id, change);
  return write(opKey(uid, id), change);
}
async function flush(id) {
  const owner = active, value = pending.get(id), cycle = generation, running = busy;
  if (!owner || !value || running.has(id)) return;
  running.add(id);
  let ok = false;
  try {
    const ref = sdk.store.doc(db, travelUserCollection, owner.uid, 'saved', encodeURIComponent(id));
    if (value.present) await sdk.store.setDoc(ref, { id, savedAt:sdk.store.serverTimestamp() });
    else await sdk.store.deleteDoc(ref);
    ok = true;
    if (read(opKey(owner.uid, id), null)?.token === value.token) write(opKey(owner.uid, id), null);
    if (cycle !== generation) return;
    if (value.present) confirmed.add(id); else confirmed.delete(id);
    if (pending.get(id)?.token === value.token) pending.delete(id);
    publish({ saved:projected(), syncState:pending.size ? 'pending':'synced', errorCode:null });
  } catch (err) {
    if (cycle === generation) publish({ syncState:'error', errorCode:err.code || 'cloud-write-failed' });
  } finally {
    running.delete(id);
    if (cycle === generation && pending.has(id) && (ok || pending.get(id)?.token !== value.token)) void flush(id);
  }
}

function switchUser(user) {
  if (user && user.uid === active?.uid) return;
  generation++;
  const cycle = generation;
  listeners.forEach(stop => stop());
  listeners = []; busy = new Set(); pending = new Map(); active = user;
  if (!user) { guestMode(); return; }
  const uid = user.uid;
  const prefix = ownPrefix(uid);
  confirmed = storedIds(prefix + 'saved');
  pending = loadPending(uid);
  // Only this account receives this device's guest picks. Persist the transfer
  // before removing guest copies so a refresh during the first sync is safe.
  for (const id of guest) {
    if (pending.has(id) || stage(uid, id, true)) guest.delete(id);
  }
  write(guestKey, [...guest]);
  publish({ ready:true, user:{ uid, displayName:user.displayName, photoURL:user.photoURL, email:user.email },
    saved:projected(), visited:[], storageMode:'account',
    syncState:'pending', errorCode:null });
  const onError = error => {
    if (cycle === generation) publish({ syncState:'error', errorCode:error.code || 'cloud-read-failed' });
  };
  listeners.push(sdk.store.onSnapshot(sdk.store.collection(db, travelUserCollection, uid, 'saved'),
    { includeMetadataChanges:true }, snap => {
      if (cycle !== generation) return;
      if (!snap.metadata.fromCache || !snap.empty || !confirmed.size) {
        confirmed = new Set(snap.docs.map(doc => doc.data().id).filter(valid));
        write(prefix + 'saved', [...confirmed]);
      }
      publish({ saved:projected(), syncState:pending.size || snap.metadata.fromCache || snap.metadata.hasPendingWrites ? 'pending':'synced' });
    }, onError));
  listeners.push(sdk.store.onSnapshot(sdk.store.collection(db, travelUserCollection, uid, 'visited'),
    { includeMetadataChanges:true }, snap => {
    if (cycle !== generation || snap.metadata.fromCache || snap.metadata.hasPendingWrites) return;
    const visited = snap.docs.map(doc => doc.id);
    publish({ visited });
  }, onError));
  pending.forEach((_, id) => { void flush(id); });
}

async function boot() {
  guest = storedIds(guestKey);
  if (!read(legacyMark, false)) {
    for (const id of storedIds('east-jeju-saved')) {
      const parts = id.split('/');
      if (parts.length === 2 && parts.every(Boolean)) guest.add('course:' + parts[1]);
    }
    if (write(guestKey, [...guest])) write(legacyMark, true);
  }
  publish({ saved:[...guest], ready:!configured });
  window.addEventListener('storage', e => {
    if (!active && e.key === guestKey) {
      guest = storedIds(guestKey); publish({ saved:[...guest] });
    } else if (active && e.key?.startsWith(opPrefix(active.uid))) {
      // Firestore's realtime listener reconciles commits from other tabs.
      const refreshed = loadPending(active.uid);
      for (const [id, change] of refreshed) pending.set(id, change);
      publish({ saved:projected() });
      refreshed.forEach((_, id) => { void flush(id); });
    }
  });
  window.addEventListener('online', () => { pending.forEach((_, id) => { void flush(id); }); });
  if (!configured) return;
  try {
    const [app, authSdk, store] = await Promise.all([
      import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    sdk = { auth:authSdk, store };
    const appName = 'oreum1ggi';
    const appInstance = app.getApps().find(it => it.name === appName) || app.initializeApp(config, appName);
    auth = authSdk.getAuth(appInstance);
    db = store.getFirestore(appInstance);
    auth.useDeviceLanguage();
    authReady = authSdk.onAuthStateChanged(auth, switchUser, err => guestMode(err.code || 'auth-unavailable'));
    if (process.env.NEXT_PUBLIC_FIREBASE_AUTH_REDIRECT === 'true') {
      void authSdk.getRedirectResult(auth).catch(err => publish({ errorCode:err.code || 'auth-redirect-failed' }));
    }
  } catch (err) { guestMode(err.code || 'auth-unavailable'); }
}
function start() { return booting ??= boot(); }

export async function login() {
  if (!configured) throw fault('auth-not-configured');
  if (!authReady) await start();
  if (!auth || !sdk) throw fault('auth-unavailable');
  const provider = new sdk.auth.GoogleAuthProvider();
  try { await sdk.auth.signInWithPopup(auth, provider); }
  catch (error) {
    if (['auth/popup-blocked','auth/operation-not-supported-in-this-environment'].includes(error.code) &&
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_REDIRECT === 'true' && config.authDomain === location.host) {
      await sdk.auth.signInWithRedirect(auth, provider);
    } else throw error;
  }
}
export async function logout() {
  if (auth) await sdk.auth.signOut(auth);
}
export function toggleSaved(id) {
  if (!valid(id)) throw fault('invalid-item');
  const present = !view.saved.includes(id);
  if (!active) {
    if (present) guest.add(id); else guest.delete(id);
    write(guestKey, [...guest]); publish({ saved:[...guest], errorCode:null });
  } else {
    stage(active.uid, id, present);
    publish({ saved:projected(), syncState:'pending', errorCode:null }); void flush(id);
  }
  return present;
}
export async function checkIn(summitId) {
  if (!active) throw fault('auth-required');
  if (!navigator.geolocation) throw fault('location-unavailable');
  const owner = active;
  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, e => {
      reject(fault(['location-unavailable','location-denied','location-unavailable','location-timeout'][e.code] || 'location-unavailable'));
    }, { enableHighAccuracy:true, timeout:20000, maximumAge:0 });
  });
  if (active?.uid !== owner.uid) throw fault('auth-required');
  const token = await owner.getIdToken();
  const { latitude, longitude, accuracy } = position.coords;
  const res = await fetch('/api/visits', { method:'POST', cache:'no-store',
    headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token },
    body:JSON.stringify({ summitId, position:{ latitude, longitude, accuracy, timestamp:position.timestamp } }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.summitId !== summitId) throw fault(data.error || 'service-unavailable');
  if (active?.uid !== owner.uid) throw fault('auth-required');
  const visited = Array.from(new Set([...view.visited, summitId]));
  publish({ visited });
  return summitId;
}
export function useTravel() {
  const state = useSyncExternalStore(subscribe, readView, initialView);
  useEffect(() => { void start(); }, []);
  return { ...state, login, logout, toggleSaved, checkIn };
}
