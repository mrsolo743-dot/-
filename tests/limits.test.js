// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../assets/js/limits-core.js');

// Численное приближение предела: подходим к точке всё ближе
function approx(num) {
  if (num.at === Infinity) return num.f(1e7);
  const h = 1e-6;
  return (num.f(num.at + h) + num.f(num.at - h)) / 2;
}

test('ответы всех шаблонов совпадают с численным приближением', () => {
  for (const kind of Object.keys(L.TEMPLATES)) {
    for (let i = 0; i < 200; i++) {
      const t = L.TEMPLATES[kind]();
      const v = approx(t.num);
      if (!isFinite(t.answer)) {
        assert.ok(Math.abs(v) > 1e5 && Math.sign(v) === Math.sign(t.answer), kind + ': ' + t.tex);
      } else {
        assert.ok(Math.abs(v - t.answer) < 1e-3 * Math.max(1, Math.abs(t.answer)), kind + ': ' + t.tex + ' ≈ ' + v + ', ответ ' + t.answer);
      }
      for (const s of t.steps) assert.ok(!/NaN|undefined|\+ -|1x/.test(s.tex + s.title), kind + ' шаг: ' + s.tex);
      assert.ok(!/NaN|undefined|\+ -/.test(t.tex), kind + ': ' + t.tex);
    }
  }
});

test('разбор ответа: дроби, e^k, бесконечности', () => {
  assert.equal(L.parseAnswer('3/4').value, 0.75);
  assert.equal(L.parseAnswer('-1,5').value, -1.5);
  assert.ok(Math.abs(L.parseAnswer('e^3').value - Math.exp(3)) < 1e-12);
  assert.ok(Math.abs(L.parseAnswer('e^(-1/5)').value - Math.exp(-0.2)) < 1e-12);
  assert.equal(L.parseAnswer('∞').value, Infinity);
  assert.equal(L.parseAnswer('+inf').value, Infinity);
  assert.equal(L.parseAnswer('-∞').value, -Infinity);
  assert.equal(L.parseAnswer('нет').none, true);
  assert.ok(L.parseAnswer('2x').error);
  assert.ok(L.parseAnswer('').error);
});

test('check: верные ответы и типичные ошибки', () => {
  const t = { answer: 0.75, steps: [{ title: 'x' }] };
  assert.equal(L.check(t, '3/4').ok, true);
  assert.equal(L.check(t, '0,75').ok, true);
  assert.match(L.check(t, '-3/4').message, /знаком/);
  assert.match(L.check(t, '4/3').message, /перевёрнута/);
  const inf = { answer: -Infinity, steps: [] };
  assert.equal(L.check(inf, '-∞').ok, true);
  assert.match(L.check(inf, '∞').message, /знак/);
  const e = { answer: Math.exp(6), steps: [] };
  assert.equal(L.check(e, 'e^6').ok, true);
});

test('N(ε): найденное N действительно работает и минимально', () => {
  for (let i = 0; i < 500; i++) {
    const t = L.makeNTask();
    const a = (n) => (t.a * n + t.b) / (t.c * n + t.d);
    // все n от Nmin до Nmin + 1000 в коридоре
    for (let n = t.Nmin; n < t.Nmin + 1000; n += 7) assert.ok(Math.abs(a(n) - t.Lval) < t.eps, 'n=' + n);
    // а при Nmin - 1 (если оно ≥ 1) — нет
    if (t.Nmin > 1) assert.ok(Math.abs(a(t.Nmin - 1) - t.Lval) >= t.eps - 1e-12);
    assert.equal(L.checkN(t, String(t.Nmin)).ok, true);
    assert.equal(L.checkN(t, String(t.Nmin + 10)).ok, true);
    if (t.Nmin > 1) assert.equal(L.checkN(t, String(t.Nmin - 1)).ok, false);
    assert.equal(L.checkN(t, 'abc').invalid, true);
  }
});
