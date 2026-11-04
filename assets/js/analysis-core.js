// Исследование функции: численный анализ (область определения, нули, экстремумы, перегибы,
// асимптоты, промежутки монотонности и выпуклости) и задачи тренажёра.
// Зависит от Expr (производные), Series (распознавание дробей), LimCore (разбор ответа).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./expr.js'), require('./series.js'), require('./limits-core.js'));
  else root.AnCore = factory(root.Expr, root.Series, root.LimCore);
})(typeof self !== 'undefined' ? self : this, function (E, S, LC) {
  'use strict';

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (min, max) => { let v; do { v = rnd(min, max); } while (v === 0); return v; };
  const sg = (v) => (v < 0 ? ' - ' + -v : ' + ' + v);

  // ---------- «Красивое» число: целое, дробь, ±√(p/q), e, kπ/m, иначе десятичное ----------
  function nice(v) {
    if (!isFinite(v)) return v > 0 ? '+\\infty' : '-\\infty';
    if (Math.abs(v) < 1e-9) return '0';
    if (Math.abs(v - Math.round(v)) < 1e-7) return String(Math.round(v));
    const frac = (r) => (r.q === 1 ? String(r.p) : (r.p < 0 ? '-' : '') + '\\frac{' + Math.abs(r.p) + '}{' + r.q + '}');
    const r = smallFrac(v);
    if (r) return frac(r);
    const r2 = smallFrac(v * v);
    if (r2 && r2.p > 0) {
      // √(p/q) = √(pq)/q; выносим квадраты из-под корня: √(s²t) = s√t
      let n = r2.p * r2.q, out = 1;
      for (let d = 2; d * d <= n; d++) while (n % (d * d) === 0) { n /= d * d; out *= d; }
      const g = gcdI(out, r2.q), num = out / g, den = r2.q / g;
      const body = (num === 1 ? '' : num) + '\\sqrt{' + n + '}';
      return (v < 0 ? '-' : '') + (den === 1 ? body : '\\frac{' + body + '}{' + den + '}');
    }
    for (const [c, t] of [[Math.E, 'e'], [1 / Math.E, '\\frac{1}{e}'], [Math.PI, '\\pi']]) {
      const k = smallFrac(v / c);
      if (k && Math.abs(k.p) <= 12 && k.q <= 12) {
        if (k.p === 1 && k.q === 1) return t;
        if (k.p === -1 && k.q === 1) return '-' + t;
        return (k.p < 0 ? '-' : '') + (k.q === 1 ? Math.abs(k.p) + t : '\\frac{' + (Math.abs(k.p) === 1 ? '' : Math.abs(k.p)) + t + '}{' + k.q + '}');
      }
    }
    return String(+v.toFixed(3)).replace('.', '{,}');
  }
  // Округление предела к ближайшей «простой» константе: p/q (q ≤ 12), pπ/q, e, 1/e
  function approxConst(v, tol) {
    if (!isFinite(v)) return v;
    let best = v, bestErr = tol;
    for (const [c] of [[1], [Math.PI], [Math.E], [1 / Math.E]]) {
      for (let q = 1; q <= 12; q++) {
        const p = Math.round((v / c) * q);
        const cand = (p / q) * c, err = Math.abs(cand - v);
        if (err < bestErr) { best = cand; bestErr = err; }
      }
      if (bestErr < tol) break; // сначала пробуем простые дроби
    }
    return best;
  }
  function smallFrac(v) {
    for (let q = 1; q <= 64; q++) {
      const p = Math.round(v * q);
      if (Math.abs(p / q - v) < 1e-8 * Math.max(1, Math.abs(v))) return { p, q };
    }
    return null;
  }

  function gcdI(a, b) { while (b) [a, b] = [b, a % b]; return Math.abs(a) || 1; }

  // ---------- Поиск корней на сетке ----------
  function bisect(g, a, b) {
    let ga = g(a);
    for (let i = 0; i < 80; i++) {
      const m = (a + b) / 2, gm = g(m);
      if (gm === 0) return m;
      if (Math.sign(gm) === Math.sign(ga)) { a = m; ga = gm; } else b = m;
    }
    return (a + b) / 2;
  }
  // корни g на [lo; hi]: смена знака (без «перескока через бесконечность») и касания нуля
  function roots(g, lo, hi, breaks, N) {
    N = N || 4000;
    const xs = [], ys = [];
    for (let i = 0; i <= N; i++) { const x = lo + ((hi - lo) * i) / N; xs.push(x); ys.push(g(x)); }
    const fin = ys.filter(isFinite).map(Math.abs).sort((p, q) => p - q);
    const scale = Math.max(1, fin.length ? fin[Math.floor(fin.length / 2)] : 1);
    const out = [];
    const nearBreak = (a, b) => breaks.some((c) => c >= a - 1e-9 && c <= b + 1e-9);
    for (let i = 0; i < N; i++) {
      const a = ys[i], b = ys[i + 1];
      if (!isFinite(a) || !isFinite(b)) continue;
      if (a === 0) { out.push(xs[i]); continue; }
      if (Math.sign(a) !== Math.sign(b) && b !== 0 && !nearBreak(xs[i], xs[i + 1]) && Math.abs(a) < 1e6 * scale && Math.abs(b) < 1e6 * scale) {
        const r = bisect(g, xs[i], xs[i + 1]);
        if (Math.abs(g(r)) < 1e-6 * scale) out.push(r);
      }
    }
    // касания: локальные минимумы |g|, близкие к нулю (двойные корни)
    for (let i = 1; i < N; i++) {
      const a = Math.abs(ys[i - 1]), m = Math.abs(ys[i]), b = Math.abs(ys[i + 1]);
      if (!(m <= a && m <= b) || !isFinite(a) || !isFinite(b) || m > 1e-2 * scale) continue;
      let l = xs[i - 1], r = xs[i + 1];
      for (let k = 0; k < 100; k++) {
        const m1 = l + (r - l) / 3, m2 = r - (r - l) / 3;
        if (Math.abs(g(m1)) < Math.abs(g(m2))) r = m2; else l = m1;
      }
      const x = (l + r) / 2;
      if (Math.abs(g(x)) < 1e-9 * scale) out.push(x);
    }
    out.sort((p, q) => p - q);
    return out.filter((x, i) => i === 0 || x - out[i - 1] > 1e-6).map(snap);
  }
  // «примагничиваем» почти целые/дробные значения (ошибки бисекции)
  function snap(x) {
    const r = smallFrac(x);
    if (r && Math.abs(r.p / r.q - x) < 1e-7) return r.p / r.q;
    return Math.abs(x) < 1e-10 ? 0 : x;
  }

  // Подвыражения, обнуление которых ломает область определения
  function trouble(ast, out) {
    out = out || [];
    if (!ast || typeof ast !== 'object') return out;
    if (ast.type === 'op' && ast.op === '/') out.push(ast.b);
    if (ast.type === 'op' && ast.op === '^' && !E.hasX(ast.b) && E.evaluate(ast.b, 0) < 0) out.push(ast.a);
    if (ast.type === 'fn' && (ast.name === 'ln' || ast.name === 'sqrt')) out.push(ast.arg);
    if (ast.type === 'fn' && ast.name === 'tg') out.push(E.fn('cos', ast.arg));
    if (ast.type === 'fn' && ast.name === 'ctg') out.push(E.fn('sin', ast.arg));
    if (ast.type === 'fn' && ast.name === 'exp') { /* всюду определена */ }
    for (const k of ['a', 'b', 'arg']) if (ast[k]) trouble(ast[k], out);
    return out;
  }

  // ---------- Полное исследование ----------
  function analyze(ast, L) {
    L = L || 10;
    const f = (x) => E.evaluate(ast, x);
    const d1 = E.derive(ast).result;
    const d2 = E.derive(d1).result;
    const f1 = (x) => E.evaluate(d1, x), f2 = (x) => E.evaluate(d2, x);
    const lo = -L, hi = L;

    // Особые точки: нули «опасных» подвыражений
    let breaks = [];
    for (const t of trouble(ast)) {
      if (!E.hasX(t)) continue;
      const g = (x) => E.evaluate(t, x);
      breaks.push(...roots(g, lo, hi, []));
    }
    breaks = [...new Set(breaks.map((x) => +x.toFixed(10)))].sort((p, q) => p - q);

    // Область определения в окне: отрезки сетки, где f конечна
    const N = 4000, segs = [];
    let start = null;
    for (let i = 0; i <= N; i++) {
      const x = lo + ((hi - lo) * i) / N;
      const v = f(x);
      const ok = !isNaN(v) && !breaks.some((c) => Math.abs(c - x) < 1e-12); // переполнение (±∞) — не «не определена»
      if (ok && start === null) start = x;
      if ((!ok || i === N) && start !== null) {
        let endX = ok ? x : lo + ((hi - lo) * (i - 1)) / N;
        // уточняем границы
        const refine = (inside, outside) => { for (let k = 0; k < 60; k++) { const m = (inside + outside) / 2; if (!isNaN(f(m))) inside = m; else outside = m; } return snap(outside); };
        const a = start === lo ? lo : refine(start, start - (hi - lo) / N);
        const b = !ok ? refine(endX, x) : hi;
        segs.push([a, b]);
        start = null;
      }
    }

    const zeros = roots(f, lo, hi, breaks).filter((x) => isFinite(f(x)));
    const crit = roots(f1, lo, hi, breaks).filter((x) => isFinite(f(x)));
    const infl0 = roots(f2, lo, hi, breaks).filter((x) => isFinite(f(x)));
    const side = (g, x, dir, neighbors) => {
      const others = neighbors.filter((y) => Math.abs(y - x) > 1e-9).map((y) => Math.abs(y - x));
      const h = Math.min(1e-3, ...(others.length ? others.map((d) => d / 3) : [1e-3]));
      return g(x + dir * h);
    };
    const keyAll = [...crit, ...infl0, ...breaks];
    const extrema = crit.map((x) => {
      const l = side(f1, x, -1, keyAll), r = side(f1, x, 1, keyAll);
      const kind = l > 0 && r < 0 ? 'max' : l < 0 && r > 0 ? 'min' : 'none';
      return { x, y: f(x), kind };
    });
    const inflections = infl0.filter((x) => Math.sign(side(f2, x, -1, keyAll)) * Math.sign(side(f2, x, 1, keyAll)) < 0).map((x) => ({ x, y: f(x) }));

    // Асимптоты
    const vertical = [];
    const edgePts = [...breaks, ...segs.flatMap((s) => s).filter((x) => x > lo + 1e-9 && x < hi - 1e-9)];
    for (const c of [...new Set(edgePts.map((x) => +x.toFixed(9)))]) {
      const l = f(c - 1e-7), r = f(c + 1e-7);
      const infL = !isNaN(l) && Math.abs(l) > 1e5, infR = !isNaN(r) && Math.abs(r) > 1e5;
      if (infL || infR) vertical.push({ x: c, left: infL ? Math.sign(l) * Infinity : l, right: infR ? Math.sign(r) * Infinity : r });
    }
    const oblique = (dir) => {
      const X1 = dir * 1e5, X2 = dir * 1e6;
      const y1 = f(X1), y2 = f(X2);
      if (!isFinite(y1) || !isFinite(y2)) return null;
      const k1 = y1 / X1, k2 = y2 / X2;
      if (Math.abs(k1 - k2) > 1e-3 * Math.max(1, Math.abs(k2))) return null;
      const k = approxConst(Math.abs(k2) < 1e-4 ? 0 : k2, 1e-4);
      const b1 = y1 - k * X1, b2 = y2 - k * X2;
      if (!isFinite(b1) || !isFinite(b2) || Math.abs(b1 - b2) > 1e-2 * Math.max(1, Math.abs(b2))) return null;
      const b = approxConst(Math.abs(b2) < 1e-4 ? 0 : b2, 1e-4);
      return { k, b };
    };
    const asPlus = oblique(1), asMinus = oblique(-1);

    // Промежутки: между всеми особыми точками
    const cuts = [...new Set([lo, ...breaks, ...crit, ...inflections.map((p) => p.x), ...segs.flatMap((s) => s), hi].map((x) => +x.toFixed(10)))].filter((x) => x >= lo && x <= hi).sort((p, q) => p - q);
    const intervals = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i], b = cuts[i + 1];
      if (b - a < 1e-9) continue;
      const m = (a + b) / 2;
      if (!isFinite(f(m))) { intervals.push({ a, b, defined: false }); continue; }
      intervals.push({ a, b, defined: true, inc: Math.sign(f1(m)), conv: Math.sign(f2(m)) });
    }
    return { ast, d1, d2, f, f1, f2, L, breaks, segs, zeros, extrema, inflections, vertical, asPlus, asMinus, intervals, f0: f(0) };
  }

  // ---------- Тренажёр: экстремумы ----------
  const EXT = [
    () => {
      let a, p, q;
      do { a = pick([1, -1, 2, -2]); p = rnd(-4, 3); q = rnd(p + 1, 4); } while ((a * (p + q)) % 2 !== 0);
      const B = (-3 * a * (p + q)) / 2, C = 3 * a * p * q, d = rnd(-5, 5);
      const src = a + 'x^3' + sg(B) + 'x^2' + sg(C) + 'x' + sg(d);
      return { src, max: [a > 0 ? p : q], min: [a > 0 ? q : p] };
    },
    () => ({ src: 'x e^x', max: [], min: [-1] }),
    () => ({ src: 'x e^(-x)', max: [1], min: [] }),
    () => ({ src: 'x^2 e^(-x)', max: [2], min: [0] }),
    () => ({ src: 'ln(x)/x', max: [Math.E], min: [] }),
    () => { const k = pick([1, 4, 9]); const r = Math.sqrt(k); return { src: 'x + ' + k + '/x', max: [-r], min: [r] }; },
    () => ({ src: 'x ln x', max: [], min: [1 / Math.E] }),
    () => ({ src: 'x/(x^2 + 1)', max: [1], min: [-1] }),
    () => ({ src: 'x^4 - 2x^2', max: [0], min: [-1, 1] }),
    () => ({ src: 'e^(-x^2)', max: [0], min: [] }),
    () => ({ src: 'x^3', max: [], min: [] }),
    () => ({ src: 'x^2 (x - 3)', max: [0], min: [2] }),
    () => ({ src: 'x^4 - 4x^3', max: [], min: [3] }),
  ];
  function makeExtTask() {
    const t = pick(EXT)();
    const ast = E.parse(t.src);
    const an = analyze(ast);
    const crit = an.extrema;
    const steps = [
      { title: 'Находим производную:', tex: "f'(x) = " + E.tex(an.d1) },
      { title: 'Критические точки — где \\(f\'(x) = 0\\) (или не существует):', tex: crit.length ? crit.map((c) => 'x = ' + nice(c.x)).join(', \\quad ') : '\\text{нет}' },
      { title: 'Смотрим, меняет ли \\(f\'\\) знак: с «+» на «−» — максимум, с «−» на «+» — минимум, без смены — экстремума нет.', tex: crit.length ? crit.map((c) => 'x = ' + nice(c.x) + '\\colon\\; ' + (c.kind === 'max' ? '+ \\to -\\;\\; \\max' : c.kind === 'min' ? '- \\to +\\;\\; \\min' : '\\text{без смены знака}')).join(' \\\\ ') : null },
    ];
    if (steps[2].tex && crit.length > 1) steps[2].tex = '\\begin{gathered}' + steps[2].tex + '\\end{gathered}';
    return { src: t.src, tex: E.tex(E.simplify(ast)), max: t.max, min: t.min, steps, an };
  }

  // список чисел «1; -2» или «нет»
  function parseList(raw) {
    const s = String(raw || '').trim().toLowerCase();
    if (!s) return { error: 'Заполните оба поля (если точек нет — напишите «нет»).' };
    if (/^(нет|—|-|∅|нету)$/.test(s)) return { values: [] };
    const parts = s.split(/\s*;\s*|\s*,\s+/).filter(Boolean);
    const values = [];
    for (const p of parts) {
      const r = LC.parseAnswer(p);
      if (r.error || r.none || !isFinite(r.value)) return { error: 'Не получилось прочитать «' + p + '». Пример: 1; -2 или e или нет.' };
      values.push(r.value);
    }
    return { values };
  }
  const sameSet = (a, b) => a.length === b.length && a.every((x) => b.some((y) => Math.abs(x - y) < 1e-6 * Math.max(1, Math.abs(y))));

  function checkExt(t, rawMax, rawMin) {
    const pM = parseList(rawMax), pm = parseList(rawMin);
    if (pM.error) return { ok: false, invalid: true, message: 'Максимумы: ' + pM.error };
    if (pm.error) return { ok: false, invalid: true, message: 'Минимумы: ' + pm.error };
    const okM = sameSet(pM.values, t.max), okm = sameSet(pm.values, t.min);
    if (okM && okm) return { ok: true, message: 'Верно!' };
    if (sameSet(pM.values, t.min) && sameSet(pm.values, t.max)) return { ok: false, message: 'Максимумы и минимумы перепутаны: при переходе через максимум производная меняет знак с «+» на «−».' };
    const msgs = [];
    if (!okM) msgs.push('точки максимума найдены неверно');
    if (!okm) msgs.push('точки минимума найдены неверно');
    return { ok: false, message: msgs.join(', ').replace(/^./, (c) => c.toUpperCase()) + '. Не забывайте: \\(f\'(x_0) = 0\\) ещё не значит экстремум (у \\(x^3\\) его нет).' };
  }

  // ---------- Тренажёр: асимптоты ----------
  const ASY = [
    () => {
      const a = nz(-2, 2), b = nz(-5, 5), d = nz(-4, 4);
      let c; do { c = nz(-6, 6); } while (a * d * d + b * d + c === 0);
      return { src: '(' + a + 'x^2' + sg(b) + 'x' + sg(c) + ')/(x' + sg(-d) + ')', vert: [d], k: a, b: b + a * d };
    },
    () => {
      const a = nz(-4, 4), b = nz(-5, 5), c = pick([1, 2]), d = nz(-5, 5);
      if (a * d - b * c === 0) return ASY[1]();
      return { src: '(' + a + 'x' + sg(b) + ')/(' + c + 'x' + sg(d) + ')', vert: [-d / c], k: 0, b: a / c };
    },
    () => { const q = rnd(1, 4), p = nz(-5, 5); if (p === -q * q) return ASY[2](); return { src: '(x^2' + sg(p) + ')/(x^2 - ' + q * q + ')', vert: [-q, q], k: 0, b: 1 }; },
    () => { const k = nz(-5, 5); return { src: 'x + ' + k + '/x', vert: [0], k: 1, b: 0 }; },
    () => ({ src: 'e^(1/x)', vert: [0], k: 0, b: 1 }),
    () => { const k = rnd(1, 4); return { src: k + 'x + 1/x^2', vert: [0], k, b: 0 }; },
  ];
  function makeAsyTask() {
    const t = pick(ASY)();
    const ast = E.simplify(E.parse(t.src));
    const steps = [
      { title: 'Вертикальные асимптоты ищем в точках, где функция не определена: там односторонний предел должен быть бесконечным.', tex: t.vert.length ? t.vert.map((v) => 'x = ' + nice(v)).join(', \\quad ') : '\\text{нет}' },
      { title: 'Наклонная (или горизонтальная) асимптота \\(y = kx + b\\):', tex: 'k = \\lim_{x \\to \\infty} \\frac{f(x)}{x} = ' + nice(t.k) + ', \\qquad b = \\lim_{x \\to \\infty} \\big(f(x) - ' + (t.k === 0 ? '0' : nice(t.k) + 'x') + '\\big) = ' + nice(t.b) },
      { title: t.k === 0 ? 'При \\(k = 0\\) асимптота горизонтальная:' : 'Итак, наклонная асимптота:', tex: 'y = ' + (t.k === 0 ? nice(t.b) : E.tex(E.simplify(E.parse(t.k + 'x + ' + t.b)))) },
    ];
    return { src: t.src, tex: E.tex(ast), vert: t.vert, k: t.k, b: t.b, steps };
  }
  function checkAsy(t, rawV, rawK, rawB) {
    const pv = parseList(rawV);
    if (pv.error) return { ok: false, invalid: true, message: 'Вертикальные: ' + pv.error };
    const pk = LC.parseAnswer(rawK), pb = LC.parseAnswer(rawB);
    if (pk.error || !isFinite(pk.value)) return { ok: false, invalid: true, message: 'k: ' + (pk.error || 'нужно число') };
    if (pb.error || !isFinite(pb.value)) return { ok: false, invalid: true, message: 'b: ' + (pb.error || 'нужно число') };
    const okV = sameSet(pv.values, t.vert);
    const okK = Math.abs(pk.value - t.k) < 1e-9, okB = Math.abs(pb.value - t.b) < 1e-9 * Math.max(1, Math.abs(t.b));
    if (okV && okK && okB) return { ok: true, message: 'Верно!' };
    const msgs = [];
    if (!okV) msgs.push('вертикальные асимптоты: проверьте нули знаменателя (и что числитель там не ноль)');
    if (!okK) msgs.push('k = lim f(x)/x найден неверно');
    else if (!okB) msgs.push('k верно, а b = lim (f(x) − kx) — нет');
    return { ok: false, message: msgs.join('; ').replace(/^./, (c) => c.toUpperCase()) + '.' };
  }

  // ---------- Тренажёр: наибольшее и наименьшее на отрезке ----------
  function makeSegTask() {
    for (let i = 0; i < 100; i++) {
      const t = EXT[0]();
      const p = Math.min(t.max[0], t.min[0]), q = Math.max(t.max[0], t.min[0]);
      const l = rnd(p - 2, p), r = rnd(Math.max(l + 1, p + 1), q + 2);
      if (r - l > 7) continue;
      const ast = E.parse(t.src);
      const f = (x) => E.evaluate(ast, x);
      const cands = [l, r, ...[p, q].filter((x) => x > l && x < r)];
      const vals = cands.map((x) => ({ x, y: f(x) }));
      const ys = vals.map((v) => v.y);
      const M = Math.max(...ys), m = Math.min(...ys);
      const an = analyze(ast);
      const steps = [
        { title: 'По теореме Вейерштрасса наибольшее и наименьшее значения существуют. Они достигаются либо в критических точках внутри отрезка, либо на концах.', tex: "f'(x) = " + E.tex(an.d1) },
        { title: 'Критические точки: \\(x = ' + p + '\\) и \\(x = ' + q + '\\). Внутрь \\([' + l + ';\\ ' + r + ']\\) попадают: ' + (cands.length > 2 ? cands.slice(2).join(', ') : 'ни одной') + '.', tex: null },
        { title: 'Сравниваем значения:', tex: '\\begin{gathered}' + vals.map((v) => 'f(' + v.x + ') = ' + v.y).join(' \\\\ ') + '\\end{gathered}' },
        { title: 'Итог:', tex: '\\max_{[' + l + ';\\, ' + r + ']} f = ' + M + ', \\qquad \\min_{[' + l + ';\\, ' + r + ']} f = ' + m },
      ];
      return { src: t.src, tex: E.tex(E.simplify(ast)), l, r, max: M, min: m, steps };
    }
    return makeSegTask();
  }
  function checkSeg(t, rawM, rawm) {
    const pM = LC.parseAnswer(rawM), pm = LC.parseAnswer(rawm);
    if (pM.error || !isFinite(pM.value)) return { ok: false, invalid: true, message: 'Наибольшее: ' + (pM.error || 'нужно число') };
    if (pm.error || !isFinite(pm.value)) return { ok: false, invalid: true, message: 'Наименьшее: ' + (pm.error || 'нужно число') };
    const okM = Math.abs(pM.value - t.max) < 1e-9, okm = Math.abs(pm.value - t.min) < 1e-9;
    if (okM && okm) return { ok: true, message: 'Верно!' };
    return { ok: false, message: (okM ? '' : 'Наибольшее значение неверно. ') + (okm ? '' : 'Наименьшее значение неверно. ') + 'Частая ошибка — забыть сравнить со значениями на концах отрезка.' };
  }

  // ---------- «Верно или неверно?» ----------
  const TF = [
    { tex: "f'(x_0) = 0 \\;\\Rightarrow\\; x_0 \\text{ — точка экстремума}", truth: false, why: 'Контрпример: \\(x^3\\) в нуле. Производная равна нулю, но функция возрастает — экстремума нет.' },
    { tex: 'x_0 \\text{ — точка экстремума} \\;\\Rightarrow\\; f\'(x_0) = 0', truth: false, why: 'Только если производная существует (теорема Ферма). У \\(|x|\\) минимум в нуле, а производной там нет.' },
    { tex: "f''(x_0) = 0 \\;\\Rightarrow\\; x_0 \\text{ — точка перегиба}", truth: false, why: 'Контрпример: \\(x^4\\) в нуле. \\(f\'\'(0) = 0\\), но \\(f\'\' = 12x^2 \\ge 0\\) не меняет знак — перегиба нет (там минимум).' },
    { tex: "f'(x_0) = 0,\\; f''(x_0) &gt; 0 \\;\\Rightarrow\\; x_0 \\text{ — локальный минимум}", truth: true, why: 'По Тейлору \\(f(x) - f(x_0) = \\frac{f\'\'(x_0)}{2}(x - x_0)^2 + o((x - x_0)^2) &gt; 0\\) рядом с \\(x_0\\).' },
    { tex: '\\text{У многочлена степени } n \\ge 1 \\text{ не больше } n - 1 \\text{ точек экстремума}', truth: true, why: 'Экстремумы — среди корней производной, а это многочлен степени \\(n - 1\\).' },
    { tex: "f' &gt; 0 \\text{ на } (a;\\, b) \\;\\Rightarrow\\; f \\text{ имеет на } (a;\\, b) \\text{ не больше одного нуля}", truth: true, why: 'Функция строго возрастает, поэтому каждое значение принимает не больше одного раза.' },
    { tex: "f'' &gt; 0 \\text{ на } (a;\\, b) \\;\\Rightarrow\\; \\text{локальный минимум на } (a;\\, b) \\text{ — глобальный}", truth: true, why: 'Выпуклая вниз функция лежит над касательной; в точке минимума касательная горизонтальна, значит \\(f(x) \\ge f(x_0)\\) всюду.' },
    { tex: '\\text{Наклонная асимптота при } x \\to +\\infty \\text{ и при } x \\to -\\infty \\text{ всегда одна и та же}', truth: false, why: 'Контрпример: \\(\\sqrt{x^2 + 1}\\) — асимптоты \\(y = x\\) и \\(y = -x\\); или \\(\\operatorname{arctg} x\\) — \\(y = \\pm\\frac{\\pi}{2}\\).' },
    { tex: '\\text{График может пересекать свою горизонтальную асимптоту}', truth: true, why: 'Например, \\(\\frac{\\sin x}{x}\\) пересекает \\(y = 0\\) бесконечно много раз. Асимптота говорит о поведении на бесконечности, а не о том, что график её не касается.' },
    { tex: '\\text{У функции может быть бесконечно много вертикальных асимптот}', truth: true, why: '\\(\\operatorname{tg} x\\): асимптоты \\(x = \\frac{\\pi}{2} + \\pi k\\).' },
    { tex: '\\text{Непрерывная на } (a;\\, b) \\text{ функция с единственным экстремумом — максимумом — достигает в нём наибольшего значения}', truth: true, why: 'Слева от точки максимума функция не может «опуститься и снова подняться выше» — для этого нужен ещё один экстремум (минимум).' },
    { tex: '\\text{Если } f \\text{ возрастает, то } f\' &gt; 0 \\text{ всюду}', truth: false, why: 'Контрпример: \\(x^3\\) возрастает, но \\(f\'(0) = 0\\). Верно лишь \\(f\' \\ge 0\\).' },
    { tex: "\\text{Точка перегиба — это точка, где } f' \\text{ имеет экстремум}", truth: true, why: 'Перегиб — смена знака \\(f\'\'\\), то есть смена возрастания \\(f\'\\) на убывание или наоборот.' },
    { tex: '\\text{Рациональная функция } \\frac{P(x)}{Q(x)} \\text{ имеет наклонную асимптоту, если } \\deg P = \\deg Q + 1', truth: true, why: 'Деление с остатком: \\(\\frac{P}{Q} = kx + b + \\frac{R}{Q}\\), где \\(\\frac{R}{Q} \\to 0\\).' },
  ];

  return { nice, roots, analyze, EXT, makeExtTask, checkExt, parseList, ASY, makeAsyTask, checkAsy, makeSegTask, checkSeg, TF, pick };
});
