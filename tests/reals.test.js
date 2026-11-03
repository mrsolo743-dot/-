// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../assets/js/reals-core.js');

const close = (x, y, tol) => Math.abs(x - y) <= tol * Math.max(1, Math.abs(y));

test('sup/inf: ответы совпадают с численной оценкой по выборке элементов', () => {
  for (const kind of Object.keys(R.SETS)) {
    for (let i = 0; i < 60; i++) {
      const t = R.SETS[kind]();
      const xs = t.sample();
      const mx = Math.max(...xs), mn = Math.min(...xs);
      // все элементы между гранями
      assert.ok(xs.every((x) => x <= t.sup + 1e-12 && x >= t.inf - 1e-12), kind + ': ' + t.tex);
      // грани точные: элементы подходят к ним близко
      if (isFinite(t.sup)) assert.ok(close(mx, t.sup, 0.02), kind + ' sup ' + t.tex + ': ' + mx + ' vs ' + t.sup);
      else assert.ok(mx > 1000, kind);
      assert.ok(close(mn, t.inf, 0.02), kind + ' inf ' + t.tex + ': ' + mn + ' vs ' + t.inf);
      // достижимость: если max — грань есть в выборке точно
      if (t.max) assert.ok(xs.some((x) => Math.abs(x - t.sup) < 1e-12), kind + ' max');
      else assert.ok(xs.every((x) => Math.abs(x - t.sup) > 1e-12), kind + ' нет max');
      if (t.min) assert.ok(xs.some((x) => Math.abs(x - t.inf) < 1e-12), kind + ' min');
      else assert.ok(xs.every((x) => Math.abs(x - t.inf) > 1e-12), kind + ' нет min');
      for (const s of t.steps) assert.ok(!/NaN|undefined|\+ -/.test(s.title + s.tex), kind + ' шаг');
    }
  }
});

test('lim sup / lim inf: совпадают с sup/inf далёких хвостов', () => {
  for (const kind of Object.keys(R.SEQS)) {
    for (let i = 0; i < 40; i++) {
      const t = R.SEQS[kind]();
      const tail = Array.from({ length: 2000 }, (_, j) => t.f(200000 + j));
      const hi = Math.max(...tail), lo = Math.min(...tail);
      if (isFinite(t.sup)) assert.ok(close(hi, t.sup, 1e-3), kind + ' limsup ' + t.tex + ': ' + hi);
      else assert.ok(hi > 1e5, kind);
      if (isFinite(t.inf)) assert.ok(close(lo, t.inf, 1e-3), kind + ' liminf ' + t.tex + ': ' + lo);
      else assert.ok(lo < -1e5, kind);
      for (const s of t.steps) assert.ok(!/NaN|undefined|\+ -/.test(s.title + s.tex), kind + ' шаг');
    }
  }
});

test('проверка ответа', () => {
  const t = { type: 'sup', sup: 1, inf: 0.5, max: false, min: true, steps: [{ title: '' }] };
  assert.equal(R.check(t, '1', '1/2', false, true).ok, true);
  assert.equal(R.check(t, '1', '0,5', false, true).ok, true);
  assert.match(R.check(t, '1', '1/2', true, true).message, /не достигается/);
  assert.match(R.check(t, '1/2', '1', false, true).message, /перепутаны/);
  assert.match(R.check(t, '2', '1/2', false, true).message, /sup найден неверно/);
  assert.equal(R.check(t, '', '1', false, true).invalid, true);
  const s = { type: 'limsup', sup: Math.E, inf: 1 / Math.E, steps: [{ title: '' }] };
  assert.equal(R.check(s, 'e', 'e^-1').ok, true);
  assert.equal(R.check(s, 'e', '1/e').ok, true);
  const r = { type: 'sup', sup: Math.SQRT2, inf: -Math.SQRT2, max: false, min: false, steps: [{ title: '' }] };
  assert.equal(R.check(r, 'sqrt(2)', '-sqrt 2', false, false).ok, true);
  const inf = { type: 'limsup', sup: Infinity, inf: 0, steps: [{ title: '' }] };
  assert.equal(R.check(inf, '+∞', '0').ok, true);
  assert.equal(R.check(inf, 'inf', '0').ok, true);
});
