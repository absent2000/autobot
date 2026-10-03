const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { stripTypeScriptTypes } = require("node:module");

let handler;
let query;
let params;
let rows = [];
let detail = [];
const sql = () => Promise.resolve(detail);
sql.unsafe = (text, values) => { query = text; params = values; return Promise.resolve(rows); };
const src = stripTypeScriptTypes(fs.readFileSync(__dirname + "/index.ts", "utf8"))
  .replace(/^import .*;$/gm, "");
vm.runInNewContext(src, {
  postgres: () => sql, Deno: { env: { get: () => "mock-db" }, serve: fn => { handler = fn; } },
  URL, Request, Response, TextEncoder, TextDecoder, atob, btoa, console, Date
});
const raw = {
  parser_id: "123", market: "iaai_us", source: "iaai", lot_id: "46231751",
  vin: null, is_active: true, archived: false, archive_reason: null, image_count: 2,
  first_seen: "2026-09-29T07:00:00Z", last_seen: "2026-09-29T14:00:00Z",
  general: { title: "TEST MOTORCYCLE", vin_masked: "ABC**************",
    url: "https://www.iaai.com/VehicleDetail/123~US" },
  auction: { pre_bid: 125, min_bid: 250, buy_now_price: 300, currency: "USD",
    auction_date: "2026-09-30T16:00:00Z" },
  condition: { keys: "yes", odometer: 4000 },
  specs: { make: "Honda", model: "Rebel", year: 2020, vehicle_type: "motorcycle" },
  first_image: { position: 2, url: "https://vis.iaai.com/resizer?imageKeys=123~SID~B531~S0~I2" },
  images: [
    { position: 2, url: "https://vis.iaai.com/resizer?imageKeys=123~SID~B531~S0~I2" },
    { position: 1, url: "https://vis.iaai.com/resizer?imageKeys=123~SID~B531~S0~I1" }
  ],
  page_id: "123", page_ts: "2026-09-29 14:00:00.123456+00"
};
const request = async path => {
  const response = await handler(new Request("https://example.com/functions/v1/cars24-public-api/" + path));
  return { status: response.status, body: await response.json(), headers: response.headers };
};
(async () => {
  rows = [raw, { ...raw, parser_id: "122", page_id: "122" }];
  let r = await request("lots?source=iaai&type=moto&make=honda&model=rebel&year=2020&buy_now=1&auction_date=2026-09-30&limit=1");
  assert.equal(r.status, 200);
  assert.equal(r.body.data.length, 1);
  assert.equal(r.body.has_more, true);
  assert.equal(r.body.data[0].current_bid, null);
  assert.equal(r.body.data[0].pre_bid, 125);
  assert.equal(r.body.data[0].vin, null);
  assert.equal(r.body.data[0].vin_status, "masked");
  assert(query.includes("p.model_key = ") && query.includes("p.auction_day = ") && query.includes("p.has_buy_now = true"));
  assert(params.includes("rebel") && params.includes("2026-09-30"));
  const cursor = r.body.next_cursor;
  r = await request("lots?source=iaai&type=moto&make=honda&model=rebel&year=2020&buy_now=1&auction_date=2026-09-30&limit=1&cursor=" + cursor);
  assert.equal(r.status, 200);
  assert(query.includes("(p.stream_at,p.parser_id) <"));
  assert(params.includes("2026-09-29 14:00:00.123456+00"));
  r = await request("lots?source=iaai&type=moto&cursor=" + cursor);
  assert.equal(r.status, 400);
  detail = [{ ...raw, is_active: false, archived: true, archive_reason: "gone" }];
  r = await request("lot?key=iaai-46231751-123");
  assert.equal(r.status, 200);
  assert.equal(r.body.data.status, "inactive");
  assert.equal(r.body.data.archive_reason, "gone");
  assert.equal(r.body.data.photos.length, 2);
  assert(r.body.data.photos[0].includes("~I1"));
  assert.equal(r.body.data.photo_count, 2);
  r = await request("lots?page=101");
  assert.equal(r.status, 400);
  console.log("Local route contract checks passed");
})().catch(err => { console.error(err); process.exitCode = 1; });
