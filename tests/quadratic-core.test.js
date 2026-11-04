// Запуск: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../assets/js/quadratic-core.js');

const val = (f) => f.n / f.d;
const evalPoly = (t, x) => t.a * x * x + t.b * x + t.c;

test('polyTex форматирует коэффициенты', () => {
  assert.equal(Q.polyTex(1, -5, 6), 'x^2 - 5x + 6');
  assert.equal(Q.polyTex(-1, 0, 4), '-x^2 + 4');
  assert.equal(Q.polyTex(2, 1, 0), '2x^2 + x');
  assert.equal(Q.polyTex(0, -3, -1), '-3x - 1');
});

test('solve находит точные корни', () => {
  const r = Q.solve(1, -5, 6);
  assert.equal(r.D, 1);
  assert.deepEqual(r.roots.map(val).sort(), [2, 3]);
  assert.deepEqual(Q.solve(1, -4, 4).roots.map(val), [2]);
  assert.equal(Q.solve(1, 2, 3).roots.length, 0);
  assert.deepEqual(Q.solve(2, -3, 1).roots.map(val).sort(), [0.5, 1]);
});

test('сгенерированные задачи корректны на всех уровнях', () => {
  for (const level of [1, 2, 3]) {
    for (let i = 0; i < 500; i++) {
      const t = Q.makeTask(level);
      assert.notEqual(t.a, 0);
      for (const k of ['a', 'b', 'c']) assert.ok(Number.isInteger(t[k]), k + ' целое');
      for (const r of t.roots) {
        assert.ok('n' in r, 'корень точный');
        assert.ok(Math.abs(evalPoly(t, val(r))) < 1e-9, 'корень подставляется в уравнение');
      }
      const D = t.b * t.b - 4 * t.a * t.c;
      assert.equal(t.roots.length, D < 0 ? 0 : D === 0 ? 1 : 2);
      const steps = Q.solutionSteps(t);
      assert.ok(steps.length >= 2);
      for (const s of steps) assert.ok(!/NaN|undefined/.test(String(s.text) + String(s.tex)));
    }
  }
});

test('parseAnswer понимает разные форматы', () => {
  assert.deepEqual(Q.parseAnswer('2; -3').options, [[2, -3]]);
  assert.deepEqual(Q.parseAnswer('x1 = 2; x2 = −3').options, [[2, -3]]);
  assert.deepEqual(Q.parseAnswer('3/2; 1').options, [[1.5, 1]]);
  assert.deepEqual(Q.parseAnswer('1,5; 2').options, [[1.5, 2]]);
  assert.deepEqual(Q.parseAnswer('2, 3').options, [[2, 3]]);
  assert.deepEqual(Q.parseAnswer('2,3').options, [[2.3], [2, 3]]);
  assert.equal(Q.parseAnswer('нет').none, true);
  assert.equal(Q.parseAnswer('Корней нет').none, true);
  assert.ok(Q.parseAnswer('abc').error);
  assert.ok(Q.parseAnswer('').error);
});

test('checkAnswer принимает верные и объясняет неверные ответы', () => {
  const t = { a: 1, b: -5, c: 6, ...Q.solve(1, -5, 6) };
  assert.equal(Q.checkAnswer(t, '2; 3').ok, true);
  assert.equal(Q.checkAnswer(t, '3 2').ok, true);
  assert.equal(Q.checkAnswer(t, '2,3').ok, true);
  assert.match(Q.checkAnswer(t, '-2; -3').message, /знак/);
  assert.match(Q.checkAnswer(t, '2; 4').message, /Один корень/);
  assert.equal(Q.checkAnswer(t, 'нет').ok, false);

  const half = { a: 2, b: -3, c: 1, ...Q.solve(2, -3, 1) };
  assert.equal(Q.checkAnswer(half, '1/2; 1').ok, true);
  assert.equal(Q.checkAnswer(half, '0,5; 1').ok, true);

  const dbl = { a: 1, b: -4, c: 4, ...Q.solve(1, -4, 4) };
  assert.equal(Q.checkAnswer(dbl, '2').ok, true);
  assert.equal(Q.checkAnswer(dbl, '2; 2').ok, true);

  const none = { a: 1, b: 2, c: 3, ...Q.solve(1, 2, 3) };
  assert.equal(Q.checkAnswer(none, 'нет').ok, true);
  assert.equal(Q.checkAnswer(none, '1').ok, false);
});
