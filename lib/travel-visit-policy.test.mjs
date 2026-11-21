import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createVisitHandler, locationVerdict } from './travel-visit-policy.mjs';

const summit = { id:'sample', latitude:33.48, longitude:126.9, checkInEnabled:true };
const now = Date.now();
const point = { latitude:summit.latitude, longitude:summit.longitude, accuracy:10, timestamp:now };

test('the published ledger enables the eight named visitor checkpoints at their study locations', async () => {
  const file = new URL('../public/flight/verified-summits.json', import.meta.url);
  const eligible = JSON.parse(await readFile(file, 'utf8')).filter(site => site.checkInEnabled);
  assert.deepEqual(eligible.map(site => site.id).sort(), [
    'abu', 'jimi', 'keunsaseumi', 'mulyeongari', 'seongsan', 'seoubong', 'udobong', 'yongnuni'
  ]);
  for (const site of eligible) {
    assert.ok(site.checkpointName.trim() && site.source && site.coordinateSource, site.id);
    const fix = { ...point, latitude:site.latitude, longitude:site.longitude };
    assert.equal(locationVerdict(site, fix, now), null, site.id);
    assert.equal(locationVerdict(site, { ...fix, latitude:site.latitude + 0.006 }, now), 'outside-summit', site.id);
  }
});

test('check-in requires a fresh, accurate fix inside the eligible viewpoint radius', () => {
  assert.equal(locationVerdict(summit, point, now), null);
  assert.equal(locationVerdict({ ...summit, checkInEnabled:false }, point, now), 'summit-unavailable');
  assert.equal(locationVerdict(undefined, point, now), 'summit-unavailable');
  assert.equal(locationVerdict(summit, { ...point, latitude:null }, now), 'location-invalid');
  assert.equal(locationVerdict(summit, { ...point, timestamp:now - 121000 }, now), 'location-stale');
  assert.equal(locationVerdict(summit, { ...point, accuracy:75 }, now), 'location-inaccurate');
  assert.equal(locationVerdict(summit, { ...point, latitude:33.4811, accuracy:40 }, now), 'outside-summit');
  assert.equal(locationVerdict(summit, { ...point, longitude:126.95 }, now), 'outside-summit');
});

test('visit route records just the authenticated owner and server-approved summit', async () => {
  const records = [];
  const handler = createVisitHandler({
    verifyUser: token => {
      if (token === 'valid-session') return 'account-a';
      throw Object.assign(new Error(), { code:'auth/invalid-id-token' });
    },
    findSummit: id => id === summit.id ? summit : null,
    recordVisit: (...args) => records.push(args)
  });
  function request(token, body) {
    const headers = { 'Content-Type':'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return new Request('https://example.test/api/visits', {
      method:'POST', headers, body:JSON.stringify(body)
    });
  }
  const body = { uid:'another-person', summitId:summit.id, position:point };
  assert.equal((await handler(request(null, body))).status, 401);
  assert.equal((await handler(request('invalid-session', body))).status, 401);
  assert.equal((await handler(request('valid-session', { ...body, summitId:'closed' }))).status, 404);
  const bad = await handler(request('valid-session', { ...body, position:{ ...point, accuracy:100 } }));
  assert.equal(bad.status, 422);
  assert.deepEqual(records, []);
  const good = await handler(request('valid-session', body));
  assert.equal(good.status, 200);
  assert.deepEqual(await good.json(), { summitId:summit.id });
  assert.deepEqual(records, [['account-a', summit.id]]);
});
