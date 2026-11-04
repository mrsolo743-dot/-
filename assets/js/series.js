// Ряды Тейлора: коэффициенты любой функции (из Expr-дерева) в точке a —
// вычисляются арифметикой усечённых степенных рядов, без символьного дифференцирования.
// Также: «красивые» дроби, TeX многочлена Тейлора, предел частного при x → 0.
// Работает и в браузере (window.Series), и в Node (module.exports).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./expr.js'));
  else root.Series = factory(root.Expr);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  // Ряд — массив коэффициентов c[0..N] при степенях (x − a)^k
  const zeros = (n) => new Array(n).fill(0);
  const constS = (v, n) => { const s = zeros(n); s[0] = v; return s; };
  const add = (p, q) => p.map((v, i) => v + q[i]);
  const sub = (p, q) => p.map((v, i) => v - q[i]);
  const scale = (p, c) => p.map((v) => v * c);
  function mul(p, q) {
    const n = p.length, r = zeros(n);
    for (let i = 0; i < n; i++) if (p[i]) for (let j = 0; i + j < n; j++) r[i + j] += p[i] * q[j];
    return r;
  }
  function div(p, q) {
    const n = p.length, r = zeros(n);
    if (q[0] === 0) return r.fill(NaN);
    for (let k = 0; k < n; k++) {
      let s = p[k];
      for (let j = 1; j <= k; j++) s -= q[j] * r[k - j];
      r[k] = s / q[0];
    }
    return r;
  }
  // производная ряда (длина сохраняется, последний коэффициент теряется) и первообразная
  const deriv = (p) => p.map((_, k) => (k + 1 < p.length ? (k + 1) * p[k + 1] : 0));
  function integ(p, c0) {
    const r = zeros(p.length);
    r[0] = c0;
    for (let k = 1; k < p.length; k++) r[k] = p[k - 1] / k;
    return r;
  }
  function expS(u) {
    const n = u.length, w = zeros(n);
    w[0] = Math.exp(u[0]);
    for (let k = 1; k < n; k++) {
      let s = 0;
      for (let j = 1; j <= k; j++) s += j * u[j] * w[k - j];
      w[k] = s / k;
    }
    return w;
  }
  function lnS(u) {
    const n = u.length, w = zeros(n);
    if (!(u[0] > 0)) return w.fill(NaN);
    w[0] = Math.log(u[0]);
    for (let k = 1; k < n; k++) {
      let s = u[k];
      for (let j = 1; j < k; j++) s -= (j * w[j] * u[k - j]) / k;
      w[k] = s / u[0];
    }
    return w;
  }
  function sinCos(u) {
    const n = u.length, s = zeros(n), c = zeros(n);
    s[0] = Math.sin(u[0]); c[0] = Math.cos(u[0]);
    for (let k = 1; k < n; k++) {
      let a = 0, b = 0;
      for (let j = 1; j <= k; j++) { a += j * u[j] * c[k - j]; b += j * u[j] * s[k - j]; }
      s[k] = a / k; c[k] = -b / k;
    }
    return [s, c];
  }
  // u^α для постоянного α
  function powConst(u, alpha) {
    const n = u.length;
    if (Number.isInteger(alpha) && alpha >= 0) {
      let r = constS(1, n), b = u.slice(), e = alpha;
      while (e > 0) { if (e & 1) r = mul(r, b); b = mul(b, b); e >>= 1; }
      return r;
    }
    if (Number.isInteger(alpha) && alpha < 0) return div(constS(1, n), powConst(u, -alpha));
    const w = zeros(n);
    if (!(u[0] > 0)) return w.fill(NaN);
    w[0] = Math.pow(u[0], alpha);
    for (let k = 1; k < n; k++) {
      let s = 0;
      for (let j = 1; j <= k; j++) s += (alpha * j - (k - j)) * u[j] * w[k - j];
      w[k] = s / (k * u[0]);
    }
    return w;
  }

  // Значение дерева выражения как ряд в точке a
  function seriesOf(ast, a, N) {
    const n = N + 1;
    const rec = (t) => {
      switch (t.type) {
        case 'num': return constS(t.value, n);
        case 'const': return constS(t.name === 'pi' ? Math.PI : Math.E, n);
        case 'var': { const s = constS(a, n); if (n > 1) s[1] = 1; return s; }
        case 'neg': return scale(rec(t.a), -1);
        case 'op': {
          const p = rec(t.a);
          if (t.op === '^' && !E.hasX(t.b)) return powConst(p, E.evaluate(t.b, 0));
          const q = rec(t.b);
          switch (t.op) {
            case '+': return add(p, q);
            case '-': return sub(p, q);
            case '*': return mul(p, q);
            case '/': return div(p, q);
            case '^': return expS(mul(q, lnS(p))); // u^v = e^{v ln u}
          }
          break;
        }
        case 'fn': {
          const u = rec(t.arg);
          const du = deriv(u);
          switch (t.name) {
            case 'exp': return expS(u);
            case 'ln': return lnS(u);
            case 'sqrt': return powConst(u, 0.5);
            case 'sin': return sinCos(u)[0];
            case 'cos': return sinCos(u)[1];
            case 'tg': { const [s, c] = sinCos(u); return div(s, c); }
            case 'ctg': { const [s, c] = sinCos(u); return div(c, s); }
            case 'arctg': return integ(div(du, add(constS(1, n), mul(u, u))), Math.atan(u[0]));
            case 'arcctg': return integ(scale(div(du, add(constS(1, n), mul(u, u))), -1), Math.PI / 2 - Math.atan(u[0]));
            case 'arcsin': return integ(div(du, powConst(sub(constS(1, n), mul(u, u)), 0.5)), Math.asin(u[0]));
            case 'arccos': return integ(scale(div(du, powConst(sub(constS(1, n), mul(u, u)), 0.5)), -1), Math.acos(u[0]));
          }
        }
      }
      return zeros(n).fill(NaN);
    };
    return rec(ast);
  }

  // Значение многочлена Тейлора степени n в точке x
  function evalPoly(c, a, n, x) {
    let s = 0, p = 1;
    for (let k = 0; k <= n; k++) { s += c[k] * p; p *= x - a; }
    return s;
  }

  // Знаменатель «как у факториала»: все простые множители не больше 23
  function smooth(q) {
    for (const pr of [2, 3, 5, 7, 11, 13, 17, 19, 23]) while (q % pr === 0) q /= pr;
    return q === 1;
  }
  // Число -> «красивая» дробь (цепные дроби). Принимаем только точные совпадения
  // с маленьким или «факториальным» знаменателем — иначе e превратилось бы в 517656/190435.
  function rationalize(v) {
    if (!isFinite(v)) return null;
    if (Math.abs(v) < 1e-13) return { p: 0, q: 1 };
    const sign = v < 0 ? -1 : 1, av = Math.abs(v);
    let x = av, h0 = 0, h1 = 1, k0 = 1, k1 = 0;
    for (let i = 0; i < 40; i++) {
      const a = Math.floor(x);
      [h0, h1] = [h1, a * h1 + h0];
      [k0, k1] = [k1, a * k1 + k0];
      if (k1 > 1e12) break;
      if (Math.abs(h1 / k1 - av) < 1e-11 * av) { // относительный допуск: важно для маленьких коэффициентов
        return k1 <= 2000 || smooth(k1) ? { p: sign * h1, q: k1 } : null;
      }
      if (x - a < 1e-15) break;
      x = 1 / (x - a);
    }
    return null;
  }

  function fmtDec(v) {
    const s = Math.abs(v) >= 1e-3 || v === 0 ? String(+v.toPrecision(5)) : v.toExponential(3).replace(/e(-?\d+)/, ' \\cdot 10^{$1}');
    return s.replace('.', '{,}');
  }
  // TeX коэффициента как отдельного числа
  function coefTex(v) {
    const r = rationalize(v);
    if (!r) return fmtDec(v);
    if (r.q === 1) return String(r.p);
    return (r.p < 0 ? '-' : '') + '\\frac{' + Math.abs(r.p) + '}{' + r.q + '}';
  }

  // TeX многочлена Тейлора: c0 + c1 (x − a) + …
  function polyTex(c, a, n, varTex) {
    const base = a === 0 ? (varTex || 'x') : '(x ' + (a < 0 ? '+ ' : '- ') + coefTex(Math.abs(a)) + ')';
    const terms = [];
    for (let k = 0; k <= n; k++) {
      const v = c[k];
      if (!isFinite(v)) return '\\text{не определено}';
      if (Math.abs(v) < 1e-12) continue;
      const pw = k === 0 ? '' : k === 1 ? base : base + '^{' + k + '}';
      const r = rationalize(v);
      let body, neg = v < 0;
      if (r) {
        const p = Math.abs(r.p), q = r.q;
        if (k === 0) body = q === 1 ? String(p) : '\\frac{' + p + '}{' + q + '}';
        else if (q === 1) body = (p === 1 ? '' : p) + pw;
        else body = '\\frac{' + (p === 1 ? '' : p) + pw + '}{' + q + '}';
      } else body = fmtDec(Math.abs(v)) + (k ? ' ' + pw : '');
      terms.push({ neg, body });
    }
    if (!terms.length) return '0';
    return terms.map((t, i) => (i === 0 ? (t.neg ? '-' : '') + t.body : (t.neg ? ' - ' : ' + ') + t.body)).join('');
  }

  // Порядок первого ненулевого коэффициента
  function order(c) {
    const scaleV = Math.max(1, ...c.filter(isFinite).map(Math.abs));
    for (let k = 0; k < c.length; k++) if (Math.abs(c[k]) > 1e-9 * scaleV) return k;
    return null;
  }

  // Предел N(x)/D(x) при x → 0 по разложениям: { value, nOrd, dOrd, nc, dc }
  function limitAt0(numAst, denAst, N) {
    N = N || 12;
    const nc = seriesOf(numAst, 0, N), dc = seriesOf(denAst, 0, N);
    if (nc.some((v) => !isFinite(v)) || dc.some((v) => !isFinite(v))) return { error: 'Функция не раскладывается в ряд в нуле (не определена или не гладкая).' };
    const nOrd = order(nc), dOrd = order(dc);
    if (dOrd === null) return { error: 'Знаменатель тождественно равен нулю около нуля (в пределах точности).' };
    if (nOrd === null) return { value: 0, nOrd: N + 1, dOrd, nc, dc };
    let value;
    if (nOrd > dOrd) value = 0;
    else if (nOrd === dOrd) value = nc[nOrd] / dc[dOrd];
    else value = (dOrd - nOrd) % 2 === 0 ? Math.sign(nc[nOrd] / dc[dOrd]) * Infinity : NaN; // нечётная разность — разные знаки слева и справа
    return { value, nOrd, dOrd, nc, dc };
  }

  return { seriesOf, evalPoly, rationalize, coefTex, polyTex, order, limitAt0, fmtDec, mul, div };
});
