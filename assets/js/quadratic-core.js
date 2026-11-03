// Логика темы «Квадратные уравнения» без привязки к странице:
// генерация задач, точные корни, пошаговое решение (TeX), разбор ответа ученика.
// Работает и в браузере (window.QuadCore), и в Node (module.exports) — для тестов.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.QuadCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Рациональные числа ----------
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }

  function frac(n, d) {
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }

  const fracValue = (f) => f.n / f.d;

  function fracTex(f) {
    if (f.d === 1) return String(f.n);
    return (f.n < 0 ? '-' : '') + '\\frac{' + Math.abs(f.n) + '}{' + f.d + '}';
  }

  // ---------- Форматирование ----------
  // Число в скобках, если отрицательное: (-3)
  const paren = (n) => (n < 0 ? '(' + n + ')' : String(n));

  // a x^2 + b x + c в виде TeX
  function polyTex(a, b, c) {
    const terms = [];
    const push = (coef, body) => {
      if (coef === 0) return;
      const abs = Math.abs(coef);
      const k = body && abs === 1 ? '' : String(abs);
      const sign = coef < 0 ? '-' : '+';
      terms.push({ sign, text: k + body });
    };
    push(a, 'x^2');
    push(b, 'x');
    push(c, '');
    if (!terms.length) return '0';
    return terms
      .map((t, i) => (i === 0 ? (t.sign === '-' ? '-' : '') + t.text : ' ' + t.sign + ' ' + t.text))
      .join('');
  }

  // ---------- Корни ----------
  function isqrt(n) {
    if (n < 0) return null;
    const r = Math.round(Math.sqrt(n));
    return r * r === n ? r : null;
  }

  // Точные корни для целых a, b, c (D — полный квадрат), иначе приближённые
  function solve(a, b, c) {
    const D = b * b - 4 * a * c;
    if (D < 0) return { D, roots: [] };
    const s = isqrt(D);
    if (s !== null && Number.isInteger(a) && Number.isInteger(b)) {
      if (D === 0) return { D, sqrtD: 0, roots: [frac(-b, 2 * a)] };
      return { D, sqrtD: s, roots: [frac(-b + s, 2 * a), frac(-b - s, 2 * a)] };
    }
    const sq = Math.sqrt(D);
    const r = D === 0 ? [-b / (2 * a)] : [(-b + sq) / (2 * a), (-b - sq) / (2 * a)];
    return { D, roots: r.map((v) => ({ approx: v })) };
  }

  // ---------- Генерация задач ----------
  function rnd(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (min, max) => { let v; do { v = rnd(min, max); } while (v === 0); return v; };

  // Каждый генератор возвращает коэффициенты {a, b, c} с целыми числами
  const generators = {
    // c = 0: ax^2 + bx = 0
    noC() {
      const a = pick([1, 1, 2, 3, -1, -2]);
      const r = nz(-7, 7);
      return { a, b: -a * r, c: 0 };
    },
    // b = 0: ax^2 + c = 0, два корня ±r
    noBTwo() {
      const a = pick([1, 1, 2, 3, -1]);
      const r = rnd(1, 8);
      return { a, b: 0, c: -a * r * r };
    },
    // b = 0, корней нет
    noBNone() {
      const a = pick([1, 2, 3]);
      return { a, b: 0, c: rnd(1, 9) };
    },
    // Полное, два целых корня
    intRoots() {
      const a = pick([1, 1, 1, 1, 2, -1, 3]);
      let r1, r2;
      do { r1 = nz(-7, 7); r2 = nz(-7, 7); } while (r1 === r2 || r1 + r2 === 0);
      return { a, b: -a * (r1 + r2), c: a * r1 * r2 };
    },
    // Один дробный корень: (ax - p)(x - r)
    fracRoot() {
      const a = pick([2, 3]);
      let p;
      do { p = nz(-7, 7); } while (p % a === 0);
      const r = nz(-5, 5);
      return { a, b: -(a * r + p), c: p * r };
    },
    // D = 0: a(x - r)^2
    doubleRoot() {
      const a = pick([1, 1, 2, -1]);
      const r = nz(-6, 6);
      return { a, b: -2 * a * r, c: a * r * r };
    },
    // D < 0: a(x - h)^2 + k, где a и k одного знака
    noRoots() {
      const a = pick([1, 1, 2, -1]);
      const h = rnd(-4, 4);
      const k = Math.sign(a) * rnd(1, 6);
      return { a, b: -2 * a * h, c: a * h * h + k };
    },
  };

  const LEVELS = {
    1: ['noC', 'noC', 'noBTwo', 'noBTwo', 'noBNone'],
    2: ['intRoots'],
    3: ['intRoots', 'intRoots', 'fracRoot', 'fracRoot', 'doubleRoot', 'noRoots'],
  };

  function makeTask(level) {
    const kind = pick(LEVELS[level] || LEVELS[2]);
    const { a, b, c } = generators[kind]();
    return { kind, a, b, c, ...solve(a, b, c) };
  }

  // ---------- Пошаговое решение ----------
  // Возвращает массив шагов: { text, tex } (tex — формула для отображения или null)
  function solutionSteps(t) {
    const { a, b, c } = t;
    const steps = [];

    // Неполное уравнение без c: выносим x
    if (c === 0 && b !== 0) {
      steps.push({ text: 'Свободного члена нет (c = 0), поэтому выносим x за скобку:', tex: 'x\\left(' + polyTex(0, a, b) + '\\right) = 0' });
      steps.push({ text: 'Произведение равно нулю, когда хотя бы один множитель равен нулю:', tex: 'x = 0 \\quad \\text{или} \\quad ' + polyTex(0, a, b) + ' = 0' });
      const r = frac(-b, a);
      steps.push({ text: 'Из второго уравнения:', tex: 'x = \\frac{' + -b + '}{' + a + '} = ' + fracTex(r) });
      steps.push({ text: 'Ответ:', tex: 'x_1 = 0, \\quad x_2 = ' + fracTex(r) });
      return steps;
    }

    // Неполное уравнение без b: x^2 = -c/a
    if (b === 0 && c !== 0) {
      const q = frac(-c, a);
      steps.push({ text: 'Коэффициента b нет, поэтому сразу выражаем x²:', tex: polyTex(a, 0, 0) + ' = ' + -c + ' \\;\\Rightarrow\\; x^2 = ' + fracTex(q) });
      if (q.n < 0) {
        steps.push({ text: 'Квадрат числа не может быть отрицательным, значит корней нет.', tex: null });
        steps.push({ text: 'Ответ: корней нет.', tex: null });
      } else {
        const r = fracTex({ n: Math.abs(t.roots[0].n), d: t.roots[0].d });
        steps.push({ text: 'Квадрат «забывает» знак, поэтому подходят оба числа: и положительное, и отрицательное.', tex: 'x = \\pm\\sqrt{' + fracTex(q) + '} = \\pm ' + r });
        steps.push({ text: 'Ответ:', tex: 'x_1 = ' + r + ', \\quad x_2 = -' + r });
      }
      return steps;
    }

    // Полное уравнение: через дискриминант
    steps.push({ text: 'Выписываем коэффициенты:', tex: 'a = ' + a + ', \\quad b = ' + b + ', \\quad c = ' + c });
    steps.push({ text: 'Считаем дискриминант:', tex: '\\begin{aligned} D &= b^2 - 4ac \\\\ &= ' + paren(b) + '^2 - 4 \\cdot ' + paren(a) + ' \\cdot ' + paren(c) + ' \\\\ &= ' + b * b + (4 * a * c >= 0 ? ' - ' + 4 * a * c : ' + ' + -4 * a * c) + ' = ' + t.D + ' \\end{aligned}' });

    if (t.D < 0) {
      steps.push({ text: 'D < 0: под корнем отрицательное число, а квадрат не бывает отрицательным. Парабола не пересекает ось Ox.', tex: null });
      steps.push({ text: 'Ответ: корней нет.', tex: null });
      return steps;
    }
    if (t.D === 0) {
      const r = t.roots[0];
      steps.push({ text: 'D = 0, значит корень один (вершина параболы лежит на оси Ox):', tex: 'x = -\\frac{b}{2a} = \\frac{' + -b + '}{' + 2 * a + '} = ' + fracTex(r) });
      steps.push({ text: 'Ответ:', tex: 'x = ' + fracTex(r) });
      return steps;
    }

    const s = t.sqrtD;
    steps.push({ text: 'D > 0, значит корней два. Извлекаем корень:', tex: '\\sqrt{D} = \\sqrt{' + t.D + '} = ' + s });
    const [r1, r2] = t.roots;
    const rootLine = (name, op, val, r) =>
      '\\begin{aligned} ' + name + ' &= \\frac{-b ' + op + ' \\sqrt{D}}{2a} = \\frac{' + -b + ' ' + op + ' ' + s + '}{' + 2 * a + '} \\\\ &= \\frac{' + val + '}{' + 2 * a + '} = ' + fracTex(r) + ' \\end{aligned}';
    steps.push({ text: 'Подставляем в формулу корней. Первый корень (со знаком «+»):', tex: rootLine('x_1', '+', -b + s, r1) });
    steps.push({ text: 'Второй корень (со знаком «−»):', tex: rootLine('x_2', '-', -b - s, r2) });
    // Проверка по Виету
    const sum = frac(r1.n * r2.d + r2.n * r1.d, r1.d * r2.d);
    const prod = frac(r1.n * r2.n, r1.d * r2.d);
    steps.push({ text: 'Проверка по теореме Виета: сумма корней равна −b/a, произведение равно c/a.', tex: '\\begin{aligned} x_1 + x_2 &= ' + fracTex(sum) + ' = -\\tfrac{b}{a} \\\\ x_1 \\cdot x_2 &= ' + fracTex(prod) + ' = \\tfrac{c}{a} \\end{aligned}' });
    steps.push({ text: 'Ответ:', tex: 'x_1 = ' + fracTex(r1) + ', \\quad x_2 = ' + fracTex(r2) });
    return steps;
  }

  function hint(t) {
    if (t.c === 0 && t.b !== 0) return 'Здесь нет свободного члена. Вынесите x за скобку: произведение равно нулю, когда один из множителей равен нулю.';
    if (t.b === 0 && t.c !== 0) return 'Здесь нет слагаемого с x. Перенесите число вправо и выразите x². Помните: квадрат не бывает отрицательным.';
    return 'Начните с дискриминанта: D = b² − 4ac. Здесь a = ' + t.a + ', b = ' + t.b + ', c = ' + t.c + '. Знак D подскажет, сколько будет корней.';
  }

  // ---------- Разбор ответа ученика ----------
  function parseNumber(tok) {
    tok = tok.trim();
    if (/^[-+]?\d+(?:[.,]\d+)?$/.test(tok)) return parseFloat(tok.replace(',', '.'));
    const m = tok.match(/^([-+]?\d+)\s*\/\s*([-+]?\d+)$/);
    if (m && +m[2] !== 0) return +m[1] / +m[2];
    return NaN;
  }

  // Возвращает { none: true } | { options: [[числа], ...] } | { error }
  // options — возможные прочтения (например, «2,5» — это 2.5 или «2 и 5»)
  function parseAnswer(raw) {
    let s = String(raw || '').toLowerCase().trim();
    s = s.replace(/[−–—]/g, '-').replace(/[хx]\s*[_]?\s*[12₁₂]?\s*=/g, ' ').trim();
    if (!s) return { error: 'Введите ответ.' };
    if (/^(нет|нет корней|корней нет|∅|нет решений|решений нет)\.?$/.test(s)) return { none: true };

    const toNums = (parts) => {
      const nums = parts.map((p) => p.trim()).filter(Boolean).map(parseNumber);
      return nums.length && nums.every((n) => !isNaN(n)) ? nums : null;
    };

    const options = [];
    if (s.includes(';')) {
      const n = toNums(s.split(';'));
      if (n) options.push(n);
    } else {
      // Запятая с пробелом или пробел — разделители
      const n1 = toNums(s.split(/\s*,\s+|\s+/));
      if (n1) options.push(n1);
      // Запятая без пробелов: «2,5» — либо десятичная дробь, либо два числа
      if (/\d,\-?\d/.test(s)) {
        const n2 = toNums(s.split(/\s*,\s*|\s+/));
        if (n2) options.push(n2);
      }
    }
    if (!options.length) return { error: 'Не получилось прочитать ответ. Пример: 2; -3  или  3/2; 1  или  нет.' };
    return { options };
  }

  const EPS = 1e-6;
  const uniq = (arr) => arr.filter((v, i) => arr.findIndex((w) => Math.abs(w - v) < EPS) === i);

  // Проверка ответа: { ok, message }
  function checkAnswer(t, raw) {
    const parsed = parseAnswer(raw);
    if (parsed.error) return { ok: false, invalid: true, message: parsed.error };
    const expected = t.roots.map(fracValue);

    if (parsed.none) {
      return expected.length === 0
        ? { ok: true, message: 'Верно! Дискриминант отрицательный, корней нет.' }
        : { ok: false, message: 'Корни есть. Посчитайте дискриминант ещё раз: он не отрицательный.' };
    }
    if (expected.length === 0) {
      return { ok: false, message: 'У этого уравнения нет действительных корней. Проверьте знак дискриминанта.' };
    }

    let best = null;
    for (const opt of parsed.options) {
      const given = uniq(opt);
      const hits = given.filter((g) => expected.some((e) => Math.abs(e - g) < EPS)).length;
      if (hits === expected.length && given.length === expected.length) {
        return { ok: true, message: expected.length === 1 ? 'Верно! Корень один, потому что D = 0.' : 'Верно! Оба корня найдены.' };
      }
      const negHits = given.filter((g) => expected.some((e) => Math.abs(e + g) < EPS)).length;
      const score = { given, hits, negHits };
      if (!best || hits > best.hits) best = score;
    }

    const { given, hits, negHits } = best;
    if (negHits === expected.length && given.length === expected.length) {
      return { ok: false, message: 'Почти! Похоже, перепутан знак. В формуле стоит −b: если b отрицательное, то −b положительное.' };
    }
    if (hits > 0 && hits < expected.length) {
      return { ok: false, message: 'Один корень найден верно, а второго не хватает или он неверный.' };
    }
    if (given.length !== expected.length) {
      return { ok: false, message: 'Проверьте количество корней. Их ' + (expected.length === 1 ? 'один' : 'два') + ': это видно по знаку дискриминанта.' };
    }
    return { ok: false, message: 'Пока неверно. Подставьте свой ответ в уравнение: получается ли 0? Или откройте подсказку.' };
  }

  return { gcd, frac, fracTex, fracValue, polyTex, solve, makeTask, generators, LEVELS, solutionSteps, hint, parseAnswer, checkAnswer };
});
