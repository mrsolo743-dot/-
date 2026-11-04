// Интерфейс темы «Интеграл»: суммы Римана и тренажёр.
(function () {
  'use strict';
  const I = window.IntCore;
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (v, d) => (isFinite(v) ? String(+v.toFixed(d === undefined ? 5 : d)).replace('.', '{,}') : '\\text{—}');

  // ---------- 1. Суммы Римана ----------
  const PRESETS = [
    { src: 'x^2', a: 0, b: 2, exact: 8 / 3, exactTex: '\\frac{8}{3}' },
    { src: 'sin x', a: 0, b: Math.PI, exact: 2, exactTex: '2', bTex: '\\pi' },
    { src: 'e^x', a: 0, b: 1, exact: Math.E - 1, exactTex: 'e - 1' },
    { src: 'sqrt(x)', a: 0, b: 4, exact: 16 / 3, exactTex: '\\frac{16}{3}' },
    { src: 'x^3 - 3x', a: -2, b: 2, exact: 0, exactTex: '0' },
  ];
  const plot = new Plot($('rs-plot'));
  function current() {
    const v = $('rs-sel').value;
    $('rs-custom').hidden = v !== 'custom';
    if (v !== 'custom') { const p = PRESETS[+v]; return Object.assign({ ast: Expr.parse(p.src) }, p); }
    const ast = Expr.parse($('rs-f').value);
    const pa = LimCore.parseAnswer($('rs-a').value), pb = LimCore.parseAnswer($('rs-b').value);
    if (pa.error || pb.error || !isFinite(pa.value) || !isFinite(pb.value)) throw new Error('Пределы a и b — числа, например 0 и pi.');
    if (pb.value <= pa.value) throw new Error('Нужно a < b.');
    return { ast, src: $('rs-f').value, a: pa.value, b: pb.value };
  }
  function update() {
    const out = $('rs-out');
    let c;
    try { c = current(); } catch (e) { out.innerHTML = '<p class="preview error">' + esc(e.message) + '</p>'; plot.draw([]); return; }
    const f = (x) => Expr.evaluate(c.ast, x);
    const n = +$('rs-n').value, kind = $('rs-kind').value;
    $('rs-n-out').textContent = n;
    const exact = c.exact !== undefined ? c.exact : I.simpson(f, c.a, c.b, 20000);
    if (!isFinite(exact)) { out.innerHTML = '<p class="preview error">Функция не определена на части отрезка — интеграл так не посчитать.</p>'; return; }
    const sum = I.riemann(f, c.a, c.b, n, kind);
    // фигуры
    const h = (c.b - c.a) / n, shapes = [];
    const pos = css('--curve', '#2f6fdb'), neg = css('--bad', '#c0392b');
    for (let i = 0; i < n; i++) {
      const l = c.a + i * h, r = l + h;
      let pts;
      if (kind === 'trap') pts = [[l, 0], [l, f(l)], [r, f(r)], [r, 0]];
      else { const y = f(kind === 'left' ? l : kind === 'right' ? r : (l + r) / 2); pts = [[l, 0], [l, y], [r, y], [r, 0]]; }
      const avg = (pts[1][1] + pts[2][1]) / 2;
      shapes.push({ pts, fill: avg >= 0 ? pos : neg, alpha: 0.22, stroke: avg >= 0 ? pos : neg });
    }
    const ys = [];
    for (let i = 0; i <= 200; i++) { const y = f(c.a + ((c.b - c.a) * i) / 200); if (isFinite(y)) ys.push(y); }
    const lo = Math.min(0, ...ys), hi = Math.max(0, ...ys), pad = (hi - lo) * 0.12 || 1;
    const w = c.b - c.a;
    plot.setView({ xMin: c.a - w * 0.08, xMax: c.b + w * 0.08, yMin: lo - pad, yMax: hi + pad, equal: false });
    plot.draw([{ fn: (x) => (x < c.a - w * 0.08 || x > c.b + w * 0.08 ? NaN : f(x)) }], [], [], [], shapes);
    const names = { left: 'левых прямоугольников', right: 'правых прямоугольников', mid: 'средних прямоугольников', trap: 'трапеций' };
    const err = Math.abs(sum - exact);
    out.innerHTML =
      '<p>Сумма ' + names[kind] + ' при ' + tex('n = ' + n) + ': ' + tex('\\sigma \\approx ' + fmt(sum)) + '</p>' +
      '<p>Интеграл: ' + tex('\\int_{' + fmt(c.a, 4) + '}^{' + (c.bTex || fmt(c.b, 4)) + '} ' + Expr.tex(Expr.simplify(c.ast)) + '\\,dx ' + (c.exactTex ? '= ' + c.exactTex + ' \\approx ' : '\\approx ') + fmt(exact)) + (c.exactTex ? '' : ' (посчитано численно)') + '</p>' +
      '<p>Ошибка: ' + tex('|\\sigma - I| \\approx ' + (err < 1e-9 ? '0' : err.toExponential(2).replace('.', '{,}').replace(/e([-+]\d+)/, ' \\cdot 10^{$1}'))) + '. Увеличьте \\(n\\) вдвое и посмотрите, во сколько раз она уменьшится.</p>' +
      (ys.some((y) => y < 0) ? '<p class="small-note">Полоски под осью (красные) входят в сумму со знаком минус: интеграл — это площадь со знаком.</p>' : '');
    renderMath(out);
  }
  ['rs-sel', 'rs-kind'].forEach((id) => $(id).addEventListener('change', update));
  $('rs-n').addEventListener('input', update);
  let t = null;
  ['rs-f', 'rs-a', 'rs-b'].forEach((id) => $(id).addEventListener('input', () => { clearTimeout(t); t = setTimeout(update, 250); }));

  // ---------- 8. Тренажёр ----------
  const STATS_KEY = 'msh.integral.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => { $('stats').innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>'; };
  let mode = 'anti', task = null, done = false, helped = false;
  function fb(kind, html) { const el = $('feedback'); el.className = 'feedback' + (kind ? ' ' + kind : ''); el.innerHTML = html; renderMath(el); }
  function record(ok) {
    if (done) return;
    stats.attempts++;
    if (ok) { done = true; stats.solved++; stats.streak = helped ? 0 : stats.streak + 1; stats.best = Math.max(stats.best, stats.streak); } else stats.streak = 0;
    saveStats(); renderStats();
  }
  function inputForm(label, ph, check) {
    $('area').innerHTML = '<form id="tr-form" autocomplete="off"><div class="expr-input"><label for="tr-in" style="font-weight:600">' + label + '</label><input id="tr-in" placeholder="' + ph + '" spellcheck="false" autocapitalize="off"><button class="primary" type="submit">Проверить</button></div><div class="preview" id="tr-pv"></div></form>';
    renderMath($('area'));
    $('tr-in').addEventListener('input', () => {
      const v = $('tr-in').value.trim(), pv = $('tr-pv');
      if (!v) { pv.textContent = ''; return; }
      try { pv.className = 'preview'; pv.innerHTML = 'Вы ввели: ' + tex(Expr.tex(Expr.parse(v.replace(/\+\s*[cс]\s*$/i, '')))); }
      catch (e) { pv.className = 'preview error'; pv.textContent = e.message; }
    });
    $('tr-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const res = check($('tr-in').value);
      if (res.invalid) { const el = $('feedback'); el.className = 'feedback bad'; el.textContent = res.message; return; }
      record(res.ok);
      fb(res.ok ? 'good' : 'bad', res.message);
    });
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
  function newTask() {
    mode = $('mode').value;
    done = false; helped = false;
    fb('', ''); $('solution').innerHTML = ''; $('area').innerHTML = '';
    $('hint-btn').hidden = mode === 'imp' || mode === 'tf';
    if (mode === 'anti') {
      task = I.makeAntiTask();
      $('task').innerHTML = 'Найдите первообразную:' + tex('\\int ' + task.tex + '\\,dx', true) + '<span class="small-note">Ответ проверяется дифференцированием, поэтому подойдёт любая верная форма. «+ C» можно не писать. Модуль — так: ln|x − 1|.</span>';
      inputForm(tex('F(x) ='), 'например: x^3/3 + ln|x| или x sin x + cos x', (v) => I.checkAnti(task, v));
    } else if (mode === 'def') {
      task = I.makeDefTask();
      $('task').innerHTML = 'Вычислите:' + tex(task.tex, true) + '<span class="small-note">Можно ответить точно: 3/2, pi/4, ln 2, e - 1.</span>';
      inputForm('Ответ:', 'например: pi/4', (v) => I.checkDef(task, v));
    } else if (mode === 'imp') {
      task = I.pick(I.IMP);
      $('task').innerHTML = 'Сходится ли интеграл?' + tex(task.tex, true);
      choices(['Сходится', 'Расходится'], (i, b) => {
        const ok = (i === 0) === task.conv;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) helped = true;
        record(ok);
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, интеграл ' + (task.conv ? 'сходится' : 'расходится') + '. ') + (task.conv && task.value ? 'Его значение: \\(' + task.value + '\\). ' : '') + task.why);
      });
    } else {
      task = I.pick(I.TF);
      $('task').innerHTML = 'Верно ли утверждение?' + tex(task.tex, true);
      choices(['Верно', 'Неверно'], (i, b) => {
        const ok = (i === 0) === task.truth;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) helped = true;
        record(ok);
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, утверждение ' + (task.truth ? 'верно' : 'неверно') + '. ') + task.why);
      });
    }
    renderMath($('task'));
  }
  $('hint-btn').addEventListener('click', () => {
    if (!task || !task.steps) return;
    helped = true;
    fb('hint', (task.method ? '<b>Метод: ' + task.method + '.</b> ' : '') + task.steps[0].title);
  });
  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    if (mode === 'imp' || mode === 'tf') { fb('hint', (mode === 'imp' ? 'Интеграл <b>' + (task.conv ? 'сходится' : 'расходится') + '</b>. ' : 'Утверждение <b>' + (task.truth ? 'верно' : 'неверно') + '</b>. ') + task.why); return; }
    const items = task.steps.map((s) => '<li><div>' + s.title + '</div>' + (s.tex ? tex(s.tex, true) : '') + '</li>');
    if (mode === 'anti') items.push('<li class="final"><div>Ответ:</div>' + tex('\\int ' + task.tex + '\\,dx = ' + Expr.tex(Expr.simplify(Expr.parse(task.F))) + ' + C', true) + '</li>');
    $('solution').innerHTML = '<h3>Решение по шагам</h3><ol class="steps-list">' + items.join('') + '</ol>';
    renderMath($('solution'));
  });
  $('new-task-btn').addEventListener('click', newTask);
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => { update(); renderStats(); newTask(); });
})();
