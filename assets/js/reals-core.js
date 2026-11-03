// Задачи «найдите sup и inf множества» и «найдите lim sup и lim inf последовательности»
// с пошаговыми решениями. Зависит от Expr и LimCore (разбор ответа: числа, √2, e, ∞).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./expr.js'), require('./limits-core.js'));
  else root.RealsCore = factory(root.Expr, root.LimCore);
})(typeof self !== 'undefined' ? self : this, function (E, LC) {
  'use strict';

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (min, max) => { let v; do { v = rnd(min, max); } while (v === 0); return v; };
  const fr = LC.fr;
  const sf = (k, den) => (k < 0 ? ' - ' : ' + ') + '\\frac{' + Math.abs(k) + '}{' + den + '}';
  const sg = (v) => (v < 0 ? ' - ' + -v : ' + ' + v);
  const cf = (k) => (k === 1 ? '' : k === -1 ? '-' : String(k));
  const NN = 'n \\in \\mathbb{N}';
  const INF = '+\\infty', NINF = '-\\infty';

  // ---------- sup и inf множеств ----------
  // Каждый генератор: { tex, sup, inf, supTex, infTex, max, min, steps, sample() }
  // max/min — достигается ли sup/inf (то есть является ли он наибольшим/наименьшим элементом)
  const SETS = {
    aPlusBn() {
      const a = nz(-5, 5), b = nz(-6, 6);
      const top = b > 0;
      return {
        tex: 'A = \\left\\{ ' + a + sf(b, 'n') + ' \\;\\middle|\\; ' + NN + ' \\right\\}',
        sup: top ? a + b : a, inf: top ? a : a + b,
        supTex: String(top ? a + b : a), infTex: String(top ? a : a + b),
        max: top, min: !top,
        sample: () => Array.from({ length: 5000 }, (_, i) => a + b / (i + 1)),
        steps: [
          { title: 'Дробь \\(\\frac{' + Math.abs(b) + '}{n}\\) убывает с ростом \\(n\\), поэтому элементы ' + (top ? 'убывают' : 'возрастают') + '. Крайний элемент — при \\(n = 1\\): \\(' + (a + b) + '\\).', tex: null },
          { title: top ? 'Значит, \\(' + (a + b) + '\\) — наибольший элемент. Наибольший элемент всегда является точной верхней гранью:' : 'Значит, \\(' + (a + b) + '\\) — наименьший элемент, он же точная нижняя грань:', tex: (top ? '\\sup A = \\max A = ' : '\\inf A = \\min A = ') + (a + b) },
          { title: 'С другой стороны, \\(\\frac{' + Math.abs(b) + '}{n} &gt; 0\\), поэтому все элементы ' + (top ? 'больше' : 'меньше') + ' \\(' + a + '\\), но подходят к нему сколь угодно близко: для \\(\\varepsilon &gt; 0\\) возьмём \\(n &gt; \\frac{' + Math.abs(b) + '}{\\varepsilon}\\).', tex: (top ? '\\inf A = ' : '\\sup A = ') + a + ' \\notin A' },
          { title: 'Число \\(' + a + '\\) не достигается: \\(' + a + sf(b, 'n') + ' \\ne ' + a + '\\) ни при каком \\(n\\). Поэтому ' + (top ? 'наименьшего' : 'наибольшего') + ' элемента нет.', tex: null },
        ],
      };
    },
    altOverN() {
      const c = rnd(1, 6);
      return {
        tex: 'A = \\left\\{ \\frac{(-1)^n \\cdot ' + c + '}{n} \\;\\middle|\\; ' + NN + ' \\right\\}',
        sup: c / 2, inf: -c, supTex: fr(c, 2), infTex: String(-c), max: true, min: true,
        sample: () => Array.from({ length: 5000 }, (_, i) => (Math.pow(-1, i + 1) * c) / (i + 1)),
        steps: [
          { title: 'Выпишем элементы: при нечётных \\(n\\) они отрицательны, при чётных положительны:', tex: '-' + c + ',\\; ' + fr(c, 2) + ',\\; -' + fr(c, 3) + ',\\; ' + fr(c, 4) + ',\\; -' + fr(c, 5) + ',\\; \\ldots' },
          { title: 'Положительные элементы \\(\\frac{' + c + '}{n}\\) (чётные \\(n\\)) убывают, наибольший из них при \\(n = 2\\):', tex: '\\sup A = \\max A = ' + fr(c, 2) },
          { title: 'Отрицательные \\(-\\frac{' + c + '}{n}\\) (нечётные \\(n\\)) возрастают, наименьший при \\(n = 1\\):', tex: '\\inf A = \\min A = -' + c },
          { title: 'Обе грани достигаются. Заметьте: 0 — предел последовательности, но не грань множества.', tex: null },
        ],
      };
    },
    altPlusRecip() {
      const k = rnd(1, 4);
      return {
        tex: 'A = \\left\\{ ' + (k === 1 ? '' : k) + '(-1)^n + \\frac{1}{n} \\;\\middle|\\; ' + NN + ' \\right\\}',
        sup: k + 0.5, inf: -k, supTex: fr(2 * k + 1, 2), infTex: String(-k), max: true, min: false,
        sample: () => Array.from({ length: 5000 }, (_, i) => k * Math.pow(-1, i + 1) + 1 / (i + 1)),
        steps: [
          { title: 'Разобьём на чётные и нечётные номера.', tex: 'n = 2m\\colon\\; ' + k + ' + \\frac{1}{2m}, \\qquad n = 2m - 1\\colon\\; -' + k + ' + \\frac{1}{2m - 1}' },
          { title: 'Чётные элементы убывают; наибольший из них при \\(n = 2\\): \\(' + k + ' + \\frac{1}{2}\\). Нечётные не больше \\(-' + k + ' + 1\\), то есть заведомо меньше. Значит:', tex: '\\sup A = \\max A = ' + fr(2 * k + 1, 2) },
          { title: 'Нечётные элементы \\(-' + k + ' + \\frac{1}{2m - 1}\\) больше \\(-' + k + '\\) и сколь угодно близки к нему; чётные ещё больше. Поэтому:', tex: '\\inf A = -' + k + ' \\notin A' },
          { title: 'Нижняя грань не достигается: наименьшего элемента нет.', tex: null },
        ],
      };
    },
    interval() {
      let a = nz(-6, 4), b = a + rnd(1, 6);
      const kind = pick(['(]', '[)', '()', '[]']);
      const lc = kind[0] === '[', rc = kind[1] === ']';
      return {
        tex: 'A = ' + (lc ? '[' : '(') + a + ';\\ ' + b + (rc ? ']' : ')'),
        sup: b, inf: a, supTex: String(b), infTex: String(a), max: rc, min: lc,
        sample: () => {
          const out = [];
          for (let i = 1; i < 4000; i++) out.push(a + ((b - a) * i) / 4000);
          if (lc) out.push(a);
          if (rc) out.push(b);
          return out;
        },
        steps: [
          { title: 'Все элементы лежат между \\(' + a + '\\) и \\(' + b + '\\), значит, \\(' + b + '\\) — верхняя граница, \\(' + a + '\\) — нижняя.', tex: null },
          { title: 'Меньшего числа в роли верхней границы взять нельзя: для любого \\(\\varepsilon &gt; 0\\) в промежутке есть точки правее \\(' + b + ' - \\varepsilon\\). Аналогично для нижней.', tex: '\\sup A = ' + b + ', \\qquad \\inf A = ' + a },
          { title: (rc ? 'Правый конец входит в промежуток, это наибольший элемент.' : 'Правый конец не входит (круглая скобка): наибольшего элемента нет, хотя sup есть.') + ' ' + (lc ? 'Левый конец входит — это наименьший элемент.' : 'Левый конец не входит: наименьшего элемента нет.'), tex: null },
        ],
      };
    },
    squareLess() {
      const k = rnd(1, 6), strict = Math.random() < 0.6;
      return {
        tex: 'A = \\left\\{ x \\in \\mathbb{R} \\;\\middle|\\; x^2 ' + (strict ? '<' : '\\le') + ' ' + k * k + ' \\right\\}',
        sup: k, inf: -k, supTex: String(k), infTex: String(-k), max: !strict, min: !strict,
        sample: () => {
          const out = [];
          for (let i = 1; i < 4000; i++) out.push(-k + (2 * k * i) / 4000);
          if (!strict) out.push(-k, k);
          return out;
        },
        steps: [
          { title: 'Решаем неравенство:', tex: 'x^2 ' + (strict ? '<' : '\\le') + ' ' + k * k + ' \\iff ' + (strict ? '-' + k + ' < x < ' + k : '-' + k + ' \\le x \\le ' + k) },
          { title: 'Это ' + (strict ? 'интервал' : 'отрезок') + ', его грани — концы:', tex: '\\sup A = ' + k + ', \\qquad \\inf A = -' + k },
          { title: strict ? 'Неравенство строгое, концы не входят: ни максимума, ни минимума нет.' : 'Неравенство нестрогое, концы входят: это максимум и минимум.', tex: null },
        ],
      };
    },
    nOverNk() {
      const k = rnd(1, 5);
      return {
        tex: 'A = \\left\\{ \\frac{n}{n + ' + k + '} \\;\\middle|\\; ' + NN + ' \\right\\}',
        sup: 1, inf: 1 / (1 + k), supTex: '1', infTex: fr(1, 1 + k), max: false, min: true,
        sample: () => Array.from({ length: 5000 }, (_, i) => (i + 1) / (i + 1 + k)),
        steps: [
          { title: 'Перепишем элемент так, чтобы было видно монотонность:', tex: '\\frac{n}{n + ' + k + '} = 1 - \\frac{' + k + '}{n + ' + k + '}' },
          { title: 'Вычитаемое уменьшается, поэтому элементы возрастают. Наименьший — при \\(n = 1\\):', tex: '\\inf A = \\min A = ' + fr(1, 1 + k) },
          { title: 'Все элементы меньше 1 и стремятся к 1:', tex: '\\sup A = 1 \\notin A' },
          { title: 'Верхняя грань не достигается: наибольшего элемента нет.', tex: null },
        ],
      };
    },
    diffRecip() {
      return {
        tex: 'A = \\left\\{ \\frac{1}{n} - \\frac{1}{m} \\;\\middle|\\; n, m \\in \\mathbb{N} \\right\\}',
        sup: 1, inf: -1, supTex: '1', infTex: '-1', max: false, min: false,
        sample: () => {
          const out = [];
          for (let n = 1; n < 300; n++) for (let m = 1; m < 300; m += 7) out.push(1 / n - 1 / m);
          return out;
        },
        steps: [
          { title: 'Оценка сверху: \\(\\frac{1}{n} \\le 1\\) и \\(\\frac{1}{m} &gt; 0\\), поэтому каждый элемент меньше 1.', tex: '\\frac{1}{n} - \\frac{1}{m} < 1' },
          { title: 'Это точная граница: при \\(n = 1\\) и большом \\(m\\) элементы \\(1 - \\frac{1}{m}\\) сколь угодно близки к 1.', tex: '\\sup A = 1' },
          { title: 'Множество симметрично (поменяйте \\(n\\) и \\(m\\) местами — элемент сменит знак), поэтому:', tex: '\\inf A = -1' },
          { title: 'Ни одна грань не достигается: равенство \\(\\frac{1}{n} - \\frac{1}{m} = 1\\) требует \\(\\frac{1}{m} = 0\\).', tex: null },
        ],
      };
    },
    rationalSqrt() {
      const p = pick([2, 3, 5, 6, 7]);
      const r = Math.sqrt(p);
      return {
        tex: 'A = \\left\\{ x \\in \\mathbb{Q} \\;\\middle|\\; x^2 < ' + p + ' \\right\\}',
        sup: r, inf: -r, supTex: '\\sqrt{' + p + '}', infTex: '-\\sqrt{' + p + '}', max: false, min: false,
        sample: () => {
          const out = [];
          for (let q = 1; q <= 60; q++) for (let s = -Math.ceil(r * q); s <= Math.ceil(r * q); s++) if ((s / q) ** 2 < p) out.push(s / q);
          return out;
        },
        steps: [
          { title: 'Это рациональные точки интервала \\((-\\sqrt{' + p + '};\\ \\sqrt{' + p + '})\\).', tex: null },
          { title: 'Рациональные числа плотны: в любой окрестности \\(\\sqrt{' + p + '}\\) слева есть рациональные точки множества. Поэтому:', tex: '\\sup A = \\sqrt{' + p + '}, \\qquad \\inf A = -\\sqrt{' + p + '}' },
          { title: 'Грани иррациональны (\\(\\sqrt{' + p + '} \\notin \\mathbb{Q}\\)), поэтому в множество не входят. Важно: в \\(\\mathbb{Q}\\) у этого множества вообще <b>нет</b> точной верхней грани — именно эту «дыру» закрывает аксиома полноты.', tex: null },
        ],
      };
    },
    unbounded() {
      const k = rnd(1, 4), b = nz(-6, 6);
      return {
        tex: 'A = \\left\\{ ' + (k === 1 ? '' : k) + 'n' + sg(b) + ' \\;\\middle|\\; ' + NN + ' \\right\\}',
        sup: Infinity, inf: k + b, supTex: INF, infTex: String(k + b), max: false, min: true,
        sample: () => Array.from({ length: 2000 }, (_, i) => k * (i + 1) + b),
        steps: [
          { title: 'Элементы возрастают и неограниченно растут (принцип Архимеда), верхних границ нет. По соглашению:', tex: '\\sup A = +\\infty' },
          { title: 'Наименьший элемент — при \\(n = 1\\):', tex: '\\inf A = \\min A = ' + (k + b) },
        ],
      };
    },
  };

  // ---------- lim sup и lim inf последовательностей ----------
  // Каждый: { tex, sup (lim sup), inf (lim inf), supTex, infTex, steps, f(n) }
  const SEQS = {
    altShift() {
      const A = nz(-4, 4), B = nz(-5, 5), C = nz(-5, 5);
      const hi = B + Math.abs(A), lo = B - Math.abs(A);
      return {
        tex: 'a_n = ' + cf(A) + '(-1)^n' + sg(B) + sf(C, 'n'),
        sup: hi, inf: lo, supTex: String(hi), infTex: String(lo),
        f: (n) => A * Math.pow(-1, n) + B + C / n,
        steps: [
          { title: 'Множитель \\((-1)^n\\) принимает два значения, поэтому смотрим на подпоследовательности чётных и нечётных номеров:', tex: 'a_{2m} = ' + (A + B) + sf(C, '2m') + ' \\to ' + (A + B) + ', \\qquad a_{2m-1} = ' + (B - A) + sf(C, '2m - 1') + ' \\to ' + (B - A) },
          { title: 'Каждый член попадает в одну из двух подпоследовательностей, поэтому других частичных пределов нет. Их множество:', tex: '\\{' + Math.min(A + B, B - A) + ',\\ ' + Math.max(A + B, B - A) + '\\}' },
          { title: 'Верхний предел — наибольший частичный предел, нижний — наименьший:', tex: '\\varlimsup_{n \\to \\infty} a_n = ' + hi + ', \\qquad \\varliminf_{n \\to \\infty} a_n = ' + lo },
        ],
      };
    },
    sinHalf() {
      const k = rnd(1, 5);
      return {
        tex: 'a_n = ' + (k === 1 ? '' : k) + '\\sin\\frac{\\pi n}{2}' + ' + \\frac{1}{n}',
        sup: k, inf: -k, supTex: String(k), infTex: String(-k),
        f: (n) => k * Math.sin((Math.PI * n) / 2) + 1 / n,
        steps: [
          { title: '\\(\\sin\\frac{\\pi n}{2}\\) периодичен с периодом 4: значения \\(1, 0, -1, 0, 1, 0, -1, \\ldots\\) Разбиваем на 4 подпоследовательности по остатку \\(n\\) от деления на 4:', tex: 'a_{4m+1} \\to ' + k + ', \\quad a_{4m+2} \\to 0, \\quad a_{4m+3} \\to -' + k + ', \\quad a_{4m} \\to 0' },
          { title: 'Слагаемое \\(\\frac{1}{n} \\to 0\\) на частичные пределы не влияет. Множество частичных пределов \\(\\{-' + k + ',\\ 0,\\ ' + k + '\\}\\):', tex: '\\varlimsup a_n = ' + k + ', \\qquad \\varliminf a_n = -' + k },
        ],
      };
    },
    cosThird() {
      const k = rnd(1, 4);
      return {
        tex: 'a_n = ' + (k === 1 ? '' : k) + '\\cos\\frac{2\\pi n}{3}',
        sup: k, inf: -k / 2, supTex: String(k), infTex: fr(-k, 2),
        f: (n) => k * Math.cos((2 * Math.PI * n) / 3),
        steps: [
          { title: 'Период 3: при \\(n = 1, 2, 3\\) косинус равен \\(-\\frac{1}{2}, -\\frac{1}{2}, 1\\), дальше повторяется.', tex: 'a_n \\in \\left\\{ ' + fr(-k, 2) + ',\\ ' + k + ' \\right\\}' },
          { title: 'Каждое значение встречается бесконечно много раз и само является частичным пределом (постоянная подпоследовательность):', tex: '\\varlimsup a_n = ' + k + ', \\qquad \\varliminf a_n = ' + fr(-k, 2) },
          { title: 'Обратите внимание: \\(\\varliminf\\) — это не \\(-' + k + '\\). Значения \\(-' + k + '\\) последовательность вообще не принимает.', tex: null },
        ],
      };
    },
    eTrick() {
      return {
        tex: 'a_n = \\left(1 + \\frac{(-1)^n}{n}\\right)^n',
        sup: Math.E, inf: 1 / Math.E, supTex: 'e', infTex: 'e^{-1}',
        f: (n) => Math.pow(1 + Math.pow(-1, n) / n, n),
        steps: [
          { title: 'Чётные номера: второй замечательный предел.', tex: 'a_{2m} = \\left(1 + \\frac{1}{2m}\\right)^{2m} \\to e' },
          { title: 'Нечётные номера: \\(\\left(1 - \\frac{1}{n}\\right)^n \\to e^{-1}\\) (тот же предел с \\(-1\\) вместо 1).', tex: 'a_{2m-1} = \\left(1 - \\frac{1}{2m - 1}\\right)^{2m - 1} \\to \\frac{1}{e}' },
          { title: 'Итого:', tex: '\\varlimsup a_n = e, \\qquad \\varliminf a_n = \\frac{1}{e}' },
        ],
      };
    },
    halfInfinite() {
      return {
        tex: 'a_n = \\left((-1)^n + 1\\right) n',
        sup: Infinity, inf: 0, supTex: INF, infTex: '0',
        f: (n) => (Math.pow(-1, n) + 1) * n,
        steps: [
          { title: 'Чётные номера: \\(a_{2m} = 4m \\to +\\infty\\). Нечётные: \\(a_{2m-1} = 0\\).', tex: null },
          { title: 'Последовательность не ограничена сверху, поэтому верхний предел бесконечен; нижний — наименьший частичный предел:', tex: '\\varlimsup a_n = +\\infty, \\qquad \\varliminf a_n = 0' },
        ],
      };
    },
    powerAlt() {
      return {
        tex: 'a_n = n^{(-1)^n}',
        sup: Infinity, inf: 0, supTex: INF, infTex: '0',
        f: (n) => Math.pow(n, Math.pow(-1, n)),
        steps: [
          { title: 'Чётные номера: \\(a_{2m} = 2m \\to +\\infty\\). Нечётные: \\(a_{2m-1} = \\frac{1}{2m - 1} \\to 0\\).', tex: null },
          { title: 'Итого:', tex: '\\varlimsup a_n = +\\infty, \\qquad \\varliminf a_n = 0' },
          { title: 'Заметьте: \\(\\varliminf = 0\\), хотя ни один член не равен нулю. Верхний и нижний пределы — это пределы, а не значения.', tex: null },
        ],
      };
    },
    bothInfinite() {
      const k = rnd(1, 3);
      return {
        tex: 'a_n = (-1)^n ' + (k === 1 ? 'n' : 'n^' + k),
        sup: Infinity, inf: -Infinity, supTex: INF, infTex: NINF,
        f: (n) => Math.pow(-1, n) * Math.pow(n, k),
        steps: [
          { title: 'Чётные члены \\(\\to +\\infty\\), нечётные \\(\\to -\\infty\\). Последовательность не ограничена ни сверху, ни снизу:', tex: '\\varlimsup a_n = +\\infty, \\qquad \\varliminf a_n = -\\infty' },
        ],
      };
    },
    convergent() {
      const a = nz(-5, 5), b = nz(-9, 9), c = rnd(1, 4), d = rnd(1, 9);
      return {
        tex: 'a_n = \\frac{' + E.tex(E.simplify(E.parse(a + 'x' + sg(b)))).replace(/x/g, 'n') + '}{' + E.tex(E.simplify(E.parse(c + 'x' + sg(d)))).replace(/x/g, 'n') + '}',
        sup: a / c, inf: a / c, supTex: fr(a, c), infTex: fr(a, c),
        f: (n) => (a * n + b) / (c * n + d),
        steps: [
          { title: 'Последовательность сходится (делим на \\(n\\)):', tex: '\\lim_{n \\to \\infty} a_n = ' + fr(a, c) },
          { title: 'У сходящейся последовательности любая подпоследовательность сходится к тому же пределу, поэтому частичный предел один:', tex: '\\varlimsup a_n = \\varliminf a_n = ' + fr(a, c) },
          { title: 'Это общий факт: предел существует тогда и только тогда, когда \\(\\varlimsup a_n = \\varliminf a_n\\).', tex: null },
        ],
      };
    },
  };

  function makeSupTask() {
    const kind = pick(Object.keys(SETS));
    return Object.assign({ kind, type: 'sup' }, SETS[kind]());
  }
  function makeLimsupTask() {
    const kind = pick(Object.keys(SEQS));
    return Object.assign({ kind, type: 'limsup' }, SEQS[kind]());
  }

  // ---------- Проверка ответа ----------
  const close = (x, y) => (isFinite(y) ? isFinite(x) && Math.abs(x - y) < 1e-9 * Math.max(1, Math.abs(y)) : x === y);

  // rawS, rawI — ответы для верхней и нижней грани/предела; attS, attI — отмечено ли «достигается»
  function check(task, rawS, rawI, attS, attI) {
    const ps = LC.parseAnswer(rawS), pi = LC.parseAnswer(rawI);
    const names = task.type === 'sup' ? ['sup', 'inf'] : ['lim sup', 'lim inf'];
    if (ps.error) return { ok: false, invalid: true, message: names[0] + ': ' + ps.error };
    if (pi.error) return { ok: false, invalid: true, message: names[1] + ': ' + pi.error };
    if (ps.none || pi.none) return { ok: false, message: 'В расширенной числовой прямой эти величины существуют всегда: если множество не ограничено, ответ \\(\\pm\\infty\\).' };
    const okS = close(ps.value, task.sup), okI = close(pi.value, task.inf);
    const msgs = [];
    if (!okS) {
      if (close(ps.value, task.inf) && close(pi.value, task.sup)) return { ok: false, message: 'Значения перепутаны местами: верхняя грань не меньше нижней.' };
      msgs.push(names[0] + ' найден неверно.');
    }
    if (!okI) msgs.push(names[1] + ' найден неверно.');
    if (msgs.length) return { ok: false, message: msgs.join(' ') + ' Откройте подсказку или решение по шагам.', partial: okS || okI };
    if (task.type === 'sup') {
      const am = [];
      if (attS !== task.max) am.push(task.max ? 'sup достигается: это наибольший элемент множества (max).' : 'sup не достигается: он не принадлежит множеству, поэтому максимума нет.');
      if (attI !== task.min) am.push(task.min ? 'inf достигается: это наименьший элемент (min).' : 'inf не достигается: минимума нет.');
      if (am.length) return { ok: false, message: 'Сами грани верны! Но: ' + am.join(' ') };
    }
    return { ok: true, message: task.type === 'sup' ? 'Верно: и грани, и их достижимость.' : 'Верно!' };
  }

  const hint = (task) => 'С чего начать: ' + task.steps[0].title;

  return { SETS, SEQS, makeSupTask, makeLimsupTask, check, hint };
});
