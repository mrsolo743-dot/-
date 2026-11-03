// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../assets/js/logic-core.js');

test('разбор формул: разные способы записи', () => {
  const same = [
    ['p => q', '!p | q'],
    ['p -> q', 'p ⇒ q'],
    ['не p или q', '¬p ∨ q'],
    ['p and q', 'p & q'],
    ['p <=> q', '(p => q) & (q => p)'],
    ['p -> q -> r', 'p => (q => r)'], // импликация правоассоциативна
    ['!p & q', '(!p) & q'],          // ¬ сильнее ∧
    ['p | q & r', 'p | (q & r)'],    // ∧ сильнее ∨
  ];
  for (const [a, b] of same) assert.ok(L.equivalent(L.parse(a), L.parse(b)).equal, a + ' ≡ ' + b);
  for (const bad of ['', 'pq', 'p &', '(p | q', 'p q', 'p ) ']) assert.throws(() => L.parse(bad), L.ParseError, bad);
});

test('таблицы истинности и классификация', () => {
  assert.equal(L.classify(L.parse('p | !p')), 'tautology');
  assert.equal(L.classify(L.parse('p & !p')), 'contradiction');
  assert.equal(L.classify(L.parse('p => q')), 'satisfiable');
  assert.equal(L.classify(L.parse('((p => q) & p) => q')), 'tautology'); // modus ponens
  const t = L.truthTable([L.parse('p => q')]);
  assert.deepEqual(t.names, ['p', 'q']);
  assert.deepEqual(t.rows.map((r) => r.values[0]), [true, false, true, true]); // 11, 10, 01, 00
});

test('равносильность: известные законы и контрпримеры', () => {
  const eq = (a, b) => L.equivalent(L.parse(a), L.parse(b));
  assert.ok(eq('!(p & q)', '!p | !q').equal);
  assert.ok(eq('p => q', '!q => !p').equal);
  const r = eq('p => q', 'q => p');
  assert.equal(r.equal, false);
  assert.ok(r.counter); // есть набор, на котором различаются
  assert.notEqual(L.evaluate(L.parse('p => q'), r.counter), L.evaluate(L.parse('q => p'), r.counter));
  // все пары тренажёра разбираются
  for (const [a, b] of L.EQ_PAIRS) { L.parse(a); L.parse(b); }
});

test('tex расставляет скобки однозначно', () => {
  assert.equal(L.tex(L.parse('p -> q -> r')), 'p \\Rightarrow (q \\Rightarrow r)');
  assert.equal(L.tex(L.parse('p & !q | r')), '(p \\land \\neg q) \\lor r');
  assert.equal(L.tex(L.parse('!(p & q)')), '\\neg (p \\land q)');
});

test('отрицание утверждений с кванторами: шаги и результат', () => {
  // проверяем на «модели»: кванторы над конечными множествами и атомы — функции
  for (let i = 0; i < L.STATEMENTS.length; i++) {
    const t = L.makeNegTask(i);
    // правильный вариант ровно один, все варианты различны
    assert.equal(t.options.filter((o) => o.ok).length, 1, t.name);
    assert.equal(new Set(t.options.map((o) => o.tex)).size, t.options.length, t.name);
    assert.ok(t.options.length >= 3, t.name);
    // у неверных вариантов есть объяснение
    for (const o of t.options) if (!o.ok) assert.ok(o.why && o.why.length > 20);
    // последний шаг совпадает с правильным ответом, и в нём не осталось ¬
    const last = t.steps[t.steps.length - 1].tex;
    assert.equal(last, t.correctTex, t.name);
    assert.ok(!/\\neg/.test(last), t.name);
    for (const s of t.steps) assert.ok(!/undefined|NaN/.test(s.tex + s.rule));
  }
  // ключевой пример: определение предела
  const lim = L.makeNegTask(0);
  assert.equal(lim.correctTex, String.raw`\exists \varepsilon > 0 \;\; \forall N \in \mathbb{N} \;\; \exists n \ge N \colon\; |a_n - a| \ge \varepsilon`);
});

test('«верно или неверно»: у каждого утверждения есть объяснение', () => {
  for (const t of L.TF) {
    assert.equal(typeof t.truth, 'boolean');
    assert.ok(t.why.length > 10);
  }
  // проверим численно пару утверждений про n^2 + n + 41 и n^3 - n
  const isPrime = (k) => { for (let d = 2; d * d <= k; d++) if (k % d === 0) return false; return k > 1; };
  assert.equal(isPrime(40 * 40 + 40 + 41), false);
  for (let n = 1; n < 40; n++) assert.ok(isPrime(n * n + n + 41));
  for (let n = 1; n < 1000; n++) assert.equal((n ** 3 - n) % 6, 0);
});
