// Интерфейс страницы «Пределы»: ε-коридор, ε-δ, тренажёр.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  // Число для TeX: русская запятая
  const fmt = (v, sig) => {
    if (!isFinite(v)) return v > 0 ? '+\\infty' : '-\\infty';
    const s = Math.abs(v) >= 1e-3 || v === 0 ? String(+v.toPrecision(sig || 4)) : v.toExponential(2);
    return s.replace('.', '{,}');
  };

  // ---------- 1. ε-коридор для последовательностей ----------
  const SEQS = [
    { f: (n) => 1 / n, L: 0, tex: 'a_n = \\frac{1}{n}', Ltex: '0' },
    { f: (n) => (2 * n + 1) / (n + 3), L: 2, tex: 'a_n = \\frac{2n + 1}{n + 3}', Ltex: '2' },
    { f: (n) => Math.pow(-1, n) / n, L: 0, tex: 'a_n = \\frac{(-1)^n}{n}', Ltex: '0' },
    { f: (n) => Math.sin(n) / n, L: 0, tex: 'a_n = \\frac{\\sin n}{n}', Ltex: '0' },
    { f: (n) => Math.pow(1 + 1 / n, n), L: Math.E, tex: 'a_n = \\left(1 + \\frac{1}{n}\\right)^n', Ltex: 'e' },
    { f: (n) => Math.pow(-1, n), L: 1, tex: 'a_n = (-1)^n', Ltex: '1', diverges: true },
  ];
  const LIMIT_N = 5000;
  const seqPlot = new Plot($('seq-plot'));

  // Наименьшее N, после которого все члены (до LIMIT_N) в коридоре; null — не нашлось
  function findN(s, eps) {
    let last = 0;
    for (let n = 1; n <= LIMIT_N; n++) if (Math.abs(s.f(n) - s.L) >= eps) last = n;
    return last >= LIMIT_N - 10 ? null : last + 1;
  }

  function seqUpdate() {
    const s = SEQS[+$('seq-sel').value];
    const eps = Math.pow(10, (-3 * +$('seq-eps').value) / 100);
    $('seq-eps-out').textContent = fmt(eps, 2).replace('{,}', ',');
    const N = findN(s, eps);
    const nMax = Math.min(400, Math.max(30, N ? Math.ceil(N * 1.3) + 2 : 40));
    const pts = [];
    let lo = s.L - eps, hi = s.L + eps, outside = 0;
    for (let n = 1; n <= nMax; n++) {
      const v = s.f(n);
      const out = Math.abs(v - s.L) >= eps;
      if (out) outside++;
      lo = Math.min(lo, v); hi = Math.max(hi, v);
      pts.push({ x: n, y: v, r: nMax > 120 ? 2 : 3.5, color: out ? css('--bad', '#c0392b') : css('--curve', '#2f6fdb') });
    }
    const pad = (hi - lo) * 0.12 || 0.5;
    seqPlot.setView({ xMin: -nMax * 0.04, xMax: nMax + 1, yMin: lo - pad, yMax: hi + pad, equal: false });
    const lines = [{ x1: 0, y1: s.L, x2: nMax + 1, y2: s.L }];
    if (N && N <= nMax) lines.push({ x1: N, y1: lo - pad, x2: N, y2: hi + pad, color: css('--tangent', '#1f8a4c'), dash: [3, 4] });
    seqPlot.draw([], pts, lines, [{ yMin: s.L - eps, yMax: s.L + eps }]);

    const out = ['<p>' + tex(s.tex) + ', предполагаемый предел ' + tex('a = ' + s.Ltex) + ', коридор ' + tex('\\varepsilon = ' + fmt(eps, 2)) + '.</p>'];
    if (N) {
      out.push('<p>Подходит ' + tex('N = ' + N) + (N > nMax ? ' (за пределами графика)' : ' (зелёная вертикаль)') + ': при всех ' + tex('n \\ge ' + N) + ' выполнено ' + tex('|a_n - ' + s.Ltex + '| < ' + fmt(eps, 2)) + '. Вне коридора ' + (N - 1) + ' ' + plural(N - 1, 'член', 'члена', 'членов') + '.</p>');
      if (s.diverges) out.push('<p class="note">Для такого широкого коридора \\(N\\) нашлось. Но определение требует \\(N\\) для <b>каждого</b> \\(\\varepsilon\\). Уменьшите \\(\\varepsilon\\) до 2 и меньше — и \\(N\\) не найдётся.</p>');
      else out.push('<p>Уменьшайте \\(\\varepsilon\\): \\(N\\) растёт, но всегда существует. Это и значит, что предел равен \\(' + s.Ltex + '\\).</p>');
    } else {
      out.push('<p class="note">Такого \\(N\\) <b>нет</b>: члены с нечётными номерами равны \\(-1\\) и всегда отстоят от 1 на 2. Это ровно отрицание определения: нашлось \\(\\varepsilon\\), для которого никакое \\(N\\) не годится. Значит, 1 — не предел; аналогично не подходит и никакое другое число.</p>');
    }
    $('seq-readout').innerHTML = out.join('');
    renderMath($('seq-readout'));
  }
  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }
  $('seq-sel').addEventListener('change', seqUpdate);
  $('seq-eps').addEventListener('input', seqUpdate);

  // ---------- 2. ε-δ для функций ----------
  const FUNCS = [
    { f: (x) => 3 * x + 1, x0: 1, L: 4, view: { xMin: -1, xMax: 3, yMin: -1, yMax: 9 }, tex: 'f(x) = 3x + 1', exact: (e) => e / 3, exactTex: '\\delta = \\frac{\\varepsilon}{3}' },
    { f: (x) => x * x, x0: 2, L: 4, view: { xMin: -0.5, xMax: 3.5, yMin: -1, yMax: 9 }, tex: 'f(x) = x^2', exact: (e) => Math.sqrt(4 + e) - 2, exactTex: '\\delta = \\sqrt{4 + \\varepsilon} - 2' },
    { f: (x) => (x * x - 1) / (x - 1), x0: 1, L: 2, hole: true, view: { xMin: -1, xMax: 3, yMin: -0.5, yMax: 4.5 }, tex: 'f(x) = \\frac{x^2 - 1}{x - 1}', exact: (e) => e, exactTex: '\\delta = \\varepsilon' },
    { f: (x) => Math.sin(x) / x, x0: 0, L: 1, hole: true, view: { xMin: -7, xMax: 7, yMin: -0.6, yMax: 1.6 }, tex: 'f(x) = \\frac{\\sin x}{x}', exact: null },
  ];
  const edPlot = new Plot($('ed-plot'));

  // Наибольшее δ (численно): первое t, где |f(x0 ± t) − L| ≥ ε
  function findDelta(F, eps) {
    const tMax = 6, steps = 60000;
    for (let i = 1; i <= steps; i++) {
      const t = (tMax * i) / steps;
      if (Math.abs(F.f(F.x0 + t) - F.L) >= eps || Math.abs(F.f(F.x0 - t) - F.L) >= eps) return t;
    }
    return tMax;
  }

  function edUpdate() {
    const F = FUNCS[+$('ed-sel').value];
    const eps = 2 * Math.pow(10, (-2 * +$('ed-eps').value) / 100);
    $('ed-eps-out').textContent = fmt(eps, 2).replace('{,}', ',');
    const delta = F.exact ? F.exact(eps) : findDelta(F, eps);
    edPlot.setView(Object.assign({ equal: false }, F.view));
    const good = css('--tangent', '#1f8a4c');
    edPlot.draw(
      [{ fn: (x) => (Math.abs(x - F.x0) < 1e-9 ? NaN : F.f(x)) }],
      [{ x: F.x0, y: F.L, hollow: !!F.hole, label: F.hole ? 'не определена' : '' }],
      [
        { x1: F.x0 - delta, y1: -100, x2: F.x0 - delta, y2: 100, color: good, dash: [4, 4] },
        { x1: F.x0 + delta, y1: -100, x2: F.x0 + delta, y2: 100, color: good, dash: [4, 4] },
      ],
      [
        { yMin: F.L - eps, yMax: F.L + eps },
        { xMin: F.x0 - delta, xMax: F.x0 + delta, color: css('--good-soft', '#e3f4ea'), alpha: 0.8 },
      ]
    );
    const out = [
      '<p>' + tex(F.tex) + ', ' + tex('x_0 = ' + F.x0 + ',\\; L = ' + F.L) + '. Синяя полоса — ' + tex('L \\pm \\varepsilon') + ', зелёная — ' + tex('x_0 \\pm \\delta') + '.</p>',
      '<p>При ' + tex('\\varepsilon = ' + fmt(eps, 2)) + ' подходит ' + tex('\\delta ' + (F.exact ? '= ' : '\\approx ') + fmt(delta, 3)) + ': если ' + tex('0 < |x - ' + F.x0 + '| < \\delta') + ', то график внутри синей полосы. Любое меньшее ' + tex('\\delta') + ' тоже подходит.</p>',
    ];
    if (F.exact) out.push('<p>Формула для любого \\(\\varepsilon\\): ' + tex(F.exactTex) + '. Найти её — и значит доказать предел.</p>');
    else out.push('<p>Здесь явную формулу для \\(\\delta\\) найти трудно; предел доказывается иначе — через неравенство \\(\\cos x &lt; \\frac{\\sin x}{x} &lt; 1\\) (см. §6).</p>');
    $('ed-readout').innerHTML = out.join('');
    renderMath($('ed-readout'));
  }
  $('ed-sel').addEventListener('change', edUpdate);
  $('ed-eps').addEventListener('input', edUpdate);

  // ---------- 2½. Верхний и нижний пределы: огибающие хвостов ----------
  const LS = [
    { f: (n) => Math.pow(-1, n) * (1 + 1 / n), sup: 1, inf: -1, supTex: '1', infTex: '-1' },
    { f: (n) => 2 * Math.cos((2 * Math.PI * n) / 3) + 1 / n, sup: 2, inf: -1, supTex: '2', infTex: '-1' },
    { f: (n) => Math.pow(1 + Math.pow(-1, n) / n, n), sup: Math.E, inf: 1 / Math.E, supTex: 'e', infTex: '\\frac{1}{e}' },
    { f: (n) => Math.sin(n), sup: 1, inf: -1, supTex: '1', infTex: '-1', dense: true },
    { f: (n) => (2 * n + 1) / (n + 3), sup: 2, inf: 2, supTex: '2', infTex: '2' },
  ];
  const lsPlot = new Plot($('ls-plot'));
  function lsUpdate() {
    const s = LS[+$('ls-sel').value];
    const N = 80, M = N + 20000;
    const a = [NaN];
    for (let n = 1; n <= M; n++) a.push(s.f(n));
    // суффиксные sup и inf: S[n] = sup_{k>=n} a_k (по первым M членам)
    const S = new Array(M + 2), I = new Array(M + 2);
    S[M + 1] = -Infinity; I[M + 1] = Infinity;
    for (let n = M; n >= 1; n--) { S[n] = Math.max(a[n], S[n + 1]); I[n] = Math.min(a[n], I[n + 1]); }
    let lo = Infinity, hi = -Infinity;
    const pts = [];
    for (let n = 1; n <= N; n++) {
      lo = Math.min(lo, a[n], I[n]); hi = Math.max(hi, a[n], S[n]);
      pts.push({ x: n, y: a[n], r: 3, color: css('--curve', '#2f6fdb') });
    }
    const pad = (hi - lo) * 0.1 || 0.5;
    lsPlot.setView({ xMin: -2, xMax: N + 1, yMin: lo - pad, yMax: hi + pad, equal: false });
    const step = (arr) => (x) => (x < 0.5 ? NaN : arr[Math.min(N, Math.max(1, Math.round(x)))]);
    lsPlot.draw(
      [{ fn: step(S), color: css('--curve-2', '#d9480f'), width: 2 }, { fn: step(I), color: css('--tangent', '#1f8a4c'), width: 2 }],
      pts,
      [{ x1: 0, y1: s.sup, x2: N + 1, y2: s.sup }, { x1: 0, y1: s.inf, x2: N + 1, y2: s.inf }]
    );
    const out = [
      '<p>Оранжевая ступенька \\(S_n\\) не возрастает и стремится к ' + tex('\\varlimsup a_n = ' + s.supTex) + ', зелёная \\(I_n\\) не убывает и стремится к ' + tex('\\varliminf a_n = ' + s.infTex) + ' (пунктиры).</p>',
    ];
    if (s.sup === s.inf) out.push('<p class="feedback good">Огибающие сходятся к одному числу — значит, последовательность сходится: ' + tex('\\lim a_n = ' + s.supTex) + '.</p>');
    else out.push('<p>Огибающие сходятся к разным числам, поэтому предела нет. ' + (s.dense ? 'У \\(\\sin n\\) частичные пределы заполняют весь отрезок \\([-1;\\ 1]\\), а не только концы.' : 'Частичные пределы — значения, около которых бесконечно часто оказываются члены.') + '</p>');
    $('ls-readout').innerHTML = out.join('');
    renderMath($('ls-readout'));
  }
  $('ls-sel').addEventListener('change', lsUpdate);

  // ---------- 3. Тренажёр ----------
  const STATS_KEY = 'msh.limits.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => {
    $('stats').innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
  };

  let task = null, isN = false, done = false, helped = false;

  function setFeedback(kind, html) {
    const fb = $('feedback');
    fb.className = 'feedback' + (kind ? ' ' + kind : '');
    fb.innerHTML = html;
    renderMath(fb);
  }

  function newTask() {
    const mode = $('mode').value;
    isN = mode === 'N';
    done = false;
    helped = false;
    if (isN) {
      task = LimCore.makeNTask();
      $('task-eq').innerHTML =
        '<p>Докажите по определению, что ' + tex('\\lim_{n \\to \\infty} ' + task.seqTex + ' = ' + task.L) + '. Для начала конкретный шаг: при ' + tex('\\varepsilon = ' + task.epsTex) + ' найдите номер ' + tex('N') + ', начиная с которого ' + tex('|a_n - ' + task.L + '| < \\varepsilon') + '.</p>';
      $('answer-label').textContent = 'N =';
      $('answer').placeholder = 'натуральное число';
      $('answer').setAttribute('inputmode', 'numeric');
      $('answer-help').textContent = 'Засчитывается любое подходящее N, не обязательно наименьшее. В решении — формула N(ε) для произвольного ε, то есть полное доказательство.';
    } else {
      task = LimCore.makeTask(+mode);
      $('task-eq').innerHTML = 'Вычислите: ' + tex(task.tex, true);
      $('answer-label').textContent = 'Ответ:';
      $('answer').placeholder = 'например: 3/4, -2, e^3, ∞';
      $('answer').setAttribute('inputmode', 'text');
      $('answer-help').textContent = 'Можно ввести число, дробь (3/4), выражение с e (e^3, e^(-1/2)) или ∞ / -∞ (также inf).';
    }
    renderMath($('task-eq'));
    $('answer').value = '';
    $('answer-preview').textContent = '';
    setFeedback('', '');
    $('solution').innerHTML = '';
  }

  $('answer').addEventListener('input', () => {
    const pv = $('answer-preview');
    const v = $('answer').value.trim();
    if (!v || isN) { pv.textContent = ''; return; }
    const p = LimCore.parseAnswer(v);
    if (p.error) { pv.className = 'preview error'; pv.textContent = p.error; return; }
    pv.className = 'preview';
    if (p.none) pv.textContent = 'Вы ответили: предела нет.';
    else if (!isFinite(p.value)) pv.innerHTML = 'Вы ввели: ' + tex(p.value > 0 ? '+\\infty' : '-\\infty');
    else pv.innerHTML = 'Вы ввели: ' + tex(Expr.tex(p.ast) + (p.ast.type === 'num' ? '' : ' \\approx ' + fmt(p.value, 5)));
  });

  $('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!task) return;
    const res = isN ? LimCore.checkN(task, $('answer').value) : LimCore.check(task, $('answer').value);
    if (res.invalid) {
      const fb = $('feedback');
      fb.className = 'feedback bad';
      fb.textContent = res.message;
      return;
    }
    if (!done) {
      stats.attempts++;
      if (res.ok) {
        done = true;
        stats.solved++;
        stats.streak = helped ? 0 : stats.streak + 1;
        stats.best = Math.max(stats.best, stats.streak);
      } else stats.streak = 0;
      saveStats();
      renderStats();
    }
    const fb = $('feedback');
    fb.className = 'feedback ' + (res.ok ? 'good' : 'bad');
    fb.textContent = res.message;
    if (res.ok && !isN) {
      fb.insertAdjacentHTML('beforeend', ' Ответ: ' + tex(task.answerTex) + '. Нажмите «Новая задача», чтобы продолжить.');
    }
  });

  $('hint-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    setFeedback('hint', isN ? 'С чего начать: упростите \\(|a_n - ' + task.L + '|\\) — приведите к общему знаменателю. Получится дробь, которая убывает с ростом \\(n\\). Затем решите неравенство «эта дробь \\(&lt; \\varepsilon\\)» относительно \\(n\\).' : LimCore.hint(task));
  });

  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    const items = task.steps.map((s) => '<li><div>' + s.title + '</div>' + (s.tex ? tex(s.tex, true) : '') + '</li>');
    if (!isN) items.push('<li class="final"><div>Ответ:</div>' + tex(task.answerTex, true) + '</li>');
    const box = $('solution');
    box.innerHTML = '<h3>Решение по шагам</h3><ol class="steps-list">' + items.join('') + '</ol>';
    renderMath(box);
  });

  // Численная проверка: значения всё ближе к точке
  $('numeric-btn').addEventListener('click', () => {
    if (!task) return;
    let rows, head;
    if (isN) {
      const a = (n) => (task.a * n + task.b) / (task.c * n + task.d);
      head = '<tr><th>\\(n\\)</th><th>\\(|a_n - ' + task.L + '|\\)</th></tr>';
      rows = [1, 5, 10, 50, 100, 1000].map((n) => '<tr><td>' + n + '</td><td>' + tex(fmt(Math.abs(a(n) - task.Lval), 4)) + '</td></tr>');
    } else {
      const { f, at } = task.num;
      if (at === Infinity) {
        head = '<tr><th>\\(n\\) (или \\(x\\))</th><th>значение</th></tr>';
        rows = [10, 100, 1000, 1e4, 1e5, 1e6].map((n) => '<tr><td>' + tex(fmt(n, 6)) + '</td><td>' + tex(fmt(f(n), 6)) + '</td></tr>');
      } else {
        head = '<tr><th>\\(x\\)</th><th>\\(f(x)\\)</th><th>\\(x\\)</th><th>\\(f(x)\\)</th></tr>';
        rows = [0.1, 0.01, 0.001, 1e-4].map((h) =>
          '<tr><td>' + tex(fmt(at - h, 6)) + '</td><td>' + tex(fmt(f(at - h), 6)) + '</td><td>' + tex(fmt(at + h, 6)) + '</td><td>' + tex(fmt(f(at + h), 6)) + '</td></tr>');
      }
    }
    setFeedback('hint', '<b>Численная проверка.</b> Значения при приближении к пределу:<table class="num-table">' + head + rows.join('') + '</table>Таблица подсказывает ответ, но <b>не доказывает</b> его: доказательство — это решение по шагам.');
  });

  $('new-task-btn').addEventListener('click', () => { newTask(); $('answer').focus(); });
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => {
    seqUpdate();
    edUpdate();
    lsUpdate();
    PairTrainer.mount($('limsup-trainer'), { modes: ['limsup'], statsKey: 'msh.limsup.stats' });
    renderStats();
    newTask();
  });
})();
