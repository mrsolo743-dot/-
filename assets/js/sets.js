// Интерфейс темы «Множества и отображения».
(function () {
  'use strict';
  const S = window.SetsCore;
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function rgb(hex, fb) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    const v = m ? parseInt(m[1], 16) : fb;
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  // =====================================================================
  // Диаграмма Венна на canvas: области закрашиваются попиксельно,
  // клик по области сообщает её индекс (битовая маска, A — старший бит)
  // =====================================================================
  const LAYOUT = {
    2: { circles: [[-0.55, 0], [0.55, 0]], rect: [-2.05, -1.35, 2.05, 1.35] },
    3: { circles: [[-0.6, -0.38], [0.6, -0.38], [0, 0.62]], rect: [-2.05, -1.6, 2.05, 1.85] },
  };
  class Venn {
    constructor(canvas, onClick) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.k = 3;
      this.colorOf = () => null;
      if (onClick) {
        canvas.style.cursor = 'pointer';
        canvas.addEventListener('click', (e) => {
          const r = canvas.getBoundingClientRect();
          const idx = this.regionAt(e.clientX - r.left, e.clientY - r.top);
          if (idx >= 0) onClick(idx);
        });
      }
      window.addEventListener('resize', () => this.draw());
    }
    set(k, colorOf) { this.k = k; this.colorOf = colorOf; this.draw(); }
    geom() {
      const L = LAYOUT[this.k];
      const [x0, y0, x1, y1] = L.rect;
      const s = Math.min(this.w / (x1 - x0 + 0.1), this.h / (y1 - y0 + 0.1));
      const ox = this.w / 2 - ((x0 + x1) / 2) * s, oy = this.h / 2 - ((y0 + y1) / 2) * s;
      return { L, s, ox, oy };
    }
    regionAt(px, py) {
      const { L, s, ox, oy } = this.geom();
      const x = (px - ox) / s, y = (py - oy) / s;
      const [x0, y0, x1, y1] = L.rect;
      if (x < x0 || x > x1 || y < y0 || y > y1) return -1;
      let idx = 0;
      L.circles.forEach(([cx, cy], j) => { if ((x - cx) ** 2 + (y - cy) ** 2 < 1) idx |= 1 << (this.k - 1 - j); });
      return idx;
    }
    draw() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.c.getBoundingClientRect();
      if (!rect.width) return;
      this.w = rect.width; this.h = rect.height;
      this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
      const ctx = this.ctx;
      // попиксельная заливка областей
      const img = ctx.createImageData(this.c.width, this.c.height);
      const bg = rgb(css('--surface', '#ffffff'), 0xffffff);
      const cache = {};
      for (let py = 0; py < this.c.height; py++) {
        for (let px = 0; px < this.c.width; px++) {
          const idx = this.regionAt(px / dpr, py / dpr);
          let col = bg;
          if (idx >= 0) {
            if (!(idx in cache)) cache[idx] = this.colorOf(idx);
            if (cache[idx]) col = cache[idx];
          }
          const o = (py * this.c.width + px) * 4;
          img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { L, s, ox, oy } = this.geom();
      const text = css('--text', '#1f2328');
      ctx.strokeStyle = text; ctx.lineWidth = 1.8;
      const [x0, y0, x1, y1] = L.rect;
      ctx.strokeRect(ox + x0 * s, oy + y0 * s, (x1 - x0) * s, (y1 - y0) * s);
      ctx.fillStyle = text;
      ctx.font = '600 ' + Math.max(13, Math.round(s * 0.22)) + 'px system-ui, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText('U', ox + x0 * s + 6, oy + y0 * s + 4);
      const labelPos = this.k === 2 ? [[-1.3, -0.95], [1.3, -0.95]] : [[-1.45, -1.2], [1.45, -1.2], [1.05, 1.45]];
      L.circles.forEach(([cx, cy], j) => {
        ctx.beginPath(); ctx.arc(ox + cx * s, oy + cy * s, s, 0, Math.PI * 2); ctx.stroke();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(['A', 'B', 'C'][j], ox + labelPos[j][0] * s, oy + labelPos[j][1] * s);
      });
    }
  }
  // Цвета заливки
  const fillColor = () => {
    const a = rgb(css('--curve', '#2f6fdb'), 0x2f6fdb), bg = rgb(css('--surface', '#ffffff'), 0xffffff);
    return a.map((v, i) => Math.round(v * 0.45 + bg[i] * 0.55));
  };
  const softColor = (name, fbHex) => rgb(css(name, fbHex), parseInt(fbHex.slice(1), 16));

  // =====================================================================
  // 2. Лаборатория
  // =====================================================================
  const v1 = new Venn($('lab-v1')), v2 = new Venn($('lab-v2'));
  function labRun() {
    const out = $('lab-out');
    const s1 = $('lab-e1').value.trim(), s2 = $('lab-e2').value.trim();
    let e1, e2 = null;
    try {
      e1 = S.parse(s1);
      if (s2) e2 = S.parse(s2);
    } catch (e) {
      out.innerHTML = '<p class="preview error">' + esc(e.message) + '</p>';
      return;
    }
    const k = e2 ? S.arity(e1, e2) : S.arity(e1);
    const fc = fillColor();
    const r1 = S.regions(e1, k);
    v1.set(k, (i) => (r1[i] ? fc : null));
    $('lab-c1').innerHTML = tex('E_1 = ' + S.tex(e1));
    $('lab-f2').hidden = !e2;
    let h = '<p>' + tex('x \\in E_1 \\iff ' + S.logicTex(e1)) + '</p>';
    if (e2) {
      const r2 = S.regions(e2, k);
      v2.set(k, (i) => (r2[i] ? fc : null));
      $('lab-c2').innerHTML = tex('E_2 = ' + S.tex(e2));
      h += '<p>' + tex('x \\in E_2 \\iff ' + S.logicTex(e2)) + '</p>';
      const eq = S.equalSets(e1, e2);
      if (eq.equal) h += '<p class="feedback good">\\(E_1 = E_2\\): закрашены одни и те же области. Логические формулы справа равносильны — это и есть доказательство.</p>';
      else {
        const bad = eq.diff.map((d, i) => (d ? '«' + S.regionText(k, i) + '» (' + (eq.ra[i] ? 'входит только в E₁' : 'входит только в E₂') + ')' : null)).filter(Boolean);
        h += '<p class="feedback bad">\\(E_1 \\ne E_2\\). Различаются области: ' + esc(bad.join(', ')) + '. Любой элемент оттуда — контрпример.</p>';
      }
    }
    out.innerHTML = h;
    renderMath(out);
    renderMath($('lab-c1'));
    renderMath($('lab-c2'));
  }
  let labTimer = null;
  ['lab-e1', 'lab-e2'].forEach((id) => $(id).addEventListener('input', () => { clearTimeout(labTimer); labTimer = setTimeout(labRun, 200); }));
  $('lab-chips').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    $('lab-e1').value = b.dataset.e1;
    $('lab-e2').value = b.dataset.e2;
    labRun();
  });

  // =====================================================================
  // 5. Таблица дробей с обходом по диагоналям
  // =====================================================================
  function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
  (function qTable() {
    const N = 6;
    const num = {};
    let k = 0;
    for (let sum = 2; sum <= 2 * N; sum++) {
      for (let q = 1; q < sum; q++) {
        const p = sum - q;
        if (p > N || q > N) continue;
        if (gcd(p, q) === 1) num[p + '/' + q] = ++k;
      }
    }
    let h = '<table class="num-table qtab"><tr><th></th>' + Array.from({ length: N }, (_, i) => '<th>p = ' + (i + 1) + '</th>').join('') + '</tr>';
    for (let q = 1; q <= N; q++) {
      h += '<tr><th>q = ' + q + '</th>';
      for (let p = 1; p <= N; p++) {
        const n = num[p + '/' + q];
        h += n ? '<td>\\(\\frac{' + p + '}{' + q + '}\\)<sup>' + n + '</sup></td>' : '<td class="dim">\\(\\frac{' + p + '}{' + q + '}\\)</td>';
      }
      h += '</tr>';
    }
    $('q-table').innerHTML = h + '</table><p class="small-note">Верхний индекс — номер дроби. Нумерация идёт по диагоналям \\(p + q = 2, 3, 4, \\ldots\\): каждая диагональ конечна, поэтому до любой дроби мы доберёмся за конечное число шагов. Серые дроби сократимы и повторяют уже занумерованные.</p>';
  })();

  // =====================================================================
  // 6. Диагональ Кантора
  // =====================================================================
  function cantor() {
    const rows = 8, digits = 10;
    const list = S.cantorList(rows, digits);
    const x = S.cantorNumber(list);
    let h = '<table class="num-table cantor">';
    list.forEach((row, i) => {
      h += '<tr><th>\\(x_{' + (i + 1) + '}\\)</th><td class="mono">0,' + row.map((d, j) => (j === i ? '<span class="diag">' + d + '</span>' : d)).join('') + '…</td></tr>';
    });
    h += '<tr class="new"><th>\\(x\\)</th><td class="mono">0,' + x.map((d, j) => (j < rows ? '<span class="diag new">' + d + '</span>' : '<span class="dim">' + d + '</span>')).join('') + '…</td></tr></table>';
    $('cantor-table').innerHTML = h;
    const diffs = list.map((row, i) => '\\(x \\ne x_{' + (i + 1) + '}\\): ' + (i + 1) + '-я цифра ' + x[i] + ' ≠ ' + row[i]);
    $('cantor-out').innerHTML = '<p>' + diffs.join('; ') + '. И так для любого номера \\(n\\): число \\(x\\) не совпадает ни с одним \\(x_n\\), значит, список не полон. Каким бы ни был список — нажмите кнопку.</p>';
    renderMath($('cantor-table'));
    renderMath($('cantor-out'));
  }
  $('cantor-new').addEventListener('click', cantor);

  // =====================================================================
  // Стрелочная диаграмма отображения
  // =====================================================================
  function drawArrows(canvas, t, reveal) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const w = rect.width, h = rect.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const text = css('--text', '#1f2328'), accent = css('--curve', '#2f6fdb'), border = css('--border', '#dcd8ce');
    const xl = w * 0.25, xr = w * 0.75;
    const pos = (n, i) => 30 + ((h - 60) * (i + 0.5)) / n;
    // овалы множеств
    ctx.strokeStyle = border; ctx.lineWidth = 2;
    [[xl, t.m], [xr, t.k]].forEach(([cx]) => { ctx.beginPath(); ctx.ellipse(cx, h / 2, Math.min(60, w * 0.13), h / 2 - 8, 0, 0, Math.PI * 2); ctx.stroke(); });
    ctx.fillStyle = css('--muted', '#5d6470'); ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('X', xl - Math.min(60, w * 0.13) - 14, 6); ctx.fillText('Y', xr + Math.min(60, w * 0.13) + 14, 6);
    // стрелки
    const hit = new Array(t.k).fill(0);
    t.f.forEach((y) => hit[y]++);
    ctx.strokeStyle = accent; ctx.fillStyle = accent; ctx.lineWidth = 2;
    t.f.forEach((y, i) => {
      const x1 = xl + 10, y1 = pos(t.m, i), x2 = xr - 12, y2 = pos(t.k, y);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 10 * Math.cos(a - 0.4), y2 - 10 * Math.sin(a - 0.4));
      ctx.lineTo(x2 - 10 * Math.cos(a + 0.4), y2 - 10 * Math.sin(a + 0.4));
      ctx.closePath(); ctx.fill();
    });
    // точки и подписи
    ctx.font = '600 15px system-ui, sans-serif'; ctx.textBaseline = 'middle';
    for (let i = 0; i < t.m; i++) {
      ctx.fillStyle = text; ctx.beginPath(); ctx.arc(xl, pos(t.m, i), 5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'right'; ctx.fillText(String(i + 1), xl - 12, pos(t.m, i));
    }
    for (let j = 0; j < t.k; j++) {
      let col = text;
      if (reveal) col = hit[j] === 0 ? css('--bad', '#c0392b') : hit[j] > 1 ? css('--curve-2', '#d9480f') : css('--good', '#1f8a4c');
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(xr, pos(t.k, j), reveal ? 7 : 5, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillText(S.YNAMES[j], xr + 12, pos(t.k, j));
    }
  }

  // =====================================================================
  // 7. Тренажёр
  // =====================================================================
  const STATS_KEY = 'msh.sets.stats';
  let stats = { solved: 0, attempts: 0, streak: 0, best: 0 };
  try { stats = Object.assign(stats, JSON.parse(localStorage.getItem(STATS_KEY)) || {}); } catch (e) { /* хранилище недоступно */ }
  const saveStats = () => { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ничего */ } };
  const renderStats = () => {
    $('stats').innerHTML = 'С первой попытки: <b>' + stats.solved + '</b> из ' + stats.attempts + ' · Подряд: <b>' + stats.streak + '</b> · Рекорд: <b>' + stats.best + '</b>';
  };

  let mode = 'region', task = null, answered = false, firstTry = true, venn = null, selected = null, checked = false;

  function record(ok) {
    if (answered) return;
    answered = true;
    stats.attempts++;
    if (ok && firstTry) { stats.solved++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); }
    else stats.streak = 0;
    saveStats();
    renderStats();
  }
  function fb(kind, html) {
    const el = $('feedback');
    el.className = 'feedback' + (kind ? ' ' + kind : '');
    el.innerHTML = html;
    renderMath(el);
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
  function checkboxes() {
    $('area').insertAdjacentHTML('beforeend',
      '<div class="row" style="margin:8px 0"><label class="attain" style="font-size:16px;color:var(--text)"><input type="checkbox" id="cb-inj"> инъекция</label>' +
      '<label class="attain" style="font-size:16px;color:var(--text)"><input type="checkbox" id="cb-surj"> сюръекция</label></div>' +
      '<p class="small-note">Отметьте оба пункта, если это биекция, и ни одного, если ни то ни другое.</p>');
  }

  function regionColors() {
    const fc = fillColor();
    const good = softColor('--good-soft', '#e3f4ea'), bad = softColor('--bad-soft', '#fbe9e7');
    return (i) => {
      if (!checked) return selected[i] ? fc : null;
      if (selected[i] && task.regions[i]) return fc;      // верно закрашено
      if (selected[i] !== task.regions[i]) return bad;     // лишнее или пропущено
      return null;
    };
  }

  function newTask() {
    mode = $('mode').value;
    answered = false; firstTry = true; checked = false;
    fb('', '');
    $('solution').innerHTML = '';
    $('area').innerHTML = '';
    $('check-btn').hidden = !(mode === 'region' || mode === 'map' || mode === 'func');
    if (mode === 'region') {
      task = S.makeRegionTask();
      selected = new Array(task.regions.length).fill(false);
      $('task').innerHTML = 'Закрасьте (кликами по областям) множество' + tex(S.tex(task.expr), true);
      $('area').innerHTML = '<canvas class="venn" id="tr-venn" aria-label="Диаграмма Венна: кликните по областям"></canvas>';
      venn = new Venn($('tr-venn'), (i) => {
        selected[i] = !selected[i];
        if (checked) { checked = false; fb('', ''); }
        venn.set(task.k, regionColors());
      });
      venn.set(task.k, regionColors());
    } else if (mode === 'eq') {
      task = S.makeEqTask();
      $('task').innerHTML = 'Верно ли равенство?' + tex(S.tex(task.a) + ' \\;=\\; ' + S.tex(task.b), true);
      choices(['Равны при любых A, B, C', 'Не всегда равны'], (i, b) => {
        const ok = (i === 0) === task.equal;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) firstTry = false;
        record(ok);
        showEq(ok);
      });
    } else if (mode === 'map') {
      task = S.makeFiniteMap();
      $('task').innerHTML = 'Отображение \\(f\\colon X \\to Y\\) задано стрелками. Какого оно типа?';
      $('area').innerHTML = '<canvas class="arrows" id="tr-arrows" aria-label="Стрелочная диаграмма отображения"></canvas>';
      checkboxes();
      drawArrows($('tr-arrows'), task, false);
    } else if (mode === 'func') {
      task = S.pick(S.FUNCS);
      $('task').innerHTML = 'Какого типа отображение?' + tex(task.tex, true);
      checkboxes();
    } else {
      task = S.pick(S.COUNT);
      $('task').innerHTML = 'Это множество счётно?' + tex(task.tex, true);
      choices(['Счётно', 'Несчётно'], (i, b) => {
        const ok = (i === 0) === task.countable;
        b.classList.add(ok ? 'correct' : 'wrong');
        if (!ok) firstTry = false;
        record(ok);
        fb(ok ? 'good' : 'bad', (ok ? 'Верно! ' : 'Нет, ' + (task.countable ? 'счётно' : 'несчётно') + '. ') + task.why);
      });
    }
    renderMath($('task'));
  }

  function showEq(ok) {
    const k = task.k;
    const head = ok ? 'Верно! ' : 'Нет. ';
    let txt = task.equal
      ? 'Множества равны: закрашены одни и те же области.'
      : 'Не равны: различаются области — ' + task.diff.map((d, i) => (d ? '«' + S.regionText(k, i) + '»' : null)).filter(Boolean).join(', ') + '. Любой элемент оттуда — контрпример.';
    fb(ok ? 'good' : 'bad', head + esc(txt) + ' ' + task.note);
    $('solution').innerHTML = '<div class="venn-row"><figure><canvas class="venn" id="eq-v1"></canvas><figcaption>' + tex(S.tex(task.a)) + '</figcaption></figure>' +
      '<figure><canvas class="venn" id="eq-v2"></canvas><figcaption>' + tex(S.tex(task.b)) + '</figcaption></figure></div>';
    const fc = fillColor();
    new Venn($('eq-v1')).set(k, (i) => (task.ra[i] ? fc : null));
    new Venn($('eq-v2')).set(k, (i) => (task.rb[i] ? fc : null));
  }

  function check() {
    if (mode === 'region') {
      checked = true;
      const wrong = task.regions.map((v, i) => v !== selected[i]);
      const ok = !wrong.some(Boolean);
      if (!ok) firstTry = false;
      record(ok);
      venn.set(task.k, regionColors());
      if (ok) fb('good', 'Верно! ' + tex('x \\in ' + S.tex(task.expr) + ' \\iff ' + S.logicTex(task.expr)));
      else {
        const missed = task.regions.map((v, i) => (v && !selected[i] ? '«' + S.regionText(task.k, i) + '»' : null)).filter(Boolean);
        const extra = task.regions.map((v, i) => (!v && selected[i] ? '«' + S.regionText(task.k, i) + '»' : null)).filter(Boolean);
        fb('bad', 'Ошибки выделены красным. ' + (missed.length ? 'Не закрашено нужное: ' + esc(missed.join(', ')) + '. ' : '') + (extra.length ? 'Закрашено лишнее: ' + esc(extra.join(', ')) + '. ' : '') + 'Подсказка: ' + tex('x \\in ' + S.tex(task.expr) + ' \\iff ' + S.logicTex(task.expr)) + '. Исправьте и проверьте снова.');
      }
    } else if (mode === 'map' || mode === 'func') {
      const inj = $('cb-inj').checked, surj = $('cb-surj').checked;
      const ok = inj === task.inj && surj === task.surj;
      if (!ok) firstTry = false;
      record(ok);
      const kind = task.inj && task.surj ? 'биекция' : task.inj ? 'инъекция, но не сюръекция' : task.surj ? 'сюръекция, но не инъекция' : 'ни инъекция, ни сюръекция';
      const why = mode === 'map' ? S.explainFinite(task) : task.why;
      fb(ok ? 'good' : 'bad', (ok ? 'Верно: ' : 'Нет. Правильно: ') + kind + '. ' + why);
      if (mode === 'map') drawArrows($('tr-arrows'), task, true);
    }
  }

  $('check-btn').addEventListener('click', check);
  $('solution-btn').addEventListener('click', () => {
    if (!task) return;
    firstTry = false;
    if (mode === 'region') {
      selected = task.regions.slice();
      checked = false;
      venn.set(task.k, regionColors());
      record(false);
      fb('hint', 'Правильные области закрашены. ' + tex('x \\in ' + S.tex(task.expr) + ' \\iff ' + S.logicTex(task.expr)) + ' — проверьте эту формулу для каждой области.');
    } else if (mode === 'eq') { record(false); showEq(false); }
    else if (mode === 'map' || mode === 'func') {
      $('cb-inj').checked = task.inj; $('cb-surj').checked = task.surj;
      record(false); // показ ответа — попытка не засчитывается
      check();
    } else {
      record(false);
      fb('hint', 'Множество ' + (task.countable ? '<b>счётно</b>' : '<b>несчётно</b>') + '. ' + task.why);
    }
  });
  $('new-task-btn').addEventListener('click', newTask);
  $('mode').addEventListener('change', newTask);
  window.addEventListener('resize', () => { if (mode === 'map' && task) drawArrows($('tr-arrows'), task, answered); });

  document.addEventListener('DOMContentLoaded', () => {
    labRun();
    cantor();
    renderStats();
    newTask();
  });
})();
