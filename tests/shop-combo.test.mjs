import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateCombo } from '../workers/mottameister-services-api/src/shop-combo.js';

const products = {
  cobbledollars_1m: { type: 'cobbledollars', amount: 9.9, cobbleDollars: 1000000 },
  cobbledollars_5m: { type: 'cobbledollars', amount: 29.9, cobbleDollars: 5000000 },
  cobbledollars_15m: { type: 'cobbledollars', amount: 54.9, cobbleDollars: 15000000 },
  cobbledollars_30m: { type: 'cobbledollars', amount: 99.9, cobbleDollars: 30000000 },
  claims_5: { type: 'opac_claim_bonus', amount: 9.9, claimChunks: 5 },
  claims_12: { type: 'opac_claim_bonus', amount: 19.9, claimChunks: 12 },
  claims_20: { type: 'opac_claim_bonus', amount: 29.9, claimChunks: 20 },
  claims_45: { type: 'opac_claim_bonus', amount: 54.9, claimChunks: 45 },
  claims_60: { type: 'opac_claim_bonus', amount: 69.9, claimChunks: 60 },
  coruja_plus: { type: 'membership', amount: 24.9, cobbleDollars: 2000000, claimChunks: 5, shinyEggs: 1 },
  coruja_gold: { type: 'membership', amount: 64.9, cobbleDollars: 10000000, claimChunks: 12, shinyEggs: 3 },
  coruja_diamond: { type: 'membership', amount: 99.9, cobbleDollars: 20000000, claimChunks: 20, shinyEggs: 4 },
  chunk_loader_1: { type: 'opac_forceload', amount: 99.9 },
  shiny_cookie: { type: 'shiny_cookie', amount: 99.9 },
  ace_trainer_toca: { type: 'manual_fulfillment', amount: 19.9 },
};
const items = (...skus) => skus.map((sku) => ({ sku, quantity: 1 }));

test('combo discounts grow by distinct benefit and server computes the price', () => {
  assert.equal(calculateCombo(items('cobbledollars_1m'), products).comboAmount, 9.9);
  const two = calculateCombo(items('cobbledollars_1m', 'claims_5'), products);
  assert.equal(two.comboDiscountPercent, 5);
  assert.equal(two.comboAmount, 18.81);
  const three = calculateCombo(items('cobbledollars_1m', 'claims_5', 'shiny_cookie'), products);
  assert.equal(three.comboDiscountPercent, 10);
  assert.equal(three.comboAmount, 107.73);
  const four = calculateCombo(items('cobbledollars_1m', 'claims_5', 'shiny_cookie', 'chunk_loader_1'), products);
  assert.equal(four.comboDiscountPercent, 15);
  assert.equal(four.comboAmount, 186.66);
});

test('combo aggregates deliveries and identifies manual work', () => {
  const combo = calculateCombo(items('coruja_gold', 'claims_12', 'shiny_cookie', 'ace_trainer_toca'), products);
  assert.equal(combo.membershipSku, 'coruja_gold');
  assert.equal(combo.cobbleDollars, 10000000);
  assert.equal(combo.claimChunks, 24);
  assert.equal(combo.shinyEggs, 3);
  assert.equal(combo.shinyCookies, 1);
  assert.equal(combo.hasManualItems, true);
  assert.equal(combo.hasAutomaticItems, true);
});

test('new tiers aggregate the diamond benefits with extra cash and claims', () => {
  const combo = calculateCombo(items('coruja_diamond', 'cobbledollars_15m', 'claims_45'), products);
  assert.equal(combo.membershipSku, 'coruja_diamond');
  assert.equal(combo.cobbleDollars, 35000000);
  assert.equal(combo.claimChunks, 65);
  assert.equal(combo.shinyEggs, 4);
  assert.equal(combo.comboDiscountPercent, 10);
  assert.equal(combo.comboAmount, 188.73);
});

test('combo rejects duplicate benefits, two memberships and invalid quantities', () => {
  assert.throws(() => calculateCombo(items('claims_5', 'claims_5'), products));
  assert.throws(() => calculateCombo(items('coruja_plus', 'coruja_gold'), products));
  assert.throws(() => calculateCombo(items('coruja_gold', 'coruja_diamond'), products));
  assert.throws(() => calculateCombo([{ sku: 'chunk_loader_1', quantity: 2 }], products));
  assert.throws(() => calculateCombo([{ sku: 'shiny_cookie', quantity: 4 }], products));
  assert.throws(() => calculateCombo([{ sku: 'kit_ferro', quantity: 1 }], products));
  assert.throws(() => calculateCombo([{ sku: 'mundo_toca_download', quantity: 1 }], products));
});
