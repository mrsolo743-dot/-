// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../assets/js/lin-core.js');
const { F, M } = L;

test('дроби', () => {
  assert.deepEqual(L.add(F(1, 2), F(1, 3)), F(5, 6));
  assert.deepEqual(L.div(F(3), F(-6)), F(-1, 2));
  assert.equal(L.ftex(F(-3, 4)), '-\\frac{3}{4}');
  assert.deepEqual(L.parseF('0,25'), F(1, 4));
  assert.equal(L.parseF('abc'), null);
});

test('определитель: сверка с формулой разложения', () => {
  const det3 = (A) => { const a = A.map((r) => r.map(L.val));
    return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]); };
  for (let i = 0; i < 300; i++) {
    const t = L.makeDetTask(3);
    assert.ok(L.val(t.answer) === det3(t.A)); // === считает 0 и −0 равными
    const s = L.makeDetTask(2);
    const a = s.A.map((r) => r.map(L.val));
    assert.ok(L.val(s.answer) === a[0][0] * a[1][1] - a[0][1] * a[1][0]);
  }
  assert.equal(L.val(L.det(M([[1, 2], [2, 4]])).value), 0);
});

test('обратная матрица: A·A⁻¹ = E', () => {
  for (let n = 2; n <= 4; n++) {
    for (let i = 0; i < 50; i++) {
      const A = L.niceInvertible(n);
      const r = L.inverse(A);
      assert.ok(!r.singular);
      assert.ok(L.matEq(L.matMul(A, r.inv), L.ident(n)));
    }
  }
  assert.ok(L.inverse(M([[1, 2], [2, 4]])).singular);
  const t = L.makeInverseTask();
  assert.ok(L.matEq(L.matMul(t.A, t.answer), L.ident(2)));
});

test('решение систем: единственное, бесконечно много, нет решений', () => {
  for (let i = 0; i < 100; i++) {
    const t = L.makeSolveTask(L.pick([2, 3]));
    const s = L.solve(t.A, t.b);
    assert.equal(s.kind, 'unique');
    s.x.forEach((v, j) => assert.ok(L.eq(v, t.x[j])));
  }
  for (let i = 0; i < 200; i++) {
    const t = L.makeClassifyTask();
    const s = L.solve(t.A, t.b);
    assert.equal(s.kind, t.kind);
    if (s.kind === 'many') {
      // общее решение действительно удовлетворяет системе при любых значениях параметров
      for (const tv of [0, 1, -2, 0.5]) {
        const x = s.expr.map((e) => L.val(e.c) + e.coef.reduce((acc, c) => acc + L.val(c) * tv, 0));
        t.A.forEach((r, k) => assert.ok(Math.abs(r.reduce((acc, a, j) => acc + L.val(a) * x[j], 0) - L.val(t.b[k])) < 1e-9));
      }
      assert.match(L.generalTex(s), /\\in \\mathbb\{R\}/);
    }
  }
});

test('ранг и шаги метода Гаусса', () => {
  for (let i = 0; i < 100; i++) {
    const t = L.makeRankTask();
    assert.equal(L.gauss(t.A).rank, t.answer);
  }
  const g = L.gauss(M([[0, 1], [2, 3]]));
  assert.equal(g.steps[0].kind, 'swap');
  for (let i = 0; i < 50; i++) {
    const t = L.makeSolveTask(3);
    const s = L.solve(t.A, t.b);
    for (const st of s.gauss.steps) assert.ok(!/NaN|undefined|frac\{1\}\{\\frac/.test(st.ops.join(' ')));
  }
  assert.match(L.systemTex(M([[2, -1], [1, 0]]), M([[3, 4]])[0]), /2x - y &= 3/);
});

test('общее решение и система используют одни имена переменных', () => {
  const s = L.solve(L.M([[1, 0, -2], [0, 1, 3]]), L.M([[1, 2]])[0]);
  assert.equal(s.kind, 'many');
  assert.equal(L.generalTex(s), 'x = 1 + 2t, \\quad y = 2 - 3t, \\quad z = t, \\quad t \\in \\mathbb{R}');
});
