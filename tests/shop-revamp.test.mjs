import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import worker from "../workers/mottameister-services-api/src/index.js";

const require = createRequire(import.meta.url);
const { buildKitCommand, kitItems } = require("../scripts/shop-kit-command.cjs");

test("each kit is a single RCON give with full armor and five tools", () => {
  for (const tier of ["iron", "diamond", "netherite"]) {
    const command = buildKitCommand("Player_123", tier);
    const items = kitItems(tier);
    assert.equal(items.length, 9);
    assert.ok(command.startsWith("give Player_123 shulker_box[container=["));
    assert.equal((command.match(/\{slot:/g) || []).length, 9);
    assert.ok(command.endsWith("]] 1"));
    for (const [id] of items) assert.ok(command.includes(`id:'${id}'`));
    assert.ok(command.length < 1400, `${tier} kit should fit the live RCON command limit`);
  }
  assert.match(buildKitCommand("Player_123", "netherite"), /mending:1/);
  assert.match(buildKitCommand("Player_123", "netherite"), /efficiency:5/);
  assert.throws(() => buildKitCommand("bad nick", "iron"));
});

const mockDb = () => {
  const state = { approvedBrl: 0, monthBrl: 0 };
  return {
    state,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes("COALESCE(SUM(amount)")) {
                assert.match(sql, /last_payment_status = 'approved'/);
                assert.match(sql, /paid_at >= \?/);
                assert.match(sql, /mercado_pago_payment_id NOT LIKE 'coupon:%'/);
                assert.equal(params[2], "2026-09-24T02:37:25.738Z");
                return { approved_brl: state.approvedBrl, month_brl: state.monthBrl };
              }
              throw new Error("Unexpected query");
            },
          };
        },
      };
    },
  };
};

test("goal starts at the shop launch, shows only a percentage, and caps at 100%", async () => {
  const DB = mockDb();
  const env = { DB, SHOP_ENV: "test" };
  const get = () => worker.fetch(new Request("https://example.com/api/shop/server-goal"), env);
  const initial = await (await get()).json();
  assert.equal(initial.active, true);
  assert.equal(initial.progressPercent, 0);
  assert.equal(initial.startedAt, "2026-09-24T02:37:25.738Z");

  DB.state.approvedBrl = 19.8;
  DB.state.monthBrl = 19.8;
  const smallPurchases = await (await get()).json();
  assert.equal(smallPurchases.progressPercent, 0.4);
  assert.equal(smallPurchases.monthContributionPercent, 0.4);

  DB.state.approvedBrl = 2750;
  DB.state.monthBrl = 550;
  const halfway = await (await get()).json();
  assert.equal(halfway.progressPercent, 50);
  assert.equal(halfway.monthContributionPercent, 10);
  assert.equal(halfway.reached, false);
  assert.equal(Object.hasOwn(halfway, "approvedBrl"), false);
  assert.equal(Object.hasOwn(halfway, "targetBrl"), false);

  DB.state.approvedBrl = 6000;
  const reached = await (await get()).json();
  assert.equal(reached.progressPercent, 100);
  assert.equal(reached.reached, true);
});
