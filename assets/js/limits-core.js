// Тренажёр по пределам: генерация задач с пошаговыми решениями,
// разбор ответа (число, выражение вроде e^3, ∞), задачи «найдите N(ε)».
// Зависит от Expr (assets/js/expr.js).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./expr.js'));
  else root.LimCore = factory(root.Expr);
})(typeof self !== 'undefined' ? self : this, function (E) {
  'use strict';

  const rnd = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const nz = (min, max) => { let v; do { v = rnd(min, max); } while (v === 0); return v; };
  const sg = (v) => (v < 0 ? ' - ' + -v : ' + ' + v);

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  }
  // Дробь p/q в TeX (сокращённая)
  function fr(p, q) {
    if (q < 0) { p = -p; q = -q; }
    const g = gcd(p, q);
    p /= g; q /= g;
    if (q === 1) return String(p);
    return (p < 0 ? '-' : '') + '\\frac{' + Math.abs(p) + '}{' + q + '}';
  }
  // Формула (строкой для Expr) -> TeX; для последовательностей x заменяем на n
  const T = (src) => E.tex(E.simplify(E.parse(src)));
  const Tn = (src) => T(src).replace(/x/g, 'n');
  // « + \frac{3}{n}» / « - \frac{3}{n}»
  const sf = (k, den) => (k < 0 ? ' - ' : ' + ') + '\\frac{' + Math.abs(k) + '}{' + den + '}';
  // коэффициент перед буквой: 1 -> '', -1 -> '-'
  const cf = (k) => (k === 1 ? '' : k === -1 ? '-' : String(k));
  const lim = (to, v) => '\\lim_{' + (v || 'x') + ' \\to ' + to + '} ';

  // Каждый шаблон: { tex, answer (число или ±Infinity), answerTex, steps: [{title, tex}] }
  const TEMPLATES = {
    // ---------- 1. Бесконечность на бесконечность ----------
    ratSame() {
      const a = nz(-6, 6), b = nz(-9, 9), c = nz(-9, 9), d = nz(1, 6), e = nz(-9, 9);
      const f = Tn(a + 'x^2' + sg(b) + 'x' + sg(c)), g = Tn(d + 'x^2' + sg(e) + 'x');
      return {
        tex: lim('\\infty', 'n') + '\\frac{' + f + '}{' + g + '}',
        answer: a / d, answerTex: fr(a, d),
        num: { at: Infinity, f: (n) => (a * n * n + b * n + c) / (d * n * n + e * n) },
        steps: [
          { title: 'Неопределённость \\(\\frac{\\infty}{\\infty}\\). Делим числитель и знаменатель на старшую степень \\(n^2\\).', tex: '= ' + lim('\\infty', 'n') + '\\frac{' + a + sf(b, 'n') + sf(c, 'n^2') + '}{' + d + sf(e, 'n') + '}' },
          { title: 'Слагаемые вида \\(\\frac{k}{n}\\) и \\(\\frac{k}{n^2}\\) стремятся к нулю.', tex: '= \\frac{' + a + '}{' + d + '} = ' + fr(a, d) },
        ],
      };
    },
    ratLower() {
      const a = nz(-7, 7), b = nz(-9, 9), c = nz(1, 6), d = nz(-9, 9);
      return {
        tex: lim('\\infty', 'n') + '\\frac{' + Tn(a + 'x' + sg(b)) + '}{' + Tn(c + 'x^2' + sg(d)) + '}',
        answer: 0, answerTex: '0',
        num: { at: Infinity, f: (n) => (a * n + b) / (c * n * n + d) },
        steps: [
          { title: 'Степень числителя (1) меньше степени знаменателя (2). Делим на \\(n^2\\):', tex: '= ' + lim('\\infty', 'n') + '\\frac{' + (a < 0 ? '-' : '') + '\\frac{' + Math.abs(a) + '}{n}' + sf(b, 'n^2') + '}{' + c + sf(d, 'n^2') + '}' },
          { title: 'Числитель стремится к 0, знаменатель — к ' + c + '.', tex: '= \\frac{0}{' + c + '} = 0' },
        ],
      };
    },
    ratHigher() {
      const a = nz(-5, 5), b = nz(-9, 9), c = nz(1, 5), d = nz(-9, 9);
      const inf = a > 0 ? '+\\infty' : '-\\infty';
      return {
        tex: lim('\\infty', 'n') + '\\frac{' + Tn(a + 'x^3' + sg(b)) + '}{' + Tn(c + 'x^2' + sg(d) + 'x') + '}',
        answer: a > 0 ? Infinity : -Infinity, answerTex: inf,
        num: { at: Infinity, f: (n) => (a * n ** 3 + b) / (c * n * n + d * n) },
        steps: [
          { title: 'Степень числителя (3) больше степени знаменателя (2). Делим на \\(n^2\\):', tex: '= ' + lim('\\infty', 'n') + '\\frac{' + cf(a) + 'n' + sf(b, 'n^2') + '}{' + c + sf(d, 'n') + '}' },
          { title: 'Числитель неограниченно растёт по модулю (знак — как у \\(' + a + 'n\\)), знаменатель стремится к ' + c + ' &gt; 0.', tex: '= ' + inf },
        ],
      };
    },
    sqrtDiff() {
      const a = nz(-8, 8);
      return {
        tex: lim('\\infty', 'n') + '\\left(\\sqrt{' + Tn('x^2' + sg(a) + 'x') + '} - n\\right)',
        answer: a / 2, answerTex: fr(a, 2),
        num: { at: Infinity, f: (n) => Math.sqrt(n * n + a * n) - n },
        steps: [
          { title: 'Неопределённость \\(\\infty - \\infty\\). Умножаем и делим на сопряжённое выражение \\(\\sqrt{\\ldots} + n\\):', tex: '= ' + lim('\\infty', 'n') + '\\frac{(' + Tn('x^2' + sg(a) + 'x') + ') - n^2}{\\sqrt{' + Tn('x^2' + sg(a) + 'x') + '} + n}' },
          { title: 'В числителе \\(n^2\\) сокращается. Делим числитель и знаменатель на \\(n\\):', tex: '= ' + lim('\\infty', 'n') + '\\frac{' + a + '}{\\sqrt{1 ' + (a < 0 ? '-' : '+') + ' \\frac{' + Math.abs(a) + '}{n}} + 1}' },
          { title: 'Корень стремится к 1:', tex: '= \\frac{' + a + '}{2} = ' + fr(a, 2) },
        ],
      };
    },

    // ---------- 2. Ноль на ноль ----------
    diffSquares() {
      const r = nz(-6, 6);
      return {
        tex: lim(r) + '\\frac{x^2 - ' + r * r + '}{' + T('x' + sg(-r)) + '}',
        answer: 2 * r, answerTex: String(2 * r),
        num: { at: r, f: (x) => (x * x - r * r) / (x - r) },
        steps: [
          { title: 'Подстановка \\(x = ' + r + '\\) даёт \\(\\frac{0}{0}\\). Раскладываем числитель по формуле разности квадратов:', tex: '= ' + lim(r) + '\\frac{(' + T('x' + sg(-r)) + ')(' + T('x' + sg(r)) + ')}{' + T('x' + sg(-r)) + '}' },
          { title: 'Сокращаем на \\(' + T('x' + sg(-r)) + '\\): так можно, потому что в определении предела \\(x \\ne ' + r + '\\).', tex: '= ' + lim(r) + '(' + T('x' + sg(r)) + ') = ' + 2 * r },
        ],
      };
    },
    cubes() {
      const r = nz(-4, 4);
      return {
        tex: lim(r) + '\\frac{' + T('x^3' + sg(-r * r * r)) + '}{' + T('x' + sg(-r)) + '}',
        answer: 3 * r * r, answerTex: String(3 * r * r),
        num: { at: r, f: (x) => (x ** 3 - r ** 3) / (x - r) },
        steps: [
          { title: 'Неопределённость \\(\\frac{0}{0}\\). Разность кубов: \\(x^3 - a^3 = (x - a)(x^2 + ax + a^2)\\).', tex: '= ' + lim(r) + '\\frac{(' + T('x' + sg(-r)) + ')(' + T('x^2' + sg(r) + 'x' + sg(r * r)) + ')}{' + T('x' + sg(-r)) + '}' },
          { title: 'Сокращаем и подставляем:', tex: '= ' + r * r + ' + ' + r * r + ' + ' + r * r + ' = ' + 3 * r * r },
        ],
      };
    },
    factorQuad() {
      let r, s;
      do { r = nz(-5, 5); s = nz(-5, 5); } while (s === r || s === -r);
      // числитель (x - r)(x - s), знаменатель x^2 - r^2 = (x - r)(x + r)
      const num = 'x^2' + sg(-(r + s)) + 'x' + sg(r * s);
      return {
        tex: lim(r) + '\\frac{' + T(num) + '}{x^2 - ' + r * r + '}',
        answer: (r - s) / (2 * r), answerTex: fr(r - s, 2 * r),
        num: { at: r, f: (x) => (x * x - (r + s) * x + r * s) / (x * x - r * r) },
        steps: [
          { title: 'При \\(x = ' + r + '\\) и числитель, и знаменатель обращаются в 0, значит оба делятся на \\(' + T('x' + sg(-r)) + '\\). Раскладываем на множители:', tex: '= ' + lim(r) + '\\frac{(' + T('x' + sg(-r)) + ')(' + T('x' + sg(-s)) + ')}{(' + T('x' + sg(-r)) + ')(' + T('x' + sg(r)) + ')}' },
          { title: 'Сокращаем (здесь \\(x \\ne ' + r + '\\)) и подставляем:', tex: '= \\frac{' + r + sg(-s) + '}{' + r + sg(r) + '} = ' + fr(r - s, 2 * r) },
        ],
      };
    },
    sqrtZero() {
      const a = rnd(1, 5);
      return {
        tex: lim(0) + '\\frac{\\sqrt{x + ' + a * a + '} - ' + a + '}{x}',
        answer: 1 / (2 * a), answerTex: fr(1, 2 * a),
        num: { at: 0, f: (x) => (Math.sqrt(x + a * a) - a) / x },
        steps: [
          { title: 'Неопределённость \\(\\frac{0}{0}\\) с корнем. Домножаем на сопряжённое \\(\\sqrt{x + ' + a * a + '} + ' + a + '\\):', tex: '= ' + lim(0) + '\\frac{(x + ' + a * a + ') - ' + a * a + '}{x\\left(\\sqrt{x + ' + a * a + '} + ' + a + '\\right)}' },
          { title: 'В числителе остаётся \\(x\\), сокращаем:', tex: '= ' + lim(0) + '\\frac{1}{\\sqrt{x + ' + a * a + '} + ' + a + '} = \\frac{1}{' + 2 * a + '}' },
        ],
      };
    },

    // ---------- 3. Замечательные пределы и эквивалентности ----------
    sinLin() {
      const a = nz(2, 9), b = nz(2, 9);
      return {
        tex: lim(0) + '\\frac{\\sin ' + a + 'x}{' + b + 'x}',
        answer: a / b, answerTex: fr(a, b),
        num: { at: 0, f: (x) => Math.sin(a * x) / (b * x) },
        steps: [
          { title: 'Подгоняем под первый замечательный предел \\(\\lim_{t \\to 0} \\frac{\\sin t}{t} = 1\\), где \\(t = ' + a + 'x \\to 0\\):', tex: '= ' + lim(0) + '\\frac{\\sin ' + a + 'x}{' + a + 'x} \\cdot \\frac{' + a + '}{' + b + '}' },
          { title: 'Первый множитель стремится к 1:', tex: '= 1 \\cdot \\frac{' + a + '}{' + b + '} = ' + fr(a, b) },
        ],
      };
    },
    tgSin() {
      const a = nz(2, 9), b = nz(2, 9);
      return {
        tex: lim(0) + '\\frac{\\operatorname{tg} ' + a + 'x}{\\sin ' + b + 'x}',
        answer: a / b, answerTex: fr(a, b),
        num: { at: 0, f: (x) => Math.tan(a * x) / Math.sin(b * x) },
        steps: [
          { title: 'Заменяем бесконечно малые на эквивалентные: \\(\\operatorname{tg} t \\sim t\\) и \\(\\sin t \\sim t\\) при \\(t \\to 0\\).', tex: '= ' + lim(0) + '\\frac{' + a + 'x}{' + b + 'x}' },
          { title: 'Сокращаем \\(x\\):', tex: '= ' + fr(a, b) },
        ],
      };
    },
    oneMinusCos() {
      const a = nz(2, 6);
      return {
        tex: lim(0) + '\\frac{1 - \\cos ' + a + 'x}{x^2}',
        answer: (a * a) / 2, answerTex: fr(a * a, 2),
        num: { at: 0, f: (x) => (1 - Math.cos(a * x)) / (x * x) },
        steps: [
          { title: 'Эквивалентность \\(1 - \\cos t \\sim \\frac{t^2}{2}\\) (она следует из \\(1 - \\cos t = 2\\sin^2 \\frac{t}{2}\\) и \\(\\sin \\frac{t}{2} \\sim \\frac{t}{2}\\)).', tex: '= ' + lim(0) + '\\frac{(' + a + 'x)^2}{2x^2}' },
          { title: 'Сокращаем:', tex: '= \\frac{' + a * a + '}{2} = ' + fr(a * a, 2) },
        ],
      };
    },
    expSin() {
      const a = nz(2, 8), b = nz(2, 8);
      return {
        tex: lim(0) + '\\frac{e^{' + a + 'x} - 1}{\\sin ' + b + 'x}',
        answer: a / b, answerTex: fr(a, b),
        num: { at: 0, f: (x) => (Math.exp(a * x) - 1) / Math.sin(b * x) },
        steps: [
          { title: 'Эквивалентности при \\(t \\to 0\\): \\(e^t - 1 \\sim t\\), \\(\\sin t \\sim t\\).', tex: '= ' + lim(0) + '\\frac{' + a + 'x}{' + b + 'x}' },
          { title: 'Сокращаем:', tex: '= ' + fr(a, b) },
        ],
      };
    },
    lnExp() {
      const a = nz(2, 8), b = nz(2, 8);
      return {
        tex: lim(0) + '\\frac{\\ln(1 + ' + a + 'x)}{e^{' + b + 'x} - 1}',
        answer: a / b, answerTex: fr(a, b),
        num: { at: 0, f: (x) => Math.log(1 + a * x) / (Math.exp(b * x) - 1) },
        steps: [
          { title: 'Эквивалентности при \\(t \\to 0\\): \\(\\ln(1 + t) \\sim t\\), \\(e^t - 1 \\sim t\\).', tex: '= ' + lim(0) + '\\frac{' + a + 'x}{' + b + 'x}' },
          { title: 'Сокращаем:', tex: '= ' + fr(a, b) },
        ],
      };
    },
    arcsinLn() {
      const a = nz(2, 8), b = nz(2, 8);
      return {
        tex: lim(0) + '\\frac{\\arcsin ' + a + 'x}{\\ln(1 + ' + b + 'x)}',
        answer: a / b, answerTex: fr(a, b),
        num: { at: 0, f: (x) => Math.asin(a * x) / Math.log(1 + b * x) },
        steps: [
          { title: 'Эквивалентности: \\(\\arcsin t \\sim t\\), \\(\\ln(1 + t) \\sim t\\) при \\(t \\to 0\\).', tex: '= ' + lim(0) + '\\frac{' + a + 'x}{' + b + 'x}' },
          { title: 'Сокращаем:', tex: '= ' + fr(a, b) },
        ],
      };
    },

    // ---------- 4. Второй замечательный предел ----------
    secondA() {
      const a = nz(-4, 4), b = nz(1, 4);
      const ab = a * b;
      const base = '1' + sf(a, 'x');
      const t = Math.abs(a) === 1 ? (a < 0 ? '-x' : 'x') : (a < 0 ? '-' : '') + '\\frac{x}{' + Math.abs(a) + '}';
      return {
        tex: lim('\\infty') + '\\left(' + base + '\\right)^{' + cf(b) + 'x}',
        answer: Math.exp(ab), answerTex: 'e^{' + ab + '}',
        num: { at: Infinity, f: (x) => Math.pow(1 + a / x, b * x) },
        steps: [
          { title: 'Неопределённость \\(1^\\infty\\). Выделяем второй замечательный предел \\(\\lim_{t \\to \\infty} \\left(1 + \\frac{1}{t}\\right)^t = e\\), где \\(t = ' + t + '\\):', tex: '= ' + lim('\\infty') + '\\left[\\left(' + base + '\\right)^{' + t + '}\\right]^{' + ab + '}' },
          { title: 'Выражение в квадратных скобках стремится к \\(e\\):', tex: '= e^{' + ab + '}' },
        ],
      };
    },
    secondB() {
      let a, b;
      do { a = nz(-5, 5); b = nz(-5, 5); } while (a === b);
      const k = a - b;
      const den = T('x' + sg(b));
      const alpha = (k < 0 ? '-' : '') + '\\frac{' + Math.abs(k) + '}{' + den + '}';
      const expo = (k < 0 ? '-' : '') + '\\frac{' + cf(Math.abs(k)) + 'x}{' + den + '}';
      return {
        tex: lim('\\infty') + '\\left(\\frac{' + T('x' + sg(a)) + '}{' + den + '}\\right)^{x}',
        answer: Math.exp(k), answerTex: 'e^{' + k + '}',
        num: { at: Infinity, f: (x) => Math.pow((x + a) / (x + b), x) },
        steps: [
          { title: 'Основание стремится к 1, показатель к \\(\\infty\\): неопределённость \\(1^\\infty\\). Выделяем единицу:', tex: '\\frac{' + T('x' + sg(a)) + '}{' + den + '} = 1' + sf(k, den) },
          { title: 'Используем \\(\\lim (1 + \\alpha)^{1/\\alpha} = e\\) при \\(\\alpha \\to 0\\), где \\(\\alpha = ' + alpha + '\\):', tex: '= ' + lim('\\infty') + '\\left[(1 + \\alpha)^{\\frac{1}{\\alpha}}\\right]^{' + expo + '}' },
          { title: 'Показатель \\(' + expo + ' \\to ' + k + '\\):', tex: '= e^{' + k + '}' },
        ],
      };
    },
    secondZero() {
      const a = nz(-6, 6), b = nz(1, 6);
      const ax = T(Math.abs(a) + 'x');
      const base = '1 ' + (a < 0 ? '-' : '+') + ' ' + ax;
      const inv = (a < 0 ? '-' : '') + '\\frac{1}{' + ax + '}';
      return {
        tex: lim(0) + '\\left(' + base + '\\right)^{\\frac{1}{' + T(b + 'x') + '}}',
        answer: Math.exp(a / b), answerTex: 'e^{' + fr(a, b) + '}',
        num: { at: 0, f: (x) => Math.pow(1 + a * x, 1 / (b * x)) },
        steps: [
          { title: 'Неопределённость \\(1^\\infty\\). Используем \\(\\lim_{t \\to 0} (1 + t)^{1/t} = e\\), где \\(t = ' + T(a + 'x') + '\\):', tex: '= ' + lim(0) + '\\left[(' + base + ')^{' + inv + '}\\right]^{' + fr(a, b) + '}' },
          { title: 'Квадратная скобка стремится к \\(e\\):', tex: '= e^{' + fr(a, b) + '}' },
        ],
      };
    },
  };

  const LEVELS = {
    1: { name: '∞/∞ и ∞ − ∞', kinds: ['ratSame', 'ratSame', 'ratLower', 'ratHigher', 'sqrtDiff'] },
    2: { name: 'Неопределённость 0/0', kinds: ['diffSquares', 'cubes', 'factorQuad', 'factorQuad', 'sqrtZero'] },
    3: { name: 'Замечательные пределы и эквивалентности', kinds: ['sinLin', 'tgSin', 'oneMinusCos', 'expSin', 'lnExp', 'arcsinLn'] },
    4: { name: 'Второй замечательный предел', kinds: ['secondA', 'secondB', 'secondZero'] },
  };
  LEVELS[5] = { name: 'Всё вперемешку', kinds: [].concat(...[1, 2, 3, 4].map((l) => LEVELS[l].kinds)) };

  function makeTask(level) {
    const kind = pick((LEVELS[level] || LEVELS[1]).kinds);
    return Object.assign({ kind }, TEMPLATES[kind]());
  }

  // ---------- Разбор ответа ----------
  // { value } | { error }
  function parseAnswer(raw) {
    let s = String(raw || '').trim().toLowerCase().replace(/[−–—]/g, '-').replace(/\s+/g, '');
    if (!s) return { error: 'Введите ответ.' };
    const infRe = /^(\+|-)?(∞|inf|infinity|бесконечность)$/;
    const m = s.match(infRe);
    if (m) return { value: m[1] === '-' ? -Infinity : Infinity };
    if (/^(нет|несуществует|неопределён|неопределен|dne)$/.test(s)) return { none: true };
    let ast;
    try {
      ast = E.parse(raw);
    } catch (e) {
      return { error: e.message };
    }
    if (E.hasX(ast)) return { error: 'В ответе не должно быть x: предел — это число (или ∞).' };
    const v = E.evaluate(ast, 0);
    if (!isFinite(v)) return { error: 'Не получилось вычислить ответ. Пример: 3/4, -2, e^3, ∞.' };
    return { value: v, ast };
  }

  function check(task, raw) {
    const p = parseAnswer(raw);
    if (p.error) return { ok: false, invalid: true, message: p.error };
    const exp = task.answer;
    if (p.none) return { ok: false, message: 'Предел существует. Попробуйте раскрыть неопределённость — начните с подсказки.' };
    if (!isFinite(exp)) {
      if (p.value === exp) return { ok: true, message: 'Верно! Предел бесконечен.' };
      if (p.value === -exp) return { ok: false, message: 'Бесконечность верная, но знак не тот. Посмотрите на знак старшего коэффициента.' };
      return { ok: false, message: 'Предел здесь бесконечен: сравните степени числителя и знаменателя.' };
    }
    if (!isFinite(p.value)) return { ok: false, message: 'Предел конечен. Сравните степени числителя и знаменателя или раскройте неопределённость.' };
    if (Math.abs(p.value - exp) < 1e-9 * Math.max(1, Math.abs(exp))) return { ok: true, message: 'Верно!' };
    if (Math.abs(p.value + exp) < 1e-9 * Math.max(1, Math.abs(exp))) return { ok: false, message: 'Почти: ответ отличается знаком. Проверьте знаки при раскрытии скобок.' };
    if (exp !== 0 && Math.abs(p.value - 1 / exp) < 1e-9 * Math.max(1, Math.abs(1 / exp))) return { ok: false, message: 'Похоже, дробь перевёрнута: числитель и знаменатель поменялись местами.' };
    return { ok: false, message: 'Пока неверно. Откройте подсказку или решение по шагам.' };
  }

  const hint = (task) => 'С чего начать: ' + task.steps[0].title;

  // ---------- «Найдите N(ε)» ----------
  // a_n = (a n + b)/(c n + d), предел a/c; |a_n - a/c| = K / (c (c n + d)), K = |bc - ad|
  const EPS = [0.1, 0.05, 0.02, 0.01, 0.005, 0.001];
  function makeNTask() {
    let a, b, c, d, K;
    do {
      a = nz(-5, 5); b = nz(-9, 9); c = rnd(1, 4); d = rnd(1, 9);
      K = Math.abs(b * c - a * d);
    } while (K === 0);
    const eps = pick(EPS);
    // Нужно n > (K/(c·ε) − d)/c. Считаем в целых числах, ε = p/1000, чтобы не ошибиться на границе
    const p = Math.round(eps * 1000);
    const numer = 1000 * K - p * c * d, denom = p * c * c;
    const bound = numer / denom;
    const Nmin = numer < 0 ? 1 : Math.max(1, Math.floor(numer / denom) + 1);
    const seqTex = '\\frac{' + Tn(a + 'x' + sg(b)) + '}{' + Tn(c + 'x' + sg(d)) + '}';
    const L = fr(a, c);
    const epsTex = String(eps).replace('.', '{,}');
    const steps = [
      { title: 'Оцениваем расстояние до предела: приводим к общему знаменателю.', tex: '\\left|a_n - ' + L + '\\right| = \\left|' + seqTex + ' - ' + L + '\\right| = \\frac{|' + (b * c - a * d) + '|}{' + c + '(' + Tn(c + 'x' + sg(d)) + ')} = \\frac{' + K + '}{' + c + '(' + Tn(c + 'x' + sg(d)) + ')}' },
      { title: 'Решаем неравенство \\(\\frac{' + K + '}{' + c + '(' + Tn(c + 'x' + sg(d)) + ')} &lt; \\varepsilon\\) относительно \\(n\\). Знаменатель положителен, поэтому можно умножать:', tex: Tn(c + 'x' + sg(d)) + ' > \\frac{' + K + '}{' + c + '\\varepsilon} \\iff n > \\frac{1}{' + c + '}\\left(\\frac{' + K + '}{' + c + '\\varepsilon} - ' + d + '\\right)' },
      { title: 'Это работает для любого \\(\\varepsilon &gt; 0\\): годится \\(N(\\varepsilon) = \\left[\\frac{1}{' + c + '}\\left(\\frac{' + K + '}{' + c + '\\varepsilon} - ' + d + '\\right)\\right] + 1\\) (квадратные скобки — целая часть). Подставляем \\(\\varepsilon = ' + epsTex + '\\):', tex: 'n > ' + String(Math.round(bound * 1000) / 1000).replace('.', '{,}') + ' \\;\\Rightarrow\\; N = ' + Nmin },
      { title: 'Расстояние \\(|a_n - ' + L + '|\\) убывает с ростом \\(n\\), поэтому подходит и любое \\(N \\ge ' + Nmin + '\\): в определении не требуется наименьшее \\(N\\).', tex: null },
    ];
    return { a, b, c, d, K, eps, epsTex, Nmin, seqTex, L, Lval: a / c, steps };
  }

  function checkN(t, raw) {
    const s = String(raw || '').trim();
    if (!/^\d+$/.test(s)) return { ok: false, invalid: true, message: 'Введите натуральное число N.' };
    const N = parseInt(s, 10);
    if (N < 1) return { ok: false, invalid: true, message: 'N должно быть натуральным (N ≥ 1).' };
    const dist = (n) => t.K / (t.c * (t.c * n + t.d));
    if (N >= t.Nmin) {
      return {
        ok: true,
        message: N === t.Nmin
          ? 'Верно, и это даже наименьшее подходящее N!'
          : 'Верно: при n ≥ ' + N + ' все члены лежат в ε-коридоре. Наименьшее подходящее N = ' + t.Nmin + ', но в определении минимальность не нужна.',
      };
    }
    const d = dist(N);
    return {
      ok: false,
      message: 'Не подходит: уже при n = ' + N + ' расстояние |a_n − ' + (t.c === 1 ? t.a : t.a + '/' + t.c) + '| ≈ ' + d.toPrecision(3).replace('.', ',') + ' ≥ ε = ' + String(t.eps).replace('.', ',') + '. Нужно N побольше.',
    };
  }

  return { LEVELS, TEMPLATES, makeTask, parseAnswer, check, hint, makeNTask, checkN, fr };
});
