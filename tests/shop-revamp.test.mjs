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
    assert.ok(command.startsWith("give Player_123 minecraft:shulker_box[minecraft:container=["));
    assert.equal((command.match(/\{slot:/g) || []).length, 9);
    assert.ok(command.endsWith("]] 1"));
    for (const [id] of items) assert.ok(command.includes(`id:'minecraft:${id}'`));
  }
  assert.match(buildKitCommand("Player_123", "netherite"), /'minecraft:mending':1/);
  assert.match(buildKitCommand("Player_123", "netherite"), /'minecraft:efficiency':5/);
  assert.throws(() => buildKitCommand("bad nick", "iron"));
});

const mockDb = () => {
  const state = { goal: null, approvedBrl: 0 };
  return {
    state,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              if (sql.includes("FROM shop_funding_goals")) return state.goal;
              if (sql.includes("COALESCE(SUM(amount)")) {
                assert.match(sql, /last_payment_status = 'approved'/);
                assert.match(sql, /paid_at >= \?/);
                assert.match(sql, /mercado_pago_payment_id NOT LIKE 'coupon:%'/);
                assert.equal(params[2], state.goal.started_at);
                return { approved_brl: state.approvedBrl, month_brl: state.monthBrl };
              }
              throw new Error("Unexpected query");
            },
            async run() {
              if (sql.includes("INSERT OR IGNORE INTO shop_funding_goals") && !state.goal) {
                state.goal = { started_at: params[2], target_brl: params[3] };
              }
              return { success: true };
            },
          };
        },
        async run() { return { success: true }; },
      };
    },
  };
};

test("goal starts once, shows only a percentage, and caps at 100%", async () => {
  const DB = mockDb();
  const env = { DB, SHOP_ENV: "test", SHOP_ADMIN_TOKEN: "test-admin-token" };
  const get = () => worker.fetch(new Request("https://example.com/api/shop/server-goal"), env);
  const start = () => worker.fetch(new Request("https://example.com/api/shop/server-goal/activate", {
    method: "POST", headers: { "x-shop-admin-token": "test-admin-token" },
  }), env);

  assert.deepEqual(await (await get()).json(), { active: false, progressPercent: 0, startedAt: null });
  assert.equal((await worker.fetch(new Request("https://example.com/api/shop/server-goal/activate", { method: "POST" }), env)).status, 401);
  const activated = await (await start()).json();
  assert.equal(activated.active, true);
  assert.equal(activated.progressPercent, 0);
  assert.equal(DB.state.goal.target_brl, 5500);
  const originalStart = DB.state.goal.started_at;
  await start();
  assert.equal(DB.state.goal.started_at, originalStart);

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
