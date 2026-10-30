import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';
import { calculateCombo, comboSku } from '../workers/mottameister-services-api/src/shop-combo.js';

const apiSource = fs.readFileSync(new URL('../workers/mottameister-services-api/src/index.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '').replace('export default {', 'globalThis.worker = {');
const workerPath = new URL('../scripts/coruja-shop-worker.cjs', import.meta.url);
const workerSource = fs.readFileSync(workerPath, 'utf8').replace(/main\(\)\.catch\([\s\S]*$/, '').replace('const rconCommand =', 'let rconCommand =');
function apiFixture() {
  const db = new DatabaseSync(':memory:');
  const columns = 'id environment status sku product_title amount currency cobble_dollars minecraft_nick minecraft_uuid discord_name mercado_pago_preference_id mercado_pago_payment_id last_payment_status paid_at archived_at archive_reason payment_validation requester created_at updated_at'.split(' ');
  db.exec(`CREATE TABLE shop_orders (${columns.map(c=>`${c} ${['amount','cobble_dollars'].includes(c)?'REAL':'TEXT'}`).join(',')})`);
  const DB = {prepare(sql) {
    let params = [];
    const statement = {bind(...values){params=values;return statement;},async run(){return db.prepare(sql).run(...params);},async first(){return db.prepare(sql).get(...params);},async all(){return {results:db.prepare(sql).all(...params)};}};
    return statement;
  }};
  let profileAvailable = true;
  const preferences = [];
  const context = vm.createContext({Request,Response,URL,URLSearchParams,TextEncoder,crypto:webcrypto,console,calculateCombo,comboSku,fetch:async(url,options)=>{
    if (String(url).includes('api.mojang.com')) return profileAvailable?Response.json({id:'a'.repeat(32),name:'Player_123'}):new Response('',{status:503});
    if (String(url).endsWith('/checkout/preferences') && options.method==='POST') {preferences.push(JSON.parse(options.body));return Response.json({id:'pref-1',init_point:'https://example.com/pay/pref-1'});}
    if (String(url).endsWith('/checkout/preferences/pref-1')) return Response.json({id:'pref-1',init_point:'https://example.com/pay/pref-1'});
    throw new Error('Unexpected fetch '+url);
  }});
  vm.runInContext(apiSource,context);
  const env = {DB,SHOP_ENV:'test',MERCADOPAGO_ACCESS_TOKEN:'test-only'};
  const checkoutProduct = async(payload)=>context.worker.fetch(new Request('https://example.com/api/shop/checkout',{method:'POST',body:JSON.stringify({minecraftNick:'Player_123',...payload})}),env);
  const checkout = async(quantity=1,nick='Player_123')=>checkoutProduct({sku:'chunk_loader_1',quantity,minecraftNick:nick});
  return {db,preferences,checkout,checkoutProduct,offlineProfile:()=>{profileAvailable=false;}};
}

test('loader checkout costs 99.90 and reuses pending payment across nickname changes',async()=>{
  const f=apiFixture();
  const response=await f.checkout(); assert.equal(response.status,200);
  const first=await response.json();
  assert.equal(f.preferences[0].items[0].unit_price,99.9);
  assert.equal(f.preferences[0].items[0].quantity,1);
  const repeat=await (await f.checkout(1,'Renamed_123')).json();
  assert.equal(repeat.orderId,first.orderId); assert.equal(repeat.checkoutUrl,first.checkoutUrl);
  assert.equal(f.preferences.length,1);
  f.db.exec("UPDATE shop_orders SET status='delivered',paid_at='2026-10-13'");
  assert.equal((await f.checkout()).status,409);
});

test('loader rejects multiple quantities and missing UUID, and serializes simultaneous purchases',async()=>{
  const f=apiFixture(); assert.equal((await f.checkout(2)).status,400);
  const responses=await Promise.all([f.checkout(),f.checkout()]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);
  assert.equal(f.db.prepare('SELECT COUNT(*) AS count FROM shop_orders').get().count,1);
  const unavailable=apiFixture(); unavailable.offlineProfile(); assert.equal((await unavailable.checkout()).status,503);
});

test('combo checkout prices and reserves a chunk loader across direct orders', async()=>{
  const f=apiFixture();
  const response=await f.checkoutProduct({sku:'combo_personalizado',items:[{sku:'cobbledollars_1m'},{sku:'claims_5'},{sku:'chunk_loader_1'}]});
  assert.equal(response.status,200,await response.text());
  assert.equal(f.preferences[0].items[0].unit_price,107.73);
  const row=f.db.prepare("SELECT amount, cobble_dollars, payment_validation FROM shop_orders").get();
  assert.equal(row.amount,107.73);
  assert.equal(row.cobble_dollars,1000000);
  assert.equal(JSON.parse(row.payment_validation).combo.hasChunkLoader,true);
  assert.equal((await f.checkout()).status,409);
});

test('subscription prices match the new tiers and world download is closed', async()=>{
  for (const [sku, price] of [['coruja_plus',24.9],['coruja_plus_plus',39.9],['coruja_gold',64.9],['coruja_diamond',99.9]]) {
    const f=apiFixture();
    const response=await f.checkoutProduct({sku});
    assert.equal(response.status,200,`${sku}: ${await response.text()}`);
    assert.equal(f.preferences[0].items[0].unit_price,price);
  }
  const closed=apiFixture();
  assert.equal((await closed.checkoutProduct({sku:'mundo_toca_download'})).status,409);
});

test('new cash and claim tiers use their published prices', async()=>{
  for (const [sku, price] of [
    ['cobbledollars_15m',54.9],['cobbledollars_30m',99.9],
    ['claims_20',29.9],['claims_45',54.9],['claims_60',69.9],
  ]) {
    const f=apiFixture();
    const response=await f.checkoutProduct({sku});
    assert.equal(response.status,200,`${sku}: ${await response.text()}`);
    assert.equal(f.preferences[0].items[0].unit_price,price);
  }
});

test('delivery worker recognizes direct and combo diamond commands', async()=>{
  const context=vm.createContext({require:createRequire(workerPath),process:{env:{SHOP_DRY_RUN:'true'}},Buffer,console,setTimeout,clearTimeout,fetch});
  vm.runInContext(workerSource+`\nglobalThis.parseDiamond = parseMembershipCommand; globalThis.parseDiamondCombo = parseComboCommand; globalThis.deliverDiamond = executeDeliveryCommand;`,context);
  const direct='coruja-membership grant Player_123 diamond 20000000 20 4 31';
  const combo='coruja-combo grant Player_123 35000000 65 4 diamond 31 0 0';
  assert.equal(context.parseDiamond(direct).tier,'diamond');
  assert.equal(context.parseDiamondCombo(combo).totalClaimChunks,65);
  assert.match(await context.deliverDiamond({orderId:'test-only'},direct),/20000000/);
  assert.match(await context.deliverDiamond({orderId:'test-only'},combo),/35000000/);
});

function deliveryFixture({bonus=0,offline=false,rejectSet=false,offlinePlayer=false}={}) {
  let value=bonus; const commands=[];
  const context=vm.createContext({require:createRequire(workerPath),process:{env:{SHOP_DRY_RUN:'false'}},Buffer,console,setTimeout,clearTimeout,fetch});
  vm.runInContext(workerSource+`\nrconCommand = async (command) => globalThis.mockRcon(command); globalThis.deliverLoader = executeDeliveryCommand;`, context);
  context.mockRcon=async command=>{commands.push(command);if(offlinePlayer)return 'No player was found';if(command.includes('get claims.forceload.offlineForceload'))return '([Player_123]) claims.forceload.offlineForceload = '+(offline?'ON':'OFF');if(command.includes('get claims.bonusChunkForceloads'))return '([Player_123]) claims.bonusChunkForceloads = '+value;if(command.includes('set claims.bonusChunkForceloads 1')){if(!rejectSet)value=1;return 'Option claims.bonusChunkForceloads was set to 1.';}throw new Error('Unexpected RCON');};
  return {commands,deliver:()=>context.deliverLoader({orderId:'test-only'},'opac-forceload grant Player_123 1')};
}

test('loader delivery grants once, verifies readback, and safely repeats after a timeout',async()=>{
  const f=deliveryFixture(); assert.match(await f.deliver(),/confirmed/);assert.match(await f.deliver(),/confirmed/);
  assert.equal(f.commands.filter(c=>c.includes(' set ')).length,1);
});

test('loader refuses offline mode, missing player, excess bonus and unconfirmed write',async()=>{
  for (const options of [{offline:true},{offlinePlayer:true},{bonus:2},{rejectSet:true}]) await assert.rejects(deliveryFixture(options).deliver());
});
