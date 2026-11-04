// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/js/expr.js');
const S = require('../assets/js/series.js');
const TC = require('../assets/js/taylor-core.js');

test('ряды: известные коэффициенты Маклорена', () => {
  const c = (src, n) => S.seriesOf(E.parse(src), 0, n);
  const close = (a, b) => Math.abs(a - b) < 1e-12 * Math.max(1, Math.abs(b));
  assert.ok(close(c('e^x', 6)[6], 1 / 720));
  assert.ok(close(c('sin x', 7)[7], -1 / 5040));
  assert.ok(close(c('tg x', 7)[7], 17 / 315));
  assert.ok(close(c('arcsin x', 5)[5], 3 / 40));
  assert.ok(close(c('ln(1+x)', 5)[5], 1 / 5));
  assert.ok(close(c('sqrt(1+x)', 4)[4], -5 / 128));
  assert.ok(close(c('arctg x', 9)[9], 1 / 9));
});

test('ряды: многочлен Тейлора приближает функцию с ошибкой O(h^{N+1})', () => {
  const funcs = ['e^x', 'sin x', 'cos(2x)', 'ln(1 + x)', 'sqrt(1 + x)', 'arctg x', 'tg x', 'x^x', 'e^x sin x', '1/(1 + x^2)', 'arcsin x', 'sin(x)/(1 + x)', 'ln(2 + cos x)', '(1 + x)^(1/3)'];
  for (const src of funcs) {
    const ast = E.parse(src);
    for (const a of src === 'arcsin x' ? [0.3, 0.5] : [0.3, 0.5, 1]) { // arcsin не гладкий в точке 1
      const c = S.seriesOf(ast, a, 8);
      for (const h of [0.02, -0.02]) {
        const err = Math.abs(E.evaluate(ast, a + h) - S.evalPoly(c, a, 8, a + h));
        assert.ok(err < 1e-10, src + ' @ ' + a + ': ' + err);
      }
    }
  }
});

test('в негладкой точке ряд не строится', () => {
  assert.ok(S.seriesOf(E.parse('arcsin x'), 1, 4).some((v) => !isFinite(v)));
  assert.ok(S.seriesOf(E.parse('ln x'), 0, 4).some((v) => !isFinite(v)));
});

test('дроби распознаются без «фальшивых» знаменателей', () => {
  assert.deepEqual(S.rationalize(1 / 3628800), { p: 1, q: 3628800 });
  assert.deepEqual(S.rationalize(-17 / 315), { p: -17, q: 315 });
  assert.equal(S.rationalize(Math.E), null);
  assert.equal(S.rationalize(Math.PI), null);
  assert.equal(S.rationalize(Math.SQRT2), null);
});

test('пределы через разложения совпадают с численными', () => {
  for (const g of TC.LIMITS) {
    for (let i = 0; i < 5; i++) {
      const [ns, ds] = g();
      const r = S.limitAt0(E.parse(ns), E.parse(ds), 10);
      const f = (x) => E.evaluate(E.parse(ns), x) / E.evaluate(E.parse(ds), x);
      const num = (f(1e-3) + f(-1e-3)) / 2;
      assert.ok(isFinite(r.value), ns);
      assert.ok(Math.abs(num - r.value) < 1e-3 * Math.max(1, Math.abs(r.value)), ns + '/' + ds + ': ' + num + ' vs ' + r.value);
    }
  }
  const t = TC.makeLimitTask();
  assert.equal(TC.checkValue(t, t.answerTex.replace(/\\frac\{(\d+)\}\{(\d+)\}/, '$1/$2')).ok, true, t.answerTex);
});

test('задачи на коэффициенты и «сколько членов»', () => {
  for (let i = 0; i < 100; i++) {
    const t = TC.makeCoefTask();
    // коэффициент через численную производную низкого порядка совпадать не обязан, проверим через ряд в другой точке разложения
    const c = S.seriesOf(E.parse(t.src), 0, 6);
    assert.equal(c[t.k], t.answer);
    assert.ok(Math.abs(t.answer) > 1e-12);
    for (const s of t.steps) assert.ok(!/NaN|undefined/.test(String(s.title) + String(s.tex)));
  }
  for (let i = 0; i < 100; i++) {
    const t = TC.makeTermsTask();
    // фактическая ошибка многочлена степени n меньше требуемой точности
    const ast = E.parse({ exp: 'e^x', sin: 'sin x', cos: 'cos x' }[t.fn]);
    const c = S.seriesOf(ast, 0, 20);
    const err = Math.abs(E.evaluate(ast, t.x) - S.evalPoly(c, 0, t.n, t.x));
    assert.ok(err < t.tol, t.fn + ' n=' + t.n + ': ' + err);
    assert.ok(t.bound(t.n) < t.tol && (t.n === 0 || t.bound(t.n - 1) >= t.tol));
    assert.equal(TC.checkTerms(t, String(t.n)).ok, true);
    assert.equal(TC.checkTerms(t, String(t.n + 1)).ok, false);
  }
});
