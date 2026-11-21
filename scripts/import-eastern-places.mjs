// Rebuild offline using a Korean-language VisitJeju API export. No credentials are needed.
//   node scripts/import-eastern-places.mjs [snapshot-directory] [output.js]
import { readFileSync, readdirSync, writeFileSync, renameSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const input = resolve(process.argv[2] ?? "../jejuinfo/research_notes/ingestion");
const output = resolve(process.argv[3] ?? fileURLToPath(new URL("../east-places.js", import.meta.url)));
const areas = [
  ["15", "조천읍", "jocheon"], ["16", "구좌읍", "gujwa"], ["17", "성산읍", "seongsan"],
  ["26", "표선면", "pyoseon"], ["25", "남원읍", "namwon"], ["31", "우도면", "udo"],
];
// The first two pairs share coordinates despite different addresses. The last two records
// respectively point to Jeju city and the Gujwa end of an inter-district coastal road.
const knownImprecise = new Set([
  "CNTS_000000000018578", "CNTS_000000000018870", "CNTS_200000000007630", "CNTS_200000000007851",
  "CONT_000000000500213", "CONT_000000000500668",
]);
const districtName = /([가-힣]+(?:읍|면))(?=$|[\s,()])/gu;
const clean = (value) => typeof value === "string" ? value.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/(?:&nbsp;|\s)+/g, " ").trim() : "";
const tagsOf = (value) => clean(value).split(/[,·#]/u).map(tag => tag.trim()).filter(Boolean);

function districtOf(record) {
  const district = String(record.region2cd?.value ?? "");
  const byCode = areas.find(([code]) => code === district);
  const combined = [clean(record.address), clean(record.roadaddress)].join(" ");
  const named = new Set([...combined.matchAll(districtName)].map(match => match[1]));
  if (named.size > 1) return null;
  const namedDistrict = [...named][0];
  const byName = areas.find(([, label]) => label === namedDistrict);
  if ((namedDistrict && !byName) || (district && !byCode) || (byCode && byName && byCode !== byName)) return null;
  return byCode ?? byName ?? null;
}

function villageOf(record, label) {
  const address = [clean(record.address), clean(record.roadaddress)].join(" ");
  const village = new RegExp(label + "\\s+([가-힣]{1,8}(?:[12]리|리))(?=\\s|$|[,()])", "u").exec(address);
  return village?.[1] ?? /\(([가-힣]{1,8}(?:[12]리|리))\)/u.exec(address)?.[1] ?? "";
}

function categoryOf(record, overrides) {
  const approved = overrides.get(record.contentsid);
  if (approved) return approved;
  const code = record.contentscd?.value;
  const title = clean(record.title);
  const tags = tagsOf(record.tag);
  if (code === "c3") return "stay";
  if (code === "c4") {
    const cafe = /카페|까페|커피|로스터리|coffee|café|cafe/i.test(title) ||
      tags.some(tag => tag.endsWith("카페") || ["커피전문점", "로스터리", "커피숍"].includes(tag));
    return cafe ? "cafe" : "food";
  }
  if (code === "c1") {
    const activity = /체험|공방|레일바이크|서핑스쿨|카트장|승마장|다이빙센터|스쿠버|카약|공예교실/.test(title) ||
      tags.some(tag => /^(?:승마체험|도예체험|농촌체험|해녀체험|어촌체험|감귤체험|공예체험|서핑체험|낚시체험|요트체험|카약체험)$/.test(tag));
    return activity ? "experience" : "sight";
  }
  return null;
}

function positionOf(record, area, address) {
  const { latitude: lat, longitude: lon } = record;
  if (knownImprecise.has(record.contentsid) || !Number.isFinite(lat) || !Number.isFinite(lon) ||
    lat < 33.19 || lat > 33.59 || lon < 126.14 || lon > 127.0) return [null, null];
  // Udo is separated from the main island by sea. Supplement the textual selection with a
  // conservative island envelope to discard obvious wrong-island points from the source.
  const insideUdo = lat >= 33.484 && lat <= 33.531 && lon >= 126.934 && lon <= 126.977;
  if ((area === "udo") !== insideUdo || !address) return [null, null];
  return [lat, lon];
}

const files = readdirSync(input).filter(name => /^visitjeju-ko-pages-\d+-\d+\.json$/.test(name)).sort();
if (!files.length) throw new Error("No Korean VisitJeju page snapshots in " + input);
const snapshots = files.map(file => JSON.parse(readFileSync(join(input, file), "utf8")))
  .sort((a, b) => a.retrievedAt.localeCompare(b.retrievedAt));
const raw = new Map();
let totalRows = 0;
for (const snapshot of snapshots) {
  if (!["kr", "ko"].includes(snapshot.locale) || !Array.isArray(snapshot.items)) throw new Error("Expected Korean API export");
  totalRows += snapshot.items.length;
  for (const item of snapshot.items) {
    if (/^(?:CONT|CNTS)_\d{15}$/.test(item.contentsid)) raw.set(item.contentsid, item);
  }
}

// Curated editorial classification for places published under a broader VisitJeju tag.
const overrides = new Map([
  ["CNTS_200000000013791", "experience"], ["CNTS_200000000010373", "experience"],
  ["CNTS_300000000016096", "experience"], ["CONT_000000000500588", "experience"],
  ["CNTS_000000000018956", "experience"], ["CNTS_000000000000976", "experience"],
  ["CNTS_300000000015972", "cafe"], ["CNTS_300000000013273", "cafe"],
  ["CNTS_200000000012675", "cafe"], ["CNTS_000000000020477", "cafe"],
  ["CNTS_200000000013105", "cafe"], ["CNTS_000000000018357", "cafe"], ["CNTS_000000000020064", "cafe"],
]);
const items = [];
const positions = new Map();
for (const record of raw.values()) {
  // The API snapshot is an export of publicly listed content. Honor explicit flags if present.
  if ([record.publicyn, record.useyn, record.webuseyn].some(flag => String(flag).toUpperCase() === "N")) continue;
  const district = districtOf(record);
  const category = categoryOf(record, overrides);
  const name = clean(record.title);
  if (!district || !category || !name || /[[(](?:폐업|폐점|영업종료|영업종료안내)[)\]]/.test(name)) continue;
  const [, label, area] = district;
  const address = clean(record.roadaddress) || clean(record.address);
  if (!address && !record.region2cd?.value) continue;
  const [lat, lon] = positionOf(record, area, address);
  const id = record.contentsid;
  const item = { id, area, name, category, village: villageOf(record, label),
    address, lat, lon, url: "https://www.visitjeju.net/kr/detail/view?contentsid=" + id };
  items.push(item);
  if (lat !== null) {
    const key = lat.toFixed(4) + "," + lon.toFixed(4);
    const group = positions.get(key) ?? [];
    group.push(item);
    positions.set(key, group);
  }
}
for (const group of positions.values()) {
  if (new Set(group.map(item => item.address)).size > 1) {
    for (const item of group) { item.lat = null; item.lon = null; }
  }
}
if (!items.length) throw new Error("No qualifying eastern places. Existing output has been preserved.");
items.sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name, "ko") || a.id.localeCompare(b.id));
const payload = { source: "제주관광공사 비짓제주 국문 관광정보 API", sourceUrl: "https://www.data.go.kr/data/15076361/openapi.do",
  retrievedAt: snapshots.at(-1).retrievedAt, totalRows, items };
const temporary = output + "." + process.pid + ".tmp";
writeFileSync(temporary, "window.EAST_PLACES=" + JSON.stringify(payload).replaceAll("<", "\\u003c") + ";\n");
renameSync(temporary, output);
const counts = (field) => Object.fromEntries([...new Set(items.map(x => x[field]))].map(key => [key, items.filter(x => x[field] === key).length]));
console.log(JSON.stringify({ sourceRows: totalRows, uniqueSourceIds: raw.size, items: items.length,
  located: items.filter(item => item.lat !== null).length, areas: counts("area"), categories: counts("category"), retrievedAt: payload.retrievedAt }));
