// Интерфейс темы «Исследование функции»: лаборатория и тренажёр.
(function () {
  'use strict';
  const A = window.AnCore;
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (ast) => Expr.tex(Expr.simplify(ast));
  const lineTex = (k, b) => (k === 0 ? A.nice(b) : T(Expr.op('+', Expr.op('*', Expr.num(k), Expr.X()), Expr.num(b)))).replace(/1{,}5708/g, '\\frac{\\pi}{2}');
  function asyLine(o) {
    if (!o) return null;
    const kT = o.k === 0 ? '' : o.k === 1 ? 'x' : o.k === -1 ? '-x' : A.nice(o.k) + 'x';
    const bT = A.nice(o.b);
    if (!kT) return 'y = ' + bT;
    return 'y = ' + kT + (o.b === 0 ? '' : bT.startsWith('-') ? ' - ' + bT.slice(1) : ' + ' + bT);
  }

  // ---------- Лаборатория ----------
  const plot = new Plot($('lab-plot'));
  function run() {
    const pv = $('lab-preview'), out = $('lab-out');
    let ast;
    try { ast = Expr.parse($('lab-f').value); }
    catch (e) { pv.className = 'preview error'; pv.textContent = e.message; out.innerHTML = ''; plot.draw([]); return; }
    pv.className = 'preview';
    pv.innerHTML = 'Поняли так: ' + tex('f(x) = ' + T(ast));
    const an = A.analyze(ast, 10);
    const L = an.L;

    // область определения
    const endTex = (x, left) => {
      if (left && Math.abs(x + L) < 1e-9) return '(-\\infty';
      if (!left && Math.abs(x - L) < 1e-9) return '+\\infty)';
      const closed = isFinite(an.f(x)) && !an.breaks.some((c) => Math.abs(c - x) < 1e-9);
      return left ? (closed ? '[' : '(') + A.nice(x) : A.nice(x) + (closed ? ']' : ')');
    };
    const dom = an.segs.length ? an.segs.map(([a, b]) => endTex(a, true) + ';\\ ' + endTex(b, false)).join(' \\cup ') : '\\varnothing';
    const items = [];
    items.push(['Производные', tex("f'(x) = " + Expr.tex(an.d1)) + '<br>' + tex("f''(x) = " + Expr.tex(an.d2))]);
    items.push(['Область определения', tex('D(f) = ' + dom) + ' <span class="small-note" style="display:inline">(по окну \\(|x| \\le 10\\); концы окна показаны как \\(\\pm\\infty\\))</span>']);
    const even = [1, 2.3, 3.7].every((x) => { const a = an.f(x), b = an.f(-x); return (isNaN(a) && isNaN(b)) || Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a)); });
    const odd = [1, 2.3, 3.7].every((x) => { const a = an.f(x), b = an.f(-x); return (isNaN(a) && isNaN(b)) || Math.abs(a + b) < 1e-9 * Math.max(1, Math.abs(a)); });
    items.push(['Чётность', even ? 'чётная: \\(f(-x) = f(x)\\), график симметричен относительно оси \\(Oy\\)' : odd ? 'нечётная: \\(f(-x) = -f(x)\\), график симметричен относительно начала координат' : 'ни чётная, ни нечётная']);
    items.push(['Нули', an.zeros.length ? tex(an.zeros.map((z) => 'x = ' + A.nice(z)).join(',\\; ')) : 'нет']);
    const vert = an.vertical.map((v) => 'x = ' + A.nice(v.x));
    const ap = asyLine(an.asPlus), am = asyLine(an.asMinus);
    let asyTxt = vert.length ? 'вертикальные: ' + tex(vert.join(',\\; ')) : 'вертикальных нет';
    if (ap && am && ap === am) asyTxt += '; при \\(x \\to \\pm\\infty\\): ' + tex(ap);
    else asyTxt += '; при \\(x \\to +\\infty\\): ' + (ap ? tex(ap) : 'нет') + '; при \\(x \\to -\\infty\\): ' + (am ? tex(am) : 'нет');
    items.push(['Асимптоты', asyTxt]);
    const ext = an.extrema.filter((e) => e.kind !== 'none');
    items.push(['Экстремумы', ext.length ? ext.map((e) => (e.kind === 'max' ? 'максимум ' : 'минимум ') + tex('f(' + A.nice(e.x) + ') = ' + A.nice(e.y))).join('; ') : 'нет'] );
    const stat = an.extrema.filter((e) => e.kind === 'none');
    if (stat.length) items.push(['Стационарные без экстремума', tex(stat.map((e) => 'x = ' + A.nice(e.x)).join(',\\; ')) + ' — \\(f\' = 0\\), но знак не меняется']);
    items.push(['Перегибы', an.inflections.length ? tex(an.inflections.map((p) => 'x = ' + A.nice(p.x)).join(',\\; ')) : 'нет']);

    // таблица знаков
    const pts = [...new Set([...an.breaks, ...an.extrema.map((e) => e.x), ...an.inflections.map((p) => p.x)].map((x) => +x.toFixed(9)))].sort((p, q) => p - q).filter((x) => x > -L && x < L);
    const cols = [];
    const bounds = [-L, ...pts, L];
    for (let i = 0; i + 1 < bounds.length; i++) {
      const a = bounds[i], b = bounds[i + 1], m = (a + b) / 2;
      const def = !isNaN(an.f(m));
      cols.push({ head: '(' + (i === 0 ? '-\\infty' : A.nice(a)) + ';\\, ' + (i + 2 === bounds.length ? '+\\infty' : A.nice(b)) + ')', d1: def ? (an.f1(m) > 0 ? '+' : '-') : '', d2: def ? (an.f2(m) > 0 ? '+' : '-') : '', f: def ? (an.f1(m) > 0 ? '\\nearrow' : '\\searrow') + (an.f2(m) > 0 ? '\\;\\cup' : '\\;\\cap') : '\\text{не опр.}' });
      if (i + 1 < bounds.length - 1) {
        const x = b;
        const isBreak = an.breaks.some((c) => Math.abs(c - x) < 1e-9) || isNaN(an.f(x));
        const e = an.extrema.find((q) => Math.abs(q.x - x) < 1e-9);
        const ip = an.inflections.find((q) => Math.abs(q.x - x) < 1e-9);
        cols.push({ head: A.nice(x), point: true, d1: isBreak ? '\\nexists' : e ? '0' : '', d2: isBreak ? '\\nexists' : ip ? '0' : '', f: isBreak ? '\\nexists' : (e && e.kind !== 'none' ? '\\text{' + e.kind + '}\\; ' : '') + A.nice(an.f(x)) });
      }
    }
    let table = '<div class="tt-wrap"><table class="num-table signs"><tr><th>\\(x\\)</th>' + cols.map((c) => '<th' + (c.point ? ' class="pt"' : '') + '>' + tex(c.head) + '</th>').join('') + '</tr>';
    for (const [row, key] of [["f'", 'd1'], ["f''", 'd2'], ['f', 'f']]) {
      table += '<tr><th>' + tex(row) + '</th>' + cols.map((c) => '<td' + (c.point ? ' class="pt"' : '') + '>' + (c[key] ? tex(c[key]) : '') + '</td>').join('') + '</tr>';
    }
    table += '</table></div><p class="small-note">\\(\\nearrow\\) — возрастает, \\(\\searrow\\) — убывает, \\(\\cup\\) — выпукла вниз, \\(\\cap\\) — выпукла вверх.</p>';

    out.innerHTML = '<dl class="facts">' + items.map(([k, v]) => '<dt>' + k + '</dt><dd>' + v + '</dd>').join('') + '</dl><h3>Сводная таблица</h3>' + table;
    renderMath(out);

    // график
    const W = 6;
    const ys = [];
    for (let i = 0; i <= 600; i++) { const y = an.f(-W + (2 * W * i) / 600); if (isFinite(y)) ys.push(y); }
    ys.sort((p, q) => p - q);
    const special = [...an.extrema, ...an.inflections].filter((p) => Math.abs(p.x) <= W).map((p) => p.y);
    let lo = Math.min(ys[Math.floor(ys.length * 0.08)], ...special), hi = Math.max(ys[Math.floor(ys.length * 0.92)], ...special);
    if (!isFinite(lo) || !isFinite(hi)) { lo = -5; hi = 5; }
    const pad = Math.max(1, (hi - lo) * 0.25);
    plot.setView({ xMin: -W, xMax: W, yMin: lo - pad, yMax: hi + pad, equal: false });
    const gray = css('--axis', '#8a8f98');
    const curves = [{ fn: (x) => (an.breaks.some((c) => Math.abs(c - x) < 1e-9) ? NaN : an.f(x)) }];
    if (an.asPlus) curves.push({ fn: (x) => (x > 0.5 ? an.asPlus.k * x + an.asPlus.b : NaN), color: gray, width: 1.5, dash: [6, 5] });
    if (an.asMinus) curves.push({ fn: (x) => (x < -0.5 ? an.asMinus.k * x + an.asMinus.b : NaN), color: gray, width: 1.5, dash: [6, 5] });
    const points = [
      ...an.extrema.filter((e) => e.kind !== 'none').map((e) => ({ x: e.x, y: e.y, color: e.kind === 'max' ? css('--bad', '#c0392b') : css('--good', '#1f8a4c') })),
      ...an.inflections.map((p) => ({ x: p.x, y: p.y, r: 4, color: css('--curve-2', '#d9480f') })),
    ];
    plot.draw(curves, points, an.vertical.map((v) => ({ x1: v.x, y1: -1e4, x2: v.x, y2: 1e4, color: gray })));
  }
  let timer = null;
  $('lab-f').addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 300); });
  $('lab-chips').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $('lab-f').value = b.textContent; run(); });

  // ---------- Тренажёр ----------
  const STATS_KEY = 'msh.analysis.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => { $('stats').innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>'; };
  let mode = 'ext', task = null, done = false, helped = false;
  function fb(kind, html) { const el = $('feedback'); el.className = 'feedback' + (kind ? ' ' + kind : ''); el.innerHTML = html; renderMath(el); }
  function record(ok) {
    if (done) return;
    stats.attempts++;
    if (ok) { done = true; stats.solved++; stats.streak = helped ? 0 : stats.streak + 1; stats.best = Math.max(stats.best, stats.streak); }
    else stats.streak = 0;
    saveStats(); renderStats();
  }
  // форма с несколькими полями
  function form(fields, onSubmit) {
    $('area').innerHTML = '<form id="tr-form" autocomplete="off">' + fields.map((f, i) =>
      '<div class="expr-input" style="margin-top:8px"><label for="tr-in' + i + '" style="font-weight:600;min-width:96px">' + f.label + '</label><input id="tr-in' + i + '" placeholder="' + f.ph + '" spellcheck="false" autocapitalize="off"></div>').join('') +
      '<div class="row" style="margin-top:8px"><button class="primary" type="submit">Проверить</button></div></form>';
    renderMath($('area'));
    $('tr-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const res = onSubmit(fields.map((_, i) => $('tr-in' + i).value));
      if (res.invalid) { const el = $('feedback'); el.className = 'feedback bad'; el.textContent = res.message; return; }
      record(res.ok);
      fb(res.ok ? 'good' : 'bad', res.message);
    });
  }
  function newTask() {
    mode = $('mode').value;
    done = false; helped = false;
    fb('', ''); $('solution').innerHTML = ''; $('area').innerHTML = '';
    if (mode === 'ext') {
      task = A.makeExtTask();
      $('task').innerHTML = 'Найдите точки экстремума функции' + tex('f(x) = ' + task.tex, true);
      form([{ label: 'максимумы', ph: 'например: -1; 2 или нет' }, { label: 'минимумы', ph: 'например: 0 или нет' }], ([a, b]) => A.checkExt(task, a, b));
    } else if (mode === 'asy') {
      task = A.makeAsyTask();
      $('task').innerHTML = 'Найдите асимптоты функции' + tex('f(x) = ' + task.tex, true) + '<span class="small-note">Вертикальные — значения \\(x\\) через «;» (или «нет»). Наклонная или горизонтальная — коэффициенты \\(y = kx + b\\) (для горизонтальной \\(k = 0\\)).</span>';
      form([{ label: 'вертикальные: x =', ph: 'например: 2 или -1; 1' }, { label: 'k =', ph: 'число' }, { label: 'b =', ph: 'число' }], ([v, k, b]) => A.checkAsy(task, v, k, b));
    } else if (mode === 'seg') {
      task = A.makeSegTask();
      $('task').innerHTML = 'Найдите наибольшее и наименьшее значения на отрезке ' + tex('[' + task.l + ';\\ ' + task.r + ']') + tex('f(x) = ' + task.tex, true);
      form([{ label: 'наибольшее', ph: 'число' }, { label: 'наименьшее', ph: 'число' }], ([a, b]) => A.checkSeg(task, a, b));
    } else {
      task = A.pick(A.TF);
      $('task').innerHTML = 'Верно ли утверждение?' + tex(task.tex, true);
      const box = document.createElement('div');
      box.className = 'choices';
      ['Верно', 'Неверно'].forEach((l, i) => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'choice'; b.textContent = l;
        b.addEventListener('click', () => {
          const ok = (i === 0) === task.truth;
          b.classList.add(ok ? 'correct' : 'wrong');
          if (!ok) helped = true;
          record(ok);
          fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, утверждение ' + (task.truth ? 'верно' : 'неверно') + '. ') + task.why);
        });
        box.appendChild(b);
      });
      $('area').appendChild(box);
    }
    renderMath($('task'));
  }
  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    if (mode === 'tf') { fb('hint', 'Утверждение ' + (task.truth ? '<b>верно</b>' : '<b>неверно</b>') + '. ' + task.why); return; }
    let extra = '';
    if (mode === 'ext') extra = '<li class="final"><div>Ответ:</div>максимумы: ' + (task.max.length ? tex(task.max.map(A.nice).join(';\\ ')) : 'нет') + '; минимумы: ' + (task.min.length ? tex(task.min.map(A.nice).join(';\\ ')) : 'нет') + '</li>';
    const items = task.steps.map((s) => '<li><div>' + s.title + '</div>' + (s.tex ? tex(s.tex, true) : '') + '</li>');
    $('solution').innerHTML = '<h3>Решение по шагам</h3><ol class="steps-list">' + items.join('') + extra + '</ol>';
    renderMath($('solution'));
  });
  $('new-task-btn').addEventListener('click', newTask);
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => { run(); renderStats(); newTask(); });
})();
