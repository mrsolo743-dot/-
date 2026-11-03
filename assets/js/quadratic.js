// Интерфейс страницы «Квадратные уравнения»: пошаговый вывод, график, тренажёр.
(function () {
  'use strict';
  const Q = window.QuadCore;
  const $ = (id) => document.getElementById(id);
  const fmt = (v) => {
    const r = Math.round(v * 100) / 100;
    return (Object.is(r, -0) ? 0 : r).toString();
  };
  const near = (v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9;

  // ---------- 1. Пошаговый вывод формулы ----------
  const steps = Array.from(document.querySelectorAll('#derivation > li'));
  let shown = 1;
  function updateSteps() {
    steps.forEach((li, i) => { li.hidden = i >= shown; });
    $('next-step').disabled = shown >= steps.length;
  }
  $('next-step').addEventListener('click', () => {
    shown = Math.min(shown + 1, steps.length);
    updateSteps();
    steps[shown - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('all-steps').addEventListener('click', () => { shown = steps.length; updateSteps(); });
  $('reset-steps').addEventListener('click', () => { shown = 1; updateSteps(); });
  updateSteps();

  // ---------- 2. Интерактивный график ----------
  const plot = new Plot($('plot'));
  const sliders = { a: $('sa'), b: $('sb'), c: $('sc') };
  const outputs = { a: $('oa'), b: $('ob'), c: $('oc') };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function chooseView(a, b, c, roots) {
    const def = { xMin: -10, xMax: 10, yMin: -8, yMax: 8, equal: true };
    if (a === 0) return def;
    const xv = -b / (2 * a);
    const yv = a * xv * xv + b * xv + c;
    const xs = [xv, ...roots];
    const fits = xs.every((x) => Math.abs(x) <= 9) && Math.abs(yv) <= 7;
    if (fits) return def;
    // Не помещается — подбираем окно вокруг вершины и корней
    const xMin = Math.min(...xs, 0) - 3;
    const xMax = Math.max(...xs, 0) + 3;
    const yLo = Math.min(yv, 0, c);
    const yHi = Math.max(yv, 0, c);
    const pad = Math.max(3, (yHi - yLo) * 0.15);
    return { xMin, xMax, yMin: yLo - pad, yMax: yHi + pad, equal: false };
  }

  function updateGraph() {
    const a = +sliders.a.value, b = +sliders.b.value, c = +sliders.c.value;
    outputs.a.textContent = fmt(a);
    outputs.b.textContent = fmt(b);
    outputs.c.textContent = fmt(c);
    const good = css('--good') || '#1f8a4c';
    const text = css('--text') || '#1f2328';
    const out = [];

    if (a === 0) {
      plot.setView(chooseView(0));
      const pts = b !== 0 ? [{ x: -c / b, y: 0, label: 'x = ' + fmt(-c / b), color: good }] : [];
      plot.draw([{ fn: (x) => b * x + c }], pts);
      out.push('<div class="formula">' + tex('y = ' + Q.polyTex(0, b, c), true) + '</div>');
      out.push('<p class="note">При \\(a = 0\\) слагаемое с \\(x^2\\) исчезает: это уже не квадратное, а <b>линейное</b> уравнение, и график — прямая, а не парабола.</p>');
      $('readout').innerHTML = out.join('');
      renderMath($('readout'));
      return;
    }

    const D = b * b - 4 * a * c;
    const roots = D < 0 ? [] : D === 0 ? [-b / (2 * a)] : [(-b + Math.sqrt(D)) / (2 * a), (-b - Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q);
    const xv = -b / (2 * a);
    const yv = a * xv * xv + b * xv + c;

    plot.setView(chooseView(a, b, c, roots));
    const points = roots.map((r, i) => ({ x: r, y: 0, color: good, label: roots.length === 1 ? 'x' : 'x' + (i ? '₂' : '₁') }));
    if (D !== 0) points.push({ x: xv, y: yv, color: text, label: 'вершина' });
    plot.draw(
      [{ fn: (x) => a * x * x + b * x + c }],
      points,
      [{ x1: xv, y1: -1e4, x2: xv, y2: 1e4 }]
    );

    out.push('<div class="formula">' + tex('y = ' + Q.polyTex(a, b, c), true) + '</div>');
    const fourAC = 4 * a * c;
    out.push('<p>' + tex('D = b^2 - 4ac = ' + (b < 0 ? '(' + fmt(b) + ')' : fmt(b)) + '^2 - 4 \\cdot ' + (a < 0 ? '(' + fmt(a) + ')' : fmt(a)) + ' \\cdot ' + (c < 0 ? '(' + fmt(c) + ')' : fmt(c)) + ' = ' + fmt(b * b) + (fourAC >= 0 ? ' - ' + fmt(fourAC) : ' + ' + fmt(-fourAC)) + ' = ' + fmt(D)) + '</p>');

    const eq = (v) => (near(v) ? ' = ' : ' \\approx ') + fmt(v);
    if (D > 0) {
      out.push('<p><b>\\(D &gt; 0\\)</b>, поэтому корней два: ' + tex('x_1' + eq(roots[0]) + ',\\; x_2' + eq(roots[1])) + '. Парабола пересекает ось \\(Ox\\) в двух точках.</p>');
    } else if (D === 0) {
      out.push('<p><b>\\(D = 0\\)</b>, поэтому корень один: ' + tex('x' + eq(roots[0])) + '. Вершина параболы лежит прямо на оси \\(Ox\\).</p>');
    } else {
      out.push('<p><b>\\(D &lt; 0\\)</b>, поэтому корней нет. Парабола целиком ' + (a > 0 ? 'выше' : 'ниже') + ' оси \\(Ox\\) и не пересекает её.</p>');
    }
    out.push('<p>Ветви направлены ' + (a > 0 ? 'вверх, потому что \\(a &gt; 0\\)' : 'вниз, потому что \\(a &lt; 0\\)') + '. Вершина: ' + tex('\\left(' + fmt(xv) + ';\\ ' + fmt(yv) + '\\right)') + ', пунктир — ось симметрии \\(x = -\\frac{b}{2a}\\).</p>');
    $('readout').innerHTML = out.join('');
    renderMath($('readout'));
  }

  function setCoefs(a, b, c) {
    for (const [k, v] of Object.entries({ a, b, c })) {
      const s = sliders[k];
      if (v < +s.min) s.min = v;
      if (v > +s.max) s.max = v;
      s.value = v;
    }
    updateGraph();
  }

  Object.values(sliders).forEach((s) => s.addEventListener('input', updateGraph));
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => setCoefs(...btn.dataset.preset.split(',').map(Number)));
  });

  // ---------- 3. Тренажёр ----------
  const STATS_KEY = 'msh.quadratic.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };

  function renderStats() {
    $('stats').innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
  }

  let task = null;
  let done = false;
  let helped = false;

  function newTask() {
    task = Q.makeTask(+$('level').value);
    done = false;
    helped = false;
    $('task-eq').innerHTML = 'Решите уравнение: ' + tex(Q.polyTex(task.a, task.b, task.c) + ' = 0', true);
    $('answer').value = '';
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
    $('solution').innerHTML = '';
  }

  function showFeedback(ok, msg) {
    const fb = $('feedback');
    fb.className = 'feedback ' + (ok ? 'good' : 'bad');
    fb.textContent = msg;
  }

  $('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!task) return;
    const res = Q.checkAnswer(task, $('answer').value);
    if (res.invalid) { showFeedback(false, res.message); return; }
    if (!done) {
      stats.attempts++;
      if (res.ok) {
        done = true;
        stats.solved++;
        stats.streak = helped ? 0 : stats.streak + 1;
        stats.best = Math.max(stats.best, stats.streak);
      } else {
        stats.streak = 0;
      }
      saveStats();
      renderStats();
    }
    showFeedback(res.ok, res.message + (res.ok ? ' Нажмите «Новая задача», чтобы продолжить.' : ''));
  });

  $('hint-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    $('feedback').className = 'feedback hint';
    $('feedback').textContent = 'Подсказка: ' + Q.hint(task);
  });

  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    const items = Q.solutionSteps(task).map((s) =>
      '<li>' + (s.text ? '<div>' + s.text + '</div>' : '') + (s.tex ? tex(s.tex, true) : '') + '</li>'
    );
    $('solution').innerHTML = '<h3>Решение по шагам</h3><ol>' + items.join('') + '</ol>';
  });

  $('to-graph-btn').addEventListener('click', () => {
    if (!task) return;
    setCoefs(task.a, task.b, task.c);
    $('graph').scrollIntoView({ behavior: 'smooth' });
  });

  $('new-task-btn').addEventListener('click', () => { newTask(); $('answer').focus(); });
  $('level').addEventListener('change', newTask);

  // Старт после загрузки (KaTeX уже подключён синхронно)
  document.addEventListener('DOMContentLoaded', () => {
    updateGraph();
    renderStats();
    newTask();
  });
})();
