// Тренажёр по производным: генерация задач, проверка ответа, типичные ошибки.
// Зависит от Expr (assets/js/expr.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./expr.js'));
  else root.DerivCore = factory(root.Expr);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (min, max) => { let v; do { v = rnd(min, max); } while (v === 0); return v; };
  const sg = (v) => (v < 0 ? ' - ' + -v : ' + ' + v); // « + 3» / « - 3»

  // Шаблоны задач по уровням. Каждый возвращает строку функции.
  const LEVELS = {
    1: {
      name: 'Таблица и линейность',
      tasks: [
        () => { const n = rnd(3, 6), m = rnd(2, n - 1); return nz(-5, 5) + 'x^' + n + sg(nz(-6, 6)) + 'x^' + m + sg(nz(-9, 9)) + 'x' + sg(nz(-9, 9)); },
        () => nz(-5, 5) + 'sin x' + sg(nz(-5, 5)) + 'cos x',
        () => nz(-4, 4) + 'e^x' + sg(nz(-6, 6)) + 'ln x',
        () => nz(2, 8) + 'sqrt(x)' + sg(nz(-5, 5)) + '/x',
        () => 'x^' + rnd(2, 5) + sg(nz(-4, 4)) + 'tg x',
        () => nz(-3, 3) + 'arctg x' + sg(nz(-5, 5)) + 'x^' + rnd(2, 4),
        () => rnd(2, 5) + '^x' + sg(nz(-7, 7)) + 'x',
        () => nz(-4, 4) + 'arcsin x' + sg(nz(-4, 4)) + 'ctg x',
      ],
    },
    2: {
      name: 'Произведение и частное',
      tasks: [
        () => 'x^' + rnd(2, 4) + ' sin x',
        () => 'x^' + rnd(2, 4) + ' e^x',
        () => 'x^' + rnd(1, 3) + ' ln x',
        () => 'e^x cos x',
        () => '(x^2' + sg(nz(-5, 5)) + ') ln x',
        () => 'sin x / x',
        () => { const p = nz(-5, 5); let q; do { q = nz(-5, 5); } while (q === p); return '(x' + sg(p) + ')/(x' + sg(q) + ')'; },
        () => 'x^2/(x' + sg(nz(-5, 5)) + ')',
        () => 'e^x/x^' + rnd(1, 3),
        () => 'sqrt(x) cos x',
        () => '(x^2' + sg(rnd(1, 4)) + ')/(x^2' + sg(-rnd(1, 4)) + ')',
        () => 'x arctg x',
      ],
    },
    3: {
      name: 'Сложная функция',
      tasks: [
        () => 'sin(' + nz(2, 6) + 'x' + sg(nz(-5, 5)) + ')',
        () => '(' + nz(2, 4) + 'x^2' + sg(nz(-5, 5)) + ')^' + rnd(3, 6),
        () => 'e^(' + nz(-3, 3) + 'x^2)',
        () => 'ln(x^2 + ' + rnd(1, 9) + ')',
        () => 'sqrt(' + rnd(2, 5) + 'x^2 + ' + rnd(1, 9) + ')',
        () => pick(['sin', 'cos']) + '^' + rnd(2, 4) + ' x',
        () => 'arctg(' + rnd(2, 5) + 'x)',
        () => 'tg(x^' + rnd(2, 3) + ')',
        () => 'ln(sin x)',
        () => 'cos(e^x)',
        () => 'e^(sin x)',
        () => 'sqrt(ln x)',
      ],
    },
    4: {
      name: 'Комбинированные',
      tasks: [
        () => 'x^2 sin(' + rnd(2, 5) + 'x)',
        () => 'e^(-' + rnd(1, 3) + 'x) cos(' + rnd(2, 5) + 'x)',
        () => { const a = rnd(1, 3); return 'ln((x + ' + a + ')/(x - ' + a + '))'; },
        () => 'x^x',
        () => 'x^(sin x)',
        () => 'arcsin(x/' + rnd(2, 4) + ')',
        () => 'sin x/(1 + cos x)',
        () => 'x arctg x - ln(sqrt(1 + x^2))',
        () => 'sqrt(x) e^(' + rnd(2, 4) + 'x)',
        () => 'ln(x + sqrt(x^2 + ' + rnd(1, 4) + '))',
        () => '(x^2 + 1) arctg x',
        () => 'e^x (sin x - cos x)',
      ],
    },
  };

  function makeTask(level) {
    const lv = LEVELS[level] || LEVELS[1];
    const src = pick(lv.tasks)();
    const f = E.simplify(E.parse(src));
    const d = E.derive(f);
    return { level, src, f, derivative: d.result, raw: d.raw, steps: d.steps };
  }

  // Типичные ошибки: если ответ совпал с одной из них — объясняем, в чём дело
  function mistakes(f) {
    const out = [];
    const { op, fn, num, neg } = E;
    const D = (n) => E.derive(n).result;
    out.push({ ast: f, msg: 'Вы переписали саму функцию, а нужна её производная.' });
    if (f.type === 'op' && f.op === '*' && E.hasX(f.a) && E.hasX(f.b)) {
      out.push({ ast: op('*', D(f.a), D(f.b)), msg: "Производная произведения — это не произведение производных: \\((uv)' = u'v + uv'\\), а не \\(u'v'\\)." });
      out.push({ ast: op('*', D(f.a), f.b), msg: "Найдено только \\(u'v\\). Не хватает второго слагаемого \\(uv'\\)." });
      out.push({ ast: op('*', f.a, D(f.b)), msg: "Найдено только \\(uv'\\). Не хватает первого слагаемого \\(u'v\\)." });
    }
    if (f.type === 'op' && f.op === '/' && E.hasX(f.a) && E.hasX(f.b)) {
      out.push({ ast: op('/', D(f.a), D(f.b)), msg: "Производная частного — это не частное производных. Используйте \\(\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}\\)." });
      out.push({ ast: op('/', op('-', op('*', f.a, D(f.b)), op('*', D(f.a), f.b)), op('^', f.b, num(2))), msg: 'Перепутан порядок в числителе: должно быть \\(u\'v - uv\'\\), а не \\(uv\' - u\'v\\). Из-за этого ответ отличается знаком.' });
      out.push({ ast: op('-', op('*', D(f.a), f.b), op('*', f.a, D(f.b))), msg: 'Числитель верный, но забыт знаменатель \\(v^2\\).' });
    }
    // Забыли умножить на производную внутренней функции
    const outerOnly = (n) => {
      if (n.type === 'fn' && n.arg.type !== 'var' && E.hasX(n.arg)) return E.FN_DERIV[n.name](n.arg);
      if (n.type === 'op' && n.op === '^' && E.hasX(n.a) && !E.hasX(n.b) && n.a.type !== 'var') return op('*', n.b, op('^', n.a, op('-', n.b, num(1))));
      if (n.type === 'op' && n.op === '^' && n.a.type === 'const' && n.a.name === 'e' && n.b.type !== 'var') return n;
      return null;
    };
    const oo = outerOnly(f);
    if (oo) out.push({ ast: oo, msg: "Почти! Вы продифференцировали внешнюю функцию, но забыли умножить на производную внутренней: \\((f(u))' = f'(u) \\cdot u'\\)." });
    if (f.type === 'op' && f.op === '^' && E.hasX(f.a) && E.hasX(f.b)) {
      out.push({ ast: op('*', f.b, op('^', f.a, op('-', f.b, num(1)))), msg: 'Здесь и основание, и показатель зависят от x, поэтому степенное правило не работает. Используйте логарифмическое дифференцирование.' });
    }
    out.push({ ast: neg(D(f)), msg: 'Ответ отличается от правильного только знаком. Проверьте минусы: например, \\((\\cos x)\' = -\\sin x\\).' });
    return out;
  }

  // Проверка ответа ученика: { ok, invalid?, message, parsed? }
  function check(task, input) {
    let ans;
    try {
      ans = E.parse(input);
    } catch (e) {
      return { ok: false, invalid: true, message: e.message };
    }
    if (E.equivalent(ans, task.derivative)) {
      return { ok: true, parsed: ans, message: 'Верно! Ответ совпадает с правильным (форма записи может отличаться — это нормально).' };
    }
    for (const m of mistakes(task.f)) {
      if (E.equivalent(ans, m.ast)) return { ok: false, parsed: ans, message: m.msg };
    }
    return { ok: false, parsed: ans, message: 'Пока неверно. Откройте подсказку или сравните свой ответ с решением по шагам.' };
  }

  function hint(task) {
    const first = task.steps[0];
    if (!first) return 'Это константа — её производная равна нулю.';
    const tail = task.steps.length > 1 ? ' Дальше по тому же принципу разберите каждую часть.' : '';
    return 'С чего начать: ' + first.title + tail;
  }

  return { LEVELS, makeTask, check, hint, mistakes };
});
