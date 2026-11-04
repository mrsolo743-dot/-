// Логика: формулы высказываний (разбор, таблицы истинности, равносильность)
// и утверждения с кванторами (построение отрицания по шагам, типичные ошибки).
// Работает и в браузере (window.Logic), и в Node (module.exports).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =====================================================================
  // 1. Логика высказываний
  // =====================================================================
  // Узлы: {t:'var',name} {t:'const',v} {t:'not',a} {t:'and'|'or'|'imp'|'iff',a,b}
  class ParseError extends Error {}

  const WORD_OPS = {
    not: 'not', 'не': 'not',
    and: 'and', 'и': 'and',
    or: 'or', 'или': 'or',
  };

  function tokenize(src) {
    const s = String(src)
      .replace(/<=>|<->|⟺|↔|⇔|≡/g, ' IFF ')
      .replace(/=>|->|⟹|→|⇒/g, ' IMP ')
      .replace(/[¬!~]/g, ' NOT ')
      .replace(/[∧&*·]/g, ' AND ')
      .replace(/[∨|+]/g, ' OR ')
      .replace(/=/g, ' IFF ');
    const out = [];
    const words = s.match(/IFF|IMP|NOT|AND|OR|[()]|[01]|[A-Za-zА-Яа-яЁё]+|\S/g) || [];
    for (const w of words) {
      if (w === 'IFF') out.push({ t: 'iff' });
      else if (w === 'IMP') out.push({ t: 'imp' });
      else if (w === 'NOT') out.push({ t: 'not' });
      else if (w === 'AND') out.push({ t: 'and' });
      else if (w === 'OR') out.push({ t: 'or' });
      else if (w === '(' || w === ')') out.push({ t: w });
      else if (w === '0' || w === '1') out.push({ t: 'const', v: w === '1' });
      else if (/^[A-Za-zА-Яа-яЁё]+$/.test(w)) {
        const lw = w.toLowerCase();
        if (WORD_OPS[lw]) out.push({ t: WORD_OPS[lw] });
        else if (/^[A-Za-z]$/.test(w)) out.push({ t: 'var', name: lw });
        else throw new ParseError('Непонятное слово «' + w + '». Переменные — одиночные латинские буквы (p, q, r), операции: ¬ ∧ ∨ ⇒ ⇔ (или !, &, |, =>, <=>).');
      } else throw new ParseError('Непонятный символ «' + w + '».');
    }
    return out;
  }

  function parse(src) {
    const tk = tokenize(src);
    if (!tk.length) throw new ParseError('Введите формулу.');
    let p = 0;
    const is = (t) => tk[p] && tk[p].t === t;
    // приоритет: ¬ > ∧ > ∨ > ⇒ (правоассоциативная) > ⇔
    function iff() {
      let n = imp();
      while (is('iff')) { p++; n = { t: 'iff', a: n, b: imp() }; }
      return n;
    }
    function imp() {
      const n = or();
      if (is('imp')) { p++; return { t: 'imp', a: n, b: imp() }; }
      return n;
    }
    function or() {
      let n = and();
      while (is('or')) { p++; n = { t: 'or', a: n, b: and() }; }
      return n;
    }
    function and() {
      let n = not();
      while (is('and')) { p++; n = { t: 'and', a: n, b: not() }; }
      return n;
    }
    function not() {
      if (is('not')) { p++; return { t: 'not', a: not() }; }
      return atom();
    }
    function atom() {
      const t = tk[p++];
      if (!t) throw new ParseError('Формула оборвалась: чего-то не хватает в конце.');
      if (t.t === 'var') return { t: 'var', name: t.name };
      if (t.t === 'const') return { t: 'const', v: t.v };
      if (t.t === '(') {
        const n = iff();
        if (!is(')')) throw new ParseError('Не хватает закрывающей скобки.');
        p++;
        return n;
      }
      throw new ParseError('Не на месте операция или скобка.');
    }
    const n = iff();
    if (p < tk.length) throw new ParseError(is(')') ? 'Лишняя закрывающая скобка.' : 'Не удалось разобрать формулу целиком: возможно, пропущена операция между переменными.');
    return n;
  }

  function evaluate(n, env) {
    switch (n.t) {
      case 'var': return !!env[n.name];
      case 'const': return n.v;
      case 'not': return !evaluate(n.a, env);
      case 'and': return evaluate(n.a, env) && evaluate(n.b, env);
      case 'or': return evaluate(n.a, env) || evaluate(n.b, env);
      case 'imp': return !evaluate(n.a, env) || evaluate(n.b, env);
      case 'iff': return evaluate(n.a, env) === evaluate(n.b, env);
    }
    return false;
  }

  function vars(n, set) {
    set = set || new Set();
    if (n.t === 'var') set.add(n.name);
    if (n.a) vars(n.a, set);
    if (n.b) vars(n.b, set);
    return set;
  }

  // Все наборы значений переменных: от 1…1 к 0…0, как принято в учебниках
  function assignments(names) {
    const rows = [];
    const k = names.length;
    for (let i = (1 << k) - 1; i >= 0; i--) {
      const env = {};
      names.forEach((v, j) => { env[v] = !!(i & (1 << (k - 1 - j))); });
      rows.push(env);
    }
    return rows;
  }

  // Таблица истинности одной или нескольких формул (общие переменные)
  function truthTable(formulas) {
    const names = [...formulas.reduce((s, f) => vars(f, s), new Set())].sort();
    const rows = assignments(names).map((env) => ({ env, values: formulas.map((f) => evaluate(f, env)) }));
    return { names, rows };
  }

  function classify(f) {
    const { rows } = truthTable([f]);
    const t = rows.filter((r) => r.values[0]).length;
    if (t === rows.length) return 'tautology';
    if (t === 0) return 'contradiction';
    return 'satisfiable';
  }

  // Равносильность: { equal, counter } — counter — набор, где значения различаются
  function equivalent(f, g) {
    const { rows } = truthTable([f, g]);
    const bad = rows.find((r) => r.values[0] !== r.values[1]);
    return { equal: !bad, counter: bad ? bad.env : null };
  }

  const OPTEX = { and: '\\land', or: '\\lor', imp: '\\Rightarrow', iff: '\\Leftrightarrow' };
  // Скобки ставим у любой вложенной двуместной операции другого вида — так формулу проще читать
  const BIN = { and: 1, or: 1, imp: 1, iff: 1 };
  function tex(n) {
    const w = (c, cond) => (cond ? '(' + tex(c) + ')' : tex(c));
    switch (n.t) {
      case 'var': return n.name;
      case 'const': return n.v ? '1' : '0';
      case 'not': return '\\neg ' + w(n.a, !!BIN[n.a.t]);
      case 'imp': return w(n.a, !!BIN[n.a.t]) + ' ' + OPTEX.imp + ' ' + w(n.b, !!BIN[n.b.t]);
      default: return w(n.a, BIN[n.a.t] && n.a.t !== n.t) + ' ' + OPTEX[n.t] + ' ' + w(n.b, !!BIN[n.b.t] && (n.b.t !== n.t || n.t === 'iff'));
    }
  }

  // Пары формул для тренажёра «Равносильны ли?» (ответ вычисляется, а не хранится)
  const EQ_PAIRS = [
    ['p => q', '!q => !p', 'Контрапозиция: «если p, то q» равносильно «если не q, то не p». На этом основано доказательство от противного.'],
    ['p => q', 'q => p', 'Обратная импликация — другое утверждение! «Если число делится на 4, то оно чётное» верно, а обратное — нет (6).'],
    ['p => q', '!p => !q', 'Это «обратная к противоположной», она равносильна q ⇒ p, а не p ⇒ q.'],
    ['!(p & q)', '!p | !q', 'Закон де Моргана: отрицание «и» — это «или» отрицаний.'],
    ['!(p & q)', '!p & !q', 'Частая ошибка: при отрицании «и» нужно заменить его на «или».'],
    ['!(p | q)', '!p & !q', 'Закон де Моргана: отрицание «или» — это «и» отрицаний.'],
    ['p => q', '!p | q', 'Импликация выражается через «или»: она ложна только при p = 1, q = 0.'],
    ['!(p => q)', 'p & !q', 'Отрицание импликации: посылка верна, а заключение ложно.'],
    ['!(p => q)', 'p => !q', 'Частая ошибка: отрицание импликации — не импликация. Правильно: p ∧ ¬q.'],
    ['p => (q => r)', '(p & q) => r', 'Две посылки подряд — то же, что одна посылка «p и q».'],
    ['p => (q => r)', '(p => q) => r', 'Импликация не ассоциативна: расстановка скобок меняет смысл.'],
    ['p | (q & r)', '(p | q) & (p | r)', 'Дистрибутивность «или» относительно «и».'],
    ['p & (q | r)', '(p & q) | r', 'Скобки нельзя «переносить» как угодно: здесь смысл меняется.'],
    ['p <=> q', '(p => q) & (q => p)', 'Эквивалентность — это импликация в обе стороны. Поэтому «тогда и только тогда» доказывают в две стороны.'],
    ['p & (p | q)', 'p', 'Закон поглощения.'],
    ['(p | q) => r', '(p => r) & (q => r)', 'Разбор случаев: чтобы доказать r из «p или q», надо вывести r из каждого случая.'],
    ['(p & q) => r', '(p => r) & (q => r)', 'Если r следует из двух условий вместе, это не значит, что оно следует из каждого по отдельности.'],
    ['(p & q) => r', '(p => r) | (q => r)', 'Неочевидно, но верно — проверьте по таблице!'],
    ['p => (q & r)', '(p => q) & (p => r)', 'Чтобы доказать «q и r», можно доказать q и r по отдельности.'],
  ];

  function makeEqTask() {
    const [a, b, note] = EQ_PAIRS[Math.floor(Math.random() * EQ_PAIRS.length)];
    const swap = Math.random() < 0.5;
    const f = parse(swap ? b : a), g = parse(swap ? a : b);
    const eq = equivalent(f, g);
    return { f, g, equal: eq.equal, counter: eq.counter, note };
  }

  // =====================================================================
  // 2. Утверждения с кванторами и их отрицание
  // =====================================================================
  // Узлы: {t:'Q', q:'all'|'ex', v, dom, ndom, body}  — ограничение dom (например «> 0»),
  //       ndom — его «отрицание» (нужно только для типичной ошибки)
  //       {t:'and'|'or'|'imp', a, b}, {t:'not', a}
  //       {t:'atom', tex, ntex, wtex} — ntex: верное отрицание, wtex: типичное неверное
  const FA = (v, dom, ndom, body) => ({ t: 'Q', q: 'all', v, dom, ndom, body });
  const EX = (v, dom, ndom, body) => ({ t: 'Q', q: 'ex', v, dom, ndom, body });
  const A = (t, nt, wt) => ({ t: 'atom', tex: t, ntex: nt, wtex: wt || null });
  const AND = (a, b) => ({ t: 'and', a, b });
  const IMP = (a, b) => ({ t: 'imp', a, b });

  const EPS = '\\varepsilon', DEL = '\\delta', NN = '\\in \\mathbb{N}', NNN = '\\notin \\mathbb{N}';

  const STATEMENTS = [
    {
      name: '\\lim_{n \\to \\infty} a_n = a',
      meaning: 'число \\(a\\) — не предел: есть коридор ширины \\(\\varepsilon\\), из которого члены последовательности выскакивают сколь угодно далеко.',
      s: FA(EPS, '> 0', '\\le 0', EX('N', NN, NNN, FA('n', '\\ge N', '< N', A('|a_n - a| < \\varepsilon', '|a_n - a| \\ge \\varepsilon', '|a_n - a| > \\varepsilon')))),
    },
    {
      name: '\\text{функция } f \\text{ ограничена на } X',
      meaning: 'функция не ограничена: какое бы \\(M\\) ни взять, найдётся точка, где \\(|f|\\) больше \\(M\\).',
      s: EX('M', '> 0', '\\le 0', FA('x', '\\in X', '\\notin X', A('|f(x)| \\le M', '|f(x)| > M', '|f(x)| \\ge M'))),
    },
    {
      name: 'f \\text{ строго возрастает на } X',
      meaning: 'найдутся две точки \\(x_1 &lt; x_2\\), в которых \\(f(x_1) \\ge f(x_2)\\).',
      s: FA('x_1, x_2', '\\in X', '\\notin X', IMP(A('x_1 < x_2', 'x_1 \\ge x_2', 'x_1 > x_2'), A('f(x_1) < f(x_2)', 'f(x_1) \\ge f(x_2)', 'f(x_1) > f(x_2)'))),
    },
    {
      name: 'f \\text{ непрерывна в точке } x_0',
      meaning: 'функция разрывна в \\(x_0\\): есть \\(\\varepsilon\\), для которого сколь угодно близко к \\(x_0\\) найдутся точки со скачком значения не меньше \\(\\varepsilon\\).',
      s: FA(EPS, '> 0', '\\le 0', EX(DEL, '> 0', '\\le 0', FA('x', '\\in X', '\\notin X', IMP(A('|x - x_0| < \\delta', '|x - x_0| \\ge \\delta', '|x - x_0| > \\delta'), A('|f(x) - f(x_0)| < \\varepsilon', '|f(x) - f(x_0)| \\ge \\varepsilon', '|f(x) - f(x_0)| > \\varepsilon'))))),
    },
    {
      name: 'f \\text{ равномерно непрерывна на } X',
      meaning: 'есть \\(\\varepsilon\\), для которого при любом \\(\\delta\\) найдутся сколь угодно близкие точки с разницей значений не меньше \\(\\varepsilon\\) (как у \\(x^2\\) на \\(\\mathbb{R}\\) или \\(\\sin\\frac{1}{x}\\) на \\((0;1)\\)).',
      s: FA(EPS, '> 0', '\\le 0', EX(DEL, '> 0', '\\le 0', FA('x, y', '\\in X', '\\notin X', IMP(A('|x - y| < \\delta', '|x - y| \\ge \\delta', '|x - y| > \\delta'), A('|f(x) - f(y)| < \\varepsilon', '|f(x) - f(y)| \\ge \\varepsilon', '|f(x) - f(y)| > \\varepsilon'))))),
    },
    {
      name: '\\{a_n\\} \\text{ фундаментальна (последовательность Коши)}',
      meaning: 'есть \\(\\varepsilon\\), для которого сколь угодно далеко найдутся два члена, отстоящих друг от друга не меньше чем на \\(\\varepsilon\\).',
      s: FA(EPS, '> 0', '\\le 0', EX('N', NN, NNN, FA('n, m', '\\ge N', '< N', A('|a_n - a_m| < \\varepsilon', '|a_n - a_m| \\ge \\varepsilon', '|a_n - a_m| > \\varepsilon')))),
    },
    {
      name: '\\lim_{n \\to \\infty} a_n = +\\infty',
      meaning: 'есть порог \\(M\\), ниже которого (или на котором) последовательность оказывается сколь угодно далеко.',
      s: FA('M', '> 0', '\\le 0', EX('N', NN, NNN, FA('n', '\\ge N', '< N', A('a_n > M', 'a_n \\le M', 'a_n < M')))),
    },
    {
      name: 's = \\sup A',
      meaning: 'либо \\(s\\) — не верхняя граница (какой-то элемент больше \\(s\\)), либо есть верхняя граница меньше \\(s\\).',
      s: AND(
        FA('x', '\\in A', '\\notin A', A('x \\le s', 'x > s', 'x \\ge s')),
        FA(EPS, '> 0', '\\le 0', EX('x', '\\in A', '\\notin A', A('x > s - \\varepsilon', 'x \\le s - \\varepsilon', 'x < s - \\varepsilon')))
      ),
    },
    {
      name: 'f \\text{ периодична}',
      meaning: 'для любого положительного \\(T\\) найдётся точка, где сдвиг на \\(T\\) меняет значение.',
      s: EX('T', '> 0', '\\le 0', FA('x', '\\in \\mathbb{R}', '\\notin \\mathbb{R}', A('f(x + T) = f(x)', 'f(x + T) \\ne f(x)'))),
    },
    {
      name: 'f \\text{ инъективна (разные точки — разные значения)}',
      meaning: 'найдутся две разные точки с одинаковым значением.',
      s: FA('x_1, x_2', '\\in X', '\\notin X', IMP(A('f(x_1) = f(x_2)', 'f(x_1) \\ne f(x_2)'), A('x_1 = x_2', 'x_1 \\ne x_2'))),
    },
    {
      name: 'f\\colon X \\to Y \\text{ сюръективна}',
      meaning: 'есть значение \\(y\\), которое функция не принимает ни в одной точке.',
      s: FA('y', '\\in Y', '\\notin Y', EX('x', '\\in X', '\\notin X', A('f(x) = y', 'f(x) \\ne y'))),
    },
    {
      name: '\\{a_n\\} \\text{ не ограничена сверху}',
      meaning: 'последовательность ограничена сверху: есть \\(M\\), которое не превосходит ни один член.',
      s: FA('M', '\\in \\mathbb{R}', '\\notin \\mathbb{R}', EX('n', NN, NNN, A('a_n > M', 'a_n \\le M', 'a_n < M'))),
    },
  ];

  // ---------- TeX для утверждений ----------
  const isQ = (n) => n.t === 'Q';
  function qtex(n) {
    if (n.t === 'atom') return n.tex;
    if (n.t === 'Q') {
      const head = (n.q === 'all' ? '\\forall ' : '\\exists ') + n.v + (n.dom ? ' ' + n.dom : '');
      const b = n.body;
      const glue = isQ(b) || (b.t === 'not' && isQ(b.a)) ? ' \\;\\; ' : ' \\colon\\; ';
      return head + glue + qtex(b);
    }
    if (n.t === 'not') return '\\neg\\bigl(' + qtex(n.a) + '\\bigr)';
    const w = (c) => (c.t === 'atom' || c.t === 'not' ? qtex(c) : '\\bigl(' + qtex(c) + '\\bigr)');
    const op = { and: '\\land', or: '\\lor', imp: '\\Rightarrow' }[n.t];
    return w(n.a) + ' ' + op + ' ' + w(n.b);
  }

  // ---------- Отрицание по шагам ----------
  // Проталкиваем одно (самое внешнее) отрицание на уровень вглубь. Возвращает {node, rule} или null.
  function pushOnce(n) {
    if (n.t === 'not') {
      const a = n.a;
      switch (a.t) {
        case 'Q':
          return {
            node: Object.assign({}, a, { q: a.q === 'all' ? 'ex' : 'all', body: { t: 'not', a: a.body } }),
            rule: a.q === 'all'
              ? '\\(\\neg \\forall = \\exists \\neg\\): «не для всех» значит «найдётся, для которого не».' + (a.dom ? ' Ограничение \\(' + a.v + ' ' + a.dom + '\\) остаётся прежним.' : '')
              : '\\(\\neg \\exists = \\forall \\neg\\): «не существует» значит «для всех не».' + (a.dom ? ' Ограничение \\(' + a.v + ' ' + a.dom + '\\) остаётся прежним.' : ''),
          };
        case 'and':
          return { node: { t: 'or', a: { t: 'not', a: a.a }, b: { t: 'not', a: a.b } }, rule: 'Закон де Моргана: \\(\\neg(A \\land B) = \\neg A \\lor \\neg B\\).' };
        case 'or':
          return { node: { t: 'and', a: { t: 'not', a: a.a }, b: { t: 'not', a: a.b } }, rule: 'Закон де Моргана: \\(\\neg(A \\lor B) = \\neg A \\land \\neg B\\).' };
        case 'imp':
          return { node: { t: 'and', a: a.a, b: { t: 'not', a: a.b } }, rule: 'Отрицание импликации: \\(\\neg(A \\Rightarrow B) = A \\land \\neg B\\) — посылка выполнена, а заключение нет.' };
        case 'not':
          return { node: a.a, rule: 'Двойное отрицание: \\(\\neg\\neg A = A\\).' };
        default:
          return null; // атом — отрицаем в самом конце
      }
    }
    for (const key of ['body', 'a', 'b']) {
      if (n[key]) {
        const r = pushOnce(n[key]);
        if (r) return { node: Object.assign({}, n, { [key]: r.node }), rule: r.rule };
      }
    }
    return null;
  }

  // ¬атом -> атом с отрицанием (все сразу)
  function finishAtoms(n) {
    if (n.t === 'not' && n.a.t === 'atom') return A(n.a.ntex, n.a.tex, null);
    const out = Object.assign({}, n);
    for (const key of ['body', 'a', 'b']) if (n[key]) out[key] = finishAtoms(n[key]);
    return out;
  }

  function negationSteps(s) {
    const steps = [{ rule: 'Ставим отрицание перед всем утверждением.', tex: qtex({ t: 'not', a: s }) }];
    let cur = { t: 'not', a: s };
    for (let i = 0; i < 30; i++) {
      const r = pushOnce(cur);
      if (!r) break;
      cur = r.node;
      steps.push({ rule: r.rule, tex: qtex(cur) });
    }
    const fin = finishAtoms(cur);
    if (qtex(fin) !== qtex(cur)) {
      steps.push({ rule: 'Отрицаем условия в конце: \\(\\neg(&lt;) \\) это \\(\\ge\\), \\(\\neg(\\le)\\) это \\(&gt;\\), \\(\\neg(=)\\) это \\(\\ne\\).', tex: qtex(fin) });
    }
    return { steps, result: fin };
  }

  // Полное отрицание сразу, с возможными «ошибками» для вариантов ответа
  function negFull(n, o) {
    switch (n.t) {
      case 'Q':
        return Object.assign({}, n, { q: n.q === 'all' ? 'ex' : 'all', dom: o.negDomain && n.ndom ? n.ndom : n.dom, body: negFull(n.body, o) });
      case 'and': return { t: 'or', a: negFull(n.a, o), b: negFull(n.b, o) };
      case 'or': return { t: 'and', a: negFull(n.a, o), b: negFull(n.b, o) };
      case 'imp': return o.impWrong ? { t: 'imp', a: n.a, b: negFull(n.b, o) } : { t: 'and', a: n.a, b: negFull(n.b, o) };
      case 'atom': return A(o.atomWrong && n.wtex ? n.wtex : n.ntex, n.tex, null);
    }
    return n;
  }
  function mapTree(n, f) {
    const m = f(n);
    if (m !== n) return m;
    const out = Object.assign({}, n);
    for (const key of ['body', 'a', 'b']) if (n[key]) out[key] = mapTree(n[key], f);
    return out;
  }
  const flipQuantifiers = (s) => mapTree(s, (n) => (n.t === 'Q' ? Object.assign({}, n, { q: n.q === 'all' ? 'ex' : 'all', body: flipQuantifiers(n.body) }) : n));
  const negateAtomsOnly = (s) => mapTree(s, (n) => (n.t === 'atom' ? A(n.ntex, n.tex) : n));
  const has = (s, pred) => { let f = false; mapTree(s, (n) => { if (pred(n)) f = true; return n; }); return f; };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Задача «постройте отрицание»: 4 варианта, у каждого неверного — объяснение ошибки
  function makeNegTask(index) {
    const st = STATEMENTS[index === undefined ? Math.floor(Math.random() * STATEMENTS.length) : index];
    const s = st.s;
    const correct = negFull(s, {});
    const cands = [
      { node: flipQuantifiers(s), why: 'Кванторы поменяли, но забыли отрицать само условие после двоеточия. Это не отрицание, а другое утверждение.' },
      { node: negateAtomsOnly(s), why: 'Условие отрицали, но кванторы оставили прежними. По правилу \\(\\neg\\forall = \\exists\\neg\\) каждый \\(\\forall\\) превращается в \\(\\exists\\) и наоборот.' },
    ];
    if (has(s, (n) => n.t === 'Q' && n.dom && n.ndom)) {
      cands.push({ node: negFull(s, { negDomain: true }), why: 'Ограничения вроде «\\(\\varepsilon &gt; 0\\)», «\\(n \\ge N\\)», «\\(x \\in X\\)» не отрицаются: они лишь говорят, среди каких значений перебираем переменную. \\(\\neg\\,\\forall \\varepsilon &gt; 0\\ P\\) — это \\(\\exists \\varepsilon &gt; 0\\ \\neg P\\).' });
    }
    if (has(s, (n) => n.t === 'imp')) {
      cands.push({ node: negFull(s, { impWrong: true }), why: 'Отрицание импликации — не импликация: \\(\\neg(A \\Rightarrow B) = A \\land \\neg B\\). Импликация ложна ровно тогда, когда посылка верна, а заключение ложно.' });
    }
    if (has(s, (n) => n.t === 'atom' && n.wtex)) {
      cands.push({ node: negFull(s, { atomWrong: true }), why: 'Неравенство отрицано неверно: противоположное к «\\(&lt;\\)» — это «\\(\\ge\\)», а не «\\(&gt;\\)» (случай равенства тоже входит в отрицание).' });
    }
    const ct = qtex(correct);
    const seen = new Set([ct]);
    const wrong = shuffle(cands).filter((c) => {
      const t = qtex(c.node);
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    }).slice(0, 3);
    const options = shuffle([{ tex: ct, ok: true }].concat(wrong.map((w) => ({ tex: qtex(w.node), ok: false, why: w.why }))));
    return { name: st.name, meaning: st.meaning, statement: s, statementTex: qtex(s), options, correctTex: ct, steps: negationSteps(s).steps };
  }

  // =====================================================================
  // 3. «Верно или неверно?» — утверждения с кванторами
  // =====================================================================
  const TF = [
    { tex: '\\forall x \\in \\mathbb{R} \\;\\; \\exists y \\in \\mathbb{R} \\colon\\; y > x', truth: true, why: 'Для каждого \\(x\\) годится, например, \\(y = x + 1\\). Здесь \\(y\\) выбирается <b>после</b> \\(x\\) и может от него зависеть.' },
    { tex: '\\exists y \\in \\mathbb{R} \\;\\; \\forall x \\in \\mathbb{R} \\colon\\; y > x', truth: false, why: 'Это утверждение «есть число больше всех чисел». Неверно: для любого \\(y\\) возьмём \\(x = y\\) — тогда \\(y > x\\) не выполнено. Сравните с предыдущим: кванторы те же, но порядок другой.' },
    { tex: '\\forall x \\in \\mathbb{R} \\;\\; \\exists y \\in \\mathbb{R} \\colon\\; x + y = 0', truth: true, why: 'Берём \\(y = -x\\).' },
    { tex: '\\exists y \\in \\mathbb{R} \\;\\; \\forall x \\in \\mathbb{R} \\colon\\; x + y = 0', truth: false, why: 'Одно и то же \\(y\\) должно подойти для всех \\(x\\). Из \\(0 + y = 0\\) получаем \\(y = 0\\), но тогда \\(1 + y \\ne 0\\).' },
    { tex: '\\exists x \\in \\mathbb{R} \\;\\; \\forall y \\in \\mathbb{R} \\colon\\; x \\cdot y = 0', truth: true, why: 'Подходит \\(x = 0\\).' },
    { tex: '\\forall y \\in \\mathbb{R} \\;\\; \\exists x \\in \\mathbb{R} \\colon\\; x \\cdot y = 1', truth: false, why: 'Контрпример: \\(y = 0\\). Тогда \\(x \\cdot 0 = 0 \\ne 1\\) при любом \\(x\\). Чтобы опровергнуть «для всех», достаточно одного контрпримера.' },
    { tex: '\\exists n \\in \\mathbb{N} \\;\\; \\forall m \\in \\mathbb{N} \\colon\\; n \\le m', truth: true, why: 'В \\(\\mathbb{N}\\) есть наименьший элемент: \\(n = 1\\).' },
    { tex: '\\exists m \\in \\mathbb{N} \\;\\; \\forall n \\in \\mathbb{N} \\colon\\; n \\le m', truth: false, why: 'Наибольшего натурального числа нет: для любого \\(m\\) число \\(n = m + 1\\) больше.' },
    { tex: '\\forall x \\in \\mathbb{R} \\colon\\; x^2 > 0', truth: false, why: 'Контрпример: \\(x = 0\\). Верно лишь \\(x^2 \\ge 0\\).' },
    { tex: '\\forall \\varepsilon > 0 \\;\\; \\exists n \\in \\mathbb{N} \\colon\\; \\frac{1}{n} < \\varepsilon', truth: true, why: 'Это принцип Архимеда: возьмём \\(n > \\frac{1}{\\varepsilon}\\). Именно он стоит за тем, что \\(\\frac{1}{n} \\to 0\\).' },
    { tex: '\\exists \\varepsilon > 0 \\;\\; \\forall n \\in \\mathbb{N} \\colon\\; \\frac{1}{n} \\ge \\varepsilon', truth: false, why: 'Это в точности отрицание предыдущего (верного) утверждения, значит, оно ложно.' },
    { tex: '\\forall x, y \\in \\mathbb{R},\\; x < y \\;\\; \\exists q \\in \\mathbb{Q} \\colon\\; x < q < y', truth: true, why: 'Плотность рациональных чисел: между любыми двумя различными вещественными есть рациональное. Возьмём \\(n &gt; \\frac{1}{y - x}\\) и \\(q = \\frac{m}{n}\\) с подходящим целым \\(m\\).' },
    { tex: '\\exists x \\in \\mathbb{R} \\colon\\; x^2 = -1', truth: false, why: 'Квадрат вещественного числа неотрицателен. (В \\(\\mathbb{C}\\) такое \\(x\\) есть — \\(i\\).)' },
    { tex: '\\forall n \\in \\mathbb{N} \\colon\\; n^2 + n + 41 \\text{ — простое}', truth: false, why: 'Для \\(n = 1, \\ldots, 39\\) действительно получаются простые, но при \\(n = 40\\): \\(1600 + 40 + 41 = 1681 = 41^2\\). Проверка многих случаев — не доказательство!' },
    { tex: '\\forall n \\in \\mathbb{N} \\colon\\; n^3 - n \\text{ делится на } 6', truth: true, why: '\\(n^3 - n = (n - 1)\\,n\\,(n + 1)\\) — произведение трёх последовательных чисел: среди них есть чётное и кратное трём.' },
    { tex: '\\forall x \\in \\mathbb{R} \\;\\; \\exists n \\in \\mathbb{N} \\colon\\; n > x', truth: true, why: 'Снова принцип Архимеда: натуральные числа не ограничены сверху.' },
  ];

  function makeTFTask() {
    return Object.assign({}, TF[Math.floor(Math.random() * TF.length)]);
  }

  return {
    ParseError, parse, evaluate, vars, truthTable, classify, equivalent, tex,
    EQ_PAIRS, makeEqTask,
    STATEMENTS, qtex, negationSteps, negFull, makeNegTask,
    TF, makeTFTask,
  };
});
