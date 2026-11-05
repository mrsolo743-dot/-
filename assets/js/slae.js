// Интерфейс темы «Системы линейных уравнений»: прямые, лаборатория, тренажёр.
(function () {
  'use strict';
  const L = window.Lin, U = window.LinUI;
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const F = L.F;
  const show = (el, html) => { el.innerHTML = html; renderMath(el); };

  // ---------- 1. Две прямые ----------
  const plot = new Plot($('lines-plot'));
  plot.setView({ xMin: -8, xMax: 8, yMin: -6, yMax: 6, equal: true });
  function updateLines() {
    const g = (id) => { const v = +$(id).value; $(id + '-out').textContent = v; return v; };
    const a1 = g('p1'), b1 = g('q1'), c1 = g('r1'), a2 = g('p2'), b2 = g('q2'), c2 = g('r2');
    const colors = [css('--curve', '#2f6fdb'), css('--tangent', '#e67e22')];
    const curves = [], lines = [], points = [];
    [[a1, b1, c1], [a2, b2, c2]].forEach(([a, b, c], k) => {
      if (b !== 0) curves.push({ fn: (x) => (c - a * x) / b, color: colors[k], dash: k ? [8, 6] : null });
      else if (a !== 0) lines.push({ x1: c / a, y1: -100, x2: c / a, y2: 100, color: colors[k], width: 2.5, solid: !k, dash: k ? [8, 6] : null });
    });
    const sol = L.solve(L.M([[a1, b1], [a2, b2]]), [F(c1), F(c2)]);
    let txt = tex(L.systemTex(L.M([[a1, b1], [a2, b2]]), [F(c1), F(c2)])) + '<br>';
    const degenerate = (a1 === 0 && b1 === 0) || (a2 === 0 && b2 === 0);
    const D = a1 * b2 - a2 * b1;
    if (sol.kind === 'unique') {
      const [x, y] = sol.x;
      points.push({ x: L.val(x), y: L.val(y), label: '(' + L.fstr(x) + '; ' + L.fstr(y) + ')' });
      txt += 'Прямые <b>пересекаются</b> в одной точке: ' + tex('x = ' + L.ftex(x) + ',\\ y = ' + L.ftex(y)) + '. Определитель ' + tex('\\Delta = a_1 b_2 - a_2 b_1 = ' + D + ' \\ne 0') + '.';
    } else if (degenerate) {
      txt += 'Одно из уравнений вида ' + tex('0x + 0y = c') + ' — это не прямая: при ' + tex('c = 0') + ' ему подходит вся плоскость, иначе — ничего. ' + (sol.kind === 'none' ? 'Решений <b>нет</b>.' : 'Решения — все точки второй прямой (или вся плоскость).');
    } else if (sol.kind === 'none') {
      txt += 'Прямые <b>параллельны</b> и не совпадают: решений нет. ' + tex('\\Delta = 0') + ', но ранг расширенной матрицы больше ранга матрицы коэффициентов.';
    } else {
      txt += 'Прямые <b>совпадают</b>: уравнения пропорциональны, решений бесконечно много: ' + tex(L.generalTex(sol)) + '.';
    }
    plot.draw(curves, points, lines);
    show($('lines-out'), txt);
  }
  ['p1', 'q1', 'r1', 'p2', 'q2', 'r2'].forEach((id) => $(id).addEventListener('input', updateLines));

  // ---------- 5. Лаборатория ----------
  const SAMPLES = {
    '2x2': [[2, 1, 5], [1, -1, 1]],
    '3x3': [[2, 1, -1, 8], [-3, -1, 2, -11], [-2, 1, 2, -3]],
    '3x4': [[1, 2, -1, 1, 3], [2, 4, 0, 1, 7], [1, 2, 1, 0, 4]],
    '4x3': [[1, 1, 1, 6], [1, -1, 0, -1], [0, 1, -1, -1], [1, 0, 1, 4]],
  };
  let lab = null;
  const size = () => { const [m, n] = $('lab-size').value.split('x').map(Number); return { m, n }; };
  function makeLab(values) {
    const { m, n } = size();
    lab = U.grid($('lab-grid'), m, n + 1, { id: 'lab', aug: n, values: L.M(values || SAMPLES[$('lab-size').value]) });
    $('lab-out').innerHTML = '';
    previewSystem();
    $('lab-grid').querySelectorAll('input').forEach((el) => el.addEventListener('input', previewSystem));
  }
  function readLab() {
    const r = lab.get();
    if (r.error) return r;
    const n = size().n;
    return { A: r.M.map((row) => row.slice(0, n)), b: r.M.map((row) => row[n]), aug: r.M };
  }
  function previewSystem() {
    const r = readLab();
    if (r.error) { $('lab-system').innerHTML = ''; return; }
    show($('lab-system'), tex(L.systemTex(r.A, r.b), true));
  }
  function gaussHtml(A, b) {
    const n = A[0].length, aug = A.map((r, i) => r.concat([b[i]]));
    const sol = L.solve(A, b);
    let h = '<h3>Метод Гаусса — Жордана</h3>';
    h += sol.gauss.steps.length ? U.stepsHtml(aug, sol.gauss.steps, n) : tex(L.mtex(aug, n), true);
    h += '<p>Ранги: ' + tex('\\operatorname{rang} A = ' + sol.rankA) + ', ' + tex('\\operatorname{rang}(A \\mid b) = ' + sol.rankAug) + ', неизвестных ' + tex('n = ' + n) + '.</p>';
    if (sol.kind === 'none') {
      const row = sol.gauss.A.findIndex((r) => r.slice(0, n).every(L.isZero) && !L.isZero(r[n]));
      h += '<p class="feedback bad">Строка ' + (row + 1) + ' означает уравнение ' + tex('0 = ' + L.ftex(sol.gauss.A[row][n])) + ' — противоречие. Ранги различны, система <b>несовместна</b>: решений нет.</p>';
    } else if (sol.kind === 'unique') {
      h += '<p>Ранги равны и совпадают с числом неизвестных — решение <b>единственное</b>:</p>' + tex(sol.x.map((x, j) => L.varName(j, n) + ' = ' + L.ftex(x)).join(',\\quad '), true);
      const ok = A.every((r, i) => L.eq(r.reduce((s, a, j) => L.add(s, L.mul(a, sol.x[j])), F(0)), b[i]));
      h += '<p class="small-note">Проверка подстановкой: ' + (ok ? 'все уравнения выполняются.' : 'не сошлось.') + '</p>';
    } else {
      const names = sol.free.map((j) => tex(L.varName(j, n))).join(', ');
      h += '<p>Ранги равны, но меньше числа неизвестных: свободных неизвестных ' + (n - sol.rankA) + ' (' + names + '). Решений <b>бесконечно много</b>. Общее решение:</p>' + tex('\\begin{gathered} ' + L.generalTex(sol).split(', \\quad ').join(', \\\\ ') + ' \\end{gathered}', true);
    }
    return h;
  }
  function cramerHtml(A, b) {
    const n = A.length;
    if (A[0].length !== n) return '<p class="feedback bad">Правило Крамера — только для квадратных систем (уравнений столько же, сколько неизвестных). Здесь используйте метод Гаусса.</p>';
    const D = L.det(A).value;
    let h = '<h3>Правило Крамера</h3>' + tex('\\Delta = ' + L.dtex(A) + ' = ' + L.ftex(D), true);
    if (L.isZero(D)) return h + '<p class="feedback bad">\\(\\Delta = 0\\): правило Крамера не применимо. Решений либо нет, либо бесконечно много — выясните методом Гаусса.</p>';
    const xs = [];
    for (let j = 0; j < n; j++) {
      const Aj = A.map((r, i) => r.map((x, k) => (k === j ? b[i] : x)));
      const Dj = L.det(Aj).value, x = L.div(Dj, D);
      xs.push(x);
      const v = L.varName(j, n);
      h += tex('\\begin{gathered} \\Delta_{' + v + '} = ' + L.dtex(Aj) + ' = ' + L.ftex(Dj) + ', \\\\ ' + v + ' = \\frac{\\Delta_{' + v + '}}{\\Delta} = \\frac{' + L.ftex(Dj) + '}{' + L.ftex(D) + '} = ' + L.ftex(x) + ' \\end{gathered}', true);
    }
    return h;
  }
  $('lab-size').addEventListener('change', () => makeLab());
  $('lab-random').addEventListener('click', () => {
    const { m, n } = size();
    if (m === n) { const t = L.makeSolveTask(n); makeLab(t.A.map((r, i) => r.concat([t.b[i]]).map(L.val))); return; }
    makeLab(Array.from({ length: m }, () => Array.from({ length: n + 1 }, () => L.rnd(-4, 5))));
  });
  const labRun = (fn) => () => {
    const r = readLab();
    if (r.error) { $('lab-out').innerHTML = '<p class="preview error">' + r.error + '</p>'; r.el.focus(); return; }
    show($('lab-out'), fn(r.A, r.b));
  };
  $('lab-gauss').addEventListener('click', labRun(gaussHtml));
  $('lab-cramer').addEventListener('click', labRun(cramerHtml));

  // ---------- 7. Тренажёр ----------
  const TF = [
    { html: 'У линейной системы может быть ровно два решения.', truth: false, why: 'Если решений два, то и вся прямая через них — решения (см. §1). Бывает 0, 1 или бесконечно много.' },
    { html: 'Однородная система \\(Ax = 0\\) всегда совместна.', truth: true, why: 'Нулевой вектор \\(x = 0\\) всегда решение.' },
    { html: 'Если уравнений меньше, чем неизвестных, то решений бесконечно много.', truth: false, why: 'Решений может не быть вовсе: \\(x + y + z = 1,\\ x + y + z = 2\\). Верно лишь: если решения есть, то их бесконечно много.' },
    { html: 'Если \\(\\det A \\ne 0\\), то система \\(Ax = b\\) имеет единственное решение при любом \\(b\\).', truth: true, why: 'Тогда существует \\(A^{-1}\\), и \\(x = A^{-1}b\\) — единственное решение.' },
    { html: 'Умножение уравнения на \\(0\\) — допустимое преобразование системы.', truth: false, why: 'Уравнение превращается в \\(0 = 0\\), информация теряется, и решений может стать больше.' },
    { html: 'Система \\(Ax = b\\) совместна тогда и только тогда, когда \\(\\operatorname{rang} A = \\operatorname{rang}(A \\mid b)\\).', truth: true, why: 'Это и есть теорема Кронекера — Капелли.' },
    { html: 'Если \\(\\Delta = \\det A = 0\\), то решений нет.', truth: false, why: 'При \\(\\Delta = 0\\) решений либо нет, либо бесконечно много — например, совпадающие прямые.' },
    { html: 'Если \\(x_1\\) и \\(x_2\\) — решения \\(Ax = 0\\), то и \\(x_1 + x_2\\) — решение.', truth: true, why: '\\(A(x_1 + x_2) = Ax_1 + Ax_2 = 0 + 0 = 0\\). Решения однородной системы образуют подпространство.' },
    { html: 'Если \\(x_1\\) и \\(x_2\\) — решения \\(Ax = b\\), где \\(b \\ne 0\\), то и \\(x_1 + x_2\\) — решение.', truth: false, why: '\\(A(x_1 + x_2) = 2b \\ne b\\). Зато разность \\(x_1 - x_2\\) — решение однородной системы.' },
    { html: 'В совместной системе число свободных неизвестных равно \\(n - \\operatorname{rang} A\\).', truth: true, why: 'Ведущих (базисных) неизвестных столько, сколько ступенек, то есть \\(\\operatorname{rang} A\\); остальные свободные.' },
  ];
  const stats = U.trainerStats('msh.slae.stats', $('stats'));
  let mode = 'solve2', task = null, done = false, helped = false;
  const fb = (kind, html) => U.feedback($('feedback'), kind, html);
  function record(ok) { if (done) return; if (ok) done = true; stats.record(ok, helped); }
  function varsForm(labels, check) {
    $('area').innerHTML = '<form id="tr-form" autocomplete="off"><div class="vars">' + labels.map((l, i) => '<label>' + tex(l + ' =') + '<input id="tr-v' + i + '" inputmode="text" spellcheck="false"></label>').join('') + '</div><button class="primary" type="submit">Проверить</button></form>';
    $('tr-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const vals = [];
      for (let i = 0; i < labels.length; i++) {
        const f = L.parseF($('tr-v' + i).value);
        if (!f) { fb('bad', 'Поле ' + tex(labels[i]) + ': нужно число (например 3, -2 или 1/2).'); $('tr-v' + i).focus(); return; }
        vals.push(f);
      }
      const res = check(vals);
      record(res.ok);
      fb(res.ok ? 'good' : 'bad', res.message);
    });
  }
  function newTask() {
    mode = $('mode').value;
    done = false; helped = false;
    fb('', ''); $('solution').innerHTML = ''; $('area').innerHTML = '';
    if (mode === 'solve2' || mode === 'solve3') {
      const n = mode === 'solve2' ? 2 : 3;
      task = L.makeSolveTask(n);
      $('task').innerHTML = 'Решите систему:' + tex(L.systemTex(task.A, task.b), true);
      varsForm(task.x.map((_, j) => L.varName(j, n)), (v) => {
        if (v.every((x, j) => L.eq(x, task.x[j]))) return { ok: true, message: 'Верно!' };
        const bad = task.A.map((r, i) => i).filter((i) => !L.eq(task.A[i].reduce((s, a, j) => L.add(s, L.mul(a, v[j])), F(0)), task.b[i]));
        return { ok: false, message: 'Подставьте ответ: не выполняется уравнение ' + bad.map((i) => i + 1).join(', ') + '. Проверьте вычисления (особенно знаки).' };
      });
    } else if (mode === 'classify') {
      task = L.makeClassifyTask();
      $('task').innerHTML = 'Сколько решений у системы?' + tex(L.systemTex(task.A, task.b), true);
      const kinds = ['unique', 'many', 'none'];
      U.choices($('area'), ['Одно', 'Бесконечно много', 'Нет решений'], (i, btn) => {
        const ok = kinds[i] === task.kind;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) helped = true;
        record(ok);
        const s = L.solve(task.A, task.b);
        const why = 'Ранги: \\(\\operatorname{rang} A = ' + s.rankA + '\\), \\(\\operatorname{rang}(A \\mid b) = ' + s.rankAug + '\\). ';
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет. ') + why + (ok ? '' : 'Нажмите «Показать решение», чтобы увидеть шаги.'));
      });
    } else if (mode === 'cramer') {
      task = L.makeSolveTask(2);
      $('task').innerHTML = 'Найдите определители Крамера для системы:' + tex(L.systemTex(task.A, task.b), true);
      const [[a, b], [c, d]] = task.A, [e, f] = task.b;
      const D = L.sub(L.mul(a, d), L.mul(b, c)), Dx = L.sub(L.mul(e, d), L.mul(b, f)), Dy = L.sub(L.mul(a, f), L.mul(e, c));
      task.dets = [D, Dx, Dy];
      varsForm(['\\Delta', '\\Delta_x', '\\Delta_y'], (v) => {
        const wrong = v.map((x, i) => (L.eq(x, task.dets[i]) ? null : ['\\(\\Delta\\)', '\\(\\Delta_x\\)', '\\(\\Delta_y\\)'][i])).filter(Boolean);
        if (!wrong.length) return { ok: true, message: 'Верно! Тогда \\(x = \\Delta_x / \\Delta = ' + L.ftex(task.x[0]) + '\\), \\(y = \\Delta_y / \\Delta = ' + L.ftex(task.x[1]) + '\\).' };
        return { ok: false, message: 'Неверно: ' + wrong.join(', ') + '. Напоминание: в \\(\\Delta_x\\) столбец коэффициентов при \\(x\\) заменяется столбцом свободных членов.' };
      });
    } else {
      task = L.pick(TF);
      $('task').innerHTML = 'Верно ли утверждение?<p>' + task.html + '</p>';
      U.choices($('area'), ['Верно', 'Неверно'], (i, btn) => {
        const ok = (i === 0) === task.truth;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) helped = true;
        record(ok);
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, утверждение ' + (task.truth ? 'верно' : 'неверно') + '. ') + task.why);
      });
    }
    renderMath($('task')); renderMath($('area'));
  }
  function solution() {
    if (!task) return;
    helped = true;
    if (mode === 'tf') { fb('hint', 'Утверждение <b>' + (task.truth ? 'верно' : 'неверно') + '</b>. ' + task.why); return; }
    let h;
    if (mode === 'cramer') h = cramerHtml(task.A, task.b);
    else h = gaussHtml(task.A, task.b);
    show($('solution'), '<h3>Решение</h3>' + h);
  }
  $('solution-btn').addEventListener('click', solution);
  $('new-task-btn').addEventListener('click', newTask);
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => { updateLines(); makeLab(); newTask(); });
})();
