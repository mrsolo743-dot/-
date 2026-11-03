// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../assets/js/cont-core.js');
const LC = require('../assets/js/limits-core.js');

// Односторонний предел численно: значения при h = 1e-4…1e-7; null — не сходится
function side(f, x0, dir) {
  const vals = [1e-4, 1e-5, 1e-6, 1e-7].map((h) => f(x0 + dir * h));
  if (vals.some((v) => !isFinite(v) || Math.abs(v) > 1e3)) return { inf: true };
  const tail = vals.slice(1);
  if (Math.max(...tail) - Math.min(...tail) > 1e-2) return { osc: true };
  return { value: vals[vals.length - 1] };
}
// TeX-предел -> число (для сверки подписи с численным значением)
function texVal(t) {
  if (t === '\\nexists') return null;
  const s = t.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)').replace(/\\pi/g, 'pi').replace(/\\infty/g, '∞').replace(/^\+/, '');
  return LC.parseAnswer(s).value;
}

test('классификация точек разрыва согласуется с численными пределами', () => {
  for (const gen of Object.keys(C.POINTS)) {
    for (let i = 0; i < 40; i++) {
      const t = C.POINTS[gen]();
      const L = side(t.f, t.x0, -1), R = side(t.f, t.x0, +1);
      const fin = (s) => s.value !== undefined;
      const near = (a, b) => Math.abs(a - b) < 1e-2;
      if (t.kind === 'cont') {
        assert.ok(fin(L) && fin(R) && t.fx0 !== null && near(L.value, t.fx0) && near(R.value, t.fx0), gen);
      } else if (t.kind === 'removable') {
        assert.ok(fin(L) && fin(R) && near(L.value, R.value), gen);
        assert.ok(t.fx0 === null || !near(t.fx0, L.value), gen);
      } else if (t.kind === 'jump') {
        assert.ok(fin(L) && fin(R) && !near(L.value, R.value), gen);
      } else {
        assert.ok(!fin(L) || !fin(R), gen);
      }
      // подписи пределов совпадают с численными значениями
      for (const [tx, s] of [[t.left, L], [t.right, R]]) {
        const v = texVal(tx);
        if (v === null) assert.ok(s.osc, gen + ' ∄');
        else if (!isFinite(v)) assert.ok(s.inf, gen + ' ∞');
        else assert.ok(fin(s) && near(s.value, v), gen + ': ' + tx + ' vs ' + s.value);
      }
      assert.ok(!/NaN|undefined|&lt;/.test(t.tex), gen + ' tex');
    }
  }
});

test('подбор параметра: найденное значение делает функцию непрерывной', () => {
  for (const gen of Object.keys(C.PARAMS)) {
    for (let i = 0; i < 60; i++) {
      const t = C.PARAMS[gen]();
      const cont = (P) => [-1, 1].every((d) => Math.abs(t.f(t.x0 + d * 1e-6, P) - t.f(t.x0, P)) < 1e-3);
      assert.ok(cont(t.answer), gen + ': ' + t.tex);
      assert.ok(!cont(t.answer + 1), gen + ' (другое значение не подходит)');
      assert.equal(C.checkParam(t, t.answerTex.replace(/\\frac\{(-?\d+)\}\{(\d+)\}/, '$1/$2').replace(/^-\\frac/, '-')).ok, true, gen + ' ' + t.answerTex);
      for (const s of t.steps) assert.ok(!/NaN|undefined/.test(s.title + s.tex));
    }
  }
});

test('бисекция сужает отрезок к корню', () => {
  const r = C.bisect((x) => x * x - 2, 1, 2, 30);
  assert.ok(Math.abs(r.a - Math.SQRT2) < 1e-8 && Math.abs(r.b - Math.SQRT2) < 1e-8);
  assert.equal(r.steps.length, 30);
  assert.ok(C.TF.length >= 15 && C.TF.every((t) => typeof t.truth === 'boolean' && t.why));
});
