import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { refreshVisitJeju } from './refresh-visitjeju.mjs';

const rows = [
  ['15','c4','마을식당'], ['16','c4','마을카페'], ['17','c3','마을숙소'],
  ['26','c1','마을체험'], ['25','c1','마을전망대'], ['31','c1','마을정원']
].map(([area, code, title], index) => ({
  contentsid:'CNTS_' + String(index + 1).padStart(15, '0'),
  title, region2cd:{value:area}, contentscd:{value:code}
}));

function page(number) {
  return { result:'200', resultMessage:'success', currentPage:number, totalCount:6,
    pageCount:3, pageSize:2, resultCount:2, items:rows.slice((number - 1) * 2, number * 2) };
}

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'oreum-visitjeju-'));
  t.after(() => rm(dir, { recursive:true, force:true }));
  const snapshot = join(dir, 'east-places.js'), catalog = join(dir, 'catalog.json');
  await Promise.all([writeFile(snapshot, 'original snapshot'), writeFile(catalog, 'original catalogue')]);
  return { dir, snapshot, catalog, wait:async () => {}, apiKey:'mock-for-testing' };
}

test('fetches every provider page sequentially before generating both releases', async t => {
  const opts = await fixture(t);
  const calls = [];
  const fetchPage = async (url, request) => {
    assert.equal(url.origin, 'https://api.visitjeju.net');
    assert.equal(url.searchParams.get('apikey'), opts.apiKey);
    assert.equal(url.searchParams.get('locale'), 'kr');
    assert.equal(request.redirect, 'error');
    const n = Number(url.searchParams.get('page'));
    calls.push(n);
    if (calls.length === 2) return new Response('', { status:429, headers:{'Retry-After':'1'} });
    return Response.json(page(n));
  };
  const result = await refreshVisitJeju({ ...opts, fetchPage });
  assert.deepEqual(calls, [1, 2, 2, 3]);
  assert.equal(result.easternPlaces, 6);
  const snapshot = await readFile(opts.snapshot, 'utf8');
  assert.ok(snapshot.startsWith('window.EAST_PLACES=') && !snapshot.includes(opts.apiKey));
  const catalog = JSON.parse(await readFile(opts.catalog, 'utf8'));
  assert.ok(rows.every(row => catalog.places.some(place => place.id === row.contentsid)));
  assert.deepEqual((await readdir(opts.dir)).sort(), ['catalog.json','east-places.js']);
});

test('provider errors and incomplete, shifted or malformed pages preserve both releases', async t => {
  const opts = await fixture(t);
  const broken = [
    () => new Response(null,{status:403}),
    () => Response.json({ ...page(2), result:'99' }),
    () => Response.json({ ...page(2), totalCount:5 }),
    () => Response.json({ ...page(2), items:rows.slice(2,3) }),
    () => Response.json({ ...page(2), items:[rows[0],rows[3]] }),
    () => Response.json({ ...page(2), currentPage:1 }),
    () => Response.json({ ...page(2), resultCount:'two' }),
    () => Response.json({ ...page(2), items:[{...rows[2],title:null},rows[3]] }),
    () => new Response('broken json'),
    () => { throw Error('socket closed'); }
  ];
  for (const response of broken) {
    const fetchPage = async url => url.searchParams.get('page') === '1' ? Response.json(page(1)) : response();
    await assert.rejects(refreshVisitJeju({ ...opts, fetchPage }));
  }
  const noEast = async url => {
    const data = page(Number(url.searchParams.get('page')));
    return Response.json({...data, items:data.items.map(row => ({...row,region2cd:{value:'15'}}))});
  };
  await assert.rejects(refreshVisitJeju({...opts,fetchPage:noEast}), /missing eastern districts or travel categories/);
  assert.equal(await readFile(opts.snapshot, 'utf8'), 'original snapshot');
  assert.equal(await readFile(opts.catalog, 'utf8'), 'original catalogue');
  assert.deepEqual((await readdir(opts.dir)).sort(), ['catalog.json','east-places.js']);
});
