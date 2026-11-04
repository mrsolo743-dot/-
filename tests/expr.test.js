// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../assets/js/expr.js');
const DC = require('../assets/js/derivative-core.js');

// Численная производная для сверки с символьной
function numericDerivOk(f, d) {
  let checked = 0;
  for (const x of [-3.7, -1.8, -0.7, 0.35, 0.8, 1.35, 2.2, 2.9, 3.6, 4.4]) {
    const h = 1e-5;
    const nd = (E.evaluate(f, x + h) - E.evaluate(f, x - h)) / (2 * h);
    const ad = E.evaluate(d, x);
    if (!isFinite(nd) || !isFinite(ad)) continue;
    if (Math.abs(nd - ad) > 1e-5 * Math.max(1, Math.abs(ad))) return false;
    checked++;
  }
  return checked >= 2;
}

test('parse понимает привычную запись', () => {
  const same = [
    ['2x^2', '2*x^2'],
    ['sin x', 'sin(x)'],
    ['sin 2x', 'sin(2*x)'],
    ['sin^2 x', '(sin(x))^2'],
    ['xsinx', 'x*sin(x)'],
    ['sin x cos x', 'sin(x)*cos(x)'],
    ['tan x', 'tg(x)'],
    ['arctan x', 'arctg(x)'],
    ['х^2', 'x^2'], // русская «х»
    ['2,5x', '2.5*x'],
    ['e^-x', 'e^(-x)'],
    ['3(x+1)', '3*(x+1)'],
    ['-x^2', '-(x^2)'],
    ['x²', 'x^2'],
    ['2·x', '2*x'],
    ['√'.length ? 'sqrt x' : '', 'sqrt(x)'],
  ];
  for (const [a, b] of same) {
    assert.ok(E.equivalent(E.parse(a), E.parse(b)), a + ' == ' + b);
  }
});

test('parse сообщает об ошибках по-русски', () => {
  for (const bad of ['', 'x +', '(x+1', 'x)', 'y^2', 'sin', '2 $ x']) {
    assert.throws(() => E.parse(bad), E.ParseError, bad);
  }
});

test('tex даёт аккуратную запись', () => {
  const t = (s) => E.tex(E.simplify(E.parse(s)));
  assert.equal(t('3x^2 - 2x + 1'), '3 x^{2} - 2 x + 1');
  assert.equal(t('sin x / x'), '\\frac{\\sin x}{x}');
  assert.equal(t('cos^2 x'), '\\cos^{2} x');
  assert.equal(t('e^(2x)'), 'e^{2 x}');
  assert.equal(t('-1/x^2'), '-\\frac{1}{x^{2}}');
});

test('derive: известные производные', () => {
  const cases = [
    ['x^3', '3x^2'],
    ['sin(3x)', '3cos(3x)'],
    ['x^2 e^x', '(2x + x^2) e^x'],
    ['ln(x^2+1)', '2x/(x^2+1)'],
    ['x^x', 'x^x (ln x + 1)'],
    ['(x-1)/(x+2)', '3/(x+2)^2'],
    ['x arctg x - ln(sqrt(1+x^2))', 'arctg x'],
    ['5', '0'],
  ];
  for (const [f, d] of cases) {
    const r = E.derive(E.parse(f));
    assert.ok(E.equivalent(r.result, E.parse(d)), f + "' = " + d + ', получено ' + E.tex(r.result));
    assert.ok(r.steps.length >= 1);
  }
});

test('упрощение доводит ответы до «учебного» вида', () => {
  const d = (s) => E.tex(E.derive(E.simplify(E.parse(s))).result);
  assert.equal(d('3x^4 - 2x^2 + 5x - 7'), '12 x^{3} - 4 x + 5');
  assert.equal(d('(x-1)/(x+2)'), '\\frac{3}{\\left(x + 2\\right)^{2}}');
  assert.equal(d('sqrt(x^2+1)'), '\\frac{x}{\\sqrt{x^{2} + 1}}');
  assert.equal(d('x arctg x - ln(sqrt(1+x^2))'), '\\operatorname{arctg} x');
});

test('задачи всех уровней: производная верна, шаги без мусора', () => {
  for (const level of [1, 2, 3, 4]) {
    for (let i = 0; i < 300; i++) {
      const t = DC.makeTask(level);
      assert.ok(numericDerivOk(t.f, t.derivative), 'уровень ' + level + ': ' + t.src);
      assert.ok(E.equivalent(t.derivative, t.raw), 'упрощение не меняет значение: ' + t.src);
      for (const s of t.steps) {
        assert.ok(!/NaN|undefined|\?/.test(s.tex + s.title), 'шаг: ' + s.tex);
      }
      // Правильный ответ, набранный «руками» в другой форме, принимается
      assert.equal(DC.check(t, '(' + 'x' + ')*0 + ' + toInput(t.derivative)).ok, true, t.src);
    }
  }
});

test('check распознаёт типичные ошибки', () => {
  const task = (src) => {
    const f = E.simplify(E.parse(src));
    const d = E.derive(f);
    return { f, derivative: d.result, steps: d.steps };
  };
  const prod = task('x^2 sin x');
  assert.equal(DC.check(prod, '2x sin x + x^2 cos x').ok, true);
  assert.match(DC.check(prod, '2x cos x').message, /не произведение производных/);
  assert.match(DC.check(prod, '2x sin x').message, /Не хватает второго/);

  const chain = task('sin(3x)');
  assert.match(DC.check(chain, 'cos(3x)').message, /забыли умножить/);
  assert.match(DC.check(chain, '-3cos(3x)').message, /знаком/);

  const quot = task('sin x / x');
  assert.match(DC.check(quot, '(sin x - x cos x)/x^2').message, /порядок/);

  assert.equal(DC.check(prod, 'x +').invalid, true);
  assert.match(DC.check(prod, 'x^2 sin x').message, /саму функцию/);
});

// Перевод дерева обратно в строку для ввода (проверяем, что парсер принимает ответ)
function toInput(n) {
  switch (n.type) {
    case 'num': return '(' + n.value + ')';
    case 'var': return 'x';
    case 'const': return n.name;
    case 'neg': return '(-(' + toInput(n.a) + '))';
    case 'fn': return n.name + '(' + toInput(n.arg) + ')';
    case 'op': return '(' + toInput(n.a) + ')' + n.op + '(' + toInput(n.b) + ')';
  }
}
