// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/js/expr.js');
const I = require('../assets/js/integral-core.js');

test('численное интегрирование', () => {
  assert.ok(Math.abs(I.simpson(Math.sin, 0, Math.PI) - 2) < 1e-10);
  assert.ok(Math.abs(I.riemann((x) => x * x, 0, 1, 1000, 'mid') - 1 / 3) < 1e-6);
  assert.ok(I.riemann((x) => x * x, 0, 1, 10, 'left') < 1 / 3 && I.riemann((x) => x * x, 0, 1, 10, 'right') > 1 / 3);
});

test('модуль в формулах', () => {
  assert.equal(E.evaluate(E.parse('ln|x|'), -Math.E), 1);
  assert.equal(E.tex(E.simplify(E.parse('ln|x - 1|'))), '\\ln \\left|x - 1\\right|');
});

test('первообразные всех шаблонов верны (производная ответа = подынтегральная функция)', () => {
  for (const g of I.ANTI) {
    for (let i = 0; i < 40; i++) {
      const t = g();
      assert.equal(I.checkAnti(t, t.F).ok, true, t.f + ' → ' + t.F);
      assert.equal(I.checkAnti(t, t.F + ' + C').ok, true, '«+ C» допускается');
      for (const s of t.steps) assert.ok(!/NaN|undefined|\+ -|\+ 0\b|x \+ 0/.test(s.title + String(s.tex)), t.f + ' шаг: ' + s.tex);
    }
  }
});

test('ответ в другой форме тоже принимается, ошибки распознаются', () => {
  const t = { f: 'x e^x', F: '(x - 1) e^x' };
  assert.equal(I.checkAnti(t, 'x e^x - e^x + 5').ok, true); // другая константа
  const s = { f: 'sin(3x)', F: '-cos(3x)/3' };
  assert.match(I.checkAnti(s, '-cos(3x)').message, /множителем/);
  assert.match(I.checkAnti(s, 'cos(3x)/3').message, /знаком/);
  assert.match(I.checkAnti(s, '3cos(3x)').message, /производную/);
  assert.equal(I.checkAnti(s, 'x +').invalid, true);
  const l = { f: '1/x', F: 'ln|x|' };
  assert.equal(I.checkAnti(l, 'ln x').ok, true); // ln x тоже первообразная там, где определён
});

test('определённые интегралы совпадают с численными', () => {
  for (const g of I.DEF) {
    for (let i = 0; i < 20; i++) {
      const t = I.makeDefTask.call(null) && g();
      const f = E.parse(t.f);
      const num = I.simpson((x) => E.evaluate(f, x), t.a, t.b, 6000);
      assert.ok(Math.abs(num - t.value) < 1e-6 * Math.max(1, Math.abs(t.value)), t.f + ': ' + num + ' vs ' + t.value);
      if (t.F) {
        const F = E.parse(t.F);
        assert.ok(Math.abs(E.evaluate(F, t.b) - E.evaluate(F, t.a) - t.value) < 1e-9 * Math.max(1, Math.abs(t.value)), t.f + ' Ньютон — Лейбниц');
      }
    }
  }
  const t = I.makeDefTask();
  assert.equal(I.checkDef(t, String(t.value)).ok, true);
  assert.ok(I.checkDef({ value: Math.PI }, 'pi').ok);
  assert.ok(I.checkDef({ value: Math.LN2 }, 'ln 2').ok);
});

test('несобственные интегралы: численная проверка сходящихся с известным значением', () => {
  const known = { '1': 1, '2': 2, '-1': -1, '\\pi': Math.PI };
  for (const t of I.IMP) {
    assert.equal(typeof t.conv, 'boolean');
    if (t.value) assert.ok(t.value in known);
  }
  // ∫_1^A dx/x^2 → 1, ∫_0^A e^{-x} → 1
  assert.ok(Math.abs(I.simpson((x) => 1 / (x * x), 1, 1e4, 200000) - 1) < 1e-3);
  assert.ok(Math.abs(I.simpson((x) => Math.exp(-x), 0, 50) - 1) < 1e-7);
  assert.ok(I.TF.length >= 10);
});
