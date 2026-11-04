// Запуск: npm test. Серверная часть помощника — с подменённым fetch (без настоящего Gemini).
const test = require('node:test');
const assert = require('node:assert/strict');

let worker;
test.before(async () => { worker = await import('../worker/worker.js'); });

const req = (body, origin) => new Request('https://w.test/', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin || 'https://site.test', 'CF-Connecting-IP': String(Math.random()) },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});
const env = { GEMINI_API_KEY: 'secret-key', ALLOWED_ORIGIN: 'https://site.test' };

test('проверка входных данных', () => {
  const { validate } = worker;
  assert.ok(validate({}).error);
  assert.ok(validate({ messages: [{ role: 'user', text: '' }] }).error);
  assert.ok(validate({ messages: [{ role: 'user', text: 'x'.repeat(2001) }] }).error);
  assert.ok(validate({ messages: [{ role: 'assistant', text: 'привет' }] }).error);
  const ok = validate({ messages: [{ role: 'user', text: 'почему?' }], context: 'Тема: Пределы' });
  assert.equal(ok.messages.length, 1);
  assert.equal(ok.context, 'Тема: Пределы');
});

test('запрос к Gemini: роли, системная инструкция, контекст', () => {
  const r = worker.buildGeminiRequest([{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b' }, { role: 'user', text: 'c' }], 'Задача: x^2');
  assert.deepEqual(r.contents.map((c) => c.role), ['user', 'model', 'user']);
  assert.match(r.systemInstruction.parts[0].text, /преподаватель/);
  assert.match(r.systemInstruction.parts[0].text, /Задача: x\^2/);
});

test('успешный ответ; ключ уходит только в заголовке к Google', async () => {
  let seen;
  global.fetch = async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'Ответ \\(x^2\\)' }] } }] }), { status: 200 });
  };
  const res = await worker.default.fetch(req({ messages: [{ role: 'user', text: 'Что такое предел?' }], context: 'Тема: Пределы' }), env);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.text, 'Ответ \\(x^2\\)');
  assert.match(seen.url, /generativelanguage\.googleapis\.com\/v1beta\/models\/gemini-2\.5-flash:generateContent/);
  assert.equal(seen.init.headers['x-goog-api-key'], 'secret-key');
  assert.ok(!seen.url.includes('secret-key'));
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), 'https://site.test');
  assert.ok(!JSON.stringify(data).includes('secret-key'));
});

test('ошибки: чужой сайт, нет ключа, лимит модели, кривой JSON, OPTIONS', async () => {
  global.fetch = async () => new Response('{}', { status: 429 });
  let res = await worker.default.fetch(req({ messages: [{ role: 'user', text: 'q' }] }, 'https://evil.test'), env);
  assert.equal(res.status, 403);
  res = await worker.default.fetch(req({ messages: [{ role: 'user', text: 'q' }] }), { ALLOWED_ORIGIN: 'https://site.test' });
  assert.equal(res.status, 500); // нет ни ключа, ни Workers AI
  res = await worker.default.fetch(req({ messages: [{ role: 'user', text: 'q' }] }), env);
  assert.equal(res.status, 429);
  assert.match((await res.json()).error, /лимит/);
  res = await worker.default.fetch(req('не json'), env);
  assert.equal(res.status, 400);
  res = await worker.default.fetch(new Request('https://w.test/', { method: 'OPTIONS', headers: { Origin: 'https://site.test' } }), env);
  assert.equal(res.status, 204);
});

test('ограничение частоты запросов с одного адреса', async () => {
  global.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }), { status: 200 });
  const mk = () => new Request('https://w.test/', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://site.test', 'CF-Connecting-IP': '1.2.3.4' }, body: JSON.stringify({ messages: [{ role: 'user', text: 'q' }] }) });
  let last;
  for (let i = 0; i < 21; i++) last = await worker.default.fetch(mk(), env);
  assert.equal(last.status, 429);
});

test('без ключа Gemini — бесплатная модель Cloudflare Workers AI', async () => {
  let call;
  const AI = { run: async (model, input) => { call = { model, input }; return { response: 'Ответ модели Cloudflare' }; } };
  global.fetch = async () => { throw new Error('в Google ходить не должны'); };
  const res = await worker.default.fetch(req({ messages: [{ role: 'user', text: 'Объясни предел' }], context: 'Тема: Пределы' }), { ALLOWED_ORIGIN: 'https://site.test', AI });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).text, 'Ответ модели Cloudflare');
  assert.match(call.model, /^@cf\//);
  assert.equal(call.input.messages[0].role, 'system');
  assert.match(call.input.messages[0].content, /Тема: Пределы/);
  assert.equal(call.input.messages[1].content, 'Объясни предел');
  const AI2 = { run: async () => { throw new Error('daily neuron limit exceeded'); } };
  const r2 = await worker.default.fetch(req({ messages: [{ role: 'user', text: 'q' }] }), { ALLOWED_ORIGIN: 'https://site.test', AI: AI2 });
  assert.equal(r2.status, 429);
});
