// Интерфейс темы «Непрерывность»: галерея разрывов, бисекция, равномерная непрерывность, тренажёр.
(function () {
  'use strict';
  const C = window.ContCore;
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const fmt = (v, d) => {
    if (!isFinite(v)) return v > 0 ? '+\\infty' : v < 0 ? '-\\infty' : '\\text{—}';
    if (v !== 0 && Math.abs(v) < 1e-3) { // маленькие числа — в научной записи
      const e = Math.floor(Math.log10(Math.abs(v)));
      return String(+(v / Math.pow(10, e)).toFixed(2)).replace('.', '{,}') + ' \\cdot 10^{' + e + '}';
    }
    return String(+v.toFixed(d === undefined ? 4 : d)).replace('.', '{,}');
  };
  const plain = (s) => s.replace(/\{,\}/g, ',');

  // График функции около точки x0: обрезаем выбросы, отмечаем значение и односторонние пределы
  function plotPoint(plot, t) {
    const x0 = t.x0, W = 3;
    const ys = [];
    for (let i = 0; i <= 400; i++) {
      const x = x0 - W + (2 * W * i) / 400;
      const y = t.f(x);
      if (isFinite(y)) ys.push(y);
    }
    ys.sort((a, b) => a - b);
    let lo = ys[Math.floor(ys.length * 0.05)], hi = ys[Math.floor(ys.length * 0.95)];
    if (t.fx0 !== null) { lo = Math.min(lo, t.fx0); hi = Math.max(hi, t.fx0); }
    const pad = Math.max(0.8, (hi - lo) * 0.25);
    plot.setView({ xMin: x0 - W, xMax: x0 + W, yMin: lo - pad, yMax: hi + pad, equal: false });
    const pts = [];
    const L = t.f(x0 - 1e-7), R = t.f(x0 + 1e-7);
    const near = (a, b) => Math.abs(a - b) < 1e-3;
    if (t.kind !== 'second') {
      if (isFinite(L) && !(t.fx0 !== null && near(L, t.fx0))) pts.push({ x: x0, y: L, hollow: true, color: css('--curve', '#2f6fdb') });
      if (isFinite(R) && !near(R, L) && !(t.fx0 !== null && near(R, t.fx0))) pts.push({ x: x0, y: R, hollow: true, color: css('--curve', '#2f6fdb') });
    }
    if (t.fx0 !== null) pts.push({ x: x0, y: t.fx0, label: 'f(x₀)', color: css('--bad', '#c0392b') });
    plot.draw([{ fn: (x) => (Math.abs(x - x0) < 1e-9 ? NaN : t.f(x)) }], pts, [{ x1: x0, y1: -1e4, x2: x0, y2: 1e4 }]);
  }

  // ---------- 2. Галерея ----------
  const galPlot = new Plot($('gal-plot'));
  function galUpdate() {
    const t = C.POINTS[$('gal-sel').value]();
    plotPoint(galPlot, t);
    const rows = [0.1, 0.01, 0.001].map((h) => '<tr><td>' + tex(fmt(t.x0 - h)) + '</td><td>' + tex(fmt(t.f(t.x0 - h), 3)) + '</td><td>' + tex(fmt(t.x0 + h)) + '</td><td>' + tex(fmt(t.f(t.x0 + h), 3)) + '</td></tr>');
    $('gal-out').innerHTML =
      '<p>' + tex(t.tex) + ', точка ' + tex('x_0 = ' + t.x0) + '.</p>' +
      '<div class="tt-wrap"><table class="num-table"><tr><th>\\(x\\) слева</th><th>\\(f(x)\\)</th><th>\\(x\\) справа</th><th>\\(f(x)\\)</th></tr>' + rows.join('') + '</table></div>' +
      '<p>' + tex('f(x_0 - 0) = ' + t.left + ', \\quad f(x_0 + 0) = ' + t.right + ', \\quad f(x_0) = ' + (t.fx0 === null ? '\\text{не определено}' : t.fx0)) + '</p>' +
      '<p class="feedback ' + (t.kind === 'cont' ? 'good' : 'hint') + '"><b>' + C.KINDS[t.kind].replace(/^./, (c) => c.toUpperCase()) + '.</b> ' + t.why + '</p>';
    renderMath($('gal-out'));
  }
  $('gal-sel').addEventListener('change', galUpdate);

  // ---------- 3. Бисекция ----------
  const BIS = [
    { f: (x) => x * x - 2, a: 1, b: 2, root: Math.SQRT2, tex: 'x^2 - 2' },
    { f: (x) => x ** 3 - 2 * x - 5, a: 2, b: 3, root: 2.0945514815423265, tex: 'x^3 - 2x - 5' },
    { f: (x) => Math.cos(x) - x, a: 0, b: 1, root: 0.7390851332151607, tex: '\\cos x - x' },
    { f: (x) => Math.exp(x) - 3, a: 0, b: 2, root: Math.log(3), tex: 'e^x - 3' },
  ];
  const bisPlot = new Plot($('bis-plot'));
  let bisN = 0;
  function bisUpdate() {
    const B = BIS[+$('bis-sel').value];
    const r = C.bisect(B.f, B.a, B.b, bisN);
    const a = r.a, b = r.b, m = (a + b) / 2;
    const ys = [B.f(B.a), B.f(B.b)];
    bisPlot.setView({ xMin: B.a - 0.3, xMax: B.b + 0.3, yMin: Math.min(...ys, 0) - 1, yMax: Math.max(...ys, 0) + 1, equal: false });
    const bad = css('--bad', '#c0392b'), good = css('--tangent', '#1f8a4c');
    bisPlot.draw([{ fn: B.f }], [
      { x: a, y: B.f(a), color: B.f(a) < 0 ? bad : good, label: bisN < 4 ? 'a' : '' },
      { x: b, y: B.f(b), color: B.f(b) < 0 ? bad : good, label: bisN < 4 ? 'b' : '' },
      { x: m, y: 0, r: 4, color: css('--curve-2', '#d9480f') },
    ], [], [{ xMin: a, xMax: b }]);
    const rows = r.steps.slice(-6).map((s, i) => {
      const n = r.steps.length - Math.min(6, r.steps.length) + i + 1;
      return '<tr><td>' + n + '</td><td>' + tex(fmt(s.a, 6)) + '</td><td>' + tex(fmt(s.b, 6)) + '</td><td>' + tex(fmt(s.m, 6)) + '</td><td>' + (s.fm < 0 ? '−' : '+') + '</td></tr>';
    });
    $('bis-out').innerHTML =
      '<p>' + tex('f(x) = ' + B.tex) + ': ' + tex('f(' + B.a + ') ' + (B.f(B.a) < 0 ? '< 0' : '> 0')) + ', ' + tex('f(' + B.b + ') ' + (B.f(B.b) < 0 ? '< 0' : '> 0')) + '. Синяя полоса — текущий отрезок, оранжевая точка — его середина.</p>' +
      (bisN ? '<div class="tt-wrap"><table class="num-table"><tr><th>шаг</th><th>\\(a_n\\)</th><th>\\(b_n\\)</th><th>середина</th><th>знак \\(f\\)</th></tr>' + rows.join('') + '</table></div>' : '') +
      '<p>После ' + bisN + ' ' + (bisN % 10 === 1 && bisN % 100 !== 11 ? 'шага' : 'шагов') + ': длина отрезка ' + tex('\\frac{' + (B.b - B.a) + '}{2^{' + bisN + '}} \\approx ' + fmt((B.b - B.a) / Math.pow(2, bisN), 8)) + ', корень ' + tex('c \\approx ' + fmt(m, 8)) + ' (точное значение ' + tex(fmt(B.root, 8)) + ').</p>';
    renderMath($('bis-out'));
  }
  $('bis-step').addEventListener('click', () => { bisN = Math.min(bisN + 1, 50); bisUpdate(); });
  $('bis-ten').addEventListener('click', () => { bisN = Math.min(bisN + 10, 50); bisUpdate(); });
  $('bis-reset').addEventListener('click', () => { bisN = 0; bisUpdate(); });
  $('bis-sel').addEventListener('change', () => { bisN = 0; bisUpdate(); });

  // ---------- 5. Равномерная непрерывность: δ(x0) ----------
  const UN = [
    { f: (x) => x * x, lo: 0, hi: 3, uniform: true, view: [-0.3, 3.3, -1, 10], note: 'Отрезок: по теореме Кантора одно \\(\\delta\\) годится везде (самое маленькое — у правого конца, где график круче всего).' },
    { f: (x) => x * x, lo: 0, hi: 10, open: 'hi', uniform: false, view: [-0.5, 10.5, -5, 105], note: 'На \\([0; +\\infty)\\) (показан кусок до 10) график становится всё круче: \\(\\delta(x_0) \\approx \\frac{\\varepsilon}{2x_0} \\to 0\\). Общего \\(\\delta\\) нет — функция не равномерно непрерывна.' },
    { f: (x) => 1 / x, lo: 0, hi: 1, open: 'lo', uniform: false, view: [-0.05, 1.05, -1, 20], note: 'У нуля график уходит вверх, \\(\\delta(x_0) \\to 0\\) при \\(x_0 \\to 0^+\\). Не равномерно непрерывна — промежуток не замкнут, и теорема Кантора не применима.' },
    { f: (x) => Math.sqrt(x), lo: 0, hi: 4, uniform: true, view: [-0.2, 4.2, -0.3, 2.3], note: 'Хотя касательная в нуле вертикальна, \\(\\delta(x_0) \\ge \\varepsilon^2\\) везде: равномерно непрерывна.' },
    { f: (x) => Math.sin(1 / x), lo: 0, hi: 1, open: 'lo', uniform: false, view: [-0.05, 1.05, -1.3, 1.3], note: 'У нуля колебания всё чаще, и \\(\\delta(x_0) \\to 0\\). Не равномерно непрерывна, хотя функция ограничена.' },
    { f: (x) => Math.sin(x), lo: -10, hi: 10, uniform: true, view: [-10.5, 10.5, -1.5, 1.5], note: '\\(|\\sin x - \\sin y| \\le |x - y|\\) (Липшиц), поэтому подходит \\(\\delta = \\varepsilon\\) на всей прямой.' },
  ];
  const unF = new Plot($('un-f')), unD = new Plot($('un-d'));
  // наибольшее δ в точке x0 (численно, геометрическая сетка шагов)
  function deltaAt(U, x0, eps) {
    const f0 = U.f(x0), tMax = (U.hi - U.lo) / 2;
    let prev = 0;
    for (let j = 0; j <= 1200; j++) {
      const t = tMax * Math.pow(10, -6 + (6 * j) / 1200);
      for (const x of [x0 - t, x0 + t]) {
        if (x < U.lo || x > U.hi || (U.open === 'lo' && x <= U.lo)) continue;
        if (Math.abs(U.f(x) - f0) >= eps) return prev || t;
      }
      prev = t;
    }
    return tMax;
  }
  function unUpdate() {
    const U = UN[+$('un-sel').value];
    const eps = 0.5 * Math.pow(10, (-1.5 * +$('un-eps').value) / 100);
    $('un-eps-out').textContent = plain(fmt(eps, 3));
    const [x0, x1, y0, y1] = U.view;
    unF.setView({ xMin: x0, xMax: x1, yMin: y0, yMax: y1, equal: false });
    unF.draw([{ fn: (x) => (x < U.lo || x > U.hi || (U.open === 'lo' && x <= U.lo) ? NaN : U.f(x)) }]);
    const N = 160, pts = [];
    let minD = Infinity, argMin = 0;
    for (let i = 0; i <= N; i++) {
      let x = U.lo + ((U.hi - U.lo) * i) / N;
      if (U.open === 'lo' && i === 0) x = U.lo + (U.hi - U.lo) / (N * 20);
      const d = deltaAt(U, x, eps);
      pts.push([x, d]);
      if (d < minD) { minD = d; argMin = x; }
    }
    const dMax = Math.max(...pts.map((p) => p[1]));
    unD.setView({ xMin: x0, xMax: x1, yMin: -dMax * 0.08, yMax: dMax * 1.15, equal: false });
    unD.draw(
      [{ fn: (x) => { if (x < U.lo || x > U.hi) return NaN; const i = Math.min(N, Math.max(0, Math.round(((x - U.lo) / (U.hi - U.lo)) * N))); return pts[i][1]; }, color: css('--curve-2', '#d9480f') }],
      [{ x: argMin, y: minD, r: 4, color: css('--bad', '#c0392b') }]
    );
    $('un-out').innerHTML =
      '<p>При ' + tex('\\varepsilon = ' + fmt(eps, 3)) + ' наименьшее из \\(\\delta(x_0)\\) на показанном куске: ' + tex('\\approx ' + fmt(minD, 5)) + ' (в точке ' + tex('x_0 \\approx ' + fmt(argMin, 3)) + ', красная точка).</p>' +
      '<p class="feedback ' + (U.uniform ? 'good' : 'bad') + '">' + (U.uniform ? '<b>Равномерно непрерывна.</b> ' : '<b>Не равномерно непрерывна.</b> ') + U.note + '</p>';
    renderMath($('un-out'));
  }
  $('un-sel').addEventListener('change', unUpdate);
  $('un-eps').addEventListener('input', unUpdate);

  // ---------- 7. Тренажёр ----------
  const STATS_KEY = 'msh.continuity.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => {
    $('stats').innerHTML = 'С первой попытки: <b>' + stats.solved + '</b> из ' + stats.attempts + ' · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
  };
  let mode = 'point', task = null, answered = false, firstTry = true, trPlot = null;
  function record(ok) {
    if (answered) return;
    answered = true;
    stats.attempts++;
    if (ok && firstTry) { stats.solved++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); } else stats.streak = 0;
    saveStats(); renderStats();
  }
  function fb(kind, html) {
    const el = $('feedback');
    el.className = 'feedback' + (kind ? ' ' + kind : '');
    el.innerHTML = html;
    renderMath(el);
  }
  function choices(labels, onPick) {
    const box = document.createElement('div');
    box.className = 'choices';
    labels.forEach((l, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice'; b.textContent = l;
      b.addEventListener('click', () => onPick(i, b));
      box.appendChild(b);
    });
    $('area').appendChild(box);
  }
  function revealPoint() {
    $('solution').innerHTML = '<canvas class="plot" id="tr-plot" aria-label="График функции"></canvas>' +
      '<p>' + tex('f(x_0 - 0) = ' + task.left + ', \\quad f(x_0 + 0) = ' + task.right + ', \\quad f(x_0) = ' + (task.fx0 === null ? '\\text{не определено}' : task.fx0)) + '</p>';
    trPlot = new Plot($('tr-plot'));
    plotPoint(trPlot, task);
    renderMath($('solution'));
  }
  function newTask() {
    mode = $('mode').value;
    answered = false; firstTry = true;
    fb('', '');
    $('solution').innerHTML = '';
    $('area').innerHTML = '';
    if (mode === 'point') {
      task = C.makePointTask();
      $('task').innerHTML = 'Что происходит в точке ' + tex('x_0 = ' + task.x0) + '?' + tex(task.tex, true);
      const keys = ['cont', 'removable', 'jump', 'second'];
      choices(keys.map((k) => C.KINDS[k].replace(/^./, (c) => c.toUpperCase())), (i, b) => {
        const ok = keys[i] === task.kind;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) firstTry = false;
        record(ok);
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, здесь ' + C.KINDS[task.kind] + '. ') + task.why);
        revealPoint();
      });
    } else if (mode === 'param') {
      task = C.makeParamTask();
      $('task').innerHTML = 'При каком значении ' + tex(task.ask) + ' функция непрерывна на всей прямой?' + tex(task.tex, true);
      $('area').innerHTML = '<form id="param-form" autocomplete="off"><div class="expr-input"><label for="param-in" style="font-weight:600">' + tex(task.ask + ' =') + '</label><input id="param-in" placeholder="число или дробь, например -3/2" spellcheck="false"><button class="primary" type="submit">Проверить</button></div></form>';
      $('param-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const res = C.checkParam(task, $('param-in').value);
        if (res.invalid) { const el = $('feedback'); el.className = 'feedback bad'; el.textContent = res.message; return; }
        if (!res.ok) firstTry = false;
        if (res.ok) record(true);
        fb(res.ok ? 'good' : 'bad', res.message);
      });
    } else {
      task = C.pick(C.TF);
      $('task').innerHTML = 'Верно ли утверждение?' + tex(task.tex, true);
      choices(['Верно', 'Неверно'], (i, b) => {
        const ok = (i === 0) === task.truth;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) firstTry = false;
        record(ok);
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, утверждение ' + (task.truth ? 'верно' : 'неверно') + '. ') + task.why);
      });
    }
    renderMath($('area'));
    renderMath($('task'));
  }
  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    firstTry = false;
    if (mode === 'point') { record(false); fb('hint', 'Ответ: ' + C.KINDS[task.kind] + '. ' + task.why); revealPoint(); }
    else if (mode === 'param') {
      record(false);
      const items = task.steps.map((s) => '<li><div>' + s.title + '</div>' + (s.tex ? tex(s.tex, true) : '') + '</li>');
      $('solution').innerHTML = '<h3>Решение по шагам</h3><ol class="steps-list">' + items.join('') + '</ol>';
      renderMath($('solution'));
    } else { record(false); fb('hint', 'Утверждение ' + (task.truth ? '<b>верно</b>' : '<b>неверно</b>') + '. ' + task.why); }
  });
  $('new-task-btn').addEventListener('click', newTask);
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => {
    galUpdate();
    bisUpdate();
    unUpdate();
    renderStats();
    newTask();
  });
})();
