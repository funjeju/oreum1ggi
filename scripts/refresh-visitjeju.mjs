// Run explicitly from the command line. The Next build always uses its bundled snapshot.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { readFileSync, renameSync, copyFileSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const endpoint = 'https://api.visitjeju.net/vsjApi/contents/searchList';
const districts = ['jocheon', 'gujwa', 'seongsan', 'pyoseon', 'namwon', 'udo'];
const categories = ['food', 'cafe', 'stay', 'experience', 'sight'];

function integer(value) {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) return NaN;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : NaN;
}

function checkPage(data, page, first) {
  if (!['00', '200'].includes(String(data?.result)) || String(data.resultMessage).toLowerCase() !== 'success') {
    throw Error('VisitJeju rejected the request for page ' + page + '. Check its API key and quota.');
  }
  const total = integer(data.totalCount), size = integer(data.pageSize), pages = integer(data.pageCount);
  const expected = Math.min(size, total - (page - 1) * size);
  if (!(total > 0 && size > 0 && pages === Math.ceil(total / size)) || integer(data.currentPage) !== page ||
      expected <= 0 || !Array.isArray(data.items) || integer(data.resultCount) !== expected || data.items.length !== expected) {
    throw Error('Incomplete VisitJeju page ' + page);
  }
  if (first && (total !== first.total || pages !== first.pages || size !== first.size)) {
    throw Error('VisitJeju pagination changed during collection. Rerun the complete refresh.');
  }
  return { total, size, pages };
}

async function requestPage(page, apiKey, fetchPage, wait) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({ apikey:apiKey, locale:'kr', page:String(page) }).toString();
  for (let attempt = 1; attempt <= 3; attempt++) {
    let res;
    try {
      res = await fetchPage(url, { headers:{ Accept:'application/json' }, redirect:'error', signal:AbortSignal.timeout(20000) });
    } catch {
      if (attempt === 3) throw Error('VisitJeju network failure on page ' + page);
    }
    if (res?.ok) {
      try { return await res.json(); }
      catch { throw Error('Invalid JSON from VisitJeju on page ' + page); }
    }
    if (res && (![429, 500, 502, 503, 504].includes(res.status) || attempt === 3)) {
      throw Error('VisitJeju returned HTTP ' + res.status + ' on page ' + page);
    }
    const retry = res?.headers.get('retry-after');
    const delay = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 0;
    if (delay > 30000) throw Error('VisitJeju requested a longer pause. Retry the refresh later.');
    await wait(Math.max(1000 * attempt, Number.isFinite(delay) ? delay : 0));
  }
}

async function collect(apiKey, fetchPage, wait) {
  const items = [], ids = new Set();
  let page = 1, first;
  do {
    if (page > 1) await wait(350);
    const data = await requestPage(page, apiKey, fetchPage, wait);
    const current = checkPage(data, page, first);
    first ??= current;
    for (const row of data.items) {
      if (!/^(?:CONT|CNTS)_\d{15}$/.test(row?.contentsid) || ids.has(row.contentsid) ||
          typeof row.title !== 'string' || !row.title.trim() || !row.contentscd?.value) {
        throw Error('Invalid or duplicate VisitJeju content on page ' + page);
      }
      ids.add(row.contentsid);
      const item = {};
      for (const key of ['contentsid','title','address','roadaddress','tag','contentscd','region2cd','publicyn','useyn','webuseyn']) {
        if (row[key] != null) item[key] = row[key];
      }
      for (const key of ['latitude','longitude']) {
        const value = row[key];
        item[key] = typeof value === 'string' && value.trim() ? Number(value) : value;
      }
      items.push(item);
    }
    page++;
  } while (page <= first.pages);
  return { locale:'kr', retrievedAt:new Date().toISOString(), totalCount:first.total, pagesCollected:first.pages, items };
}

function digest(file) { return createHash('sha256').update(readFileSync(file)).digest('hex'); }

function promote(stagedSnapshot, stagedCatalog, snapshot, catalog, before, working) {
  const lock = snapshot + '.refresh-lock';
  let fd;
  try {
    fd = openSync(lock, 'wx');
    if (digest(snapshot) !== before) throw Error('Another refresh updated the snapshot during collection.');
    const backup = join(working, 'before.js');
    copyFileSync(snapshot, backup);
    renameSync(stagedSnapshot, snapshot);
    try { renameSync(stagedCatalog, catalog); }
    catch (error) { renameSync(backup, snapshot); throw error; }
  } finally {
    if (fd !== undefined) { closeSync(fd); unlinkSync(lock); }
  }
}

export async function refreshVisitJeju({
  apiKey = process.env.VISITJEJU_API_KEY,
  snapshot = join(root, 'east-places.js'), catalog = join(root, 'app-data', 'catalog.json'),
  fetchPage = fetch, wait = pause
} = {}) {
  if (!apiKey?.trim()) throw Error('Set server-side VISITJEJU_API_KEY before refreshing.');
  const before = digest(snapshot);
  const raw = await collect(apiKey.trim(), fetchPage, wait);
  const working = await mkdtemp(join(dirname(snapshot), '.visitjeju-refresh-'));
  try {
    const stagedSnapshot = join(working, 'east-places.js'), stagedCatalog = join(working, 'catalog.json');
    await writeFile(join(working, 'visitjeju-ko-pages-1-' + raw.pagesCollected + '.json'), JSON.stringify(raw));
    const run = (script, args) => execFileSync(process.execPath, [join(root, 'scripts', script), ...args],
      { encoding:'utf8', windowsHide:true, stdio:['ignore','pipe','pipe'] });
    const imported = JSON.parse(run('import-eastern-places.mjs', [working, stagedSnapshot]));
    if (imported.sourceRows !== raw.totalCount || imported.uniqueSourceIds !== raw.totalCount ||
        !districts.every(key => imported.areas[key] > 0) || !categories.every(key => imported.categories[key] > 0)) {
      throw Error('VisitJeju response is missing eastern districts or travel categories.');
    }
    run('build-catalog.mjs', ['--snapshot', stagedSnapshot, '--output', stagedCatalog]);
    promote(stagedSnapshot, stagedCatalog, snapshot, catalog, before, working);
    return { pages:raw.pagesCollected, total:raw.totalCount, easternPlaces:imported.items, retrievedAt:raw.retrievedAt };
  } finally {
    await rm(working, { recursive:true, force:true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    // Same-project secrets only. Existing process values take precedence.
    try { process.loadEnvFile(join(root, '.env.local')); }
    catch (error) { if (error.code !== 'ENOENT') throw Error('Unable to load the project .env.local'); }
    console.log(JSON.stringify(await refreshVisitJeju()));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
