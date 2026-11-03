// Множества и отображения: выражения с A, B, C (разбор, области диаграммы Венна, равенство),
// конечные отображения (инъекция/сюръекция), банки задач про функции на ℝ и счётность.
// Работает и в браузере (window.SetsCore), и в Node (module.exports).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SetsCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  // =====================================================================
  // 1. Выражения над множествами
  // =====================================================================
  // Узлы: {t:'set',name:'A'|'B'|'C'} {t:'comp',a} {t:'cup'|'cap'|'minus'|'sym',a,b}
  class ParseError extends Error {}

  function tokenize(src) {
    const out = [];
    const s = String(src);
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (/\s/.test(ch)) continue;
      if (/[ABCabcАВСавс]/.test(ch)) {
        const map = { А: 'A', В: 'B', С: 'C', а: 'A', в: 'B', с: 'C' };
        out.push({ t: 'set', name: (map[ch] || ch).toUpperCase() });
      } else if ('∪|+Uu'.includes(ch)) out.push({ t: 'cup' });
      else if ('∩&*'.includes(ch)) out.push({ t: 'cap' });
      else if ('\\-−∖'.includes(ch)) out.push({ t: 'minus' });
      else if ('Δ△^'.includes(ch)) out.push({ t: 'sym' });
      else if ("'ᶜ".includes(ch)) out.push({ t: 'post' });
      else if ('~!¬'.includes(ch)) out.push({ t: 'pre' });
      else if (ch === '(' || ch === ')') out.push({ t: ch });
      else throw new ParseError('Непонятный символ «' + ch + '». Множества — A, B, C; операции: ∪ (или +, |), ∩ (или &, *), \\ (или -), Δ (или ^), дополнение — A\' или ~A.');
    }
    return out;
  }

  function parse(src) {
    const tk = tokenize(src);
    if (!tk.length) throw new ParseError('Введите выражение.');
    let p = 0;
    const is = (t) => tk[p] && tk[p].t === t;
    // приоритет: дополнение > ∩ > (∪, \, Δ) слева направо
    function expr() {
      let n = term();
      while (is('cup') || is('minus') || is('sym')) { const o = tk[p++].t; n = { t: o, a: n, b: term() }; }
      return n;
    }
    function term() {
      let n = factor();
      while (is('cap')) { p++; n = { t: 'cap', a: n, b: factor() }; }
      return n;
    }
    function factor() {
      if (is('pre')) { p++; return { t: 'comp', a: factor() }; }
      let n = atom();
      while (is('post')) { p++; n = { t: 'comp', a: n }; }
      return n;
    }
    function atom() {
      const t = tk[p++];
      if (!t) throw new ParseError('Выражение оборвалось: чего-то не хватает в конце.');
      if (t.t === 'set') return { t: 'set', name: t.name };
      if (t.t === '(') {
        const n = expr();
        if (!is(')')) throw new ParseError('Не хватает закрывающей скобки.');
        p++;
        return n;
      }
      throw new ParseError('Не на месте операция или скобка.');
    }
    const n = expr();
    if (p < tk.length) throw new ParseError(is(')') ? 'Лишняя закрывающая скобка.' : 'Не удалось разобрать выражение: возможно, пропущена операция между множествами.');
    return n;
  }

  // Принадлежность области: m — объект {A:bool, B:bool, C:bool}
  function member(n, m) {
    switch (n.t) {
      case 'set': return !!m[n.name];
      case 'comp': return !member(n.a, m);
      case 'cup': return member(n.a, m) || member(n.b, m);
      case 'cap': return member(n.a, m) && member(n.b, m);
      case 'minus': return member(n.a, m) && !member(n.b, m);
      case 'sym': return member(n.a, m) !== member(n.b, m);
    }
    return false;
  }

  function names(n, set) {
    set = set || new Set();
    if (n.t === 'set') set.add(n.name);
    if (n.a) names(n.a, set);
    if (n.b) names(n.b, set);
    return set;
  }

  // Области диаграммы: для k множеств — 2^k областей, индекс — битовая маска (A — старший бит)
  const SETNAMES = ['A', 'B', 'C'];
  function regionMembers(k, idx) {
    const m = {};
    SETNAMES.slice(0, k).forEach((s, j) => { m[s] = !!(idx & (1 << (k - 1 - j))); });
    return m;
  }
  function regions(n, k) {
    const out = [];
    for (let i = 0; i < 1 << k; i++) out.push(member(n, regionMembers(k, i)));
    return out;
  }
  // Сколько множеств рисовать: 2, если выражения используют только A и B
  const arity = (...asts) => (asts.some((a) => names(a).has('C')) ? 3 : 2);

  function equalSets(a, b) {
    const k = arity(a, b);
    const ra = regions(a, k), rb = regions(b, k);
    const diff = ra.map((v, i) => v !== rb[i]);
    return { equal: !diff.some(Boolean), k, ra, rb, diff };
  }

  // Подпись области словами: «в A и C, не в B»
  function regionText(k, idx) {
    const m = regionMembers(k, idx);
    const ins = SETNAMES.slice(0, k).filter((s) => m[s]);
    const outs = SETNAMES.slice(0, k).filter((s) => !m[s]);
    const list = (xs) => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' и ' + xs[xs.length - 1] : xs[0]);
    if (!ins.length) return 'вне всех множеств';
    return 'в ' + list(ins) + (outs.length ? ', но не в ' + list(outs) : '');
  }

  const OPTEX = { cup: '\\cup', cap: '\\cap', minus: '\\setminus', sym: '\\triangle' };
  const BIN = { cup: 1, cap: 1, minus: 1, sym: 1 };
  function tex(n) {
    switch (n.t) {
      case 'set': return n.name;
      case 'comp': return '\\overline{' + tex(n.a) + '}';
      default: {
        const w = (c, cond) => (cond ? '(' + tex(c) + ')' : tex(c));
        // скобки у любой вложенной операции другого вида (и у правой части \ и Δ) — так однозначнее
        return w(n.a, BIN[n.a.t] && n.a.t !== n.t) + ' ' + OPTEX[n.t] + ' ' + w(n.b, BIN[n.b.t] && (n.b.t !== n.t || n.t === 'minus'));
      }
    }
  }

  // Перевод в логику: x ∈ выражение ⇔ формула про «x ∈ A», «x ∈ B»…
  function logicTex(n) {
    const w = (c) => (BIN[c.t] ? '(' + logicTex(c) + ')' : logicTex(c));
    // отрицание без двойных «не»: ¬(x ∈ A) = x ∉ A, ¬(x ∉ A) = x ∈ A
    const neg = (c) => (c.t === 'set' ? 'x \\notin ' + c.name : c.t === 'comp' ? w(c.a) : '\\neg(' + logicTex(c) + ')');
    switch (n.t) {
      case 'set': return 'x \\in ' + n.name;
      case 'comp': return neg(n.a);
      case 'cup': return w(n.a) + ' \\lor ' + w(n.b);
      case 'cap': return w(n.a) + ' \\land ' + w(n.b);
      case 'minus': return w(n.a) + ' \\land ' + neg(n.b);
      case 'sym': return '(' + logicTex(n.a) + ') \\not\\Leftrightarrow (' + logicTex(n.b) + ')'; // ровно одно из двух
    }
    return '';
  }

  // Пары для тренажёра «равны ли множества?» (ответ вычисляется)
  const EQ_PAIRS = [
    ["(A ∪ B)'", "A' ∩ B'", 'Закон де Моргана для множеств — то же, что для логики: «не (в A или в B)» = «не в A и не в B».'],
    ["(A ∩ B)'", "A' ∪ B'", 'Закон де Моргана.'],
    ["(A ∪ B)'", "A' ∪ B'", 'При дополнении объединение должно превратиться в пересечение.'],
    ['A \\ (B ∪ C)', '(A \\ B) ∩ (A \\ C)', 'Убрать из A элементы B или C — значит убрать и те, и другие.'],
    ['A \\ (B ∩ C)', '(A \\ B) ∪ (A \\ C)', 'Аналог закона де Моргана для разности.'],
    ['A \\ (B ∪ C)', '(A \\ B) ∪ (A \\ C)', 'Справа остаются элементы, которые не попали лишь в одно из B, C.'],
    ['A ∩ (B ∪ C)', '(A ∩ B) ∪ (A ∩ C)', 'Дистрибутивность пересечения относительно объединения.'],
    ['A ∪ (B ∩ C)', '(A ∪ B) ∩ (A ∪ C)', 'Дистрибутивность объединения относительно пересечения — у множеств она тоже есть (в отличие от чисел).'],
    ['A ∪ (B ∩ C)', '(A ∪ B) ∩ C', 'Скобки нельзя переставлять: элементы A вне C теряются.'],
    ["A \\ B", "A ∩ B'", 'Разность — это пересечение с дополнением.'],
    ['(A \\ B) ∪ B', 'A', 'На самом деле (A \\ B) ∪ B = A ∪ B: «вычесть и прибавить обратно» не возвращает A.'],
    ['(A ∪ B) \\ B', 'A', 'На самом деле (A ∪ B) \\ B = A \\ B: общие с B элементы A тоже пропадают.'],
    ['A Δ B', '(A ∪ B) \\ (A ∩ B)', 'Симметрическая разность — элементы ровно одного из множеств.'],
    ['A Δ B', '(A \\ B) ∪ (B \\ A)', 'Ещё одна запись симметрической разности.'],
    ['(A Δ B) Δ C', 'A Δ (B Δ C)', 'Симметрическая разность ассоциативна: это элементы, лежащие в нечётном числе множеств.'],
    ['A \\ (B \\ C)', '(A \\ B) \\ C', 'Разность не ассоциативна.'],
    ['A \\ (B \\ C)', '(A \\ B) ∪ (A ∩ C)', 'Из A убираем только те элементы B, которые не в C.'],
    ['A ∩ (B Δ C)', '(A ∩ B) Δ (A ∩ C)', 'Пересечение дистрибутивно относительно Δ.'],
    ['A ∪ (B Δ C)', '(A ∪ B) Δ (A ∪ C)', 'А объединение — нет: элементы A справа «сокращаются».'],
  ];

  function makeEqTask() {
    const [x, y, note] = pick(EQ_PAIRS);
    const swap = Math.random() < 0.5;
    const a = parse(swap ? y : x), b = parse(swap ? x : y);
    return Object.assign({ a, b, note }, equalSets(a, b));
  }

  // Случайное выражение для «закрасьте область» (не пустое и не всё)
  function randomExpr(k) {
    const sets = SETNAMES.slice(0, k);
    const leaf = () => {
      const s = { t: 'set', name: pick(sets) };
      return Math.random() < 0.25 ? { t: 'comp', a: s } : s;
    };
    const ops = ['cup', 'cap', 'minus', 'sym', 'cap', 'minus'];
    const small = () => {
      if (Math.random() < 0.45) return leaf();
      let a, b;
      do { a = leaf(); b = leaf(); } while (JSON.stringify(a) === JSON.stringify(b));
      return { t: pick(ops), a, b };
    };
    for (let i = 0; i < 100; i++) {
      const n = { t: pick(ops), a: small(), b: small() };
      if (n.a.t === 'set' && n.b.t === 'set' && n.a.name === n.b.name) continue;
      if (n.a.t === 'comp' && n.b.t === 'comp' && n.t !== 'minus') continue; // слишком часто «внешняя» область
      const used = names(n);
      if (used.size !== k) continue; // все множества должны участвовать
      const r = regions(n, k);
      const cnt = r.filter(Boolean).length;
      if (cnt === 0 || cnt === r.length) continue;
      return n;
    }
    return { t: 'minus', a: { t: 'set', name: 'A' }, b: { t: 'set', name: 'B' } };
  }

  function makeRegionTask() {
    const k = Math.random() < 0.3 ? 2 : 3;
    const n = randomExpr(k);
    return { expr: n, k, regions: regions(n, k) };
  }

  // =====================================================================
  // 2. Отображения
  // =====================================================================
  // Конечное отображение: X = {1..m}, Y = {a, b, …} (k элементов), f — массив индексов в Y
  const YNAMES = ['a', 'b', 'c', 'd', 'e', 'f'];
  function classifyMap(f, k) {
    const hit = new Array(k).fill(0);
    f.forEach((y) => hit[y]++);
    return { inj: hit.every((h) => h <= 1), surj: hit.every((h) => h >= 1) };
  }
  function makeFiniteMap() {
    // выбираем желаемый тип, чтобы ответы были разнообразны
    const want = pick(['bij', 'inj', 'surj', 'none']);
    let m, k;
    if (want === 'bij') { m = k = rnd(3, 5); }
    else if (want === 'inj') { m = rnd(2, 4); k = m + rnd(1, 2); }
    else if (want === 'surj') { k = rnd(2, 4); m = k + rnd(1, 2); }
    else { m = rnd(3, 5); k = rnd(3, 5); }
    for (let i = 0; i < 200; i++) {
      let f;
      if (want === 'bij' || want === 'inj') {
        const ys = Array.from({ length: k }, (_, j) => j).sort(() => Math.random() - 0.5);
        f = ys.slice(0, m);
      } else f = Array.from({ length: m }, () => rnd(0, k - 1));
      const c = classifyMap(f, k);
      const ok = want === 'bij' ? c.inj && c.surj : want === 'inj' ? c.inj && !c.surj : want === 'surj' ? c.surj && !c.inj : !c.inj && !c.surj;
      if (ok) return { m, k, f, ...c };
    }
    const f = Array.from({ length: m }, () => rnd(0, k - 1));
    return { m, k, f, ...classifyMap(f, k) };
  }
  function explainFinite(t) {
    const hit = new Array(t.k).fill(0);
    t.f.forEach((y) => hit[y]++);
    const many = hit.map((h, j) => (h > 1 ? YNAMES[j] : null)).filter(Boolean);
    const none = hit.map((h, j) => (h === 0 ? YNAMES[j] : null)).filter(Boolean);
    const parts = [];
    parts.push(t.inj ? 'Инъекция: в каждый элемент Y входит не больше одной стрелки.' : 'Не инъекция: в ' + many.join(', ') + ' входит больше одной стрелки (разные x — одинаковое значение).');
    parts.push(t.surj ? 'Сюръекция: в каждый элемент Y входит хотя бы одна стрелка.' : 'Не сюръекция: в ' + none.join(', ') + ' не входит ни одной стрелки (значение не принимается).');
    if (t.inj && t.surj) parts.push('Значит, это биекция, и у неё есть обратное отображение (разверните стрелки).');
    if (t.m > t.k) parts.push('Заметьте: |X| = ' + t.m + ' > |Y| = ' + t.k + ', поэтому инъекции здесь быть не может в принципе (принцип Дирихле).');
    if (t.m < t.k) parts.push('Заметьте: |X| = ' + t.m + ' < |Y| = ' + t.k + ', поэтому сюръекции здесь быть не может в принципе.');
    return parts.join(' ');
  }

  // Функции на числовых множествах: важно, откуда и куда
  const R = '\\mathbb{R}', R0 = '[0;\\, +\\infty)', Rp = '(0;\\, +\\infty)';
  const FUNCS = [
    { tex: 'f\\colon ' + R + ' \\to ' + R + ',\\; f(x) = x^2', inj: false, surj: false, why: 'Не инъекция: \\(f(-1) = f(1)\\). Не сюръекция: отрицательные значения не принимаются.' },
    { tex: 'f\\colon ' + R + ' \\to ' + R0 + ',\\; f(x) = x^2', inj: false, surj: true, why: 'Сменили область значений — стала сюръекцией: любое \\(y \\ge 0\\) равно \\((\\sqrt y)^2\\). Но \\(f(-1) = f(1)\\), так что не инъекция.' },
    { tex: 'f\\colon ' + R0 + ' \\to ' + R0 + ',\\; f(x) = x^2', inj: true, surj: true, why: 'На \\([0; +\\infty)\\) квадрат строго возрастает (инъекция) и принимает все неотрицательные значения. Биекция, обратная — \\(\\sqrt{y}\\).' },
    { tex: 'f\\colon ' + R + ' \\to ' + R + ',\\; f(x) = x^3', inj: true, surj: true, why: 'Строго возрастает и принимает все значения: \\(y = (\\sqrt[3]{y})^3\\). Биекция.' },
    { tex: 'f\\colon ' + R + ' \\to ' + R + ',\\; f(x) = e^x', inj: true, surj: false, why: 'Строго возрастает — инъекция. Но \\(e^x &gt; 0\\), поэтому \\(0\\) и отрицательные числа не принимаются.' },
    { tex: 'f\\colon ' + R + ' \\to ' + Rp + ',\\; f(x) = e^x', inj: true, surj: true, why: 'С областью значений \\((0; +\\infty)\\) — биекция, обратная к ней — \\(\\ln y\\).' },
    { tex: 'f\\colon ' + R + ' \\to [-1;\\, 1],\\; f(x) = \\sin x', inj: false, surj: true, why: 'Принимает все значения от \\(-1\\) до \\(1\\), но \\(\\sin 0 = \\sin \\pi\\).' },
    { tex: 'f\\colon \\left[-\\tfrac{\\pi}{2};\\, \\tfrac{\\pi}{2}\\right] \\to [-1;\\, 1],\\; f(x) = \\sin x', inj: true, surj: true, why: 'На этом отрезке синус строго возрастает от \\(-1\\) до \\(1\\) — биекция. Обратная к ней и есть \\(\\arcsin\\).' },
    { tex: 'f\\colon \\left(-\\tfrac{\\pi}{2};\\, \\tfrac{\\pi}{2}\\right) \\to ' + R + ',\\; f(x) = \\operatorname{tg} x', inj: true, surj: true, why: 'Биекция интервала на всю прямую. Значит, интервал и прямая равномощны!' },
    { tex: 'f\\colon \\mathbb{N} \\to \\mathbb{N},\\; f(n) = 2n', inj: true, surj: false, why: 'Разные \\(n\\) дают разные \\(2n\\), но нечётные числа не принимаются. Для бесконечных множеств инъекция «в себя» может не быть сюръекцией — для конечных так не бывает.' },
    { tex: 'f\\colon \\mathbb{N} \\to \\mathbb{N},\\; f(n) = n + 1', inj: true, surj: false, why: 'Инъекция, но 1 не принимается.' },
    { tex: 'f\\colon \\mathbb{Z} \\to \\mathbb{Z},\\; f(n) = n + 1', inj: true, surj: true, why: 'На \\(\\mathbb{Z}\\) у сдвига есть обратный, \\(n - 1\\): биекция. Сравните с \\(\\mathbb{N}\\).' },
    { tex: 'f\\colon ' + R + ' \\to \\mathbb{Z},\\; f(x) = [x]', inj: false, surj: true, why: 'Целая часть принимает каждое целое значение \\(k\\) (например, при \\(x = k\\)), но \\([0{,}3] = [0{,}7]\\).' },
    { tex: 'f\\colon \\mathbb{N} \\to \\mathbb{N},\\; f(n) = \\left[\\tfrac{n + 1}{2}\\right]', inj: false, surj: true, why: 'Значения \\(1, 1, 2, 2, 3, 3, \\ldots\\): каждое натуральное принимается ровно дважды.' },
    { tex: 'f\\colon ' + R + ' \\to ' + R + ',\\; f(x) = |x|', inj: false, surj: false, why: '\\(|-2| = |2|\\), и отрицательных значений нет.' },
    { tex: 'f\\colon ' + R + ' \\to ' + R + ',\\; f(x) = 3x - 5', inj: true, surj: true, why: 'Линейная функция с ненулевым наклоном — биекция, обратная \\(\\frac{y + 5}{3}\\).' },
  ];

  // =====================================================================
  // 3. Счётность
  // =====================================================================
  const COUNT = [
    { tex: '\\mathbb{Z}', countable: true, why: 'Нумерация \\(0, 1, -1, 2, -2, \\ldots\\) — биекция с \\(\\mathbb{N}\\).' },
    { tex: '\\mathbb{N} \\times \\mathbb{N}', countable: true, why: 'Нумеруем пары по диагоналям: сначала с суммой 2, потом 3 и т. д. (таблица выше).' },
    { tex: '\\mathbb{Q}', countable: true, why: 'Дробь \\(\\frac{p}{q}\\) задаётся парой целых чисел, а \\(\\mathbb{Z} \\times \\mathbb{N}\\) счётно. Удивительно: \\(\\mathbb{Q}\\) всюду плотно, но «так же велико», как \\(\\mathbb{N}\\).' },
    { tex: '\\mathbb{R}', countable: false, why: 'Диагональный аргумент Кантора: любой список вещественных чисел кого-то пропускает.' },
    { tex: '(0;\\, 1)', countable: false, why: 'Диагональный аргумент применяется прямо к десятичным записям чисел из \\((0; 1)\\). К тому же \\((0; 1)\\) равномощен \\(\\mathbb{R}\\).' },
    { tex: '\\mathbb{R} \\setminus \\mathbb{Q} \\text{ (иррациональные числа)}', countable: false, why: 'Если бы они были счётны, то \\(\\mathbb{R} = \\mathbb{Q} \\cup (\\mathbb{R} \\setminus \\mathbb{Q})\\) было бы счётно как объединение двух счётных. Иррациональных чисел «гораздо больше», чем рациональных.' },
    { tex: '\\mathbb{Q} \\times \\mathbb{Q} \\text{ (точки плоскости с рациональными координатами)}', countable: true, why: 'Декартово произведение двух счётных множеств счётно.' },
    { tex: '\\text{множество всех конечных двоичных строк}', countable: true, why: 'Строк каждой длины конечное число; выпишем сначала строки длины 1, потом 2 и т. д. Счётное объединение конечных множеств счётно.' },
    { tex: '\\text{множество бесконечных последовательностей из 0 и 1}', countable: false, why: 'Диагональный аргумент: по любому списку последовательностей строим новую, меняя \\(n\\)-й знак \\(n\\)-й последовательности.' },
    { tex: '\\mathcal{P}(\\mathbb{N}) \\text{ (все подмножества } \\mathbb{N})', countable: false, why: 'По теореме Кантора \\(|\\mathcal{P}(X)| &gt; |X|\\). Подмножество \\(\\mathbb{N}\\) — то же, что бесконечная последовательность из 0 и 1.' },
    { tex: '\\text{множество конечных подмножеств } \\mathbb{N}', countable: true, why: 'Конечное подмножество кодируется конечной двоичной строкой, а таких строк счётное число.' },
    { tex: '\\text{многочлены с целыми коэффициентами}', countable: true, why: 'Многочлен задаётся конечным набором целых чисел; наборов каждой длины счётно, длин — счётно.' },
    { tex: '\\text{алгебраические числа (корни многочленов с целыми коэффициентами)}', countable: true, why: 'Многочленов счётно, у каждого конечное число корней. Отсюда следует, что трансцендентные числа существуют — и их несчётно!' },
    { tex: '\\text{трансцендентные числа}', countable: false, why: 'Это \\(\\mathbb{R}\\) без счётного множества алгебраических чисел; если бы и они были счётны, \\(\\mathbb{R}\\) было бы счётно.' },
    { tex: '\\{\\text{функции } \\mathbb{N} \\to \\{0, 1\\}\\}', countable: false, why: 'Такая функция — это бесконечная последовательность из 0 и 1, их несчётно (диагональ).' },
    { tex: '\\text{множество простых чисел}', countable: true, why: 'Бесконечное подмножество \\(\\mathbb{N}\\) — всегда счётно: нумеруем элементы по возрастанию.' },
  ];

  // =====================================================================
  // 4. Диагональ Кантора
  // =====================================================================
  function cantorList(rows, digits) {
    return Array.from({ length: rows }, () => Array.from({ length: digits }, () => rnd(0, 9)));
  }
  // Цифра нового числа: 5, если на диагонали не 5, иначе 4 (избегаем 0 и 9 — проблемы 0,999… = 1,000…)
  const diagDigit = (d) => (d === 5 ? 4 : 5);
  function cantorNumber(list) {
    return list.map((row, i) => diagDigit(row[i]));
  }

  return {
    ParseError, parse, member, names, regions, regionMembers, regionText, arity, equalSets, tex, logicTex,
    EQ_PAIRS, makeEqTask, randomExpr, makeRegionTask,
    YNAMES, classifyMap, makeFiniteMap, explainFinite, FUNCS, COUNT,
    cantorList, cantorNumber, diagDigit, pick,
  };
});
