const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function panel(fetch) {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', innerHTML: '', textContent: '', disabled: false,
      events: {}, addEventListener(name, action) { this.events[name] = action; },
      click() {}, remove() {}
    });
    return elements.get(selector);
  };
  let exported;
  const context = {
    document: {
      querySelector: element,
      querySelectorAll: () => [element('[data-load]'), element('[data-export]')],
      createElement: () => element('download'), body: { append() {} }
    },
    fetch, Blob, URL: { createObjectURL(blob) { exported = blob; return 'blob:test'; }, revokeObjectURL() {} }
  };
  const html = fs.readFileSync('coruja-cup/admin/index.html', 'utf8');
  vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], context);
  return { element, exported: () => exported };
}

test('admin requests only October registrations with bearer authentication; filters and escapes participant data', async () => {
  const ui = panel(async (url, options) => {
    assert.match(url, /eventId=torneio-das-sombras-2026-10-24$/);
    assert.equal(options.headers.Authorization, 'Bearer test-only-token');
    return { ok: true, json: async () => ({ registrations: [
      { minecraftNick: 'Coruja', discordName: '<img onerror=alert(1)>', status: 'confirmed', createdAt: '2026-10-06T12:00:00Z' }
    ] }) };
  });
  ui.element('#adminToken').value = 'test-only-token';
  await ui.element('[data-load]').events.click();
  assert.match(ui.element('[data-table]').innerHTML, /&lt;img/);
  assert.doesNotMatch(ui.element('[data-table]').innerHTML, /<img/);
  ui.element('#participantSearch').value = 'missing';
  ui.element('#participantSearch').events.input();
  assert.match(ui.element('[data-table]').innerHTML, /Nenhuma inscrição/);
});

test('CSV exports accented text, quotes, commas, newlines and neutralizes spreadsheet formulas', async () => {
  const ui = panel(async () => ({ ok: true, json: async () => ({ registrations: [
    { eventId: 'torneio-das-sombras-2026-10-24', minecraftNick: 'Coruja', discordName: '@coruja', notes: '=HYPERLINK("bad")\nObservação, teste', rulesAccepted: true }
  ] }) }));
  ui.element('#adminToken').value = 'test-only-token';
  await ui.element('[data-export]').events.click();
  const bytes = new Uint8Array(await ui.exported().arrayBuffer());
  assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
  const csv = await ui.exported().text();
  assert.match(csv, /"'@coruja"/);
  assert.match(csv, /"'=HYPERLINK\(""bad""\)\nObservação, teste"/);
  assert.match(csv, /"true"/);
  assert.match(ui.element('download').download, /2026-10-24\.csv$/);
});

test('missing credentials and failed requests do not export data or leave buttons disabled', async () => {
  const ui = panel(async () => { throw new Error('network unavailable'); });
  await ui.element('[data-export]').events.click();
  assert.match(ui.element('[data-message]').textContent, /Digite o token/);
  assert.equal(ui.exported(), undefined);
  ui.element('#adminToken').value = 'test-only-token';
  await ui.element('[data-load]').events.click();
  assert.match(ui.element('[data-message]').textContent, /Não foi possível conectar/);
  assert.equal(ui.element('[data-load]').disabled, false);
});
