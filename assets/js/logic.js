// Интерфейс темы «Логика, кванторы и доказательства».
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const b01 = (v) => (v ? '1' : '0');

  // Таблица истинности: formulas — деревья, labels — TeX-заголовки
  function tableHtml(formulas, labels, highlightDiff) {
    const { names, rows } = Logic.truthTable(formulas);
    let h = '<div class="tt-wrap"><table class="num-table tt"><tr>';
    h += names.map((n) => '<th>' + tex(n) + '</th>').join('');
    h += labels.map((l) => '<th class="tt-f">' + tex(l) + '</th>').join('') + '</tr>';
    for (const r of rows) {
      const diff = highlightDiff && r.values.some((v) => v !== r.values[0]);
      h += '<tr' + (diff ? ' class="diff"' : '') + '>';
      h += names.map((n) => '<td>' + b01(r.env[n]) + '</td>').join('');
      h += r.values.map((v) => '<td class="tt-f"><b>' + b01(v) + '</b></td>').join('') + '</tr>';
    }
    return h + '</table></div>';
  }
  // Длинные утверждения с кванторами на узком экране переносим: кванторы — первая строка, условие — вторая
  function disp(t) {
    if (window.innerWidth >= 700) return tex(t, true);
    let k = t.indexOf('\\bigr) \\lor \\bigl(');
    if (k < 0) k = t.indexOf('\\bigr) \\land \\bigl(');
    let lines;
    if (k >= 0) lines = [t.slice(0, k + 6), t.slice(k + 7)];
    else {
      const c = t.lastIndexOf('\\colon\\; ');
      lines = c >= 0 ? [t.slice(0, c + 6), t.slice(c + 9)] : [t];
    }
    return tex(lines.length > 1 ? '\\begin{gathered}' + lines.join(' \\\\ ') + '\\end{gathered}' : t, true);
  }
  const envText = (env) => Object.keys(env).sort().map((k) => k + ' = ' + b01(env[k])).join(', ');

  // ---------- 1. Таблица связок ----------
  (function connectives() {
    const fs = ['!p', 'p & q', 'p | q', 'p => q', 'p <=> q'].map(Logic.parse);
    const labels = fs.map(Logic.tex);
    $('connectives').innerHTML =
      tableHtml(fs, labels, false) +
      '<p class="small-note" style="margin-bottom:0">\\(\\neg p\\) — «не \\(p\\)»; \\(p \\land q\\) — «\\(p\\) и \\(q\\)»; \\(p \\lor q\\) — «\\(p\\) или \\(q\\)» (хотя бы одно, возможно оба); \\(p \\Rightarrow q\\) — «если \\(p\\), то \\(q\\)», ложно только при \\(p = 1,\\ q = 0\\); \\(p \\Leftrightarrow q\\) — «\\(p\\) тогда и только тогда, когда \\(q\\)».</p>';
  })();

  // ---------- 2. Лаборатория ----------
  function labRun() {
    const out = $('lab-out');
    const fs = $('lab-f').value.trim(), gs = $('lab-g').value.trim();
    let f, g = null;
    try {
      f = Logic.parse(fs);
      if (gs) g = Logic.parse(gs);
    } catch (e) {
      out.innerHTML = '<p class="preview error">' + esc(e.message) + '</p>';
      return;
    }
    const nVars = Logic.truthTable(g ? [f, g] : [f]).names.length;
    if (nVars > 6) { out.innerHTML = '<p class="preview error">Слишком много переменных (больше 6): таблица выйдет на ' + (1 << nVars) + ' строк.</p>'; return; }
    const KIND = {
      tautology: '<b>тождественно истинна</b> (тавтология): верна при любых значениях переменных',
      contradiction: '<b>тождественно ложна</b> (противоречие)',
      satisfiable: '<b>выполнима</b>: истинна при одних значениях и ложна при других',
    };
    let h = '<p>' + tex('F = ' + Logic.tex(f)) + (g ? ', ' + tex('G = ' + Logic.tex(g)) : '') + '</p>';
    h += tableHtml(g ? [f, g] : [f], g ? ['F', 'G'] : ['F'], !!g);
    h += '<p>Формула \\(F\\) ' + KIND[Logic.classify(f)] + '.</p>';
    if (g) {
      const eq = Logic.equivalent(f, g);
      h += eq.equal
        ? '<p class="feedback good">\\(F \\equiv G\\): столбцы совпадают во всех строках — формулы равносильны.</p>'
        : '<p class="feedback bad">\\(F \\not\\equiv G\\): при ' + esc(envText(eq.counter)) + ' получаем \\(F = ' + b01(Logic.evaluate(f, eq.counter)) + '\\), а \\(G = ' + b01(Logic.evaluate(g, eq.counter)) + '\\). Строки, где они различаются, выделены.</p>';
    }
    out.innerHTML = h;
    renderMath(out);
  }
  let labTimer = null;
  ['lab-f', 'lab-g'].forEach((id) => $(id).addEventListener('input', () => { clearTimeout(labTimer); labTimer = setTimeout(labRun, 200); }));

  // ---------- 3. Законы: кнопка «Проверить» ----------
  document.querySelectorAll('#laws-list li').forEach((li) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Проверить в лаборатории';
    btn.style.marginTop = '6px';
    btn.addEventListener('click', () => {
      $('lab-f').value = li.dataset.f;
      $('lab-g').value = li.dataset.g;
      labRun();
      $('lab').scrollIntoView({ behavior: 'smooth' });
    });
    li.appendChild(document.createElement('br'));
    li.appendChild(btn);
  });

  // ---------- 5. Построение отрицания по шагам ----------
  const LABELS = [
    'lim aₙ = a (предел последовательности)',
    'f ограничена на X',
    'f строго возрастает на X',
    'f непрерывна в точке x₀',
    'f равномерно непрерывна на X',
    '{aₙ} фундаментальна (Коши)',
    'lim aₙ = +∞',
    's = sup A',
    'f периодична',
    'f инъективна',
    'f сюръективна',
    '{aₙ} не ограничена сверху',
  ];
  const negSel = $('neg-sel');
  Logic.STATEMENTS.forEach((st, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = LABELS[i] || 'Утверждение ' + (i + 1);
    negSel.appendChild(o);
  });
  let neg = null, negShown = 0;
  function negSetup() {
    const st = Logic.STATEMENTS[+negSel.value];
    neg = { st, steps: Logic.negationSteps(st.s).steps };
    negShown = 1;
    $('neg-statement').innerHTML = tex(st.name) + ':' + disp(Logic.qtex(st.s));
    renderMath($('neg-statement'));
    negRender();
  }
  function negRender() {
    const items = neg.steps.slice(0, negShown).map((s, i) => '<li><div>' + s.rule + '</div>' + disp((i === 0 ? '' : '\\equiv ') + s.tex) + '</li>');
    $('neg-steps').innerHTML = items.join('');
    const done = negShown >= neg.steps.length;
    $('neg-next').disabled = done;
    $('neg-meaning').innerHTML = done ? '<p class="feedback good">Готово. Смысл отрицания: ' + neg.st.meaning + '</p>' : '';
    renderMath($('neg-steps'));
    renderMath($('neg-meaning'));
  }
  negSel.addEventListener('change', negSetup);
  $('neg-next').addEventListener('click', () => { negShown = Math.min(negShown + 1, neg.steps.length); negRender(); });
  $('neg-all').addEventListener('click', () => { negShown = neg.steps.length; negRender(); });
  $('neg-reset').addEventListener('click', () => { negShown = 1; negRender(); });

  // ---------- 7. Тренажёр ----------
  const STATS_KEY = 'msh.logic.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => {
    $('stats').innerHTML = 'С первой попытки: <b>' + stats.solved + '</b> из ' + stats.attempts + ' · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
  };

  let task = null, mode = 'neg', answered = false, firstTry = true;

  function record(ok) {
    if (answered) return;
    answered = true;
    stats.attempts++;
    if (ok && firstTry) {
      stats.solved++;
      stats.streak++;
      stats.best = Math.max(stats.best, stats.streak);
    } else stats.streak = 0;
    saveStats();
    renderStats();
  }

  function setFeedback(kind, html) {
    const fb = $('feedback');
    fb.className = 'feedback' + (kind ? ' ' + kind : '');
    fb.innerHTML = html;
    renderMath(fb);
  }

  function choiceButtons(options, onPick) {
    const box = $('choices');
    box.innerHTML = '';
    options.forEach((opt, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.innerHTML = opt.html;
      b.addEventListener('click', () => onPick(i, b));
      box.appendChild(b);
    });
    renderMath(box);
  }

  function newTask() {
    mode = $('mode').value;
    answered = false;
    firstTry = true;
    setFeedback('', '');
    $('solution').innerHTML = '';
    if (mode === 'neg') {
      task = Logic.makeNegTask();
      $('task').innerHTML = 'Определение ' + tex(task.name) + ':' + disp(task.statementTex) + 'Выберите его <b>отрицание</b>:';
      choiceButtons(task.options.map((o) => ({ html: tex(o.tex) })), (i, btn) => {
        const o = task.options[i];
        if (o.ok) {
          btn.classList.add('correct');
          record(true);
          setFeedback('good', 'Верно! Смысл отрицания: ' + task.meaning);
        } else {
          btn.classList.add('wrong');
          firstTry = false;
          setFeedback('bad', o.why + ' Попробуйте ещё раз.');
        }
      });
    } else if (mode === 'eq') {
      task = Logic.makeEqTask();
      $('task').innerHTML = 'Равносильны ли формулы?' + tex(Logic.tex(task.f) + ' \\quad \\text{и} \\quad ' + Logic.tex(task.g), true);
      choiceButtons([{ html: 'Равносильны' }, { html: 'Не равносильны' }], (i, btn) => {
        const ok = (i === 0) === task.equal;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) firstTry = false;
        record(ok);
        showEqSolution(ok);
      });
    } else {
      task = Logic.makeTFTask();
      $('task').innerHTML = 'Верно ли утверждение?' + tex(task.tex, true);
      choiceButtons([{ html: 'Верно' }, { html: 'Неверно' }], (i, btn) => {
        const ok = (i === 0) === task.truth;
        btn.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) firstTry = false;
        record(ok);
        setFeedback(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, утверждение ' + (task.truth ? 'верно' : 'неверно') + '. ') + task.why);
      });
    }
    renderMath($('task'));
  }

  function showEqSolution(ok) {
    const head = ok ? 'Верно! ' : 'Нет. ';
    const verdict = task.equal ? 'Формулы равносильны: столбцы совпадают во всех строках.' : 'Формулы не равносильны: при ' + esc(envText(task.counter)) + ' они принимают разные значения (строки выделены).';
    setFeedback(ok ? 'good' : 'bad', head + verdict + ' ' + task.note);
    $('solution').innerHTML = tableHtml([task.f, task.g], ['F', 'G'], true) +
      '<p class="small-note">' + tex('F = ' + Logic.tex(task.f)) + ', ' + tex('G = ' + Logic.tex(task.g)) + '</p>';
    renderMath($('solution'));
  }

  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    firstTry = false;
    if (mode === 'neg') {
      const items = task.steps.map((s, i) => '<li><div>' + s.rule + '</div>' + disp((i ? '\\equiv ' : '') + s.tex) + '</li>');
      $('solution').innerHTML = '<h3>Отрицание по шагам</h3><ol class="steps-list">' + items.join('') + '</ol><p>Смысл: ' + task.meaning + '</p>';
      renderMath($('solution'));
    } else if (mode === 'eq') {
      record(false);
      showEqSolution(false);
    } else {
      record(false);
      setFeedback('hint', 'Утверждение ' + (task.truth ? '<b>верно</b>' : '<b>неверно</b>') + '. ' + task.why);
    }
  });
  $('new-task-btn').addEventListener('click', newTask);
  $('mode').addEventListener('change', newTask);

  document.addEventListener('DOMContentLoaded', () => {
    renderMath($('connectives'));
    labRun();
    negSetup();
    renderStats();
    newTask();
  });
})();
