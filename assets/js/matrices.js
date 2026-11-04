// Интерфейс темы «Матрицы и определители»: площадь, лаборатория, тренажёр.
(function () {
  'use strict';
  const L = window.Lin, U = window.LinUI;
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const num = (v) => String(+v.toFixed(2)).replace('.', '{,}');

  // ---------- 2. Определитель как площадь ----------
  const plot = new Plot($('area-plot'));
  plot.setView({ xMin: -8, xMax: 8, yMin: -6, yMax: 6, equal: true });
  function updateArea() {
    const g = (id) => { const v = +$(id).value; $(id + '-out').textContent = String(v).replace('.', ','); return v; };
    const a = g('a11'), c = g('a21'), b = g('a12'), d = g('a22');
    const D = a * d - b * c;
    const col = D > 0 ? css('--curve', '#2f6fdb') : D < 0 ? css('--bad', '#c0392b') : css('--muted', '#888');
    const shapes = Math.abs(D) > 1e-12 ? [{ pts: [[0, 0], [a, c], [a + b, c + d], [b, d]], fill: col, alpha: 0.22, stroke: col }] : [];
    const lines = [
      { x1: 0, y1: 0, x2: a, y2: c, color: css('--curve', '#2f6fdb'), width: 3, solid: true },
      { x1: 0, y1: 0, x2: b, y2: d, color: css('--tangent', '#e67e22'), width: 3, solid: true },
      { x1: a, y1: c, x2: a + b, y2: c + d, color: col },
      { x1: b, y1: d, x2: a + b, y2: c + d, color: col },
    ];
    plot.draw([], [{ x: a, y: c, label: 'u = (a; c)' }, { x: b, y: d, label: 'v = (b; d)' }], lines, [], shapes);
    let txt = tex('\\det = ad - bc = ' + num(a) + ' \\cdot ' + (d < 0 ? '(' + num(d) + ')' : num(d)) + ' - ' + (b < 0 ? '(' + num(b) + ')' : num(b)) + ' \\cdot ' + (c < 0 ? '(' + num(c) + ')' : num(c)) + ' = ' + num(D)) + '<br>';
    if (Math.abs(D) < 1e-12) txt += 'Векторы <b>коллинеарны</b>: параллелограмм сплющился в отрезок, площадь 0, обратной матрицы нет.';
    else txt += 'Площадь параллелограмма: ' + tex('|\\det| = ' + num(Math.abs(D))) + '. Поворот от \\(u\\) к \\(v\\) — ' + (D > 0 ? '<b>против</b> часовой стрелки (знак «+»).' : '<b>по</b> часовой стрелке (знак «−»).');
    $('area-out').innerHTML = txt;
    renderMath($('area-out'));
  }
  ['a11', 'a21', 'a12', 'a22'].forEach((id) => $(id).addEventListener('input', updateArea));

  // ---------- 5. Лаборатория ----------
  const SAMPLES = {
    2: [[2, 1], [5, 3]],
    3: [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]],
    4: [[1, 2, 0, 1], [0, 1, 3, 0], [2, 0, 1, 1], [1, 1, 1, 2]],
  };
  let labGrid = null;
  function makeLab(values) {
    const n = +$('lab-n').value;
    labGrid = U.grid($('lab-grid'), n, n, { id: 'lab', values: L.M(values || SAMPLES[n]) });
    $('lab-out').innerHTML = '';
  }
  function labMatrix() {
    const r = labGrid.get();
    if (r.error) { $('lab-out').innerHTML = '<p class="preview error">' + r.error + '</p>'; r.el.focus(); return null; }
    return r.M;
  }
  function show(html) { $('lab-out').innerHTML = html; renderMath($('lab-out')); if (window.fitMath) window.fitMath($('lab-out')); }
  function sarrusHtml(A) {
    const a = (i, j) => A[i][j];
    const prod = (t) => t.reduce((s, [i, j]) => L.mul(s, a(i, j)), L.F(1));
    const plus = [[[0, 0], [1, 1], [2, 2]], [[0, 1], [1, 2], [2, 0]], [[0, 2], [1, 0], [2, 1]]];
    const minus = [[[0, 2], [1, 1], [2, 0]], [[0, 0], [1, 2], [2, 1]], [[0, 1], [1, 0], [2, 2]]];
    const term = (t) => t.map(([i, j]) => { const x = a(i, j); return x.n < 0 ? '(' + L.ftex(x) + ')' : L.ftex(x); }).join(' \\cdot ');
    let total = L.F(0);
    plus.forEach((t) => { total = L.add(total, prod(t)); });
    minus.forEach((t) => { total = L.sub(total, prod(t)); });
    return '<p>Проверка по правилу Саррюса:</p>' + tex('\\begin{aligned} &' + plus.map(term).join(' + ') + ' \\\\ &- ' + minus.map(term).join(' - ') + ' = ' + L.ftex(total) + '. \\end{aligned}', true);
  }
  function detExplain(A, res) {
    const n = A.length, g = res.gauss;
    let h = '<h3>Определитель методом Гаусса</h3>';
    h += g.steps.length ? U.stepsHtml(A, g.steps) : '<p>Матрица уже треугольная.</p>' + tex(L.mtex(A), true);
    if (g.rank < n) {
      h += '<p>На диагонали ступенчатой матрицы появился ноль (строка обнулилась) — значит, строки линейно зависимы и</p>' + tex('\\det A = 0.', true);
    } else {
      const diag = res.diag.map((x) => (x.n < 0 ? '(' + L.ftex(x) + ')' : L.ftex(x))).join(' \\cdot ');
      h += '<p>Прибавление строк определитель не меняет' + (g.swaps === 1 ? ', а перестановка строк меняет знак' : g.swaps ? ', а каждая перестановка строк (их ' + g.swaps + ') меняет знак' : '') + '. Определитель треугольной матрицы — произведение диагонали:</p>';
      h += tex('\\det A = ' + (g.swaps % 2 ? '-' : '') + (g.swaps % 2 ? '\\left(' + diag + '\\right)' : diag) + ' = ' + L.ftex(res.value), true);
    }
    if (n === 2) h += '<p>Проверка по формуле: ' + tex('ad - bc = ' + L.ftex(L.sub(L.mul(A[0][0], A[1][1]), L.mul(A[0][1], A[1][0])))) + '.</p>';
    if (n === 3) h += sarrusHtml(A);
    return h;
  }
  $('lab-n').addEventListener('change', () => makeLab());
  $('lab-random').addEventListener('click', () => {
    const n = +$('lab-n').value;
    const v = Array.from({ length: n }, () => Array.from({ length: n }, () => L.rnd(-4, 5)));
    makeLab(v);
  });
  $('lab-det').addEventListener('click', () => {
    const A = labMatrix(); if (!A) return;
    show(detExplain(A, L.det(A)));
  });
  $('lab-inv').addEventListener('click', () => {
    const A = labMatrix(); if (!A) return;
    const n = A.length, res = L.inverse(A);
    const start = A.map((r, i) => r.concat(L.ident(n)[i]));
    let h = '<h3>Обратная матрица методом Гаусса — Жордана</h3><p>Записываем \\((A \\mid E)\\) и приводим левую часть к единичной.</p>';
    h += U.stepsHtml(start, res.gauss.steps, n);
    if (res.singular) h += '<p class="feedback bad">Левую часть не удалось привести к \\(E\\): появилась нулевая строка. Матрица <b>вырожденная</b> (\\(\\det A = 0\\)), обратной нет.</p>';
    else {
      h += '<p>Слева получилась \\(E\\), значит, справа стоит ответ:</p>' + tex('A^{-1} = ' + L.mtex(res.inv), true);
      h += '<p class="small-note">Проверка: ' + (L.matEq(L.matMul(A, res.inv), L.ident(n)) ? tex('A A^{-1} = E') + ' — сходится.' : 'не сошлось.') + '</p>';
    }
    show(h);
  });
  $('lab-rank').addEventListener('click', () => {
    const A = labMatrix(); if (!A) return;
    const g = L.gauss(A);
    let h = '<h3>Ранг</h3><p>Приводим к ступенчатому виду и считаем ненулевые строки.</p>';
    h += g.steps.length ? U.stepsHtml(A, g.steps) : tex(L.mtex(A), true);
    h += tex('\\operatorname{rang} A = ' + g.rank, true);
    if (g.rank < A.length) h += '<p class="small-note">Ранг меньше размера — строки линейно зависимы, \\(\\det A = 0\\).</p>';
    show(h);
  });

  // ---------- 7. Тренажёр ----------
  const TF = [
    { tex: 'AB = BA \\text{ для любых квадратных } A, B', truth: false, why: 'Произведение некоммутативно: пример в разделе 1. Равенство выполнено лишь для отдельных пар (например, \\(B = E\\) или \\(B = A^{-1}\\)).' },
    { tex: '\\det(AB) = \\det A \\cdot \\det B', truth: true, why: 'Коэффициенты растяжения площадей перемножаются: сначала замена \\(B\\), затем \\(A\\).' },
    { tex: '\\det(A + B) = \\det A + \\det B', truth: false, why: 'Пример: \\(A = B = E_2\\): \\(\\det(2E) = 4\\), а \\(\\det E + \\det E = 2\\).' },
    { tex: '\\text{Перестановка двух строк меняет знак } \\det', truth: true, why: 'Это одно из основных свойств: ориентация меняется на противоположную.' },
    { tex: '\\det(kA) = k \\det A \\text{ для матрицы } n \\times n', truth: false, why: 'Множитель \\(k\\) выносится из каждой из \\(n\\) строк: \\(\\det(kA) = k^n \\det A\\).' },
    { tex: 'A^{-1} \\text{ существует} \\iff \\det A \\ne 0', truth: true, why: 'Если \\(\\det A = 0\\), пространство сплющивается и замену не обратить; если \\(\\det A \\ne 0\\), обратная даётся формулой через алгебраические дополнения.' },
    { tex: '(AB)^{-1} = A^{-1} B^{-1}', truth: false, why: 'Порядок меняется: \\((AB)^{-1} = B^{-1} A^{-1}\\). Проверьте: \\(AB \\cdot B^{-1} A^{-1} = E\\).' },
    { tex: '\\det A^T = \\det A', truth: true, why: 'Строки и столбцы в определителе равноправны, поэтому все свойства для строк верны и для столбцов.' },
    { tex: 'AB = 0 \\Rightarrow A = 0 \\text{ или } B = 0', truth: false, why: 'Контрпример: \\(\\begin{pmatrix} 0 & 1 \\\\ 0 & 0 \\end{pmatrix}^2 = 0\\). У матриц бывают «делители нуля».' },
    { tex: '\\text{Если в матрице две равные строки, то } \\det A = 0', truth: true, why: 'Переставив эти строки, получим ту же матрицу, но определитель сменит знак: \\(D = -D\\), значит, \\(D = 0\\).' },
    { tex: '\\operatorname{rang} A = \\operatorname{rang} A^T', truth: true, why: 'Ранг по строкам равен рангу по столбцам — одна из основных теорем линейной алгебры.' },
    { tex: '\\det(A^{-1}) = \\frac{1}{\\det A}', truth: true, why: 'Из \\(A A^{-1} = E\\): \\(\\det A \\cdot \\det A^{-1} = \\det E = 1\\).' },
  ];
  const stats = U.trainerStats('msh.matrices.stats', $('stats'));
  let mode = 'det2', task = null, done = false, helped = false;
  const fb = (kind, html) => U.feedback($('feedback'), kind, html);
  function record(ok) { if (done) return; if (ok) done = true; stats.record(ok, helped); }

  function numberForm(label, check) {
    $('area').innerHTML = '<form id="tr-form" autocomplete="off"><div class="expr-input"><label for="tr-in" style="font-weight:600">' + label + '</label><input id="tr-in" inputmode="text" placeholder="например: -7 или 3/2" spellcheck="false"><button class="primary" type="submit">Проверить</button></div></form>';
    renderMath($('area'));
    $('tr-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = L.parseF($('tr-in').value);
      if (!f) { fb('bad', 'Введите число: целое, дробь 3/4 или десятичное 0,5.'); return; }
      const res = check(f);
      record(res.ok);
      fb(res.ok ? 'good' : 'bad', res.message);
    });
  }
  function gridForm(rows, cols, label, check) {
    $('area').innerHTML = '<form id="tr-form" autocomplete="off"><div style="font-weight:600">' + label + '</div><div id="tr-grid"></div><button class="primary" type="submit">Проверить</button></form>';
    renderMath($('area'));
    const g = U.grid($('tr-grid'), rows, cols, { id: 'tr' });
    $('tr-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const r = g.get();
      if (r.error) { fb('bad', r.error); r.el.focus(); return; }
      const res = check(r.M);
      record(res.ok);
      fb(res.ok ? 'good' : 'bad', res.message);
    });
  }
  const wrongCells = (X, Y) => {
    const out = [];
    X.forEach((r, i) => r.forEach((x, j) => { if (!L.eq(x, Y[i][j])) out.push('(' + (i + 1) + ', ' + (j + 1) + ')'); }));
    return out;
  };

  function newTask() {
    mode = $('mode').value;
    done = false; helped = false;
    fb('', ''); $('solution').innerHTML = ''; $('area').innerHTML = '';
    if (mode === 'det2' || mode === 'det3') {
      task = L.makeDetTask(mode === 'det2' ? 2 : 3);
      $('task').innerHTML = 'Вычислите определитель:' + tex(L.dtex(task.A), true);
      numberForm(tex('\\det A ='), (f) => {
        if (L.eq(f, task.answer)) return { ok: true, message: 'Верно! \\(\\det A = ' + L.ftex(task.answer) + '\\).' };
        if (L.eq(f, L.neg(task.answer)) && !L.isZero(f)) return { ok: false, message: 'Знак не тот. Проверьте, какие произведения идут со знаком «−»' + (mode === 'det3' ? ' (побочная диагональ и параллельные ей тройки)' : ' (\\(bc\\) вычитается)') + '.' };
        return { ok: false, message: 'Пока нет. ' + (mode === 'det2' ? 'Формула: \\(ad - bc\\).' : 'Сравните с правилом Саррюса или приведите матрицу к треугольному виду.') };
      });
    } else if (mode === 'prod') {
      task = L.makeProductTask();
      const r = task.answer.length, c = task.answer[0].length;
      $('task').innerHTML = 'Найдите произведение:' + tex(L.mtex(task.A) + ' \\cdot ' + L.mtex(task.B), true) + '<span class="small-note">Размер ответа: ' + r + ' × ' + c + ' (строк столько же, сколько у первой матрицы, столбцов — как у второй).</span>';
      gridForm(r, c, tex('AB ='), (M) => {
        if (L.matEq(M, task.answer)) return { ok: true, message: 'Верно!' };
        const w = wrongCells(M, task.answer);
        if (task.A.length === task.B[0].length && task.A[0].length === task.B.length && task.A.length === task.A[0].length && L.matEq(M, L.matMul(task.B, task.A))) return { ok: false, message: 'Вы посчитали \\(BA\\), а нужно \\(AB\\): строки первой матрицы на столбцы второй.' };
        return { ok: false, message: 'Ошибка в элемент' + (w.length > 1 ? 'ах ' : 'е ') + w.join(', ') + '. Элемент \\((i, j)\\) — это строка \\(i\\) матрицы \\(A\\), умноженная на столбец \\(j\\) матрицы \\(B\\).' };
      });
    } else if (mode === 'inv') {
      task = L.makeInverseTask();
      $('task').innerHTML = 'Найдите обратную матрицу:' + tex('A = ' + L.mtex(task.A), true) + '<span class="small-note">Дроби вводите так: 3/2, -1/3.</span>';
      gridForm(2, 2, tex('A^{-1} ='), (M) => {
        if (L.matEq(M, task.answer)) return { ok: true, message: 'Верно! Проверка: \\(A \\cdot A^{-1} = E\\).' };
        const [[a, b], [c, d]] = task.A, D = L.det(task.A).value;
        const adj = [[d, L.neg(b)], [L.neg(c), a]];
        if (L.matEq(M, adj) && !L.eq(D, L.F(1))) return { ok: false, message: 'Вы нашли присоединённую матрицу, но забыли разделить на \\(\\det A = ' + L.ftex(D) + '\\).' };
        if (L.matEq(M, [[d, b], [c, a]].map((r) => r.map((x) => L.div(x, D))))) return { ok: false, message: 'Почти: у элементов \\(b\\) и \\(c\\) нужно сменить знак.' };
        return { ok: false, message: 'Пока нет. Умножьте \\(A\\) на свой ответ — должна получиться \\(E\\). Формула: \\(\\frac{1}{ad - bc}\\begin{pmatrix} d & -b \\\\ -c & a \\end{pmatrix}\\).' };
      });
    } else if (mode === 'rank') {
      task = L.makeRankTask();
      $('task').innerHTML = 'Найдите ранг матрицы:' + tex(L.mtex(task.A), true);
      numberForm(tex('\\operatorname{rang} A ='), (f) => (f.d === 1 && f.n === task.answer
        ? { ok: true, message: 'Верно!' }
        : { ok: false, message: 'Пока нет. Приведите матрицу к ступенчатому виду и посчитайте ненулевые строки.' }));
    } else {
      task = L.pick(TF);
      $('task').innerHTML = 'Верно ли утверждение?' + tex(task.tex, true);
      U.choices($('area'), ['Верно', 'Неверно'], (i, b) => {
        const ok = (i === 0) === task.truth;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) helped = true;
        record(ok);
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, утверждение ' + (task.truth ? 'верно' : 'неверно') + '. ') + task.why);
      });
    }
    renderMath($('task'));
    if (window.fitMath) window.fitMath($('task'));
  }
  function solution() {
    if (!task) return;
    helped = true;
    let h = '<h3>Решение</h3>';
    if (mode === 'tf') { fb('hint', 'Утверждение <b>' + (task.truth ? 'верно' : 'неверно') + '</b>. ' + task.why); return; }
    if (mode === 'det2') {
      const [[a, b], [c, d]] = task.A;
      const p = (x) => (x.n < 0 ? '(' + L.ftex(x) + ')' : L.ftex(x));
      h += tex('\\det A = ad - bc = ' + p(a) + ' \\cdot ' + p(d) + ' - ' + p(b) + ' \\cdot ' + p(c) + ' = ' + L.ftex(task.answer), true);
    } else if (mode === 'det3') h += detExplain(task.A, L.det(task.A));
    else if (mode === 'prod') {
      const A = task.A, B = task.B;
      const p = (x) => (x.n < 0 ? '(' + L.ftex(x) + ')' : L.ftex(x));
      const rows = task.answer.map((r, i) => r.map((x, j) => 'c_{' + (i + 1) + (j + 1) + '} &= ' + A[i].map((a, k) => p(a) + ' \\cdot ' + p(B[k][j])).join(' + ') + ' = ' + L.ftex(x)).join(' \\\\ '));
      h += '<p>Каждый элемент — строка на столбец:</p>' + tex('\\begin{aligned} ' + rows.join(' \\\\ ') + ' \\end{aligned}', true) + tex('AB = ' + L.mtex(task.answer), true);
    } else if (mode === 'inv') {
      const [[a, b], [c, d]] = task.A, D = L.det(task.A).value;
      h += tex('\\det A = ' + L.ftex(D) + ' \\ne 0', true) + tex('A^{-1} = \\frac{1}{' + L.ftex(D) + '}' + L.mtex([[d, L.neg(b)], [L.neg(c), a]]) + ' = ' + L.mtex(task.answer), true);
    } else if (mode === 'rank') {
      const g = L.gauss(task.A);
      h += U.stepsHtml(task.A, g.steps) + '<p>Ненулевых строк: ' + g.rank + '.</p>' + tex('\\operatorname{rang} A = ' + g.rank, true);
    }
    $('solution').innerHTML = h;
    renderMath($('solution'));
    if (window.fitMath) window.fitMath($('solution'));
  }
  $('solution-btn').addEventListener('click', solution);
  $('new-task-btn').addEventListener('click', newTask);
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => { updateArea(); makeLab(); newTask(); });
})();
