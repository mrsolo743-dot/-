// Непрерывность: задачи «классифицируйте точку разрыва», «подберите параметр»,
// «верно или неверно», метод бисекции. Зависит от LimCore (разбор ответа и дроби).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./limits-core.js'));
  else root.ContCore = factory(root.LimCore);
})(typeof self !== 'undefined' ? self : this, function (LC) {
  'use strict';

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (min, max) => { let v; do { v = rnd(min, max); } while (v === 0); return v; };
  const fr = LC.fr;
  const sg = (v) => (v < 0 ? ' - ' + -v : ' + ' + v);
  const xm = (r) => (r === 0 ? 'x' : '(x' + sg(-r) + ')'); // «(x − r)» для TeX
  const xmPlain = (r) => (r === 0 ? 'x' : 'x' + sg(-r));

  // Виды точек: cont — непрерывна, removable — устранимый, jump — скачок (1-го рода), second — 2-го рода
  const KINDS = {
    cont: 'непрерывна',
    removable: 'устранимый разрыв',
    jump: 'разрыв 1-го рода (скачок)',
    second: 'разрыв 2-го рода',
  };

  // ---------- Классификация точек ----------
  // Каждый: { tex (определение функции), x0, kind, f (JS, для графика и проверки), fx0 (значение в x0 или null), left/right (TeX пределов), why }
  const POINTS = {
    removableSquares() {
      const r = nz(-4, 4);
      return {
        tex: 'f(x) = \\frac{x^2 - ' + r * r + '}{' + xmPlain(r) + '}', x0: r, kind: 'removable',
        f: (x) => (x * x - r * r) / (x - r), fx0: null, left: String(2 * r), right: String(2 * r),
        why: 'В точке \\(x_0 = ' + r + '\\) функция не определена, но \\(\\frac{x^2 - ' + r * r + '}{' + xmPlain(r) + '} = x' + sg(r) + '\\) при \\(x \\ne ' + r + '\\), поэтому оба односторонних предела равны \\(' + 2 * r + '\\). Разрыв устранимый: доопределим \\(f(' + r + ') = ' + 2 * r + '\\).',
      };
    },
    removableSin() {
      const k = rnd(2, 6);
      return {
        tex: 'f(x) = \\frac{\\sin ' + k + 'x}{x}', x0: 0, kind: 'removable',
        f: (x) => Math.sin(k * x) / x, fx0: null, left: String(k), right: String(k),
        why: 'По первому замечательному пределу \\(\\frac{\\sin ' + k + 'x}{x} \\to ' + k + '\\) с обеих сторон, а в нуле функция не определена. Устранимый разрыв.',
      };
    },
    removableWrongValue() {
      const r = nz(-3, 3), a = nz(1, 3), b = nz(-4, 4);
      const L = a * r + b;
      let v; do { v = rnd(-6, 6); } while (v === L);
      return {
        tex: 'f(x) = \\begin{cases} ' + (a === 1 ? '' : a) + 'x' + sg(b) + ', & x \\ne ' + r + ', \\\\ ' + v + ', & x = ' + r + ' \\end{cases}', x0: r, kind: 'removable',
        f: (x) => (Math.abs(x - r) < 1e-12 ? v : a * x + b), fx0: v, left: String(L), right: String(L),
        why: 'Оба односторонних предела равны \\(' + L + '\\), но значение в точке \\(f(' + r + ') = ' + v + '\\) другое. Это устранимый разрыв: достаточно исправить одно значение.',
      };
    },
    removableXsin() {
      return {
        tex: 'f(x) = x \\sin\\frac{1}{x}', x0: 0, kind: 'removable',
        f: (x) => x * Math.sin(1 / x), fx0: null, left: '0', right: '0',
        why: '\\(|x \\sin\\frac{1}{x}| \\le |x| \\to 0\\) (два милиционера), а в нуле функция не определена. Разрыв устранимый, хотя график и колеблется.',
      };
    },
    jumpAbs() {
      const r = nz(-4, 4);
      return {
        tex: 'f(x) = \\frac{|' + xmPlain(r) + '|}{' + xmPlain(r) + '}', x0: r, kind: 'jump',
        f: (x) => Math.abs(x - r) / (x - r), fx0: null, left: '-1', right: '1',
        why: 'При \\(x &gt; ' + r + '\\) функция равна 1, при \\(x &lt; ' + r + '\\) равна \\(-1\\). Односторонние пределы конечны, но различны: скачок величины 2.',
      };
    },
    jumpPiece() {
      const c = nz(-3, 3), a = nz(-3, 3), b = nz(-5, 5), d = nz(-3, 3);
      let e; do { e = nz(-5, 5); } while (a * c + b === d * c + e);
      const L = a * c + b, R = d * c + e;
      return {
        tex: 'f(x) = \\begin{cases} ' + (a === 1 ? '' : a === -1 ? '-' : a) + 'x' + sg(b) + ', & x < ' + c + ', \\\\ ' + (d === 1 ? '' : d === -1 ? '-' : d) + 'x' + sg(e) + ', & x \\ge ' + c + ' \\end{cases}', x0: c, kind: 'jump',
        f: (x) => (x < c ? a * x + b : d * x + e), fx0: R, left: String(L), right: String(R),
        why: 'Слева \\(f(x) \\to ' + a + ' \\cdot ' + (c < 0 ? '(' + c + ')' : c) + sg(b) + ' = ' + L + '\\), справа \\(\\to ' + R + '\\). Конечные, но разные пределы — скачок.',
      };
    },
    jumpArctg() {
      return {
        tex: 'f(x) = \\operatorname{arctg}\\frac{1}{x}', x0: 0, kind: 'jump',
        f: (x) => Math.atan(1 / x), fx0: null, left: '-\\frac{\\pi}{2}', right: '\\frac{\\pi}{2}',
        why: 'При \\(x \\to 0^+\\) аргумент \\(\\frac{1}{x} \\to +\\infty\\), арктангенс \\(\\to \\frac{\\pi}{2}\\); при \\(x \\to 0^-\\) — к \\(-\\frac{\\pi}{2}\\). Скачок величины \\(\\pi\\).',
      };
    },
    jumpFloor() {
      const n = nz(-3, 3);
      return {
        tex: 'f(x) = [x] \\text{ (целая часть)}', x0: n, kind: 'jump',
        f: (x) => Math.floor(x), fx0: n, left: String(n - 1), right: String(n),
        why: 'Слева от \\(' + n + '\\) целая часть равна \\(' + (n - 1) + '\\), справа и в самой точке — \\(' + n + '\\). Скачок величины 1 (функция непрерывна справа).',
      };
    },
    secondPole() {
      const r = nz(-4, 4), k = rnd(1, 2);
      return {
        tex: 'f(x) = \\frac{1}{' + (k === 1 ? xmPlain(r) : xm(r) + '^2') + '}', x0: r, kind: 'second',
        f: (x) => 1 / Math.pow(x - r, k), fx0: null, left: k === 1 ? '-\\infty' : '+\\infty', right: '+\\infty',
        why: 'Хотя бы один односторонний предел бесконечен — это разрыв 2-го рода (вертикальная асимптота \\(x = ' + r + '\\)).',
      };
    },
    secondOsc() {
      return {
        tex: 'f(x) = \\sin\\frac{1}{x}', x0: 0, kind: 'second',
        f: (x) => Math.sin(1 / x), fx0: null, left: '\\nexists', right: '\\nexists',
        why: 'Односторонних пределов нет вовсе: по Гейне, при \\(x_n = \\frac{1}{\\pi n} \\to 0\\) значения равны 0, а при \\(x_n = \\frac{1}{\\pi/2 + 2\\pi n}\\) — 1. Разрыв 2-го рода без бесконечностей.',
      };
    },
    secondExp() {
      return {
        tex: 'f(x) = e^{1/x}', x0: 0, kind: 'second',
        f: (x) => Math.exp(1 / x), fx0: null, left: '0', right: '+\\infty',
        why: 'Слева \\(\\frac{1}{x} \\to -\\infty\\), значит \\(e^{1/x} \\to 0\\); справа \\(\\to +\\infty\\). Достаточно одного бесконечного (или несуществующего) одностороннего предела — разрыв 2-го рода.',
      };
    },
    contAbs() {
      return {
        tex: 'f(x) = |x|', x0: 0, kind: 'cont',
        f: (x) => Math.abs(x), fx0: 0, left: '0', right: '0',
        why: 'Оба односторонних предела равны \\(0 = f(0)\\): функция <b>непрерывна</b>. У неё нет производной в нуле (излом), но непрерывность и дифференцируемость — разные вещи.',
      };
    },
    contXsin() {
      return {
        tex: 'f(x) = \\begin{cases} x \\sin\\frac{1}{x}, & x \\ne 0, \\\\ 0, & x = 0 \\end{cases}', x0: 0, kind: 'cont',
        f: (x) => (x === 0 ? 0 : x * Math.sin(1 / x)), fx0: 0, left: '0', right: '0',
        why: 'Пределы с обеих сторон равны 0 (\\(|x \\sin\\frac{1}{x}| \\le |x|\\)), и \\(f(0) = 0\\). Непрерывна, несмотря на бесконечные колебания.',
      };
    },
    contPiece() {
      const c = nz(-3, 3), a = nz(-3, 3), b = nz(-5, 5), d = nz(-3, 3);
      const e = a * c + b - d * c; // склеено
      const L = a * c + b;
      return {
        tex: 'f(x) = \\begin{cases} ' + (a === 1 ? '' : a === -1 ? '-' : a) + 'x' + sg(b) + ', & x < ' + c + ', \\\\ ' + (d === 1 ? '' : d === -1 ? '-' : d) + 'x' + (e === 0 ? '' : sg(e)) + ', & x \\ge ' + c + ' \\end{cases}', x0: c, kind: 'cont',
        f: (x) => (x < c ? a * x + b : d * x + e), fx0: L, left: String(L), right: String(L),
        why: 'Слева и справа предел равен \\(' + L + '\\), и \\(f(' + c + ') = ' + L + '\\): куски склеены, функция непрерывна (хотя в точке излом).',
      };
    },
  };

  function makePointTask() {
    const kind = pick(Object.keys(POINTS));
    return Object.assign({ gen: kind }, POINTS[kind]());
  }

  // ---------- «Подберите параметр» ----------
  const PARAMS = {
    linearToQuad() {
      let c, b, p, q, num;
      do { c = nz(-3, 3); b = nz(-5, 5); p = nz(-2, 2); q = nz(-6, 6); num = p * c * c + q - b; } while (num % c !== 0 && Math.random() < 0.7);
      const k = num / c;
      return {
        tex: 'f(x) = \\begin{cases} kx' + sg(b) + ', & x < ' + c + ', \\\\ ' + (p === 1 ? '' : p === -1 ? '-' : p) + 'x^2' + sg(q) + ', & x \\ge ' + c + ' \\end{cases}',
        ask: 'k', answer: k, answerTex: fr(num, c), x0: c, f: (x, P) => (x < c ? P * x + b : p * x * x + q),
        steps: [
          { title: 'Внутри каждого промежутка функция непрерывна (многочлены). Проблема только в точке склейки \\(x = ' + c + '\\): нужно, чтобы левый предел совпал со значением справа.', tex: null },
          { title: 'Левый предел:', tex: '\\lim_{x \\to ' + c + '^-} f(x) = ' + (c < 0 ? '(' + c + ')' : c) + 'k' + sg(b) },
          { title: 'Правый предел и значение в точке:', tex: 'f(' + c + ') = ' + p + ' \\cdot ' + (c < 0 ? '(' + c + ')' : c) + '^2' + sg(q) + ' = ' + (p * c * c + q) },
          { title: 'Приравниваем:', tex: (c < 0 ? '(' + c + ')' : c) + 'k' + sg(b) + ' = ' + (p * c * c + q) + ' \\;\\Rightarrow\\; k = ' + fr(num, c) },
        ],
      };
    },
    sinOverX() {
      const k = rnd(2, 7);
      return {
        tex: 'f(x) = \\begin{cases} \\frac{\\sin ' + k + 'x}{x}, & x \\ne 0, \\\\ A, & x = 0 \\end{cases}',
        ask: 'A', answer: k, answerTex: String(k), x0: 0, f: (x, P) => (x === 0 ? P : Math.sin(k * x) / x),
        steps: [
          { title: 'При \\(x \\ne 0\\) функция непрерывна. В нуле нужно \\(A = \\lim_{x \\to 0} f(x)\\).', tex: null },
          { title: 'Первый замечательный предел:', tex: '\\lim_{x \\to 0} \\frac{\\sin ' + k + 'x}{x} = \\lim_{x \\to 0} ' + k + ' \\cdot \\frac{\\sin ' + k + 'x}{' + k + 'x} = ' + k },
          { title: 'Значит:', tex: 'A = ' + k },
        ],
      };
    },
    squaresOverLinear() {
      const r = nz(-5, 5);
      return {
        tex: 'f(x) = \\begin{cases} \\frac{x^2 - ' + r * r + '}{' + xmPlain(r) + '}, & x \\ne ' + r + ', \\\\ A, & x = ' + r + ' \\end{cases}',
        ask: 'A', answer: 2 * r, answerTex: String(2 * r), x0: r, f: (x, P) => (x === r ? P : (x * x - r * r) / (x - r)),
        steps: [
          { title: 'Нужно \\(A = \\lim_{x \\to ' + r + '} f(x)\\). Раскладываем числитель:', tex: '\\frac{(' + xmPlain(r) + ')(' + 'x' + sg(r) + ')}{' + xmPlain(r) + '} = x' + sg(r) + ' \\quad (x \\ne ' + r + ')' },
          { title: 'Подставляем:', tex: 'A = ' + r + sg(r) + ' = ' + 2 * r },
        ],
      };
    },
    expOverX() {
      const k = rnd(2, 6);
      return {
        tex: 'f(x) = \\begin{cases} \\frac{e^{' + k + 'x} - 1}{x}, & x \\ne 0, \\\\ A, & x = 0 \\end{cases}',
        ask: 'A', answer: k, answerTex: String(k), x0: 0, f: (x, P) => (x === 0 ? P : (Math.exp(k * x) - 1) / x),
        steps: [
          { title: 'Нужно \\(A = \\lim_{x \\to 0} f(x)\\). Эквивалентность \\(e^t - 1 \\sim t\\):', tex: '\\lim_{x \\to 0} \\frac{e^{' + k + 'x} - 1}{x} = \\lim_{x \\to 0} \\frac{' + k + 'x}{x} = ' + k },
          { title: 'Значит:', tex: 'A = ' + k },
        ],
      };
    },
    cosQuad() {
      const k = rnd(1, 4);
      return {
        tex: 'f(x) = \\begin{cases} \\frac{1 - \\cos ' + (k === 1 ? '' : k) + 'x}{x^2}, & x \\ne 0, \\\\ A, & x = 0 \\end{cases}',
        ask: 'A', answer: (k * k) / 2, answerTex: fr(k * k, 2), x0: 0, f: (x, P) => (x === 0 ? P : (1 - Math.cos(k * x)) / (x * x)),
        steps: [
          { title: 'Нужно \\(A = \\lim_{x \\to 0} f(x)\\). Эквивалентность \\(1 - \\cos t \\sim \\frac{t^2}{2}\\):', tex: '\\lim_{x \\to 0} \\frac{1 - \\cos ' + (k === 1 ? '' : k) + 'x}{x^2} = \\lim_{x \\to 0} \\frac{(' + (k === 1 ? '' : k) + 'x)^2}{2x^2} = ' + fr(k * k, 2) },
          { title: 'Значит:', tex: 'A = ' + fr(k * k, 2) },
        ],
      };
    },
  };

  function makeParamTask() {
    const kind = pick(Object.keys(PARAMS));
    return Object.assign({ gen: kind }, PARAMS[kind]());
  }
  function checkParam(task, raw) {
    const p = LC.parseAnswer(raw);
    if (p.error) return { ok: false, invalid: true, message: p.error };
    if (p.none || !isFinite(p.value)) return { ok: false, message: 'Ответ — конкретное число.' };
    if (Math.abs(p.value - task.answer) < 1e-9 * Math.max(1, Math.abs(task.answer))) return { ok: true, message: 'Верно! При ' + task.ask + ' = ' + task.answerTex.replace(/\\frac\{(-?\d+)\}\{(\d+)\}/, '$1/$2') + ' функция непрерывна всюду.' };
    return { ok: false, message: 'Пока неверно. Найдите предел функции в особой точке (с обеих сторон) и приравняйте его к значению функции в этой точке.' };
  }

  // ---------- «Верно или неверно?» ----------
  const TF = [
    { tex: '\\text{Функция, непрерывная на } (0;\\,1), \\text{ ограничена.}', truth: false, why: 'Контрпример: \\(\\frac{1}{x}\\). Теорема Вейерштрасса требует <b>отрезок</b>.' },
    { tex: '\\text{Функция, непрерывная на } [a;\\,b], \\text{ достигает наибольшего значения.}', truth: true, why: 'Вторая теорема Вейерштрасса.' },
    { tex: '\\text{Функция, непрерывная и ограниченная на } (0;\\,1), \\text{ достигает максимума.}', truth: false, why: 'Контрпример: \\(f(x) = x\\) на \\((0; 1)\\): \\(\\sup = 1\\), но не достигается.' },
    { tex: 'f \\in C[a;\\,b],\\; f(a) f(b) < 0 \\;\\Rightarrow\\; \\text{корень единственный}', truth: false, why: 'Корень существует (Больцано — Коши), но может быть не один: \\(\\sin x\\) на \\([-1; 7]\\).' },
    { tex: 'f \\in C[a;\\,b] \\;\\Rightarrow\\; f \\text{ принимает все значения между } f(a) \\text{ и } f(b)', truth: true, why: 'Теорема о промежуточном значении (Больцано — Коши), применённая к \\(f(x) - c\\).' },
    { tex: '\\text{Функция, непрерывная на } \\mathbb{R}, \\text{ равномерно непрерывна.}', truth: false, why: 'Контрпример: \\(x^2\\). Чем дальше от нуля, тем круче график, и \\(\\delta\\) приходится брать всё меньше.' },
    { tex: '\\sqrt{x} \\text{ равномерно непрерывна на } [0;\\,+\\infty)', truth: true, why: '\\(|\\sqrt{x} - \\sqrt{y}| \\le \\sqrt{|x - y|}\\), поэтому подходит \\(\\delta = \\varepsilon^2\\) для всех точек сразу. Неограниченная производная в нуле не мешает!' },
    { tex: '\\sin\\frac{1}{x} \\text{ равномерно непрерывна на } (0;\\,1)', truth: false, why: 'Точки \\(\\frac{1}{\\pi n}\\) и \\(\\frac{1}{\\pi/2 + \\pi n}\\) сколь угодно близки, а значения отличаются на 1.' },
    { tex: 'f \\text{ непрерывна} \\;\\Rightarrow\\; |f| \\text{ непрерывна}', truth: true, why: '\\(\\bigl||f(x)| - |f(x_0)|\\bigr| \\le |f(x) - f(x_0)|\\).' },
    { tex: '|f| \\text{ непрерывна} \\;\\Rightarrow\\; f \\text{ непрерывна}', truth: false, why: 'Контрпример: \\(f = 1\\) на \\(\\mathbb{Q}\\) и \\(-1\\) вне \\(\\mathbb{Q}\\). Тогда \\(|f| \\equiv 1\\), а \\(f\\) разрывна всюду.' },
    { tex: '\\text{Сумма непрерывной в } x_0 \\text{ и разрывной в } x_0 \\text{ функций разрывна в } x_0', truth: true, why: 'Если бы \\(f + g\\) была непрерывна, то и \\(g = (f + g) - f\\) была бы непрерывна как разность непрерывных.' },
    { tex: '\\text{Произведение двух функций, разрывных в } x_0, \\text{ может быть непрерывно в } x_0', truth: true, why: 'Возьмите \\(f = g = \\operatorname{sign} x\\) с \\(f(0) = 1\\): \\(f \\cdot g \\equiv 1\\).' },
    { tex: '\\text{Монотонная функция может иметь лишь разрывы 1-го рода}', truth: true, why: 'У монотонной функции в каждой точке есть односторонние пределы (это sup и inf значений с одной стороны), поэтому разрывов 2-го рода нет. И их не больше чем счётно.' },
    { tex: '\\text{Непрерывная функция переводит отрезок в отрезок}', truth: true, why: 'По Вейерштрассу образ ограничен и содержит \\(\\min\\) и \\(\\max\\), по Больцано — Коши — всё между ними.' },
    { tex: '\\text{Непрерывная функция переводит интервал в интервал}', truth: false, why: 'Контрпример: \\(\\sin x\\) переводит \\((0; 2\\pi)\\) в отрезок \\([-1; 1]\\). Образ интервала — промежуток, но не обязательно интервал.' },
    { tex: '\\text{Многочлен нечётной степени имеет вещественный корень}', truth: true, why: 'При \\(x \\to \\pm\\infty\\) он принимает значения разных знаков, а по Больцано — Коши между ними есть ноль.' },
    { tex: '\\text{У функции Дирихле } D(x) = [x \\in \\mathbb{Q}] \\text{ все точки — разрывы 2-го рода}', truth: true, why: 'Рядом с любой точкой есть и рациональные, и иррациональные числа, поэтому ни один односторонний предел не существует.' },
    { tex: 'f \\text{ непрерывна в } x_0 \\;\\Rightarrow\\; f \\text{ дифференцируема в } x_0', truth: false, why: 'Контрпример: \\(|x|\\) в нуле. Обратное верно: дифференцируемость влечёт непрерывность.' },
  ];

  // ---------- Бисекция ----------
  function bisect(f, a, b, steps) {
    const out = [];
    let fa = f(a);
    for (let i = 0; i < steps; i++) {
      const m = (a + b) / 2, fm = f(m);
      out.push({ a, b, m, fa, fm });
      if (fm === 0) { a = b = m; break; }
      if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
    }
    return { steps: out, a, b };
  }

  return { KINDS, POINTS, makePointTask, PARAMS, makeParamTask, checkParam, TF, bisect, pick };
});
