// Интерфейс темы «Вещественные числа»: числовая прямая с sup и ε, тренажёр.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const css = (name, fb) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fb;
  const fmt = (v, d) => String(+v.toFixed(d === undefined ? 4 : d)).replace('.', '{,}');

  // Множества: либо точки (элементы по номерам n), либо промежуток
  const R2 = Math.SQRT2;
  const SETS = [
    { el: (n) => 1 - 1 / n, sup: 1, supTex: '1', inA: false, view: [-0.3, 1.35] },
    { interval: [0, 1, false, true], sup: 1, supTex: '1', inA: true, view: [-0.3, 1.35] },
    { el: (n) => Math.pow(-1, n) + 1 / n, sup: 1.5, supTex: '\\frac{3}{2}', inA: true, view: [-1.4, 2.1] },
    { interval: [-R2, R2, false, false], rational: true, sup: R2, supTex: '\\sqrt{2}', inA: false, view: [-1.9, 2.1] },
  ];
  const plot = new Plot($('nl-plot'));

  function update() {
    const S = SETS[+$('nl-sel').value];
    const eps = 0.5 * Math.pow(10, (-2 * +$('nl-eps').value) / 100);
    $('nl-eps-out').textContent = fmt(eps, 3).replace('{,}', ',');
    const [x0, x1] = S.view;
    plot.setView({ xMin: x0, xMax: x1, yMin: -1, yMax: 1, equal: false, noY: true });
    const accent = css('--curve', '#2f6fdb'), bad = css('--bad', '#c0392b');

    // Свидетель из условия (2): элемент x > s − ε
    let w, wLabel;
    const points = [], lines = [];
    if (S.el) {
      let n = 1;
      while (!(S.el(n) > S.sup - eps) && n < 100000) n++;
      w = S.el(n);
      wLabel = 'n = ' + n;
      for (let k = 1; k <= 400; k++) points.push({ x: S.el(k), y: 0, r: k < 30 ? 3.5 : 2, color: accent });
    } else {
      const [a, b, ca, cb] = S.interval;
      lines.push({ x1: a, y1: 0, x2: b, y2: 0, color: accent, width: 6, solid: true });
      points.push({ x: a, y: 0, hollow: !ca, color: accent, r: 5 }, { x: b, y: 0, hollow: !cb, color: accent, r: 5 });
      w = cb ? b : S.sup - eps / 2;
      if (S.rational) w = Math.floor((S.sup - eps / 2) * 1e4) / 1e4; // рациональная точка рядом
      wLabel = cb ? 'сам sup' : 'например';
    }
    points.push({ x: w, y: 0, r: 6, color: bad, label: 'x' });
    // Отметка sup
    lines.push({ x1: S.sup, y1: -0.8, x2: S.sup, y2: 0.8, color: css('--tangent', '#1f8a4c'), dash: [4, 4] });
    plot.draw([], points, lines, [
      { xMin: S.sup, xMax: x1 + 10, color: css('--good-soft', '#e3f4ea') },
      { xMin: S.sup - eps, xMax: S.sup, color: css('--accent-soft', '#e5eefc') },
    ]);

    const out = [];
    out.push('<p>Зелёная зона — все верхние границы, это луч ' + tex('[s;\\ +\\infty)') + '. Его начало и есть ' + tex('s = \\sup A = ' + S.supTex + (S.supTex.length > 2 ? ' \\approx ' + fmt(S.sup) : '')) + '.</p>');
    out.push('<p>Условие (2) при ' + tex('\\varepsilon = ' + fmt(eps, 3)) + ': элемент ' + tex('x = ' + fmt(w)) + ' (' + wLabel + ') больше ' + tex('s - \\varepsilon = ' + fmt(S.sup - eps)) + '. Значит, ' + tex('s - \\varepsilon') + ' уже не верхняя граница. Это работает при <b>любом</b> \\(\\varepsilon\\), поэтому меньше \\(s\\) границы нет.</p>');
    out.push('<p>' + (S.inA ? 'Здесь \\(s \\in A\\), поэтому \\(s\\) — ещё и <b>максимум</b>.' : 'Здесь \\(s \\notin A\\): супремум есть, а максимума нет.') + (S.rational ? ' В \\(\\mathbb{Q}\\) у этого множества супремума не было бы вовсе.' : '') + '</p>');
    $('nl-readout').innerHTML = out.join('');
    renderMath($('nl-readout'));
  }

  $('nl-sel').addEventListener('change', update);
  $('nl-eps').addEventListener('input', update);

  document.addEventListener('DOMContentLoaded', () => {
    update();
    PairTrainer.mount($('pair-trainer'), { modes: ['sup', 'limsup'], statsKey: 'msh.reals.stats' });
  });
})();
