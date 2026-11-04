// ИИ-помощник «Математики по шагам»: серверная часть для Cloudflare Workers (бесплатный тариф).
// Принимает вопрос с сайта, добавляет инструкцию для модели и пересылает в Google Gemini.
// Ключ Gemini хранится в секрете GEMINI_API_KEY и никогда не попадает на страницу.
//
// Переменные (wrangler.toml / настройки воркера):
//   GEMINI_API_KEY  — секрет, ключ из Google AI Studio (обязательно)
//   GEMINI_MODEL    — модель, по умолчанию gemini-2.5-flash
//   ALLOWED_ORIGIN  — адрес сайта, например https://mrsolo743-dot.github.io (через запятую можно несколько)
//
// Если ключа Gemini нет (например, Gemini API недоступен в вашей стране), используется
// бесплатная модель Cloudflare Workers AI — нужна только привязка AI в wrangler.toml:
//   CF_MODEL        — модель Workers AI, по умолчанию @cf/meta/llama-3.3-70b-instruct-fp8-fast

const SYSTEM_PROMPT = [
  'Ты — терпеливый преподаватель высшей математики на учебном сайте «Математика по шагам».',
  'Отвечай по-русски, ясно и по шагам. Главное — объяснить, откуда что берётся и почему шаг законен.',
  'Если студент спрашивает про задачу тренажёра, не выдавай сразу готовый ответ: сначала дай подсказку или наводящий вопрос.',
  'Полное решение показывай, только если студент прямо его просит.',
  'Если в вопросе есть ошибка в рассуждении, мягко укажи, где именно она.',
  'Формулы пиши в LaTeX: строчные в \\( … \\), выключные в \\[ … \\]. Не используй $…$.',
  'Отвечай коротко: обычно не больше 10–12 строк. Без лишних вступлений.',
  'Если вопрос не про математику, вежливо верни разговор к учёбе.',
].join('\n');

const MAX_MESSAGE = 2000;   // символов в одном сообщении
const MAX_HISTORY = 12;     // сообщений в истории диалога
const MAX_CONTEXT = 3000;   // символов контекста страницы
const RATE_LIMIT = 20;      // запросов в минуту с одного адреса (в пределах одного экземпляра воркера)

const hits = new Map();
function rateLimited(ip, now) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > RATE_LIMIT;
}

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin || '*' : allowed[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });
}

// Проверка и очистка входных данных: { messages: [{role:'user'|'assistant', text}], context }
export function validate(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) return { error: 'Пустой запрос.' };
  const messages = body.messages.slice(-MAX_HISTORY);
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.text !== 'string') return { error: 'Неверный формат сообщения.' };
    if (!m.text.trim()) return { error: 'Пустое сообщение.' };
    if (m.text.length > MAX_MESSAGE) return { error: 'Слишком длинное сообщение (больше ' + MAX_MESSAGE + ' символов).' };
  }
  if (messages[messages.length - 1].role !== 'user') return { error: 'Последнее сообщение должно быть вопросом.' };
  const context = typeof body.context === 'string' ? body.context.slice(0, MAX_CONTEXT) : '';
  return { messages, context };
}

// Запрос к Gemini в его формате
export function buildGeminiRequest(messages, context) {
  const system = SYSTEM_PROMPT + (context ? '\n\nСтудент сейчас на странице сайта. Что у него на экране:\n' + context : '');
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
  };
}

// Бесплатная модель Cloudflare Workers AI (без ключа Google)
async function askWorkersAI(env, v, cors) {
  const system = SYSTEM_PROMPT + (v.context ? '\n\nСтудент сейчас на странице сайта. Что у него на экране:\n' + v.context : '');
  const messages = [{ role: 'system', content: system }, ...v.messages.map((m) => ({ role: m.role, content: m.text }))];
  let out;
  try {
    out = await env.AI.run(env.CF_MODEL || '@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages, max_tokens: 1200, temperature: 0.4 });
  } catch (e) {
    const msg = String(e && e.message || '');
    if (/limit|quota|neuron/i.test(msg)) return json({ error: 'Бесплатный дневной лимит модели исчерпан. Попробуйте завтра.' }, 429, cors);
    return json({ error: 'Модель не ответила. Попробуйте ещё раз.' }, 502, cors);
  }
  const text = out && (out.response || (out.result && out.result.response));
  if (!text) return json({ error: 'Модель не дала ответа на этот вопрос. Попробуйте сформулировать иначе.' }, 502, cors);
  return json({ text }, 200, cors);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'Используйте POST.' }, 405, cors);

    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(origin)) return json({ error: 'Запросы принимаются только с сайта «Математика по шагам».' }, 403, cors);
    if (!env.AI && env.IA) env = { ...env, AI: env.IA }; // привязку модели могли назвать «IA» вместо «AI»
    if (!env.GEMINI_API_KEY && !env.AI) return json({ error: 'Помощник не настроен: на сервере нет ни ключа GEMINI_API_KEY, ни привязки Workers AI.' }, 500, cors);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip, Date.now())) return json({ error: 'Слишком много вопросов подряд. Подождите минуту.' }, 429, cors);

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'Не удалось прочитать запрос.' }, 400, cors); }
    const v = validate(body);
    if (v.error) return json({ error: v.error }, 400, cors);

    if (!env.GEMINI_API_KEY) return askWorkersAI(env, v, cors);

    const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(buildGeminiRequest(v.messages, v.context)),
      });
    } catch (e) {
      return json({ error: 'Не удалось связаться с моделью. Попробуйте ещё раз.' }, 502, cors);
    }
    if (res.status === 429) return json({ error: 'Бесплатный лимит модели на сейчас исчерпан. Попробуйте через минуту.' }, 429, cors);
    if (!res.ok) return json({ error: 'Модель вернула ошибку (' + res.status + '). Попробуйте ещё раз.' }, 502, cors);
    const data = await res.json();
    const cand = data.candidates && data.candidates[0];
    const text = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts.map((p) => p.text || '').join('') : '';
    if (!text) return json({ error: 'Модель не дала ответа на этот вопрос. Попробуйте сформулировать иначе.' }, 502, cors);
    return json({ text }, 200, cors);
  },
};
