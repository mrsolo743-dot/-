// Общие элементы интерфейса линейной алгебры: ввод матрицы таблицей, шаги метода Гаусса, тренажёр.
(function () {
  'use strict';
  const L = window.Lin;

  // Таблица полей для ввода матрицы. aug — номер столбца, перед которым черта (для расширенной матрицы)
  function grid(container, rows, cols, opts) {
    opts = opts || {};
    const id = opts.id || 'g' + Math.random().toString(36).slice(2, 7);
    let h = '<div class="tt-wrap"><table class="mgrid' + (opts.aug ? ' aug' : '') + '" role="grid">';
    for (let i = 0; i < rows; i++) {
      h += '<tr>';
      for (let j = 0; j < cols; j++) {
        const v = opts.values && opts.values[i] && opts.values[i][j] !== undefined ? L.fstr(opts.values[i][j]) : '';
        h += '<td' + (opts.aug && j === opts.aug ? ' class="bar"' : '') + '><input id="' + id + '-' + i + '-' + j + '" inputmode="text" value="' + v + '" aria-label="строка ' + (i + 1) + ', столбец ' + (j + 1) + '" autocomplete="off"></td>';
      }
      h += '</tr>';
    }
    container.innerHTML = h + '</table></div>';
    return {
      get() {
        const out = [];
        for (let i = 0; i < rows; i++) {
          const r = [];
          for (let j = 0; j < cols; j++) {
            const el = document.getElementById(id + '-' + i + '-' + j);
            const f = L.parseF(el.value);
            if (!f) return { error: 'Строка ' + (i + 1) + ', столбец ' + (j + 1) + ': нужно число (например 3, -2, 3/4 или 0,5).', el };
            r.push(f);
          }
          out.push(r);
        }
        return { M: out };
      },
    };
  }

  // Шаги метода Гаусса: операции, пояснение, матрица после шага
  function stepsHtml(start, steps, aug) {
    let h = '<ol class="steps-list gauss">';
    h += '<li><div>Исходная матрица:</div>' + tex(L.mtex(start, aug), true) + '</li>';
    for (const s of steps) {
      h += '<li><div>' + s.why + '</div><div class="ops">' + tex(s.ops.join(',\\quad ')) + '</div>' + tex(L.mtex(s.A, aug), true) + '</li>';
    }
    return h + '</ol>';
  }

  // Простая статистика тренажёра в localStorage
  function trainerStats(key, el) {
    let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
    try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(key)) || {}); } catch (e) { /* хранилище недоступно */ }
    const render = () => { el.innerHTML = 'Решено: <b>' + stats.solved + '</b> · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>'; };
    render();
    return {
      record(ok, helped) {
        stats.attempts++;
        if (ok) { stats.solved++; stats.streak = helped ? 0 : stats.streak + 1; stats.best = Math.max(stats.best, stats.streak); } else stats.streak = 0;
        try { localStorage.setItem(key, JSON.stringify(stats)); } catch (e) { /* ничего */ }
        render();
      },
    };
  }

  function feedback(el, kind, html) {
    el.className = 'feedback' + (kind ? ' ' + kind : '');
    el.innerHTML = html;
    renderMath(el);
  }

  function choices(container, labels, onPick) {
    const box = document.createElement('div');
    box.className = 'choices';
    labels.forEach((l, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'choice'; b.textContent = l;
      b.addEventListener('click', () => onPick(i, b));
      box.appendChild(b);
    });
    container.appendChild(box);
  }

  window.LinUI = { grid, stepsHtml, trainerStats, feedback, choices };
})();
