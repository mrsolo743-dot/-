// Обёртки над KaTeX. Если KaTeX не загрузился, формулы остаются в виде текста.
(function (global) {
  'use strict';

  const DELIMITERS = [
    { left: '\\[', right: '\\]', display: true },
    { left: '\\(', right: '\\)', display: false },
  ];

  // Отрисовать все формулы внутри элемента
  function renderMath(el) {
    if (typeof global.renderMathInElement === 'function') {
      global.renderMathInElement(el || document.body, { delimiters: DELIMITERS, throwOnError: false });
    }
    fitMath(el);
  }

  // Длинные формулы на узком экране уменьшаем, чтобы они помещались по ширине
  // (не меньше 62% — дальше лучше прокрутка, чем нечитаемый текст)
  function fitMath(root) {
    (root || document).querySelectorAll('.katex-display').forEach((d) => {
      d.style.fontSize = '';
      const cw = d.clientWidth;
      if (!cw) return; // скрыта (закрытый блок) — подгоним, когда откроют
      // Масштаб уменьшает ширину не строго пропорционально, поэтому подгоняем в пару проходов
      let size = 1;
      for (let i = 0; i < 3 && d.scrollWidth > cw + 1 && size > 0.62; i++) {
        size = Math.max(0.62, size * (cw / d.scrollWidth) * 0.97);
        d.style.fontSize = size + 'em';
      }
    });
  }

  // TeX-строка -> HTML (для динамически создаваемого текста)
  function tex(src, display) {
    if (global.katex) {
      return global.katex.renderToString(src, { displayMode: !!display, throwOnError: false });
    }
    const span = document.createElement('span');
    span.textContent = src;
    return span.innerHTML;
  }

  global.renderMath = renderMath;
  global.fitMath = fitMath;
  global.tex = tex;

  document.addEventListener('DOMContentLoaded', () => renderMath(document.body));
  // Шрифты KaTeX грузятся позже — после загрузки ширина формул меняется, подгоняем ещё раз
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitMath(document));
  window.addEventListener('load', () => fitMath(document));
  // Раскрыли «Почему?» — подгоняем формулы внутри
  document.addEventListener('toggle', (e) => { if (e.target.open) fitMath(e.target); }, true);
  let resizeTimer = null;
  // Пересчитываем только при изменении ширины: на телефоне resize приходит и при прокрутке
  // (прячется адресная строка), и сброс размеров формул заставлял страницу «прыгать»
  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => fitMath(document), 150);
  });
})(window);
