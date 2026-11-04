// Линейная алгебра на точных дробях: матрицы, метод Гаусса с записью шагов, определитель,
// обратная матрица, ранг, решение систем (включая общее решение), генераторы задач.
// Работает и в браузере (window.Lin), и в Node (module.exports).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Lin = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Дроби ----------
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
  function F(n, d) {
    if (d === undefined) d = 1;
    if (d === 0) throw new Error('Деление на ноль');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const mul = (a, b) => F(a.n * b.n, a.d * b.d);
  const div = (a, b) => F(a.n * b.d, a.d * b.n);
  const neg = (a) => F(-a.n, a.d);
  const isZero = (a) => a.n === 0;
  const eq = (a, b) => a.n === b.n && a.d === b.d;
  const val = (a) => a.n / a.d;
  function ftex(a) {
    if (a.d === 1) return String(a.n);
    return (a.n < 0 ? '-' : '') + '\\frac{' + Math.abs(a.n) + '}{' + a.d + '}';
  }
  function fstr(a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; }
  // Разбор числа: 3, -2, 3/4, 0,5, 1.25
  function parseF(raw) {
    const s = String(raw == null ? '' : raw).trim().replace(/[−–—]/g, '-').replace(',', '.');
    if (!s) return null;
    let m = s.match(/^([-+]?\d+)\s*\/\s*([-+]?\d+)$/);
    if (m && +m[2] !== 0) return F(+m[1], +m[2]);
    m = s.match(/^([-+]?)(\d+)(?:\.(\d+))?$/);
    if (m) {
      const dec = m[3] || '';
      const den = Math.pow(10, dec.length);
      return F((m[1] === '-' ? -1 : 1) * (+m[2] * den + (dec ? +dec : 0)), den);
    }
    return null;
  }

  // ---------- Матрицы ----------
  const M = (rows) => rows.map((r) => r.map((x) => (typeof x === 'number' ? F(x) : x)));
  const clone = (A) => A.map((r) => r.slice());
  const ident = (n) => Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => F(i === j ? 1 : 0)));
  function matMul(A, B) {
    return A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => add(s, mul(a, B[k][j])), F(0))));
  }
  const matEq = (A, B) => A.length === B.length && A.every((r, i) => r.length === B[i].length && r.every((x, j) => eq(x, B[i][j])));
  // TeX матрицы; aug — номер столбца, перед которым вертикальная черта (расширенная матрица)
  function mtex(A, aug) {
    const cols = A[0].length;
    const body = A.map((r) => r.map(ftex).join(' & ')).join(' \\\\ ');
    if (aug) {
      const spec = 'c'.repeat(aug) + '|' + 'c'.repeat(cols - aug);
      return '\\left(\\begin{array}{' + spec + '} ' + body + ' \\end{array}\\right)';
    }
    return '\\begin{pmatrix} ' + body + ' \\end{pmatrix}';
  }
  const dtex = (A) => '\\begin{vmatrix} ' + A.map((r) => r.map(ftex).join(' & ')).join(' \\\\ ') + ' \\end{vmatrix}';

  // коэффициент перед R_k в описании операции: «R_2 − 3R_1», «R_3 + \frac12 R_1»
  function opTex(target, k, src) {
    if (isZero(k)) return null;
    const negK = k.n < 0;
    const absK = F(Math.abs(k.n), k.d);
    const c = eq(absK, F(1)) ? '' : ftex(absK);
    return 'R_' + target + ' \\to R_' + target + (negK ? ' + ' : ' - ') + c + 'R_' + src;
  }

  // ---------- Метод Гаусса с шагами ----------
  // opts: { cols — сколько столбцов обрабатывать (для расширенной матрицы — без столбца свободных членов),
  //         jordan — довести до улучшенного ступенчатого вида (нули и над ведущими, ведущие = 1),
  //         aug — позиция черты для отображения }
  function gauss(A0, opts) {
    opts = opts || {};
    const A = clone(A0);
    const rows = A.length, cols = opts.cols || A[0].length;
    const steps = [];
    const pivots = [];
    let swaps = 0;
    let r = 0;
    for (let c = 0; c < cols && r < rows; c++) {
      let p = -1;
      for (let i = r; i < rows; i++) if (!isZero(A[i][c])) { p = i; break; }
      if (p < 0) continue; // в этом столбце ниже текущей строки одни нули
      if (p !== r) {
        [A[p], A[r]] = [A[r], A[p]];
        swaps++;
        steps.push({ ops: ['R_' + (r + 1) + ' \\leftrightarrow R_' + (p + 1)], why: 'В столбце ' + (c + 1) + ' на месте ведущего элемента ноль — меняем строки местами.', A: clone(A), kind: 'swap' });
      }
      if (opts.jordan && !eq(A[r][c], F(1))) {
        const k = A[r][c];
        A[r] = A[r].map((x) => div(x, k));
        const m = div(F(1), k); // умножаем на 1/k
        const mt = eq(m, F(-1)) ? '-' : ftex(m) + ' \\cdot ';
        steps.push({ ops: ['R_' + (r + 1) + ' \\to ' + mt + 'R_' + (r + 1)], why: 'Делим строку на ведущий элемент \\(' + ftex(k) + '\\), чтобы он стал равен 1.', A: clone(A), kind: 'scale', factor: k });
      }
      const ops = [];
      for (let i = opts.jordan ? 0 : r + 1; i < rows; i++) {
        if (i === r || isZero(A[i][c])) continue;
        const k = div(A[i][c], A[r][c]);
        A[i] = A[i].map((x, j) => sub(x, mul(k, A[r][j])));
        ops.push(opTex(i + 1, k, r + 1));
      }
      if (ops.length) steps.push({ ops, why: (opts.jordan ? 'Обнуляем столбец ' + (c + 1) + ' над и под ведущим элементом' : 'Обнуляем элементы столбца ' + (c + 1) + ' под ведущим элементом') + ': из строк вычитаем строку ' + (r + 1) + ' с нужным множителем.', A: clone(A), kind: 'elim' });
      pivots.push({ row: r, col: c });
      r++;
    }
    return { A, steps, pivots, rank: pivots.length, swaps };
  }

  function det(A0) {
    const n = A0.length;
    const g = gauss(A0);
    const diag = g.A.map((r, i) => r[i]);
    let d = diag.reduce((s, x) => mul(s, x), F(1));
    if (g.swaps % 2) d = neg(d);
    return { value: g.rank < n ? F(0) : d, gauss: g, diag };
  }

  function inverse(A0) {
    const n = A0.length;
    const aug = A0.map((r, i) => r.concat(ident(n)[i]));
    const g = gauss(aug, { cols: n, jordan: true });
    if (g.rank < n) return { singular: true, gauss: g };
    return { inv: g.A.map((r) => r.slice(n)), gauss: g };
  }

  // Решение системы A x = b по расширенной матрице
  function solve(A0, b) {
    const n = A0[0].length;
    const aug = A0.map((r, i) => r.concat([b[i]]));
    const g = gauss(aug, { cols: n, jordan: true });
    const rankA = g.rank;
    const gAug = gauss(aug); // ранг расширенной
    const rankAug = gAug.rank;
    if (rankAug > rankA) return { kind: 'none', gauss: g, rankA, rankAug };
    const pivCols = g.pivots.map((p) => p.col);
    const free = [];
    for (let j = 0; j < n; j++) if (!pivCols.includes(j)) free.push(j);
    // базисные переменные через свободные: x_p = b'_r − Σ a'_{r,f} t_f
    const expr = Array.from({ length: n }, () => null);
    g.pivots.forEach((p) => {
      expr[p.col] = { c: g.A[p.row][n], coef: free.map((f) => neg(g.A[p.row][f])) };
    });
    free.forEach((f, k) => { expr[f] = { c: F(0), coef: free.map((_, kk) => F(kk === k ? 1 : 0)) }; });
    if (!free.length) return { kind: 'unique', x: expr.map((e) => e.c), gauss: g, rankA, rankAug };
    return { kind: 'many', expr, free, gauss: g, rankA, rankAug };
  }
  // TeX общего решения
  const varName = (j, n) => (n <= 3 ? ['x', 'y', 'z'][j] : 'x_{' + (j + 1) + '}');
  function generalTex(sol) {
    const nv = sol.expr.length;
    const names = sol.free.map((_, k) => (sol.free.length === 1 ? 't' : 't_{' + (k + 1) + '}'));
    return sol.expr.map((e, j) => {
      let s = '';
      if (!isZero(e.c)) s = ftex(e.c);
      e.coef.forEach((c, k) => {
        if (isZero(c)) return;
        const abs = F(Math.abs(c.n), c.d);
        const term = (eq(abs, F(1)) ? '' : ftex(abs)) + names[k];
        s += s ? (c.n < 0 ? ' - ' : ' + ') + term : (c.n < 0 ? '-' : '') + term;
      });
      return varName(j, nv) + ' = ' + (s || '0');
    }).join(', \\quad ') + (sol.free.length ? ', \\quad ' + names.join(', ') + ' \\in \\mathbb{R}' : '');
  }

  // Система в виде уравнений: 2x − y + 3z = 5 (выровнено по знаку «=»)
  function systemTex(A, b) {
    const n = A[0].length;
    const v = (j) => varName(j, n);
    const rows = A.map((r, i) => {
      let s = '';
      r.forEach((a, j) => {
        if (isZero(a)) return;
        const abs = F(Math.abs(a.n), a.d);
        const t = (eq(abs, F(1)) ? '' : ftex(abs)) + v(j);
        s += s ? (a.n < 0 ? ' - ' : ' + ') + t : (a.n < 0 ? '-' : '') + t;
      });
      return (s || '0') + ' &= ' + ftex(b[i]);
    });
    return '\\left\\{\\begin{aligned} ' + rows.join(' \\\\ ') + ' \\end{aligned}\\right.';
  }

  // ---------- Генераторы задач ----------
  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randM = (r, c, lo, hi) => Array.from({ length: r }, () => Array.from({ length: c }, () => F(rnd(lo, hi))));

  // Обратимая целочисленная матрица с маленьким определителем (элементарными преобразованиями единичной)
  function niceInvertible(n, detTarget) {
    let A = ident(n);
    for (let k = 0; k < n * 3; k++) {
      const i = rnd(0, n - 1); let j; do { j = rnd(0, n - 1); } while (j === i);
      const c = F(pick([-2, -1, 1, 2]));
      A[i] = A[i].map((x, col) => add(x, mul(c, A[j][col])));
    }
    if (detTarget && detTarget !== 1) A[0] = A[0].map((x) => mul(x, F(detTarget)));
    if (A.flat().some((x) => Math.abs(val(x)) > 9)) return niceInvertible(n, detTarget);
    return A;
  }

  function makeDetTask(n) {
    const A = n === 2 ? randM(2, 2, -6, 6) : randM(3, 3, -3, 4);
    return { A, n, answer: det(A).value };
  }
  function makeProductTask() {
    const shape = pick([[2, 2, 2], [2, 3, 2], [2, 2, 3]]);
    const A = randM(shape[0], shape[1], -3, 4), B = randM(shape[1], shape[2], -3, 4);
    return { A, B, answer: matMul(A, B) };
  }
  function makeInverseTask() {
    const A = niceInvertible(2, pick([1, 1, 2, -1, 3]));
    return { A, answer: inverse(A).inv };
  }
  function makeSolveTask(n) {
    const A = niceInvertible(n, pick([1, -1, 2]));
    const x = Array.from({ length: n }, () => F(rnd(-4, 4)));
    const b = A.map((r) => r.reduce((s, a, j) => add(s, mul(a, x[j])), F(0)));
    return { A, b, x, n };
  }
  // Система 3×3 заданного типа: unique / many / none
  function makeClassifyTask() {
    const kind = pick(['unique', 'many', 'none']);
    if (kind === 'unique') { const t = makeSolveTask(3); return { A: t.A, b: t.b, kind }; }
    for (;;) {
      const r1 = randM(1, 3, -3, 3)[0], r2 = randM(1, 3, -3, 3)[0];
      const k1 = F(pick([1, -1, 2])), k2 = F(pick([1, -1, 1, 2]));
      const r3 = r1.map((x, j) => add(mul(k1, x), mul(k2, r2[j])));
      const b1 = F(rnd(-6, 6)), b2 = F(rnd(-6, 6));
      let b3 = add(mul(k1, b1), mul(k2, b2));
      if (kind === 'none') b3 = add(b3, F(pick([-3, -2, -1, 1, 2, 3])));
      const A = [r1, r2, r3], b = [b1, b2, b3];
      if (gauss(A).rank !== 2) continue;
      // перемешаем строки, чтобы зависимость не была очевидна «по последней строке»
      const order = [0, 1, 2].sort(() => Math.random() - 0.5);
      return { A: order.map((i) => A[i]), b: order.map((i) => b[i]), kind };
    }
  }
  function makeRankTask() {
    const target = rnd(1, 3);
    const rows = 3, cols = pick([3, 4]);
    for (;;) {
      const base = randM(target, cols, -3, 3);
      if (gauss(base).rank !== target) continue;
      const A = Array.from({ length: rows }, (_, i) => {
        if (i < target) return base[i];
        const coefs = base.map(() => F(rnd(-2, 2)));
        return base[0].map((_, j) => base.reduce((s, r, k) => add(s, mul(coefs[k], r[j])), F(0)));
      });
      const order = A.map((_, i) => i).sort(() => Math.random() - 0.5);
      const B = order.map((i) => A[i]);
      if (gauss(B).rank === target) return { A: B, answer: target };
    }
  }

  return {
    F, add, sub, mul, div, neg, isZero, eq, val, ftex, fstr, parseF,
    M, clone, ident, matMul, matEq, mtex, dtex,
    gauss, det, inverse, solve, generalTex, systemTex, varName,
    niceInvertible, makeDetTask, makeProductTask, makeInverseTask, makeSolveTask, makeClassifyTask, makeRankTask, pick, rnd,
  };
});
