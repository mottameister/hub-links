import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../workers/coruja-cup-api/src/index.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const eventId = 'torneio-das-sombras-2026-10-24';

function fixture(count = 17, event = eventId) {
  const values = new Map();
  for (let i = 0; i < count; i++) {
    const row = { id: `player-${i}`, eventId: event, minecraftNick: `Player${i}`, discordName: `player${i}`, status: i < 9 ? 'confirmed' : 'waitlist', createdAt: new Date(Date.UTC(2026, 9, 10, 0, i)).toISOString() };
    values.set(`registration:${event}:${row.createdAt}:${row.id}`, JSON.stringify(row));
  }
  const env = { CORUJA_CUP_ADMIN_TOKEN: 'test-only-token', CORUJA_CUP: {
    list: async ({ prefix }) => ({ keys: [...values.keys()].filter(name => name.startsWith(prefix)).reverse().map(name => ({ name })), list_complete: true }),
    get: async key => values.get(key),
    put: async (key, value) => values.set(key, value)
  } };
  const call = (path, options = {}) => worker.fetch(new Request(`https://example.com/api/coruja-cup/${path}`, options), env);
  return { call, values };
}

test('capacity promotes the first seven waiting players and retains the seventeenth as reserve without rewriting records', async () => {
  const { call, values } = fixture();
  const before = [...values.entries()];
  const status = await (await call(`status?eventId=${eventId}`)).json();
  assert.deepEqual(status, { eventId, confirmed: 16, waitlist: 1, total: 17 });
  const response = await call(`registrations?eventId=${eventId}`, { headers: { Authorization: 'Bearer test-only-token' } });
  const data = await response.json();
  assert.equal(data.registrations[15].minecraftNick, 'Player15');
  assert.equal(data.registrations[15].status, 'confirmed');
  assert.equal(data.registrations[16].status, 'waitlist');
  assert.deepEqual([...values.entries()], before);
  const csv = await (await call(`registrations?eventId=${eventId}&format=csv`, { headers: { Authorization: 'Bearer test-only-token' } })).text();
  assert.equal(csv.split('\n').filter(line => line.startsWith('confirmed,')).length, 16);
  assert.equal(csv.split('\n').filter(line => line.startsWith('waitlist,')).length, 1);
});

test('the sixteenth registration is confirmed and the seventeenth enters the waiting list', async () => {
  const { call } = fixture(15);
  for (const [nick, expected] of [['LastSlot', 'confirmed'], ['Reserve', 'waitlist']]) {
    const response = await call('register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId, minecraftNick: nick, discordName: nick, rulesAccepted: true, scheduleConfirmed: true }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, expected);
  }
});

test('other editions keep their recorded statuses and private lists still require authentication', async () => {
  const { call } = fixture(17, 'previous-edition');
  const status = await (await call('status?eventId=previous-edition')).json();
  assert.equal(status.confirmed, 9);
  assert.equal(status.waitlist, 8);
  assert.equal((await call(`registrations?eventId=${eventId}`)).status, 401);
});
