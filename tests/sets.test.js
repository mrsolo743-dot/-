// Запуск: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/js/sets-core.js');
const L = require('../assets/js/logic-core.js');

test('разбор выражений: разные записи одного и того же', () => {
  const same = [
    ['A ∪ B', 'A + B'], ['A ∩ B', 'A & B'], ['A \\ B', 'A - B'], ['A Δ B', 'A ^ B'],
    ["A'", '~A'], ["(A ∪ B)'", "A' ∩ B'"], ['А ∪ В', 'A ∪ B'], // кириллица
    ['A ∪ B ∩ C', 'A ∪ (B ∩ C)'], // ∩ сильнее ∪
  ];
  for (const [a, b] of same) assert.ok(S.equalSets(S.parse(a), S.parse(b)).equal, a + ' = ' + b);
  for (const bad of ['', 'A ∪', '(A ∪ B', 'A B', 'D', 'A ∪ B)']) assert.throws(() => S.parse(bad), S.ParseError, bad);
});

test('области диаграммы Венна', () => {
  // индекс области — битовая маска (A — старший бит): 0 = вне всех, 1 = только B, 2 = только A, 3 = A и B
  assert.deepEqual(S.regions(S.parse('A \\ B'), 2), [false, false, true, false]);
  assert.deepEqual(S.regions(S.parse('A Δ B'), 2), [false, true, true, false]);
  assert.equal(S.arity(S.parse('A ∪ B')), 2);
  assert.equal(S.arity(S.parse('A ∪ C')), 3);
  assert.equal(S.regionText(3, 0b101), 'в A и C, но не в B');
  assert.equal(S.regionText(3, 0b100), 'в A, но не в B и C');
  assert.equal(S.regionText(2, 0), 'вне всех множеств');
});

test('равенства множеств совпадают с равносильностью в логике', () => {
  // перевод: A -> a, ∪ -> |, ∩ -> &, \ -> & !, Δ -> != , дополнение -> !
  const toLogic = (n) => {
    switch (n.t) {
      case 'set': return n.name.toLowerCase();
      case 'comp': return '!(' + toLogic(n.a) + ')';
      case 'cup': return '(' + toLogic(n.a) + ') | (' + toLogic(n.b) + ')';
      case 'cap': return '(' + toLogic(n.a) + ') & (' + toLogic(n.b) + ')';
      case 'minus': return '(' + toLogic(n.a) + ') & !(' + toLogic(n.b) + ')';
      case 'sym': return '!((' + toLogic(n.a) + ') <=> (' + toLogic(n.b) + '))';
    }
  };
  for (const [x, y] of S.EQ_PAIRS) {
    const a = S.parse(x), b = S.parse(y);
    const viaSets = S.equalSets(a, b).equal;
    const viaLogic = L.equivalent(L.parse(toLogic(a)), L.parse(toLogic(b))).equal;
    assert.equal(viaSets, viaLogic, x + ' vs ' + y);
  }
  // в банке есть и равенства, и неравенства
  const verdicts = S.EQ_PAIRS.map(([x, y]) => S.equalSets(S.parse(x), S.parse(y)).equal);
  assert.ok(verdicts.includes(true) && verdicts.includes(false));
});

test('случайные выражения для «закрасьте область» корректны', () => {
  for (let i = 0; i < 500; i++) {
    const t = S.makeRegionTask();
    const cnt = t.regions.filter(Boolean).length;
    assert.ok(cnt > 0 && cnt < t.regions.length);
    assert.equal(S.names(t.expr).size, t.k);
    assert.ok(!/undefined/.test(S.tex(t.expr)));
    // TeX-запись разбирается обратно в то же множество
    const back = S.tex(t.expr).replace(/\\cup/g, '∪').replace(/\\cap/g, '∩').replace(/\\setminus/g, '\\').replace(/\\triangle/g, 'Δ').replace(/\\overline\{([^{}]+)\}/g, "($1)'");
    assert.ok(S.equalSets(S.parse(back), t.expr).equal, back);
  }
});

test('конечные отображения: классификация и разнообразие', () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) {
    const t = S.makeFiniteMap();
    assert.equal(t.f.length, t.m);
    assert.ok(t.f.every((y) => y >= 0 && y < t.k));
    const c = S.classifyMap(t.f, t.k);
    assert.equal(c.inj, t.inj); assert.equal(c.surj, t.surj);
    if (t.m > t.k) assert.equal(t.inj, false); // принцип Дирихле
    if (t.m < t.k) assert.equal(t.surj, false);
    seen.add(t.inj + '/' + t.surj);
    assert.ok(S.explainFinite(t).length > 20);
  }
  assert.equal(seen.size, 4); // встречаются все четыре типа
});

test('диагональ Кантора: новое число отличается от каждого в списке', () => {
  for (let i = 0; i < 200; i++) {
    const list = S.cantorList(8, 10);
    const x = S.cantorNumber(list);
    list.forEach((row, k) => assert.notEqual(row[k], x[k]));
    assert.ok(x.every((d) => d === 4 || d === 5));
  }
});

test('банки задач заполнены', () => {
  assert.ok(S.FUNCS.length >= 12 && S.FUNCS.every((f) => typeof f.inj === 'boolean' && f.why));
  assert.ok(S.COUNT.length >= 12 && S.COUNT.some((c) => c.countable) && S.COUNT.some((c) => !c.countable));
});
