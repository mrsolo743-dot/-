// Математический «движок»: разбор формул, вычисление, вывод в TeX,
// упрощение и дифференцирование с пошаговыми пояснениями.
// Работает и в браузере (window.Expr), и в Node (module.exports) — для тестов.
//
// Узлы дерева выражения:
//   { type: 'num', value }            — число
//   { type: 'var' }                   — переменная x
//   { type: 'const', name }           — e или pi
//   { type: 'neg', a }                — унарный минус
//   { type: 'op', op, a, b }          — + - * / ^
//   { type: 'fn', name, arg }         — sin, cos, tg, ctg, ln, exp, sqrt, arcsin, arccos, arctg, arcctg
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Expr = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- Конструкторы ----------
  const num = (value) => ({ type: 'num', value });
  const X = () => ({ type: 'var' });
  const cnst = (name) => ({ type: 'const', name });
  const op = (o, a, b) => ({ type: 'op', op: o, a, b });
  const neg = (a) => ({ type: 'neg', a });
  const fn = (name, arg) => ({ type: 'fn', name, arg });

  const FUNCS = ['sin', 'cos', 'tg', 'ctg', 'ln', 'exp', 'sqrt', 'arcsin', 'arccos', 'arctg', 'arcctg', 'abs'];
  const ALIASES = { tan: 'tg', cot: 'ctg', arctan: 'arctg', arccot: 'arcctg', log: 'ln' };
  const CONSTS = { e: Math.E, pi: Math.PI };

  const FN_EVAL = {
    sin: Math.sin,
    cos: Math.cos,
    tg: Math.tan,
    ctg: (v) => 1 / Math.tan(v),
    ln: Math.log,
    exp: Math.exp,
    sqrt: Math.sqrt,
    arcsin: Math.asin,
    arccos: Math.acos,
    arctg: Math.atan,
    arcctg: (v) => Math.PI / 2 - Math.atan(v),
    abs: Math.abs,
  };

  // ---------- Разбор строки ----------
  class ParseError extends Error {}

  const NAMES = [...FUNCS, ...Object.keys(ALIASES), ...Object.keys(CONSTS), 'x'].sort((p, q) => q.length - p.length);

  // «xsinx» -> x, sin, x
  function splitIdent(word) {
    const out = [];
    let i = 0;
    while (i < word.length) {
      const name = NAMES.find((n) => word.startsWith(n, i));
      if (!name) throw new ParseError('Неизвестное обозначение «' + word.slice(i) + '». Переменная — x, функции: sin, cos, tg, ctg, ln, sqrt, arcsin, arccos, arctg.');
      const canon = ALIASES[name] || name;
      if (canon === 'x') out.push({ t: 'x' });
      else if (canon in CONSTS) out.push({ t: 'const', name: canon });
      else out.push({ t: 'fn', name: canon });
      i += name.length;
    }
    return out;
  }

  function tokenize(src) {
    const s = String(src)
      .toLowerCase()
      .replace(/х/g, 'x') // русская «х»
      .replace(/е/g, 'e') // русская «е»
      .replace(/π/g, 'pi')
      .replace(/[−–—]/g, '-')
      .replace(/[·×]/g, '*')
      .replace(/\*\*/g, '^')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/[[{]/g, '(')
      .replace(/[\]}]/g, ')')
      .replace(/\|([^|]+)\|/g, 'abs($1)'); // модуль |u| (без вложенных)
    const tokens = [];
    let i = 0;
    while (i < s.length) {
      const ch = s[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (/[0-9.,]/.test(ch)) {
        let j = i;
        while (j < s.length && /[0-9.,]/.test(s[j])) j++;
        const raw = s.slice(i, j).replace(',', '.');
        if (!/^(\d+\.?\d*|\.\d+)$/.test(raw)) throw new ParseError('Не получилось прочитать число «' + s.slice(i, j) + '».');
        tokens.push({ t: 'num', v: parseFloat(raw) });
        i = j;
        continue;
      }
      if (/[a-z]/.test(ch)) {
        let j = i;
        while (j < s.length && /[a-z]/.test(s[j])) j++;
        tokens.push(...splitIdent(s.slice(i, j)));
        i = j;
        continue;
      }
      if ('+-*/^()'.includes(ch)) { tokens.push({ t: ch }); i++; continue; }
      throw new ParseError('Непонятный символ «' + ch + '».');
    }
    return tokens;
  }

  function parse(src) {
    const tk = tokenize(src);
    if (!tk.length) throw new ParseError('Введите выражение.');
    let p = 0;
    const peek = () => tk[p];
    const is = (t) => tk[p] && tk[p].t === t;
    const expect = (t) => {
      if (!is(t)) throw new ParseError(t === ')' ? 'Не хватает закрывающей скобки.' : 'Ожидалось «' + t + '».');
      p++;
    };
    const startsFactor = (t) => t && (t.t === 'num' || t.t === 'x' || t.t === 'const' || t.t === 'fn' || t.t === '(');

    function expr() {
      let n = term();
      while (is('+') || is('-')) {
        const o = tk[p++].t;
        n = op(o, n, term());
      }
      return n;
    }
    function term() {
      let n = unary();
      for (;;) {
        if (is('*') || is('/')) { const o = tk[p++].t; n = op(o, n, unary()); }
        else if (startsFactor(peek())) n = op('*', n, power()); // 2x, x sin x, 3(x+1)
        else break;
      }
      return n;
    }
    function unary() {
      if (is('-')) { p++; return neg(unary()); }
      if (is('+')) { p++; return unary(); }
      return power();
    }
    function power() {
      const base = primary();
      if (is('^')) { p++; return op('^', base, unary()); }
      return base;
    }
    // Аргумент функции без скобок: sin x, sin 2x, ln x^2 (но sin x cos x = sin(x)·cos(x))
    function bareArg() {
      let n = power();
      while (peek() && (is('num') || is('x') || is('const') || is('('))) n = op('*', n, power());
      return n;
    }
    function primary() {
      const t = tk[p++];
      if (!t) throw new ParseError('Выражение оборвалось: чего-то не хватает в конце.');
      if (t.t === 'num') return num(t.v);
      if (t.t === 'x') return X();
      if (t.t === 'const') return cnst(t.name);
      if (t.t === '(') { const n = expr(); expect(')'); return n; }
      if (t.t === 'fn') {
        let pw = null;
        if (is('^')) { p++; pw = unary(); } // sin^2 x
        let arg;
        if (is('(')) { p++; arg = expr(); expect(')'); }
        else if (peek()) arg = bareArg();
        else throw new ParseError('У функции ' + t.name + ' нет аргумента.');
        const f = fn(t.name, arg);
        return pw ? op('^', f, pw) : f;
      }
      if (t.t === ')') throw new ParseError('Лишняя закрывающая скобка или пустые скобки.');
      throw new ParseError('Не на месте знак «' + t.t + '».');
    }

    const n = expr();
    if (p < tk.length) throw new ParseError(is(')') ? 'Лишняя закрывающая скобка.' : 'Не удалось разобрать выражение целиком.');
    return n;
  }

  // ---------- Вычисление ----------
  function evaluate(n, x) {
    switch (n.type) {
      case 'num': return n.value;
      case 'var': return x;
      case 'const': return CONSTS[n.name];
      case 'neg': return -evaluate(n.a, x);
      case 'fn': return FN_EVAL[n.name](evaluate(n.arg, x));
      case 'op': {
        const a = evaluate(n.a, x), b = evaluate(n.b, x);
        switch (n.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': return a / b;
          case '^': return Math.pow(a, b);
        }
      }
    }
    return NaN;
  }

  function hasX(n) {
    switch (n.type) {
      case 'var': return true;
      case 'num': case 'const': return false;
      case 'neg': return hasX(n.a);
      case 'fn': return hasX(n.arg);
      case 'op': return hasX(n.a) || hasX(n.b);
    }
    return false;
  }

  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // Совпадают ли две функции (сравниваем значения в наборе точек)
  const SAMPLE = [-4.1, -3.7, -2.3, -1.7, -1.15, -0.6, -0.35, 0.3, 0.55, 0.7, 1.3, 1.45, 1.9, 2.6, 3.1, 3.6, 4.4, 5.2];
  function equivalent(f, g) {
    let valid = 0;
    for (const x of SAMPLE) {
      const a = evaluate(g, x);
      if (!isFinite(a)) continue;
      const b = evaluate(f, x);
      if (!isFinite(b)) return false;
      if (Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(a))) return false;
      valid++;
    }
    return valid >= 3;
  }

  // ---------- Упрощение ----------
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }
  const isNum = (n, v) => n.type === 'num' && (v === undefined || n.value === v);
  const isInt = (n) => n.type === 'num' && Number.isInteger(n.value);

  function isNegative(n) {
    if (n.type === 'num') return n.value < 0;
    if (n.type === 'neg') return true;
    if (n.type === 'op' && n.op === '*') return isNum(n.a) && n.a.value < 0;
    if (n.type === 'op' && n.op === '/') return isNegative(n.a);
    return false;
  }
  function negate(n) {
    if (n.type === 'num') return num(-n.value);
    if (n.type === 'neg') return n.a;
    if (n.type === 'op' && n.op === '*' && isNum(n.a)) return n.a.value === -1 ? n.b : op('*', num(-n.a.value), n.b);
    if (n.type === 'op' && n.op === '/' && isNegative(n.a)) return op('/', negate(n.a), n.b);
    return neg(n);
  }
  // 6x^2 -> [6, x^2]
  function coef(n) {
    if (n.type === 'num') return [n.value, null];
    if (n.type === 'op' && n.op === '*' && isNum(n.a)) return [n.a.value, n.b];
    return [1, n];
  }
  function withCoef(c, rest) {
    if (!rest) return num(c);
    return c === 1 ? rest : op('*', num(c), rest);
  }
  const asPow = (n) => (n.type === 'op' && n.op === '^' ? [n.a, n.b] : [n, num(1)]);

  // Порядок множителей: число, затем степени x, затем остальное (2x sin x, а не sin x · 2x)
  function rank(n) {
    if (n.type === 'num') return 0;
    if (n.type === 'var') return 1;
    if (n.type === 'op' && n.op === '^' && n.a.type === 'var' && isNum(n.b)) return 1;
    return 2;
  }

  // Приведение подобных: x + 2 - (x - 1) -> 3
  function collectSum(n) {
    const terms = flatten(n, 1, []);
    const groups = [];
    for (const t of terms) {
      let [c, rest] = coef(t.n.type === 'neg' ? t.n.a : t.n);
      if (t.n.type === 'neg') c = -c;
      c *= t.s;
      const key = rest ? JSON.stringify(rest) : '';
      const g = groups.find((q) => q.key === key);
      if (g) g.c += c; else groups.push({ key, c, rest });
    }
    const kept = groups.filter((g) => Math.abs(g.c) > 1e-12);
    if (kept.length === terms.length) return null; // нечего приводить
    kept.sort((p, q) => (p.rest ? 0 : 1) - (q.rest ? 0 : 1)); // число — в конец
    let res = null;
    for (const g of kept) {
      const term = withCoef(Math.abs(g.c), g.rest);
      res = res ? op(g.c < 0 ? '-' : '+', res, term) : g.c < 0 ? negate(term) : term;
    }
    return res || num(0);
  }
  function flatten(n, sign, out) {
    if (n.type === 'op' && (n.op === '+' || n.op === '-')) {
      flatten(n.a, sign, out);
      flatten(n.b, n.op === '-' ? -sign : sign, out);
    } else out.push({ s: sign, n });
    return out;
  }

  // Множители произведения с показателями: x^2 (x+1) -> [{x,2}, {x+1,1}]
  function factors(n, out) {
    if (n.type === 'op' && n.op === '*') { factors(n.a, out); factors(n.b, out); }
    else if (n.type === 'op' && n.op === '^' && isNum(n.b)) out.push({ base: n.a, e: n.b.value });
    else out.push({ base: n, e: 1 });
    return out;
  }
  function product(list) {
    let res = null;
    for (const f of list) {
      const t = f.e === 1 ? f.base : op('^', f.base, num(f.e));
      res = res ? op('*', res, t) : t;
    }
    return res || num(1);
  }
  // Сокращение одинаковых множителей в числителе и знаменателе
  function cancel(a, b) {
    const fa = factors(a, []), fb = factors(b, []);
    let changed = false;
    for (const f of fa) {
      if (f.base.type === 'num') continue;
      const g = fb.find((q) => q.e > 0 && equal(q.base, f.base));
      if (!g || f.e <= 0) continue;
      const m = Math.min(f.e, g.e);
      f.e -= m; g.e -= m;
      changed = true;
    }
    if (!changed) return null;
    return op('/', product(fa.filter((f) => f.e > 0)), product(fb.filter((f) => f.e > 0)));
  }

  function simpOp(o, a, b) {
    if (isNum(a) && isNum(b)) {
      const x = a.value, y = b.value;
      if (o === '+') return num(x + y);
      if (o === '-') return num(x - y);
      if (o === '*') return num(x * y);
      if (o === '/' && y !== 0) {
        if (Number.isInteger(x / y)) return num(x / y);
        if (Number.isInteger(x) && Number.isInteger(y)) {
          const g = gcd(x, y) * Math.sign(y);
          if (g !== 1) return op('/', num(x / g), num(y / g));
        }
      }
      if (o === '^' && Number.isInteger(y) && y >= 0) {
        const r = Math.pow(x, y);
        if (Number.isInteger(r) && Math.abs(r) < 1e6) return num(r);
      }
      return op(o, a, b);
    }
    switch (o) {
      case '+': {
        const c = collectSum(op('+', a, b));
        if (c) return c;
        if (isNum(a, 0)) return b;
        if (isNum(b, 0)) return a;
        if (isNegative(b)) return op('-', a, negate(b));
        if (equal(a, b)) return op('*', num(2), a);
        break;
      }
      case '-': {
        const c = collectSum(op('-', a, b));
        if (c) return c;
        if (isNum(b, 0)) return a;
        if (isNum(a, 0)) return negate(b);
        if (isNegative(b)) return op('+', a, negate(b));
        if (equal(a, b)) return num(0);
        break;
      }
      case '*': {
        if (isNum(a, 0) || isNum(b, 0)) return num(0);
        if (isNum(a, 1)) return b;
        if (isNum(b, 1)) return a;
        if (isNum(a, -1)) return negate(b);
        if (isNum(b, -1)) return negate(a);
        if (isNum(b)) return op('*', b, a); // числа — вперёд
        if (a.type === 'neg') return negate(op('*', a.a, b));
        if (b.type === 'neg') return negate(op('*', a, b.a));
        if (b.type === 'op' && b.op === '*' && isNum(b.a)) {
          return isNum(a) ? op('*', num(a.value * b.a.value), b.b) : op('*', b.a, op('*', a, b.b));
        }
        if (a.type === 'op' && a.op === '*' && isNum(a.a)) return op('*', a.a, op('*', a.b, b));
        if (b.type === 'op' && b.op === '/' && (isNum(b.a) || isNum(a))) return op('/', op('*', a, b.a), b.b);
        if (a.type === 'op' && a.op === '/' && (isNum(a.a) || isNum(b))) return op('/', op('*', a.a, b), a.b);
        if (a.type === 'op' && a.op === '/' && b.type === 'op' && b.op === '/') return op('/', op('*', a.a, b.a), op('*', a.b, b.b));
        if (b.type !== 'op' || b.op !== '*') { if (rank(a) > rank(b)) return op('*', b, a); }
        else if (rank(a) > rank(b.a)) return op('*', b.a, op('*', a, b.b));
        if (equal(a, b)) return op('^', a, num(2));
        const [ba, ea] = asPow(a), [bb, eb] = asPow(b);
        if (equal(ba, bb) && isNum(ea) && isNum(eb)) return op('^', ba, num(ea.value + eb.value));
        break;
      }
      case '/': {
        if (isNum(b, 1)) return a;
        if (isNum(a, 0)) return num(0);
        if (equal(a, b)) return num(1);
        if (a.type === 'neg') return negate(op('/', a.a, b));
        if (isNum(b) && b.value < 0) return negate(op('/', a, num(-b.value)));
        if (a.type === 'op' && a.op === '/') return op('/', a.a, op('*', a.b, b));
        if (b.type === 'op' && b.op === '/') return op('/', op('*', a, b.b), b.a);
        const [ca, ra] = coef(a), [cb, rb] = coef(b);
        if (Number.isInteger(ca) && Number.isInteger(cb) && (ca !== 1 || cb !== 1)) {
          const g = gcd(ca, cb);
          if (g > 1) return op('/', withCoef(ca / g, ra), withCoef(cb / g, rb));
        }
        const cancelled = cancel(a, b);
        if (cancelled) return cancelled;
        break;
      }
      case '^':
        if (isNum(b, 1)) return a;
        if (isNum(b, 0)) return num(1);
        if (a.type === 'op' && a.op === '^' && isNum(a.b) && isNum(b)) return op('^', a.a, num(a.b.value * b.value));
        if (a.type === 'fn' && a.name === 'sqrt' && isNum(b, 2)) return a.arg;
        break;
    }
    return op(o, a, b);
  }

  function simp(n) {
    switch (n.type) {
      case 'neg': {
        const a = simp(n.a);
        if (a.type === 'num') return num(-a.value);
        if (a.type === 'neg') return a.a;
        if (a.type === 'op' && a.op === '*' && isNum(a.a)) return negate(a);
        if (a.type === 'op' && a.op === '/' && isNum(a.a)) return op('/', num(-a.a.value), a.b);
        return neg(a);
      }
      case 'fn': return fn(n.name, simp(n.arg));
      case 'op': return simpOp(n.op, simp(n.a), simp(n.b));
      default: return n;
    }
  }

  function simplify(n) {
    let cur = n;
    for (let i = 0; i < 20; i++) {
      const next = simp(cur);
      if (equal(next, cur)) break;
      cur = next;
    }
    return cur;
  }

  // ---------- Вывод в TeX ----------
  const FN_TEX = {
    sin: '\\sin', cos: '\\cos', tg: '\\operatorname{tg}', ctg: '\\operatorname{ctg}', ln: '\\ln',
    arcsin: '\\arcsin', arccos: '\\arccos', arctg: '\\operatorname{arctg}', arcctg: '\\operatorname{arcctg}',
  };
  const wrap = (s, cond) => (cond ? '\\left(' + s + '\\right)' : s);
  const isAtom = (n) => n.type === 'var' || n.type === 'const' || (n.type === 'num' && n.value >= 0) || (n.type === 'fn' && n.name === 'abs');
  const isSum = (n) => n.type === 'op' && (n.op === '+' || n.op === '-');

  function prec(n) {
    switch (n.type) {
      case 'num': return n.value < 0 ? 1.5 : 9;
      case 'var': case 'const': return 9;
      case 'neg': return 1.5;
      case 'fn': return 5;
      case 'op':
        if (n.op === '/' && isNegative(n.a)) return 1.5;
        return { '+': 1, '-': 1, '*': 2, '/': 3, '^': 4 }[n.op];
    }
    return 0;
  }

  function fmtNum(v) {
    const r = Math.round(v * 1e6) / 1e6;
    return String(r).replace('.', '{,}');
  }

  function fnTex(n, sup) {
    if (n.name === 'sqrt') return '\\sqrt{' + tex(n.arg) + '}';
    if (n.name === 'abs') return '\\left|' + tex(n.arg) + '\\right|' + (sup ? '^{' + sup + '}' : '');
    if (n.name === 'exp') return 'e^{' + tex(n.arg) + '}';
    const name = FN_TEX[n.name] + (sup ? '^{' + sup + '}' : '');
    return isAtom(n.arg) ? name + ' ' + tex(n.arg) : name + '\\left(' + tex(n.arg) + '\\right)';
  }

  function tex(n) {
    switch (n.type) {
      case 'num': return fmtNum(n.value);
      case 'var': return 'x';
      case 'const': return n.name === 'pi' ? '\\pi' : 'e';
      case 'neg': return '-' + wrap(tex(n.a), prec(n.a) < 2);
      case 'fn': return fnTex(n);
      case 'op': {
        const { a, b } = n;
        switch (n.op) {
          case '+': return tex(a) + ' + ' + wrap(tex(b), prec(b) < 2);
          case '-': return tex(a) + ' - ' + wrap(tex(b), prec(b) < 2);
          case '/': return isNegative(a) ? '-\\frac{' + tex(negate(a)) + '}{' + tex(b) + '}' : '\\frac{' + tex(a) + '}{' + tex(b) + '}';
          case '*': {
            const lt = wrap(tex(a), prec(a) < 1.5);
            const rt = wrap(tex(b), prec(b) < 2);
            const dot =
              /^[\d-]/.test(rt) ||
              (/^\\frac/.test(rt) && (a.type === 'num' || /\\frac/.test(lt))) ||
              (a.type === 'fn' && a.name !== 'sqrt' && a.name !== 'exp' && isAtom(a.arg)) ||
              (a.type === 'op' && a.op === '^' && a.a.type === 'fn' && isAtom(a.a.arg));
            return lt + (dot ? ' \\cdot ' : ' ') + rt;
          }
          case '^': {
            if (a.type === 'fn' && FN_TEX[a.name] && isInt(b) && b.value > 0) return fnTex(a, b.value);
            return wrap(tex(a), !isAtom(a)) + '^{' + tex(b) + '}';
          }
        }
      }
    }
    return '?';
  }

  // ---------- Дифференцирование с шагами ----------
  // Производные «внешних» функций: f'(u)
  const FN_DERIV = {
    sin: (u) => fn('cos', u),
    cos: (u) => neg(fn('sin', u)),
    tg: (u) => op('/', num(1), op('^', fn('cos', u), num(2))),
    ctg: (u) => neg(op('/', num(1), op('^', fn('sin', u), num(2)))),
    ln: (u) => op('/', num(1), u),
    exp: (u) => fn('exp', u),
    sqrt: (u) => op('/', num(1), op('*', num(2), fn('sqrt', u))),
    arcsin: (u) => op('/', num(1), fn('sqrt', op('-', num(1), op('^', u, num(2))))),
    arccos: (u) => neg(op('/', num(1), fn('sqrt', op('-', num(1), op('^', u, num(2)))))),
    arctg: (u) => op('/', num(1), op('+', num(1), op('^', u, num(2)))),
    arcctg: (u) => neg(op('/', num(1), op('+', num(1), op('^', u, num(2))))),
    abs: (u) => op('/', u, fn('abs', u)), // (|u|)' = u/|u| · u' (при u ≠ 0)
  };
  const TABLE_TEX = {
    sin: "(\\sin x)' = \\cos x",
    cos: "(\\cos x)' = -\\sin x",
    tg: "(\\operatorname{tg} x)' = \\frac{1}{\\cos^2 x}",
    ctg: "(\\operatorname{ctg} x)' = -\\frac{1}{\\sin^2 x}",
    ln: "(\\ln x)' = \\frac{1}{x}",
    exp: "(e^x)' = e^x",
    sqrt: "(\\sqrt{x})' = \\frac{1}{2\\sqrt{x}}",
    arcsin: "(\\arcsin x)' = \\frac{1}{\\sqrt{1 - x^2}}",
    arccos: "(\\arccos x)' = -\\frac{1}{\\sqrt{1 - x^2}}",
    arctg: "(\\operatorname{arctg} x)' = \\frac{1}{1 + x^2}",
    arcctg: "(\\operatorname{arcctg} x)' = -\\frac{1}{1 + x^2}",
    abs: "(|x|)' = \\frac{x}{|x|} \\;(x \\ne 0)",
  };

  const P = (n) => '\\left(' + tex(n) + "\\right)'";
  const texF = (n) => wrap(tex(n), isSum(n) || n.type === 'neg' || (n.type === 'num' && n.value < 0));
  const S = (n) => tex(simplify(n));

  // Слагаемые цепочки a ± b ± c
  function flattenSum(n, sign, out) {
    if (n.type === 'op' && (n.op === '+' || n.op === '-')) {
      flattenSum(n.a, sign, out);
      flattenSum(n.b, n.op === '-' ? -sign : sign, out);
    } else out.push({ s: sign, n });
    return out;
  }

  // Функция из таблицы с аргументом x: x^n, sin x, e^x, ...
  function isTable(u) {
    if (u.type === 'fn') return u.arg.type === 'var';
    if (u.type === 'op' && u.op === '^') return (u.a.type === 'var' && !hasX(u.b)) || (!hasX(u.a) && u.b.type === 'var');
    return false;
  }

  function D(n, steps) {
    if (!hasX(n)) return num(0);
    switch (n.type) {
      case 'var':
        return num(1);
      case 'neg':
        steps.push({ rule: 'neg', title: 'Минус (множитель −1) выносим за знак производной.', tex: P(n) + ' = -' + P(n.a) });
        return neg(D(n.a, steps));
      case 'fn': {
        const u = n.arg;
        const outer = FN_DERIV[n.name](u);
        if (u.type === 'var') {
          steps.push({ rule: 'table', title: 'Табличная производная.', tex: P(n) + ' = ' + S(outer) });
          return outer;
        }
        steps.push({
          rule: 'chain',
          title: 'Сложная функция: внешняя — ' + (n.name === 'exp' ? 'экспонента' : n.name) + ', внутренняя \\(u = ' + tex(u) + "\\). Цепное правило: \\((f(u))' = f'(u) \\cdot u'\\), а по таблице \\(" + TABLE_TEX[n.name] + '\\).',
          tex: P(n) + ' = ' + wrap(S(outer), isSum(simplify(outer))) + ' \\cdot ' + P(u),
          outer,
        });
        return op('*', outer, D(u, steps));
      }
      case 'op':
        break;
      default:
        return num(0);
    }

    const { a, b } = n;
    switch (n.op) {
      case '+':
      case '-': {
        const ts = flattenSum(n, 1, []);
        const withX = ts.filter((t) => hasX(t.n));
        const hasConst = withX.length < ts.length;
        const rhs = withX.map((t, i) => (i === 0 ? (t.s < 0 ? '-' : '') : t.s < 0 ? ' - ' : ' + ') + P(t.n)).join('');
        const sumStep = {
          rule: 'sum',
          title: 'Производная суммы (разности) равна сумме (разности) производных' + (hasConst ? '; производная константы равна 0' : '') + '.',
          tex: P(n) + ' = ' + rhs,
        };
        steps.push(sumStep);
        let res = null;
        for (const t of withX) {
          const d = D(t.n, steps);
          res = res ? op(t.s < 0 ? '-' : '+', res, d) : t.s < 0 ? neg(d) : d;
        }
        // Если все слагаемые простые (x, 3x), сразу пишем итог
        if (withX.every((t) => t.n.type === 'var' || (t.n.type === 'op' && t.n.op === '*' && !hasX(t.n.a) && t.n.b.type === 'var'))) {
          sumStep.tex += ' = ' + S(res);
        }
        return res;
      }
      case '*': {
        if (!hasX(a) || !hasX(b)) {
          const c = hasX(a) ? b : a;
          const u = hasX(a) ? a : b;
          let t = P(n) + ' = ' + texF(c) + ' \\cdot ' + P(u);
          if (u.type === 'var') t += ' = ' + tex(c);
          else if (isTable(u)) {
            const du = D(u, []);
            t += ' = ' + texF(c) + ' \\cdot ' + texF(simplify(du)) + ' = ' + S(op('*', c, du));
            steps.push({ rule: 'const', title: 'Постоянный множитель выносим за знак производной, дальше — табличная производная.', tex: t });
            return op('*', c, du);
          }
          steps.push({ rule: 'const', title: 'Постоянный множитель выносим за знак производной.', tex: t });
          return op('*', c, D(u, steps));
        }
        steps.push({
          rule: 'product',
          title: "Производная произведения: \\((uv)' = u'v + uv'\\).",
          tex: P(n) + ' = ' + P(a) + ' \\cdot ' + texF(b) + ' + ' + texF(a) + ' \\cdot ' + P(b),
        });
        const da = D(a, steps), db = D(b, steps);
        return op('+', op('*', da, b), op('*', a, db));
      }
      case '/': {
        if (!hasX(b)) {
          steps.push({ rule: 'const', title: 'Знаменатель — константа: делим на него производную числителя.', tex: P(n) + ' = \\frac{' + P(a) + '}{' + tex(b) + '}' });
          return op('/', D(a, steps), b);
        }
        const v2 = tex(op('^', b, num(2)));
        if (!hasX(a)) {
          steps.push({
            rule: 'quotient',
            title: "Числитель — константа: \\(\\left(\\frac{c}{v}\\right)' = -\\frac{c \\cdot v'}{v^2}\\) (частный случай правила частного).",
            tex: P(n) + ' = -\\frac{' + texF(a) + ' \\cdot ' + P(b) + '}{' + v2 + '}',
          });
          return neg(op('/', op('*', a, D(b, steps)), op('^', b, num(2))));
        }
        steps.push({
          rule: 'quotient',
          title: "Производная частного: \\(\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}\\).",
          tex: P(n) + ' = \\frac{' + P(a) + ' \\cdot ' + texF(b) + ' - ' + texF(a) + ' \\cdot ' + P(b) + '}{' + v2 + '}',
        });
        const da = D(a, steps), db = D(b, steps);
        return op('/', op('-', op('*', da, b), op('*', a, db)), op('^', b, num(2)));
      }
      case '^': {
        const bx = hasX(a), ex = hasX(b);
        if (bx && !ex) {
          const formula = op('*', b, op('^', a, simplify(op('-', b, num(1)))));
          if (a.type === 'var') {
            steps.push({ rule: 'table', title: "Табличная производная степени: \\((x^n)' = n x^{n-1}\\).", tex: P(n) + ' = ' + S(formula) });
            return formula;
          }
          steps.push({
            rule: 'chain',
            title: "Степень сложной функции (цепное правило): \\((u^n)' = n u^{n-1} \\cdot u'\\), где \\(u = " + tex(a) + '\\).',
            tex: P(n) + ' = ' + S(formula) + ' \\cdot ' + P(a),
            outer: formula,
          });
          return op('*', formula, D(a, steps));
        }
        if (!bx && ex) {
          const isE = a.type === 'const' && a.name === 'e';
          const lnA = isE ? null : fn('ln', a);
          const outer = isE ? n : op('*', n, lnA);
          if (b.type === 'var') {
            steps.push({ rule: 'table', title: isE ? "Табличная производная: \\((e^x)' = e^x\\)." : "Табличная производная: \\((a^x)' = a^x \\ln a\\).", tex: P(n) + ' = ' + S(outer) });
            return outer;
          }
          steps.push({
            rule: 'chain',
            title: isE
              ? "Сложная функция: \\((e^u)' = e^u \\cdot u'\\), где \\(u = " + tex(b) + '\\).'
              : "Сложная функция: \\((a^u)' = a^u \\ln a \\cdot u'\\), где \\(u = " + tex(b) + '\\).',
            tex: P(n) + ' = ' + S(outer) + ' \\cdot ' + P(b),
            outer,
          });
          return op('*', outer, D(b, steps));
        }
        // u^v — логарифмическое дифференцирование
        steps.push({
          rule: 'logdiff',
          title: "Показательно-степенная функция \\(u^v\\): ни степенное, ни показательное правило не подходит. Логарифмируем: \\(\\ln y = v \\ln u\\), дифференцируем обе части: \\(\\frac{y'}{y} = v' \\ln u + v \\frac{u'}{u}\\).",
          tex: P(n) + ' = ' + tex(n) + ' \\left(' + P(b) + ' \\cdot ' + tex(fn('ln', a)) + ' + ' + texF(b) + ' \\cdot \\frac{' + P(a) + '}{' + tex(a) + '}\\right)',
        });
        const da = D(a, steps), db = D(b, steps);
        return op('*', n, op('+', op('*', db, fn('ln', a)), op('*', b, op('/', da, a))));
      }
    }
    return num(0);
  }

  // Производная с пошаговым решением: { result, raw, steps }
  function derive(n) {
    const steps = [];
    if (!hasX(n)) {
      steps.push({ rule: 'const', title: 'Функция не зависит от x — это константа, её производная равна 0.', tex: P(n) + ' = 0' });
      return { result: num(0), raw: num(0), steps };
    }
    const raw = D(n, steps);
    const result = simplify(raw);
    return { result, raw, steps };
  }

  return {
    parse, ParseError, evaluate, hasX, equal, equivalent, simplify, tex, derive,
    num, X, cnst, op, neg, fn, FN_DERIV, TABLE_TEX,
  };
});
