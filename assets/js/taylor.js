// Интерфейс темы «Формула Тейлора»: лаборатория приближений, пределы через разложения, тренажёр.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const T = (ast) => Expr.tex(Expr.simplify(ast));

  // ---------- 2. Лаборатория Тейлора ----------
  const plot = new Plot($('lab-plot'));
  let lab = null;
  function labParse() {
    const pv = $('lab-preview');
    let f, a;
    try {
      f = Expr.parse($('lab-f').value);
      const pa = LimCore.parseAnswer($('lab-a').value);
      if (pa.error || !isFinite(pa.value)) throw new Error('Точка a: ' + (pa.error || 'нужно число'));
      a = pa.value;
    } catch (e) {
      pv.className = 'preview error'; pv.textContent = e.message; lab = null; return;
    }
    const c = Series.seriesOf(f, a, 12);
    if (c.some((v) => !isFinite(v))) {
      pv.className = 'preview error';
      pv.textContent = 'В точке a = ' + $('lab-a').value + ' функция не определена или не гладкая — разложить её здесь нельзя. Попробуйте другую точку.';
      lab = null; plot.draw([]); $('lab-out').innerHTML = ''; return;
    }
    pv.className = 'preview';
    pv.innerHTML = 'Поняли так: ' + tex('f(x) = ' + T(f));
    lab = { f, a, c };
    labUpdate();
  }
  function labUpdate() {
    if (!lab) return;
    const n = +$('lab-n').value;
    $('lab-n-out').textContent = n;
    const { f, a, c } = lab;
    const F = (x) => Expr.evaluate(f, x);
    const P = (x) => Series.evalPoly(c, a, n, x);
    const ys = [];
    for (let i = 0; i <= 300; i++) { const y = F(a - 4 + (8 * i) / 300); if (isFinite(y)) ys.push(y); }
    ys.sort((p, q) => p - q);
    const lo = ys[Math.floor(ys.length * 0.03)], hi = ys[Math.floor(ys.length * 0.97)];
    const pad = Math.max(1, (hi - lo) * 0.3);
    plot.setView({ xMin: a - 4, xMax: a + 4, yMin: lo - pad, yMax: hi + pad, equal: false });
    plot.draw([{ fn: F }, { fn: P, color: css('--curve-2', '#d9480f'), width: 2.5 }], [{ x: a, y: c[0], label: 'a' }]);
    // максимальная ошибка на окрестностях
    const maxErr = (r) => {
      let m = 0;
      for (let i = 0; i <= 400; i++) {
        const x = a - r + (2 * r * i) / 400;
        const v = F(x);
        if (isFinite(v)) m = Math.max(m, Math.abs(v - P(x)));
      }
      return m;
    };
    const e1 = maxErr(0.5), e2 = maxErr(1);
    $('lab-out').innerHTML =
      // строчная формула: длинный многочлен переносится по знакам «+» и «−»
      '<p class="poly">' + tex('P_{' + n + '}(x) = ' + Series.polyTex(c, a, n)) + '</p>' +
      '<p>Наибольшая ошибка ' + tex('|f(x) - P_{' + n + '}(x)|') + ': при ' + tex('|x - a| \\le 0{,}5') + ' — ' + tex('\\approx ' + Series.fmtDec(e1)) + ', при ' + tex('|x - a| \\le 1') + ' — ' + tex('\\approx ' + Series.fmtDec(e2)) + '.</p>' +
      '<p class="small-note">Увеличивайте \\(n\\): около точки \\(a\\) ошибка падает как \\(|x - a|^{n+1}\\). Вдали от неё многочлен может уходить от функции — особенно за границей интервала сходимости.</p>';
    renderMath($('lab-out'));
  }
  let labTimer = null;
  ['lab-f', 'lab-a'].forEach((id) => $(id).addEventListener('input', () => { clearTimeout(labTimer); labTimer = setTimeout(labParse, 250); }));
  $('lab-n').addEventListener('input', labUpdate);
  $('lab-chips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $('lab-f').value = b.textContent;
    $('lab-a').value = b.dataset.a;
    labParse();
  });

  // ---------- 5. Лаборатория пределов ----------
  function limRun() {
    const out = $('lim-out');
    let nA, dA;
    try { nA = Expr.parse($('lim-n').value); dA = Expr.parse($('lim-d').value); }
    catch (e) { out.innerHTML = '<p class="preview error">' + esc(e.message) + '</p>'; return; }
    const r = Series.limitAt0(nA, dA, 12);
    if (r.error) { out.innerHTML = '<p class="preview error">' + esc(r.error) + '</p>'; return; }
    const ord = Math.min(r.nOrd, r.dOrd);
    const show = Math.max(r.nOrd, r.dOrd) > 12 ? 12 : Math.max(r.nOrd, r.dOrd);
    const lt = '\\lim_{x \\to 0} \\frac{' + T(nA) + '}{' + T(dA) + '}';
    let verdict;
    if (isFinite(r.value)) verdict = lt + ' = ' + Series.coefTex(r.value);
    else if (isNaN(r.value)) verdict = lt + '\\;\\nexists';
    else verdict = lt + ' = ' + (r.value > 0 ? '+\\infty' : '-\\infty');
    let why;
    if (r.nOrd === r.dOrd) why = 'Порядки главных членов совпадают (\\(x^{' + ord + '}\\)), предел равен отношению коэффициентов при \\(x^{' + ord + '}\\).';
    else if (r.nOrd > r.dOrd) why = 'Числитель имеет более высокий порядок малости (\\(x^{' + r.nOrd + '}\\) против \\(x^{' + r.dOrd + '}\\)), поэтому предел равен 0.';
    else why = 'Знаменатель стремится к нулю быстрее (\\(x^{' + r.dOrd + '}\\) против \\(x^{' + r.nOrd + '}\\)), поэтому дробь неограниченно растёт.' + (isNaN(r.value) ? ' Разница порядков нечётна: слева и справа получаются бесконечности разных знаков, поэтому предела нет.' : '');
    out.innerHTML =
      '<p class="poly">' + tex(T(nA) + ' = ' + Series.polyTex(r.nc, 0, show) + ' + o(x^{' + show + '})') + '</p>' +
      '<p class="poly">' + tex(T(dA) + ' = ' + Series.polyTex(r.dc, 0, show) + (r.dc.slice(show + 1).some((v) => Math.abs(v) > 1e-12) ? ' + o(x^{' + show + '})' : '')) + '</p>' +
      '<p>' + why + '</p>' +
      '<div class="formula">' + tex(verdict, true) + '</div>';
    renderMath(out);
  }
  let limTimer = null;
  ['lim-n', 'lim-d'].forEach((id) => $(id).addEventListener('input', () => { clearTimeout(limTimer); limTimer = setTimeout(limRun, 250); }));

  // ---------- 7. Тренажёр ----------
  const STATS_KEY = 'msh.taylor.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => {
    $('stats').innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
  };
  let mode = 'limit', task = null, done = false, helped = false;
  function fb(kind, html) {
    const el = $('feedback');
    el.className = 'feedback' + (kind ? ' ' + kind : '');
    el.innerHTML = html;
    renderMath(el);
  }
  function newTask() {
    mode = $('mode').value;
    done = false; helped = false;
    if (mode === 'limit') {
      task = TaylorCore.makeLimitTask();
      $('task').innerHTML = 'Вычислите с помощью формулы Тейлора:' + tex(task.tex, true);
      $('answer-label').textContent = 'Ответ:';
      $('answer').placeholder = 'например: -1/6';
    } else if (mode === 'coef') {
      task = TaylorCore.makeCoefTask();
      $('task').innerHTML = 'Найдите коэффициент при ' + tex('x^{' + task.k + '}') + ' в разложении по степеням ' + tex('x') + ':' + tex('f(x) = ' + task.tex, true);
      $('answer-label').innerHTML = tex('c_{' + task.k + '} =');
      $('answer').placeholder = 'например: 1/24';
    } else {
      task = TaylorCore.makeTermsTask();
      $('task').innerHTML = 'Значение ' + tex(task.tex) + ' считают по формуле Маклорена для ' + tex(task.fTex) + ' в точке ' + tex('x = ' + task.xTex) + '. Какую наименьшую степень ' + tex('n') + ' многочлена нужно взять, чтобы ' + tex('|R_n| < 10^{-' + task.m + '}') + ' по оценке Лагранжа?';
      $('answer-label').innerHTML = tex('n =');
      $('answer').placeholder = 'целое число';
    }
    renderMath($('task'));
    renderMath($('answer-label'));
    $('answer').value = '';
    $('answer-preview').textContent = '';
    fb('', '');
    $('solution').innerHTML = '';
  }
  $('answer').addEventListener('input', () => {
    const v = $('answer').value.trim(), pv = $('answer-preview');
    if (!v || mode === 'terms') { pv.textContent = ''; return; }
    const p = LimCore.parseAnswer(v);
    if (p.error) { pv.className = 'preview error'; pv.textContent = p.error; return; }
    pv.className = 'preview';
    pv.innerHTML = p.ast ? 'Вы ввели: ' + tex(Expr.tex(p.ast) + (p.ast.type === 'num' ? '' : ' \\approx ' + Series.fmtDec(p.value))) : '';
  });
  $('answer-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!task) return;
    const res = mode === 'terms' ? TaylorCore.checkTerms(task, $('answer').value) : TaylorCore.checkValue(task, $('answer').value);
    if (res.invalid) { const el = $('feedback'); el.className = 'feedback bad'; el.textContent = res.message; return; }
    if (!done) {
      stats.attempts++;
      if (res.ok) { done = true; stats.solved++; stats.streak = helped ? 0 : stats.streak + 1; stats.best = Math.max(stats.best, stats.streak); }
      else stats.streak = 0;
      saveStats(); renderStats();
    }
    let msg = esc(res.message);
    if (res.ok && mode !== 'terms') msg += ' Ответ: ' + tex(task.answerTex) + '.';
    fb(res.ok ? 'good' : 'bad', msg);
  });
  $('hint-btn').addEventListener('click', () => { if (!task) return; helped = true; fb('hint', 'С чего начать: ' + task.steps[0].title); });
  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    helped = true;
    const items = task.steps.map((s) => '<li><div>' + s.title + '</div>' + (s.tex ? tex(s.tex, true) : '') + '</li>');
    $('solution').innerHTML = '<h3>Решение по шагам</h3><ol class="steps-list">' + items.join('') + '</ol>';
    renderMath($('solution'));
  });
  $('new-task-btn').addEventListener('click', () => { newTask(); $('answer').focus(); });
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => {
    labParse();
    limRun();
    renderStats();
    newTask();
  });
})();
