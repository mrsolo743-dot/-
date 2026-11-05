// Интеграл: задачи «найдите первообразную» (проверка дифференцированием ответа),
// определённые и несобственные интегралы, численное интегрирование.
// Зависит от Expr и LimCore (разбор числового ответа).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./expr.js'), require('./limits-core.js'));
  else root.IntCore = factory(root.Expr, root.LimCore);
})(typeof self !== 'undefined' ? self : this, function (E, LC) {
  'use strict';

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (min, max) => { let v; do { v = rnd(min, max); } while (v === 0); return v; };
  const sg = (v) => (v < 0 ? ' - ' + -v : ' + ' + v);
  const T = (src) => E.tex(E.simplify(E.parse(src)));
  const fr = LC.fr;

  // ---------- Численный интеграл (формула Симпсона) ----------
  function simpson(f, a, b, n) {
    n = n || 2000;
    if (n % 2) n++;
    const h = (b - a) / n;
    let s = f(a) + f(b);
    for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * f(a + i * h);
    return (s * h) / 3;
  }
  // Суммы Римана и трапеции
  function riemann(f, a, b, n, kind) {
    const h = (b - a) / n;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const l = a + i * h, r = l + h;
      if (kind === 'left') s += f(l);
      else if (kind === 'right') s += f(r);
      else if (kind === 'mid') s += f((l + r) / 2);
      else s += (f(l) + f(r)) / 2;
    }
    return s * h;
  }

  // ---------- Первообразные ----------
  // Каждый шаблон: { f, F (строки для Expr), method, steps: [{title, tex}] }
  const ANTI = [
    () => { // многочлен
      const a = nz(-4, 4), n = rnd(2, 5), b = nz(-6, 6), c = nz(-7, 7);
      const f = a + 'x^' + n + sg(b) + 'x' + sg(c);
      const F = '(' + a + '/' + (n + 1) + ')x^' + (n + 1) + ' + (' + b + '/2)x^2 + ' + c + 'x';
      return { f, F, method: 'Таблица и линейность', steps: [
        { title: 'Интеграл суммы равен сумме интегралов, постоянный множитель выносится. Каждое слагаемое — по формуле \\(\\int x^n\\,dx = \\frac{x^{n+1}}{n+1} + C\\):', tex: '\\int (' + T(f) + ')\\,dx = ' + a + ' \\cdot \\frac{x^{' + (n + 1) + '}}{' + (n + 1) + '}' + sg(b) + ' \\cdot \\frac{x^2}{2}' + sg(c) + 'x + C' },
      ] };
    },
    () => { // корень и отрицательная степень
      const a = pick([3, 6, 9]), b = nz(-4, 4);
      const f = a + ' sqrt(x)' + sg(b) + '/x^2';
      const F = (2 * a / 3) + ' x^(3/2)' + sg(-b) + '/x';
      return { f, F, method: 'Таблица: степени с дробными и отрицательными показателями', steps: [
        { title: 'Перепишем через степени:', tex: T(f) + ' = ' + a + 'x^{1/2}' + sg(b) + 'x^{-2}' },
        { title: 'По формуле \\(\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}\\) (она верна при любом \\(n \\ne -1\\)):', tex: a + ' \\cdot \\frac{x^{3/2}}{3/2}' + sg(b) + ' \\cdot \\frac{x^{-1}}{-1} = ' + T(F) + ' + C' },
      ] };
    },
    () => { // линейная замена
      const k = nz(-4, 4), m = rnd(2, 5);
      const kind = pick(['exp', 'sin', 'cos']);
      const f = kind === 'exp' ? 'e^(' + k + 'x)' : kind + '(' + m + 'x)';
      const F = kind === 'exp' ? 'e^(' + k + 'x)/' + k : kind === 'sin' ? '-cos(' + m + 'x)/' + m : 'sin(' + m + 'x)/' + m;
      const kk = kind === 'exp' ? k : m;
      return { f, F, method: 'Линейная замена', steps: [
        { title: 'Внутри функции стоит \\(' + kk + 'x\\). Правило: если \\(\\int f(x)\\,dx = F(x) + C\\), то \\(\\int f(kx)\\,dx = \\frac{1}{k} F(kx) + C\\) — множитель \\(\\frac{1}{k}\\) компенсирует производную внутренней функции.', tex: null },
        { title: 'По таблице и правилу:', tex: '\\int ' + T(f) + '\\,dx = ' + T(F) + ' + C' },
      ] };
    },
    () => { // 1/(x + a)
      const a = nz(-5, 5), k = nz(-4, 4);
      const f = k + '/(x' + sg(a) + ')';
      const F = k + ' ln|x' + sg(a) + '|';
      return { f, F, method: 'Таблица: логарифм', steps: [
        { title: '\\(\\int \\frac{dx}{x} = \\ln|x| + C\\). Модуль нужен, чтобы формула работала и при отрицательных \\(x\\): \\((\\ln(-x))\' = \\frac{1}{x}\\).', tex: null },
        { title: 'Сдвиг \\(x \\to x' + sg(a) + '\\) — это линейная замена с \\(k = 1\\):', tex: '\\int ' + T(f) + '\\,dx = ' + T(F) + ' + C' },
      ] };
    },
    () => (() => { // интегрирование по частям
      const t = pick([
        { f: 'x e^x', F: '(x - 1) e^x', u: 'x', dv: 'e^x\\,dx', v: 'e^x', rest: '\\int e^x\\,dx', mid: 'x e^x - e^x' },
        { f: 'x sin x', F: 'sin x - x cos x', u: 'x', dv: '\\sin x\\,dx', v: '-\\cos x', rest: '\\int (-\\cos x)\\,dx', mid: '-x\\cos x + \\sin x' },
        { f: 'x cos x', F: 'x sin x + cos x', u: 'x', dv: '\\cos x\\,dx', v: '\\sin x', rest: '\\int \\sin x\\,dx', mid: 'x\\sin x + \\cos x' },
        { f: 'ln x', F: 'x ln x - x', u: '\\ln x', dv: 'dx', v: 'x', rest: '\\int x \\cdot \\frac{1}{x}\\,dx', mid: 'x\\ln x - x' },
        { f: 'x ln x', F: 'x^2 ln(x)/2 - x^2/4', u: '\\ln x', dv: 'x\\,dx', v: '\\frac{x^2}{2}', rest: '\\int \\frac{x^2}{2} \\cdot \\frac{1}{x}\\,dx', mid: '\\frac{x^2}{2}\\ln x - \\frac{x^2}{4}' },
        { f: 'arctg x', F: 'x arctg x - ln(1 + x^2)/2', u: '\\operatorname{arctg} x', dv: 'dx', v: 'x', rest: '\\int \\frac{x}{1 + x^2}\\,dx', mid: 'x \\operatorname{arctg} x - \\frac{1}{2}\\ln(1 + x^2)' },
      ]);
      return { f: t.f, F: t.F, method: 'Интегрирование по частям', steps: [
        { title: 'Формула по частям: \\(\\int u\\,dv = uv - \\int v\\,du\\). За \\(u\\) берём то, что упрощается при дифференцировании (многочлен, \\(\\ln\\), \\(\\operatorname{arctg}\\)):', tex: 'u = ' + t.u + ', \\qquad dv = ' + t.dv + ', \\qquad v = ' + t.v },
        { title: 'Подставляем:', tex: '\\int ' + T(t.f) + '\\,dx = ' + t.u + ' \\cdot ' + (t.v.startsWith('-') ? '(' + t.v + ')' : t.v) + ' - ' + t.rest },
        { title: 'Оставшийся интеграл табличный:', tex: '= ' + t.mid + ' + C' },
      ] };
    })(),
    () => (() => { // замена переменной
      const gens = [
        () => { const a = rnd(1, 9); return { f: '2x/(x^2 + ' + a + ')', F: 'ln(x^2 + ' + a + ')', u: 'x^2 + ' + a, du: '2x\\,dx', mid: '\\int \\frac{du}{u} = \\ln|u|' }; },
        () => ({ f: 'x e^(x^2)', F: 'e^(x^2)/2', u: 'x^2', du: '2x\\,dx', mid: '\\frac{1}{2}\\int e^u\\,du = \\frac{1}{2} e^u' }),
        () => { const a = rnd(1, 9); return { f: 'x/sqrt(x^2 + ' + a + ')', F: 'sqrt(x^2 + ' + a + ')', u: 'x^2 + ' + a, du: '2x\\,dx', mid: '\\frac{1}{2}\\int u^{-1/2}\\,du = \\sqrt{u}' }; },
        () => ({ f: 'cos(x) e^(sin x)', F: 'e^(sin x)', u: '\\sin x', du: '\\cos x\\,dx', mid: '\\int e^u\\,du = e^u' }),
        () => ({ f: 'ln(x)/x', F: 'ln(x)^2/2', u: '\\ln x', du: '\\frac{dx}{x}', mid: '\\int u\\,du = \\frac{u^2}{2}' }),
        () => ({ f: 'sin(x) cos(x)^3', F: '-cos(x)^4/4', u: '\\cos x', du: '-\\sin x\\,dx', mid: '-\\int u^3\\,du = -\\frac{u^4}{4}' }),
      ];
      const t = pick(gens)();
      return { f: t.f, F: t.F, method: 'Замена переменной', steps: [
        { title: 'В подынтегральном выражении видна функция и (с точностью до множителя) её производная. Делаем замену:', tex: 'u = ' + t.u + ', \\qquad du = ' + t.du },
        { title: 'Интеграл становится табличным:', tex: t.mid },
        { title: 'Возвращаемся к \\(x\\):', tex: '\\int ' + T(t.f) + '\\,dx = ' + T(t.F) + ' + C' },
      ] };
    })(),
    () => { // arctg и arcsin
      const a = rnd(2, 5);
      if (Math.random() < 0.5) return { f: '1/(x^2 + ' + a * a + ')', F: 'arctg(x/' + a + ')/' + a, method: 'Таблица: арктангенс', steps: [
        { title: 'Табличный интеграл \\(\\int \\frac{dx}{x^2 + a^2} = \\frac{1}{a}\\operatorname{arctg}\\frac{x}{a} + C\\), здесь \\(a = ' + a + '\\).', tex: '\\int \\frac{dx}{x^2 + ' + a * a + '} = ' + T('arctg(x/' + a + ')/' + a) + ' + C' },
        { title: 'Откуда: вынесем \\(a^2\\) и сделаем замену \\(x = at\\): \\(\\int \\frac{a\\,dt}{a^2(t^2 + 1)} = \\frac{1}{a}\\operatorname{arctg} t\\).', tex: null },
      ] };
      return { f: '1/sqrt(' + a * a + ' - x^2)', F: 'arcsin(x/' + a + ')', method: 'Таблица: арксинус', steps: [
        { title: 'Табличный интеграл \\(\\int \\frac{dx}{\\sqrt{a^2 - x^2}} = \\arcsin\\frac{x}{a} + C\\), здесь \\(a = ' + a + '\\).', tex: '\\int \\frac{dx}{\\sqrt{' + a * a + ' - x^2}} = \\arcsin\\frac{x}{' + a + '} + C' },
      ] };
    },
    () => { // простейшие дроби
      let p, q;
      do { p = rnd(-4, 4); q = rnd(-4, 4); } while (p === q);
      const d = p - q;
      const lin = (r) => (r === 0 ? 'x' : 'x' + sg(-r)); // «x − r», без «x + 0»
      const den = '(' + lin(p) + ')(' + lin(q) + ')';
      const f = '1/(' + den + ')';
      const F = '(1/' + d + ') ln|' + lin(p) + '| - (1/' + d + ') ln|' + lin(q) + '|';
      return { f, F, method: 'Разложение на простейшие дроби', steps: [
        { title: 'Раскладываем дробь на простейшие:', tex: '\\frac{1}{(' + T(lin(p)) + ')(' + T(lin(q)) + ')} = \\frac{A}{' + T(lin(p)) + '} + \\frac{B}{' + T(lin(q)) + '}' },
        { title: 'Умножаем на знаменатель: \\(1 = A(' + T(lin(q)) + ') + B(' + T(lin(p)) + ')\\). Подставляем \\(x = ' + p + '\\) и \\(x = ' + q + '\\):', tex: 'A = ' + fr(1, d) + ', \\qquad B = ' + fr(-1, d) },
        { title: 'Интегрируем каждую дробь (это логарифмы):', tex: T(F) + ' + C' },
      ] };
    },
    () => { // понижение степени
      const s = Math.random() < 0.5;
      return { f: s ? 'sin(x)^2' : 'cos(x)^2', F: s ? 'x/2 - sin(2x)/4' : 'x/2 + sin(2x)/4', method: 'Понижение степени', steps: [
        { title: 'Формула понижения степени:', tex: s ? '\\sin^2 x = \\frac{1 - \\cos 2x}{2}' : '\\cos^2 x = \\frac{1 + \\cos 2x}{2}' },
        { title: 'Интегрируем почленно (для \\(\\cos 2x\\) — линейная замена):', tex: '\\int ' + (s ? '\\sin^2 x' : '\\cos^2 x') + '\\,dx = \\frac{x}{2} ' + (s ? '-' : '+') + ' \\frac{\\sin 2x}{4} + C' },
      ] };
    },
  ];

  function makeAntiTask() {
    const t = pick(ANTI)();
    return Object.assign({ tex: T(t.f) }, t);
  }

  // Проверка первообразной: производная ответа должна совпасть с f там, где обе определены
  const SAMPLE = [-3.7, -2.6, -1.9, -1.3, -0.7, -0.4, 0.35, 0.6, 0.9, 1.4, 1.8, 2.3, 2.9, 3.6, 4.4];
  function compareFns(g, f) {
    let match = 0;
    for (const x of SAMPLE) {
      const a = E.evaluate(f, x), b = E.evaluate(g, x);
      if (!isFinite(a) || !isFinite(b)) continue;
      if (Math.abs(a - b) > 1e-6 * Math.max(1, Math.abs(a))) return false;
      match++;
    }
    return match >= 4;
  }
  function checkAnti(task, raw) {
    let ans;
    try { ans = E.parse(String(raw || '').replace(/\+\s*[cс]\s*$/i, '')); } // «+ C» в конце можно писать
    catch (e) { return { ok: false, invalid: true, message: e.message }; }
    const f = E.parse(task.f);
    const d = E.derive(ans).result;
    if (compareFns(d, f)) return { ok: true, message: 'Верно! Производная вашего ответа равна подынтегральной функции. Не забывайте \\(+\\,C\\).' };
    if (compareFns(ans, E.derive(f).result)) return { ok: false, message: 'Вы нашли производную, а нужна первообразная — функция, производная которой равна данной.' };
    if (compareFns(d, E.op('*', E.num(-1), f))) return { ok: false, message: 'Почти: производная вашего ответа отличается знаком. Проверьте знак, например \\(\\int \\sin x\\,dx = -\\cos x\\).' };
    for (const k of [2, 3, 4, 5, 0.5, 1 / 3, 0.25, 0.2]) {
      if (compareFns(d, E.op('*', E.num(k), f))) return { ok: false, message: 'Почти: ответ отличается постоянным множителем. При замене не забывайте множитель \\(\\frac{1}{k}\\) (или проверьте формулу \\(\\frac{x^{n+1}}{n+1}\\)).' };
    }
    return { ok: false, message: 'Пока неверно: производная вашего ответа не совпадает с подынтегральной функцией. Попробуйте подсказку — она подскажет метод.' };
  }

  // ---------- Определённые интегралы ----------
  const DEF = [
    () => { const a = nz(-3, 3), b = nz(-4, 4), c = nz(-5, 5), u = rnd(1, 3);
      const f = a + 'x^2' + sg(b) + 'x' + sg(c);
      const F = '(' + a + '/3)x^3 + (' + b + '/2)x^2 + ' + c + 'x';
      const val = (a * u ** 3) / 3 + (b * u * u) / 2 + c * u;
      return { f, F, lo: '0', hi: String(u), a: 0, b: u, value: val, valueTex: fr(2 * a * u ** 3 + 3 * b * u * u + 6 * c * u, 6) }; },
    () => ({ f: 'sin x', F: '-cos x', lo: '0', hi: '\\pi', a: 0, b: Math.PI, value: 2, valueTex: '2' }),
    () => ({ f: 'cos x', F: 'sin x', lo: '0', hi: '\\frac{\\pi}{2}', a: 0, b: Math.PI / 2, value: 1, valueTex: '1' }),
    () => ({ f: 'x sin x', F: 'sin x - x cos x', lo: '0', hi: '\\pi', a: 0, b: Math.PI, value: Math.PI, valueTex: '\\pi' }),
    () => ({ f: 'ln x', F: 'x ln x - x', lo: '1', hi: 'e', a: 1, b: Math.E, value: 1, valueTex: '1' }),
    () => ({ f: 'x e^x', F: '(x - 1) e^x', lo: '0', hi: '1', a: 0, b: 1, value: 1, valueTex: '1' }),
    () => ({ f: '1/(1 + x^2)', F: 'arctg x', lo: '0', hi: '1', a: 0, b: 1, value: Math.PI / 4, valueTex: '\\frac{\\pi}{4}' }),
    () => ({ f: 'ln(x)/x', F: 'ln(x)^2/2', lo: '1', hi: 'e', a: 1, b: Math.E, value: 0.5, valueTex: '\\frac{1}{2}' }),
    () => ({ f: '2x/(x^2 + 1)', F: 'ln(x^2 + 1)', lo: '0', hi: '1', a: 0, b: 1, value: Math.LN2, valueTex: '\\ln 2' }),
    () => ({ f: 'x^3 cos x', F: null, lo: '-1', hi: '1', a: -1, b: 1, value: 0, valueTex: '0', odd: true }),
    () => ({ f: 'sin(x)^2', F: 'x/2 - sin(2x)/4', lo: '0', hi: '2\\pi', a: 0, b: 2 * Math.PI, value: Math.PI, valueTex: '\\pi' }),
    () => ({ f: '|x - 1|', F: null, lo: '0', hi: '3', a: 0, b: 3, value: 2.5, valueTex: '\\frac{5}{2}', abs: true }),
    () => ({ f: 'e^(2x)', F: 'e^(2x)/2', lo: '0', hi: '\\ln 2', a: 0, b: Math.LN2, value: 1.5, valueTex: '\\frac{3}{2}' }),
  ];
  function makeDefTask() {
    const t = pick(DEF)();
    const integ = '\\int_{' + t.lo + '}^{' + t.hi + '} ' + T(t.f) + '\\,dx';
    const steps = [];
    if (t.odd) {
      steps.push({ title: 'Подынтегральная функция нечётная (\\(f(-x) = -f(x)\\)), а отрезок симметричен относительно нуля: площади слева и справа одинаковы по величине и противоположны по знаку.', tex: integ + ' = 0' });
    } else if (t.abs) {
      steps.push({ title: 'Модуль раскрываем по-разному слева и справа от точки \\(x = 1\\), где выражение под ним меняет знак, и делим отрезок:', tex: '\\int_0^1 (1 - x)\\,dx + \\int_1^3 (x - 1)\\,dx' });
      steps.push({ title: 'Каждый интеграл — площадь треугольника (или по Ньютону — Лейбницу):', tex: '\\frac{1}{2} + 2 = \\frac{5}{2}' });
    } else {
      steps.push({ title: 'Находим первообразную:', tex: 'F(x) = ' + T(t.F) });
      steps.push({ title: 'Формула Ньютона — Лейбница: \\(\\int_a^b f(x)\\,dx = F(b) - F(a)\\).', tex: integ + ' = F(' + t.hi + ') - F(' + t.lo + ') = ' + t.valueTex });
    }
    return Object.assign({ tex: integ }, t, { steps });
  }
  function checkDef(task, raw) {
    const p = LC.parseAnswer(raw);
    if (p.error) return { ok: false, invalid: true, message: p.error };
    if (p.none || !isFinite(p.value)) return { ok: false, message: 'Здесь интеграл конечен — ответ число.' };
    if (Math.abs(p.value - task.value) < 1e-6 * Math.max(1, Math.abs(task.value))) return { ok: true, message: 'Верно!' };
    if (Math.abs(p.value + task.value) < 1e-6 * Math.max(1, Math.abs(task.value))) return { ok: false, message: 'Знак не тот: \\(F(b) - F(a)\\), а не \\(F(a) - F(b)\\).' };
    return { ok: false, message: 'Пока неверно. Проверьте первообразную (продифференцируйте её) и подстановку пределов.' };
  }

  // ---------- Несобственные интегралы ----------
  const IMP = [
    { tex: '\\int_1^{+\\infty} \\frac{dx}{x^2}', conv: true, value: '1', why: '\\(\\int_1^{A} x^{-2}\\,dx = 1 - \\frac{1}{A} \\to 1\\). Вообще \\(\\int_1^\\infty \\frac{dx}{x^p}\\) сходится ровно при \\(p &gt; 1\\).' },
    { tex: '\\int_1^{+\\infty} \\frac{dx}{x}', conv: false, why: '\\(\\int_1^{A} \\frac{dx}{x} = \\ln A \\to \\infty\\). Граничный случай \\(p = 1\\) — расходится.' },
    { tex: '\\int_1^{+\\infty} \\frac{dx}{\\sqrt{x}}', conv: false, why: '\\(p = \\frac{1}{2} \\le 1\\): \\(2\\sqrt{A} - 2 \\to \\infty\\).' },
    { tex: '\\int_0^{1} \\frac{dx}{\\sqrt{x}}', conv: true, value: '2', why: 'Особенность в нуле: \\(\\int_\\varepsilon^1 x^{-1/2}\\,dx = 2 - 2\\sqrt{\\varepsilon} \\to 2\\). Около нуля всё наоборот: \\(\\int_0^1 \\frac{dx}{x^p}\\) сходится при \\(p &lt; 1\\).' },
    { tex: '\\int_0^{1} \\frac{dx}{x^2}', conv: false, why: '\\(p = 2 \\ge 1\\) около нуля: \\(\\frac{1}{\\varepsilon} - 1 \\to \\infty\\).' },
    { tex: '\\int_0^{+\\infty} e^{-x}\\,dx', conv: true, value: '1', why: '\\(1 - e^{-A} \\to 1\\). Экспонента убывает быстрее любой степени.' },
    { tex: '\\int_{-\\infty}^{+\\infty} \\frac{dx}{1 + x^2}', conv: true, value: '\\pi', why: '\\(\\operatorname{arctg} x\\) стремится к \\(\\pm\\frac{\\pi}{2}\\), разность — \\(\\pi\\).' },
    { tex: '\\int_0^{1} \\ln x\\,dx', conv: true, value: '-1', why: '\\(\\int_\\varepsilon^1 \\ln x\\,dx = -1 - \\varepsilon\\ln\\varepsilon + \\varepsilon \\to -1\\), так как \\(\\varepsilon \\ln \\varepsilon \\to 0\\).' },
    { tex: '\\int_2^{+\\infty} \\frac{dx}{x \\ln x}', conv: false, why: 'Замена \\(u = \\ln x\\): \\(\\int \\frac{du}{u} = \\ln \\ln A - \\ln\\ln 2 \\to \\infty\\) — расходится, хотя и очень медленно.' },
    { tex: '\\int_1^{+\\infty} \\frac{\\sin x}{x^2}\\,dx', conv: true, why: 'Признак сравнения: \\(\\left|\\frac{\\sin x}{x^2}\\right| \\le \\frac{1}{x^2}\\), а \\(\\int_1^\\infty \\frac{dx}{x^2}\\) сходится — значит, сходится абсолютно.' },
    { tex: '\\int_0^{+\\infty} \\sin x\\,dx', conv: false, why: '\\(1 - \\cos A\\) колеблется между 0 и 2 и предела не имеет — интеграл расходится (не к бесконечности, а «колебанием»).' },
    { tex: '\\int_1^{+\\infty} \\frac{x\\,dx}{x^3 + 1}', conv: true, why: 'При больших \\(x\\) функция ведёт себя как \\(\\frac{1}{x^2}\\) (предельный признак сравнения), а он сходится.' },
  ];

  // ---------- «Верно или неверно?» ----------
  const TF = [
    { tex: '\\text{Любая непрерывная на } [a;\\,b] \\text{ функция интегрируема}', truth: true, why: 'По теореме Кантора она равномерно непрерывна, поэтому разница между верхней и нижней суммами Римана стремится к нулю.' },
    { tex: '\\text{Функция Дирихле интегрируема на } [0;\\,1]', truth: false, why: 'В любом отрезке разбиения есть и рациональные, и иррациональные точки: нижняя сумма всегда 0, верхняя — 1.' },
    { tex: '\\text{Интегрируемая функция обязана быть непрерывной}', truth: false, why: 'Ступенька \\(\\operatorname{sign} x\\) интегрируема на \\([-1; 1]\\), хотя разрывна. Достаточно, чтобы разрывов было «мало».' },
    { tex: '\\text{Две первообразные одной функции на промежутке отличаются на константу}', truth: true, why: 'Их разность имеет нулевую производную, а по теореме Лагранжа такая функция на промежутке постоянна.' },
    { tex: '\\int \\frac{dx}{x} = \\ln x + C \\text{ при всех } x \\ne 0', truth: false, why: '\\(\\ln x\\) не определён при \\(x &lt; 0\\). Правильно: \\(\\ln|x| + C\\).' },
    { tex: '\\int_a^b f(x)\\,dx \\text{ — это всегда площадь фигуры под графиком}', truth: false, why: 'Это площадь со знаком: части под осью \\(Ox\\) входят с минусом. \\(\\int_0^{2\\pi} \\sin x\\,dx = 0\\).' },
    { tex: '\\left(\\int_a^x f(t)\\,dt\\right)\' = f(x) \\text{ для непрерывной } f', truth: true, why: 'Это главная часть доказательства формулы Ньютона — Лейбница (теорема Барроу).' },
    { tex: '\\int f(x) g(x)\\,dx = \\int f(x)\\,dx \\cdot \\int g(x)\\,dx', truth: false, why: 'Контрпример: \\(\\int x \\cdot x\\,dx = \\frac{x^3}{3}\\), а \\(\\frac{x^2}{2} \\cdot \\frac{x^2}{2} = \\frac{x^4}{4}\\). Для произведения есть интегрирование по частям.' },
    { tex: '\\text{У } e^{-x^2} \\text{ нет первообразной}', truth: false, why: 'Первообразная есть (например, \\(\\int_0^x e^{-t^2}dt\\)), но она не выражается через элементарные функции.' },
    { tex: '\\int_1^\\infty f \\text{ сходится} \\;\\Rightarrow\\; f(x) \\to 0 \\text{ при } x \\to \\infty', truth: false, why: 'Неочевидно, но неверно: можно построить функцию из всё более узких «пиков» высоты 1, площади которых образуют сходящийся ряд.' },
    { tex: 'f \\ge 0,\\; \\int_a^b f\\,dx = 0,\\; f \\text{ непрерывна} \\;\\Rightarrow\\; f \\equiv 0 \\text{ на } [a;\\,b]', truth: true, why: 'Если бы \\(f(x_0) &gt; 0\\), то по непрерывности \\(f &gt; \\frac{f(x_0)}{2}\\) на маленьком отрезке около \\(x_0\\), и интеграл был бы положительным.' },
  ];

  return { simpson, riemann, ANTI, makeAntiTask, checkAnti, compareFns, DEF, makeDefTask, checkDef, IMP, TF, pick };
});
