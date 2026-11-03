// Тренажёр с двумя ответами: sup/inf множества или lim sup/lim inf последовательности.
// PairTrainer.mount(container, { modes: ['sup', 'limsup'], statsKey })
(function () {
  'use strict';

  const MODES = {
    sup: {
      label: 'sup и inf множества',
      make: () => RealsCore.makeSupTask(),
      head: 'Найдите точные грани множества:',
      names: ['\\sup A', '\\inf A'],
      attain: ['достигается (это max)', 'достигается (это min)'],
    },
    limsup: {
      label: 'lim sup и lim inf последовательности',
      make: () => RealsCore.makeLimsupTask(),
      head: 'Найдите верхний и нижний пределы:',
      names: ['\\varlimsup_{n \\to \\infty} a_n', '\\varliminf_{n \\to \\infty} a_n'],
      attain: null,
    },
  };

  function mount(root, opts) {
    const modes = opts.modes;
    const key = opts.statsKey;
    root.innerHTML =
      '<div class="row" style="justify-content:space-between">' +
      (modes.length > 1
        ? '<label>Режим: <select data-r="mode">' + modes.map((m) => '<option value="' + m + '">' + MODES[m].label + '</option>').join('') + '</select></label>'
        : '<span></span>') +
      '<div class="stats" data-r="stats"></div></div>' +
      '<div class="task-eq" data-r="task"></div>' +
      '<form data-r="form" autocomplete="off">' +
      [0, 1].map((i) =>
        '<div class="expr-input" style="margin-top:8px"><label data-r="name' + i + '" style="font-weight:600;min-width:84px"></label>' +
        '<input data-r="in' + i + '" spellcheck="false" autocapitalize="off" placeholder="число, √: sqrt(2), e, ∞">' +
        '<label class="attain" data-r="att' + i + '"><input type="checkbox" data-r="chk' + i + '"> <span></span></label></div>' +
        '<div class="preview" data-r="pv' + i + '"></div>'
      ).join('') +
      '<div class="row" style="margin-top:8px">' +
      '<button class="primary" type="submit">Проверить</button>' +
      '<button type="button" data-r="hint">Подсказка</button>' +
      '<button type="button" data-r="sol">Показать решение</button>' +
      '<button type="button" data-r="new">Новая задача</button></div></form>' +
      '<p class="small-note">Ответ — число, дробь (3/2), корень (sqrt(2)), e, или ±∞ (можно писать inf, -inf).</p>' +
      '<div class="feedback" data-r="fb" aria-live="polite"></div><div class="solution" data-r="solution"></div>';
    const $ = (r) => root.querySelector('[data-r="' + r + '"]');

    let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
    try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(key)) || {}); } catch (e) { /* хранилище недоступно */ }
    const save = () => { try { localStorage.setItem(key, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
    const renderStats = () => {
      $('stats').innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
    };

    let task = null, mode = modes[0], done = false, helped = false;

    function fb(kind, html) {
      const el = $('fb');
      el.className = 'feedback' + (kind ? ' ' + kind : '');
      el.innerHTML = html;
      renderMath(el);
    }

    function newTask() {
      mode = modes.length > 1 ? $('mode').value : modes[0];
      const M = MODES[mode];
      task = M.make();
      done = false;
      helped = false;
      $('task').innerHTML = M.head + tex(task.tex, true);
      [0, 1].forEach((i) => {
        $('name' + i).innerHTML = tex(M.names[i] + ' =');
        $('in' + i).value = '';
        $('pv' + i).textContent = '';
        $('chk' + i).checked = false;
        $('att' + i).hidden = !M.attain;
        if (M.attain) $('att' + i).querySelector('span').textContent = M.attain[i];
      });
      fb('', '');
      $('solution').innerHTML = '';
      renderMath($('task'));
    }

    [0, 1].forEach((i) => {
      $('in' + i).addEventListener('input', () => {
        const v = $('in' + i).value.trim();
        const pv = $('pv' + i);
        if (!v) { pv.textContent = ''; return; }
        const p = LimCore.parseAnswer(v);
        if (p.error) { pv.className = 'preview error'; pv.textContent = p.error; return; }
        pv.className = 'preview';
        if (p.none) pv.textContent = '«не существует»';
        else if (!isFinite(p.value)) pv.innerHTML = 'Вы ввели: ' + tex(p.value > 0 ? '+\\infty' : '-\\infty');
        else pv.innerHTML = 'Вы ввели: ' + tex(Expr.tex(p.ast) + (p.ast.type === 'num' ? '' : ' \\approx ' + (+p.value.toFixed(4)).toString().replace('.', '{,}')));
      });
    });

    $('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (!task) return;
      const res = RealsCore.check(task, $('in0').value, $('in1').value, $('chk0').checked, $('chk1').checked);
      if (res.invalid) {
        const el = $('fb');
        el.className = 'feedback bad';
        el.textContent = res.message;
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
        save();
        renderStats();
      }
      fb(res.ok ? 'good' : 'bad', res.message + (res.ok ? ' Нажмите «Новая задача», чтобы продолжить.' : ''));
    });
    $('hint').addEventListener('click', () => { if (!task) return; helped = true; fb('hint', RealsCore.hint(task)); });
    $('sol').addEventListener('click', () => {
      if (!task) return;
      helped = true;
      const items = task.steps.map((s) => '<li><div>' + s.title + '</div>' + (s.tex ? tex(s.tex, true) : '') + '</li>');
      const M = MODES[mode];
      let ans = M.names[0] + ' = ' + task.supTex + ', \\qquad ' + M.names[1] + ' = ' + task.infTex;
      items.push('<li class="final"><div>Ответ:</div>' + tex(ans, true) + (M.attain ? '<div>' + (task.max ? 'sup достигается (max есть)' : 'sup не достигается (max нет)') + '; ' + (task.min ? 'inf достигается (min есть).' : 'inf не достигается (min нет).') + '</div>' : '') + '</li>');
      $('solution').innerHTML = '<h3>Решение по шагам</h3><ol class="steps-list">' + items.join('') + '</ol>';
      renderMath($('solution'));
    });
    $('new').addEventListener('click', newTask);
    if (modes.length > 1) $('mode').addEventListener('change', newTask);

    renderStats();
    newTask();
  }

  window.PairTrainer = { mount };
})();
