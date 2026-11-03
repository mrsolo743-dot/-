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
  global.tex = tex;

  document.addEventListener('DOMContentLoaded', () => renderMath(document.body));
})(window);
