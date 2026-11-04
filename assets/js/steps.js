// Пошаговое раскрытие вывода: <ol class="steps" data-reveal> ... </ol>
// Под списком появляются кнопки «Следующий шаг», «Показать все шаги», «Сначала».
(function () {
  'use strict';
  function setup(ol) {
    const items = Array.from(ol.children);
    let shown = 1;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      '<button class="primary" type="button">Следующий шаг</button>' +
      '<button type="button">Показать все шаги</button>' +
      '<button type="button">Сначала</button>';
    const [next, all, reset] = row.querySelectorAll('button');
    const update = () => {
      items.forEach((li, i) => { li.hidden = i >= shown; });
      next.disabled = shown >= items.length;
      if (window.fitMath) window.fitMath(ol);
    };
    next.addEventListener('click', () => {
      shown = Math.min(shown + 1, items.length);
      update();
      items[shown - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    all.addEventListener('click', () => { shown = items.length; update(); });
    reset.addEventListener('click', () => { shown = 1; update(); });
    ol.after(row);
    update();
  }
  document.querySelectorAll('ol.steps[data-reveal]').forEach(setup);
})();
