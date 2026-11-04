// Интерфейс страницы «Производная»: секущая → касательная, лаборатория, тренажёр.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;

  // Число для показа: 3 значащих знака после запятой, русская запятая
  function fmt(v, digits) {
    if (!isFinite(v)) return '—';
    const d = digits === undefined ? 3 : digits;
    const r = Math.round(v * Math.pow(10, d)) / Math.pow(10, d);
    return (Object.is(r, -0) ? 0 : r).toString().replace('.', '{,}');
  }
  const plain = (s) => s.replace('{,}', ',');

  // Пошаговое решение -> HTML
  function stepsHtml(steps, result) {
    const items = steps.map((s) => '<li><div>' + s.title + '</div>' + tex(s.tex, true) + '</li>');
    items.push('<li class="final"><div>Собираем всё вместе и упрощаем:</div>' + tex("f'(x) = " + Expr.tex(result), true) + '</li>');
    return '<ol class="steps-list">' + items.join('') + '</ol>';
  }

  // ---------- 1. Секущая и касательная ----------
  const SEC_VIEWS = {
    'x^2': { xMin: -3, xMax: 3, yMin: -1, yMax: 6 },
    'x^3 - 3x': { xMin: -3, xMax: 3, yMin: -4, yMax: 4 },
    'sin x': { xMin: -4, xMax: 4, yMin: -2, yMax: 2 },
    'e^x': { xMin: -3, xMax: 2.5, yMin: -1, yMax: 6 },
    'ln x': { xMin: -0.5, xMax: 5, yMin: -3, yMax: 2.5 },
  };
  const secPlot = new Plot($('sec-plot'));
  let sec = null;

  function secSetFn() {
    const src = $('sec-fn').value;
    const f = Expr.parse(src);
    sec = { f, d: Expr.derive(f).result };
    const x0 = $('sec-x0');
    if (src === 'ln x') { x0.min = 0.3; x0.max = 3; if (+x0.value < 0.3) x0.value = 1; }
    else { x0.min = -2; x0.max = 2; if (+x0.value > 2) x0.value = 1; }
    secPlot.setView(Object.assign({ equal: true }, SEC_VIEWS[src]));
    secUpdate();
  }

  function secUpdate() {
    const x0 = +$('sec-x0').value;
    const h = 2 * Math.pow(10, (-2.5 * +$('sec-h').value) / 100);
    $('sec-x0-out').textContent = plain(fmt(x0, 2));
    $('sec-h-out').textContent = h >= 0.1 ? plain(fmt(h, 2)) : plain(fmt(h, 4));
    const F = (x) => Expr.evaluate(sec.f, x);
    const y0 = F(x0), y1 = F(x0 + h);
    const k = (y1 - y0) / h;
    const kt = Expr.evaluate(sec.d, x0);
    const curves = [
      { fn: F },
      { fn: (x) => y0 + k * (x - x0), color: css('--curve-2', '#d9480f'), width: 2 },
    ];
    if ($('sec-tangent').checked) curves.push({ fn: (x) => y0 + kt * (x - x0), color: css('--tangent', '#1f8a4c'), width: 2, dash: [7, 5] });
    const close = h < 0.25; // точки почти слились — одна подпись на двоих
    secPlot.draw(curves, [
      { x: x0 + h, y: y1, label: close ? '' : 'B', color: css('--curve-2', '#d9480f') },
      { x: x0, y: y0, label: close ? 'A ≈ B' : 'A' },
    ]);
    $('sec-readout').innerHTML =
      '<p>Наклон секущей \\(AB\\): ' + tex('\\frac{f(x_0 + h) - f(x_0)}{h} = \\frac{' + fmt(y1) + ' - ' + fmt(y0) + '}{' + fmt(h, 4) + '} \\approx ' + fmt(k, 4)) + '</p>' +
      '<p>Производная: ' + tex("f'(x) = " + Expr.tex(sec.d) + ', \\quad f\'(' + fmt(x0, 2) + ') \\approx ' + fmt(kt, 4)) + '</p>' +
      '<p>Разница: ' + tex('\\approx ' + fmt(Math.abs(k - kt), 4)) + (h < 0.01 ? ' — секущая почти слилась с касательной.' : ' — уменьшайте \\(h\\), и она будет стремиться к нулю.') + '</p>';
    renderMath($('sec-readout'));
  }

  $('sec-fn').addEventListener('change', secSetFn);
  ['sec-x0', 'sec-h'].forEach((id) => $(id).addEventListener('input', secUpdate));
  $('sec-tangent').addEventListener('change', secUpdate);

  // ---------- 2. Лаборатория ----------
  const labPlot = new Plot($('lab-plot'));
  let lab = null;
  let zoom = 1;
  let labStepsOpen = false;

  function labParse() {
    const src = $('lab-input').value;
    const pv = $('lab-preview');
    try {
      const f = Expr.parse(src);
      const d = Expr.derive(f);
      lab = { f, d };
      pv.className = 'preview';
      pv.innerHTML = 'Поняли так: ' + tex('f(x) = ' + Expr.tex(f));
    } catch (e) {
      pv.className = 'preview error';
      pv.textContent = e.message;
      return;
    }
    labUpdate();
  }

  function labUpdate() {
    if (!lab) return;
    const x0 = +$('lab-x0').value;
    $('lab-x0-out').textContent = plain(fmt(x0, 2));
    labPlot.setView({ xMin: -5 * zoom, xMax: 5 * zoom, yMin: -4 * zoom, yMax: 4 * zoom, equal: true });
    const F = (x) => Expr.evaluate(lab.f, x);
    const Fd = (x) => Expr.evaluate(lab.d.result, x);
    const y0 = F(x0), k = Fd(x0);
    const curves = [{ fn: F }, { fn: Fd, color: css('--curve-2', '#d9480f'), width: 2 }];
    const points = [];
    const ok = isFinite(y0) && isFinite(k);
    if (ok) {
      curves.push({ fn: (x) => y0 + k * (x - x0), color: css('--tangent', '#1f8a4c'), width: 2, dash: [7, 5] });
      points.push({ x: x0, y: y0, label: 'x₀' });
    }
    labPlot.draw(curves, points);

    const out = ['<div class="formula">' + tex("f'(x) = " + Expr.tex(lab.d.result), true) + '</div>'];
    if (!ok) {
      out.push('<p class="note">В точке \\(x_0 = ' + fmt(x0, 2) + '\\) функция или её производная не определена. Сдвиньте ползунок.</p>');
    } else {
      const tangent = Expr.simplify(Expr.op('+', Expr.op('*', Expr.num(+k.toFixed(3)), Expr.X()), Expr.num(+(y0 - k * x0).toFixed(3))));
      out.push('<p>' + tex('f(' + fmt(x0, 2) + ') \\approx ' + fmt(y0) + ', \\quad f\'(' + fmt(x0, 2) + ') \\approx ' + fmt(k)) + '</p>');
      out.push('<p>Касательная: ' + tex('y \\approx ' + Expr.tex(tangent)) + '</p>');
      let mono;
      if (Math.abs(k) < 0.02) mono = '\\(f\'(x_0) \\approx 0\\): касательная горизонтальна. Это кандидат в точку экстремума (максимума или минимума) — проверьте, меняет ли \\(f\'\\) знак.';
      else if (k > 0) mono = '\\(f\'(x_0) &gt; 0\\), поэтому рядом с \\(x_0\\) функция <b>возрастает</b>: оранжевый график производной выше оси \\(Ox\\).';
      else mono = '\\(f\'(x_0) &lt; 0\\), поэтому рядом с \\(x_0\\) функция <b>убывает</b>: оранжевый график производной ниже оси \\(Ox\\).';
      out.push('<p>' + mono + '</p>');
    }
    $('lab-readout').innerHTML = out.join('');
    renderMath($('lab-readout'));
    renderLabSteps();
  }

  function renderLabSteps() {
    const box = $('lab-steps');
    if (!labStepsOpen || !lab) { box.innerHTML = ''; $('lab-steps-btn').textContent = 'Решение по шагам'; return; }
    $('lab-steps-btn').textContent = 'Скрыть решение';
    box.innerHTML = '<h3>Решение по шагам</h3>' + stepsHtml(lab.d.steps, lab.d.result);
    renderMath(box);
  }

  let labTimer = null;
  $('lab-input').addEventListener('input', () => { clearTimeout(labTimer); labTimer = setTimeout(labParse, 200); });
  $('lab-x0').addEventListener('input', labUpdate);
  $('lab-chips').addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') return;
    $('lab-input').value = e.target.textContent;
    labParse();
  });
  $('lab-zoom-in').addEventListener('click', () => { zoom = Math.max(0.25, zoom / 1.5); labUpdate(); });
  $('lab-zoom-out').addEventListener('click', () => { zoom = Math.min(20, zoom * 1.5); labUpdate(); });
  $('lab-steps-btn').addEventListener('click', () => { labStepsOpen = !labStepsOpen; renderLabSteps(); });

  // ---------- 3. Тренажёр ----------
  const STATS_KEY = 'msh.derivative.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => {
    $('stats').innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
  };

  let task = null, done = false, helped = false;

  function newTask() {
    task = DerivCore.makeTask(+$('level').value);
    done = false;
    helped = false;
    $('task-eq').innerHTML = 'Найдите производную: ' + tex('f(x) = ' + Expr.tex(task.f), true);
    $('answer').value = '';
    $('answer-preview').textContent = '';
    setFeedback('', '');
    $('solution').innerHTML = '';
  }

  function setFeedback(kind, html) {
    const fb = $('feedback');
    fb.className = 'feedback' + (kind ? ' ' + kind : '');
    fb.innerHTML = html;
    renderMath(fb);
  }

  $('answer').addEventListener('input', () => {
    const pv = $('answer-preview');
    const v = $('answer').value.trim();
    if (!v) { pv.textContent = ''; return; }
    try {
      pv.className = 'preview';
      pv.innerHTML = 'Вы ввели: ' + tex("f'(x) = " + Expr.tex(Expr.parse(v)));
    } catch (e) {
      pv.className = 'preview error';
      pv.textContent = e.message;
    }
  });

  $('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!task) return;
    const res = DerivCore.check(task, $('answer').value);
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
    let msg = res.message;
    if (res.ok) msg += ' Наш вариант записи: ' + tex("f'(x) = " + Expr.tex(task.derivative)) + '. Нажмите «Новая задача», чтобы продолжить.';
    setFeedback(res.ok ? 'good' : 'bad', msg);
  });

  $('hint-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    setFeedback('hint', DerivCore.hint(task));
  });

  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    $('solution').innerHTML = '<h3>Решение по шагам</h3>' + stepsHtml(task.steps, task.derivative);
    renderMath($('solution'));
  });

  $('to-lab-btn').addEventListener('click', () => {
    if (!task) return;
    $('lab-input').value = task.src;
    labParse();
    $('lab').scrollIntoView({ behavior: 'smooth' });
  });

  $('new-task-btn').addEventListener('click', () => { newTask(); $('answer').focus(); });
  $('level').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => {
    secSetFn();
    labParse();
    renderStats();
    newTask();
  });
})();
