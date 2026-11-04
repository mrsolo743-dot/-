// ИИ-помощник «Спросить ИИ»: плавающая кнопка и окно чата на страницах тем.
// Отправляет вопрос на сервер (window.TUTOR_ENDPOINT) вместе с тем, что студент видит на экране:
// названием темы, условием задачи тренажёра и своим ответом. Без настроенного адреса не показывается.
(function () {
  'use strict';
  const endpoint = (window.TUTOR_ENDPOINT || '').trim();
  if (!endpoint) return;

  const history = []; // { role: 'user' | 'assistant', text }
  let busy = false;

  // ---------- Контекст страницы ----------
  const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  function visibleText(el) {
    if (!el) return '';
    // для формул KaTeX берём исходный TeX, а не «рассыпанные» символы
    const copy = el.cloneNode(true);
    copy.querySelectorAll('.katex').forEach((k) => {
      const a = k.querySelector('annotation');
      k.replaceWith(document.createTextNode(a ? ' \\(' + a.textContent + '\\) ' : ''));
    });
    copy.querySelectorAll('button, script, style, canvas').forEach((n) => n.remove());
    return clean(copy.textContent);
  }
  function pageContext() {
    const parts = [];
    const h1 = document.querySelector('h1');
    parts.push('Тема: ' + clean(h1 ? h1.textContent : document.title));
    const task = document.querySelector('#practice .task-eq, #task, #task-eq');
    const t = visibleText(task);
    if (t) parts.push('Задача тренажёра: ' + t);
    const inputs = [...document.querySelectorAll('#practice input[type=text], #practice input:not([type]), #answer')]
      .filter((i) => i.value && i.value.trim()).map((i) => i.value.trim());
    if (inputs.length) parts.push('Ответ студента: ' + [...new Set(inputs)].join('; '));
    const fb = document.querySelector('#practice .feedback, #feedback');
    const f = visibleText(fb);
    if (f) parts.push('Сообщение проверки: ' + f);
    return parts.join('\n').slice(0, 2900);
  }

  // ---------- Разметка ----------
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tutor-fab';
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.textContent = 'Спросить ИИ';

  const panel = document.createElement('section');
  panel.className = 'tutor-panel';
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'ИИ-помощник');
  panel.innerHTML =
    '<header class="tutor-head"><div><b>ИИ-помощник</b><span class="tutor-sub">видит тему и задачу тренажёра на этой странице</span></div>' +
    '<button type="button" class="tutor-close" aria-label="Закрыть">×</button></header>' +
    '<div class="tutor-log" aria-live="polite"></div>' +
    '<div class="tutor-quick">' +
    '<button type="button" data-q="Дай подсказку к текущей задаче тренажёра, но не решай её целиком.">Подсказка к задаче</button>' +
    '<button type="button" data-q="Проверь мой ответ к задаче тренажёра: если он неверный, покажи, где ошибка в рассуждении.">Где моя ошибка?</button>' +
    '<button type="button" data-q="Объясни простыми словами главную идею этой темы.">Объясни тему</button>' +
    '</div>' +
    '<form class="tutor-form" autocomplete="off"><textarea id="tutor-input" rows="2" maxlength="2000" placeholder="Например: почему здесь меняется знак?" aria-label="Ваш вопрос"></textarea>' +
    '<button type="submit" class="primary">Спросить</button></form>' +
    '<p class="tutor-note">Ответы генерирует бесплатная модель Gemini и могут содержать ошибки — сверяйтесь с разбором по шагам.</p>';
  document.body.append(btn, panel);

  const log = panel.querySelector('.tutor-log');
  const input = panel.querySelector('#tutor-input');

  // Безопасный вывод: экранируем HTML, понимаем **жирный**, списки и абзацы; формулы рисует KaTeX
  function format(text) {
    const esc = text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    return esc
      .replace(/\$\$([\s\S]+?)\$\$/g, '\\[$1\\]')
      .replace(/(^|[^\\])\$([^$\n]+?)\$/g, '$1\\($2\\)')
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .split(/\n{2,}/).map((p) => {
        const lines = p.split('\n');
        if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
          return '<ul>' + lines.map((l) => '<li>' + l.replace(/^\s*([-*•]|\d+[.)])\s+/, '') + '</li>').join('') + '</ul>';
        }
        return '<p>' + lines.join('<br>') + '</p>';
      }).join('');
  }
  function add(role, text, extraClass) {
    const div = document.createElement('div');
    div.className = 'tutor-msg ' + role + (extraClass ? ' ' + extraClass : '');
    div.innerHTML = role === 'user' ? '<p>' + text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) + '</p>' : format(text);
    log.appendChild(div);
    if (window.renderMath) window.renderMath(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }
  if (!history.length) add('assistant', 'Здравствуйте! Спросите, что непонятно в теме или в задаче тренажёра — я вижу, что сейчас у вас на экране.');

  async function ask(question) {
    if (busy || !question.trim()) return;
    busy = true;
    add('user', question);
    history.push({ role: 'user', text: question });
    const wait = add('assistant', 'Думаю…', 'wait');
    panel.querySelectorAll('button, textarea').forEach((el) => (el.disabled = true));
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-12), context: pageContext() }),
      });
      let data = {};
      try { data = await res.json(); } catch (e) { /* пустой ответ */ }
      wait.remove();
      if (!res.ok || !data.text) {
        history.pop();
        add('assistant', data.error || 'Не получилось получить ответ. Попробуйте ещё раз.', 'error');
      } else {
        history.push({ role: 'assistant', text: data.text });
        add('assistant', data.text);
      }
    } catch (e) {
      wait.remove();
      history.pop();
      add('assistant', 'Нет связи с помощником. Проверьте интернет и попробуйте ещё раз.', 'error');
    } finally {
      busy = false;
      panel.querySelectorAll('button, textarea').forEach((el) => (el.disabled = false));
      input.focus();
    }
  }

  const open = () => { panel.hidden = false; btn.hidden = true; input.focus(); };
  const close = () => { panel.hidden = true; btn.hidden = false; btn.focus(); };
  btn.addEventListener('click', open);
  panel.querySelector('.tutor-close').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  panel.querySelector('.tutor-quick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-q]');
    if (b) ask(b.dataset.q);
  });
  panel.querySelector('.tutor-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value;
    input.value = '';
    ask(q);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); panel.querySelector('.tutor-form').requestSubmit(); }
  });
})();
