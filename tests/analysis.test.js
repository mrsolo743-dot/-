// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/js/expr.js');
const A = require('../assets/js/analysis-core.js');

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.some((y) => Math.abs(x - y) < 1e-6));

test('«красивые» числа', () => {
  assert.equal(A.nice(2), '2');
  assert.equal(A.nice(-1.5), '-\\frac{3}{2}');
  assert.equal(A.nice(Math.sqrt(3)), '\\sqrt{3}');
  assert.equal(A.nice(1 / Math.sqrt(3)), '\\frac{\\sqrt{3}}{3}');
  assert.equal(A.nice(Math.sqrt(8)), '2\\sqrt{2}');
  assert.equal(A.nice(Math.E), 'e');
  assert.equal(A.nice(Math.PI / 2), '\\frac{\\pi}{2}');
  assert.equal(A.nice(1 / Math.E), '\\frac{1}{e}');
});

test('исследование: известные функции', () => {
  const an = (s) => A.analyze(E.parse(s));
  let a = an('x^3 - 3x');
  assert.deepEqual(a.extrema.map((e) => [e.kind, e.x]), [['max', -1], ['min', 1]]);
  assert.deepEqual(a.inflections.map((p) => p.x), [0]);
  a = an('x^3');
  assert.deepEqual(a.extrema.map((e) => e.kind), ['none']); // стационарная точка без экстремума
  a = an('(x^2 + 1)/(x - 1)');
  assert.deepEqual(a.vertical.map((v) => v.x), [1]);
  assert.deepEqual(a.asPlus, { k: 1, b: 1 });
  a = an('arctg x');
  assert.ok(Math.abs(a.asPlus.b - Math.PI / 2) < 1e-12 && Math.abs(a.asMinus.b + Math.PI / 2) < 1e-12);
  a = an('sqrt(x^2 + 1)');
  assert.deepEqual([a.asPlus.k, a.asMinus.k], [1, -1]);
  a = an('ln(x)/x');
  assert.equal(a.segs[0][0], 0);
  assert.ok(Math.abs(a.extrema[0].x - Math.E) < 1e-9);
  a = an('e^(1/x)');
  assert.deepEqual(a.vertical.map((v) => v.x), [0]);
  assert.equal(a.segs.length, 2);
  a = an('x^4');
  assert.equal(a.inflections.length, 0); // f'' = 0 в нуле, но знак не меняется
});

test('задачи на экстремумы согласуются с исследованием', () => {
  for (const g of A.EXT) {
    for (let i = 0; i < 10; i++) {
      const t = g();
      const a = A.analyze(E.parse(t.src));
      const max = a.extrema.filter((e) => e.kind === 'max').map((e) => e.x);
      const min = a.extrema.filter((e) => e.kind === 'min').map((e) => e.x);
      assert.ok(sameSet(max, t.max) && sameSet(min, t.min), t.src + ': ' + max + ' / ' + min);
    }
  }
  const t = A.makeExtTask();
  const fmt = (xs) => (xs.length ? xs.map(String).join('; ') : 'нет');
  assert.equal(A.checkExt(t, fmt(t.max), fmt(t.min)).ok, true);
  if (t.max.length && t.min.length) assert.match(A.checkExt(t, fmt(t.min), fmt(t.max)).message, /перепутаны|неверно/);
});

test('задачи на асимптоты согласуются с исследованием', () => {
  for (const g of A.ASY) {
    for (let i = 0; i < 15; i++) {
      const t = g();
      const a = A.analyze(E.parse(t.src));
      assert.ok(sameSet(a.vertical.map((v) => v.x), t.vert), t.src + ' vert ' + a.vertical.map((v) => v.x));
      assert.ok(a.asPlus && Math.abs(a.asPlus.k - t.k) < 1e-9 && Math.abs(a.asPlus.b - t.b) < 1e-9, t.src + ' ' + JSON.stringify(a.asPlus));
      assert.ok(a.asMinus && Math.abs(a.asMinus.k - t.k) < 1e-9 && Math.abs(a.asMinus.b - t.b) < 1e-9, t.src + ' −∞');
    }
  }
  const t = A.makeAsyTask();
  assert.equal(A.checkAsy(t, t.vert.join('; ') || 'нет', String(t.k), String(t.b)).ok, true);
});

test('наибольшее/наименьшее на отрезке — по плотной сетке', () => {
  for (let i = 0; i < 100; i++) {
    const t = A.makeSegTask();
    const ast = E.parse(t.src);
    let M = -Infinity, m = Infinity;
    for (let j = 0; j <= 10000; j++) { const y = E.evaluate(ast, t.l + ((t.r - t.l) * j) / 10000); M = Math.max(M, y); m = Math.min(m, y); }
    assert.ok(Math.abs(M - t.max) < 1e-3 && Math.abs(m - t.min) < 1e-3, t.src); // сетка не попадает точно в критическую точку
    assert.equal(A.checkSeg(t, String(t.max), String(t.min)).ok, true);
  }
  assert.ok(A.TF.length >= 12);
});
