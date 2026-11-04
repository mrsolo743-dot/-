// Задачи по формуле Тейлора: пределы через разложения, коэффициенты, «сколько членов нужно».
// Зависит от Expr, Series, LimCore (разбор ответа).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./expr.js'), require('./series.js'), require('./limits-core.js'));
  else root.TaylorCore = factory(root.Expr, root.Series, root.LimCore);
})(typeof self !== 'undefined' ? self : this, function (E, S, LC) {
  'use strict';

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const T = (src) => E.tex(E.simplify(E.parse(src)));

  // ---------- Пределы через разложения ----------
  const LIMITS = [
    () => { const k = rnd(1, 4); return ['e^(' + k + 'x) - 1 - ' + k + 'x', 'x^2']; },
    () => { const k = rnd(1, 3); return ['sin(' + k + 'x) - ' + k + 'x', 'x^3']; },
    () => { const k = rnd(1, 4); return ['cos(' + k + 'x) - 1', 'x^2']; },
    () => { const k = rnd(1, 4); return ['ln(1 + ' + k + 'x) - ' + k + 'x', 'x^2']; },
    () => { const k = rnd(1, 3); return ['arctg(' + k + 'x) - ' + k + 'x', 'x^3']; },
    () => { const k = rnd(1, 4); return ['sqrt(1 + ' + k + 'x) - 1 - ' + k + 'x/2', 'x^2']; },
    () => ['tg x - sin x', 'x^3'],
    () => ['x - sin x', 'x - tg x'],
    () => ['e^x - 1 - sin x', 'x^2'],
    () => ['cos x - e^(-x^2/2)', 'x^4'],
    () => ['e^x sin x - x - x^2', 'x^3'],
    () => ['ln(1 + x) - sin x', 'x^2'],
    () => { const k = rnd(1, 3); return ['sin(' + k + 'x) - tg(' + k + 'x)', 'x^3']; },
    () => ['arcsin x - arctg x', 'x^3'],
    () => ['e^(x^2) - cos x', 'x^2'],
    () => ['1 - cos(x) cos(2x)', 'x^2'],
  ];

  function makeLimitTask() {
    for (let i = 0; i < 20; i++) {
      const [ns, ds] = pick(LIMITS)();
      const nA = E.parse(ns), dA = E.parse(ds);
      const r = S.limitAt0(nA, dA, 10);
      if (r.error || !isFinite(r.value)) continue;
      const ord = r.dOrd; // до какого порядка раскладывать
      const steps = [
        { title: 'Подстановка \\(x = 0\\) даёт \\(\\frac{0}{0}\\). Раскладываем числитель и знаменатель по формуле Маклорена до \\(x^{' + ord + '}\\) — порядка знаменателя.', tex: null },
        { title: 'Числитель:', tex: T(ns) + ' = ' + S.polyTex(r.nc, 0, ord) + ' + o(x^{' + ord + '})' },
        { title: 'Знаменатель:', tex: T(ds) + ' = ' + S.polyTex(r.dc, 0, ord) + (r.dc.slice(ord + 1).some((v) => Math.abs(v) > 1e-12) ? ' + o(x^{' + ord + '})' : '') },
        { title: 'Делим на \\(x^{' + ord + '}\\): все члены \\(o(x^{' + ord + '})\\) стремятся к нулю, остаются коэффициенты при \\(x^{' + ord + '}\\):', tex: '\\lim_{x \\to 0} \\frac{' + T(ns) + '}{' + T(ds) + '} = \\frac{' + S.coefTex(r.nc[ord]) + '}{' + S.coefTex(r.dc[ord]) + '} = ' + S.coefTex(r.value) },
      ];
      return { ns, ds, tex: '\\lim_{x \\to 0} \\frac{' + T(ns) + '}{' + T(ds) + '}', answer: r.value, answerTex: S.coefTex(r.value), steps };
    }
    return makeLimitTask();
  }

  // ---------- Коэффициент разложения ----------
  const COEFS = [
    () => { const a = pick([2, 3, -1, -2]); return 'e^(' + a + 'x)'; },
    () => { const a = pick([2, 3, -2]); return 'sin(' + a + 'x)'; },
    () => { const a = pick([2, 3]); return 'cos(' + a + 'x)'; },
    () => { const a = pick([2, 3, -1]); return 'ln(1 + ' + a + 'x)'.replace('+ -', '- '); },
    () => { const a = pick([2, 3, -1]); return '1/(1 - ' + a + 'x)'.replace('- -', '+ '); },
    () => pick(['sqrt(1 + x)', '(1 + x)^(1/3)', '1/sqrt(1 + x)', '(1 + x)^3', '1/(1 + x)^2']),
    () => pick(['e^x cos x', 'x e^(-x)', 'e^x/(1 - x)', 'sin x cos x', 'e^x sin x', 'ln(1 + x)/(1 + x)']),
  ];
  function makeCoefTask() {
    for (let i = 0; i < 50; i++) {
      const src = pick(COEFS)();
      const ast = E.parse(src);
      const c = S.seriesOf(ast, 0, 6);
      const k = rnd(2, 5);
      if (Math.abs(c[k]) < 1e-12 || !S.rationalize(c[k])) continue;
      const steps = [
        { title: 'Коэффициент при \\(x^k\\) в формуле Маклорена равен \\(\\frac{f^{(k)}(0)}{k!}\\). Удобнее не дифференцировать ' + k + ' раз, а взять готовые разложения (таблица выше) и подставить / перемножить их.', tex: null },
        { title: 'Разложение до \\(x^{' + k + '}\\):', tex: T(src) + ' = ' + S.polyTex(c, 0, k) + ' + o(x^{' + k + '})' },
        { title: 'Искомый коэффициент:', tex: 'c_{' + k + '} = ' + S.coefTex(c[k]) },
      ];
      return { src, k, tex: T(src), answer: c[k], answerTex: S.coefTex(c[k]), steps };
    }
    return makeCoefTask();
  }

  // ---------- «Сколько членов нужно?» (оценка Лагранжа) ----------
  const fact = (n) => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
  function makeTermsTask() {
    const fn = pick(['exp', 'sin', 'cos']);
    const x = pick([1, 0.5]);
    const m = rnd(3, 6);
    const tol = Math.pow(10, -m);
    const M = fn === 'exp' ? 3 : 1; // |f^{(n+1)}(ξ)| ≤ M на [0; x]
    const bound = (n) => (M * Math.pow(x, n + 1)) / fact(n + 1);
    let n = 0;
    while (bound(n) >= tol) n++;
    const name = { exp: 'e^{' + (x === 1 ? '' : '0{,}5') + '}'.replace('e^{}', 'e'), sin: '\\sin ' + (x === 1 ? '1' : '0{,}5'), cos: '\\cos ' + (x === 1 ? '1' : '0{,}5') }[fn];
    const fTex = { exp: 'e^x', sin: '\\sin x', cos: '\\cos x' }[fn];
    const xTex = x === 1 ? '1' : '0{,}5';
    const rows = [];
    for (let j = Math.max(0, n - 3); j <= n; j++) rows.push('n = ' + j + '\\colon\\; ' + (M === 1 ? '' : M + ' \\cdot ') + '\\frac{' + xTex + '^{' + (j + 1) + '}}{' + (j + 1) + '!} \\approx ' + S.fmtDec(bound(j)) + (bound(j) < tol ? ' < 10^{-' + m + '}' : ' \\ge 10^{-' + m + '}'));
    const steps = [
      { title: 'Остаточный член в форме Лагранжа: \\(R_n(x) = \\frac{f^{(n+1)}(\\xi)}{(n+1)!} x^{n+1}\\), где \\(\\xi\\) между 0 и \\(x\\).', tex: null },
      { title: fn === 'exp' ? 'Все производные \\(e^x\\) равны \\(e^x\\), а на \\([0;\\ ' + xTex + ']\\) имеем \\(e^\\xi \\le e^{' + xTex + '} &lt; 3\\).' : 'Все производные \\(' + fTex + '\\) — это \\(\\pm\\sin\\) или \\(\\pm\\cos\\), они по модулю не больше 1.', tex: '|R_n| \\le ' + (M === 1 ? '' : M + ' \\cdot ') + '\\frac{' + xTex + '^{n+1}}{(n+1)!}' },
      { title: 'Перебираем \\(n\\), пока оценка не станет меньше \\(10^{-' + m + '}\\):', tex: '\\begin{gathered}' + rows.join(' \\\\ ') + '\\end{gathered}' },
      { title: 'Наименьшее подходящее \\(n\\):', tex: 'n = ' + n },
    ];
    return { fn, x, m, n, M, tex: name, fTex, xTex, steps, bound, tol };
  }
  function checkTerms(t, raw) {
    const s = String(raw || '').trim();
    if (!/^\d+$/.test(s)) return { ok: false, invalid: true, message: 'Введите целое неотрицательное число n.' };
    const v = parseInt(s, 10);
    if (v === t.n) return { ok: true, message: 'Верно! Многочлена степени ' + t.n + ' достаточно.' };
    if (v > t.n) return { ok: false, message: 'Такого n хватит, но оно не наименьшее: оценка становится меньше нужной точности раньше.' };
    return { ok: false, message: 'Мало: при n = ' + v + ' оценка остатка ≈ ' + t.bound(v).toPrecision(2).replace('.', ',') + ', это не меньше 10^−' + t.m + '.' };
  }

  function checkValue(task, raw) {
    const p = LC.parseAnswer(raw);
    if (p.error) return { ok: false, invalid: true, message: p.error };
    if (p.none || !isFinite(p.value)) return { ok: false, message: 'Здесь ответ — конкретное число.' };
    const ok = Math.abs(p.value - task.answer) < 1e-9 * Math.max(1, Math.abs(task.answer));
    if (ok) return { ok: true, message: 'Верно!' };
    if (Math.abs(p.value + task.answer) < 1e-9 * Math.max(1, Math.abs(task.answer))) return { ok: false, message: 'Почти: ответ отличается знаком. Проверьте знаки в разложениях (у синуса и косинуса они чередуются).' };
    return { ok: false, message: 'Пока неверно. Посмотрите подсказку: раскладывать нужно до нужного порядка.' };
  }

  return { LIMITS, makeLimitTask, COEFS, makeCoefTask, makeTermsTask, checkTerms, checkValue, fact };
});
