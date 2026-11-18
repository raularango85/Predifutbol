import { test } from 'node:test';
import assert from 'node:assert';
import { parseValidValues, formatMarketPick, COMMON_SCORES } from './marketFormatter.ts';

test('parseValidValues: defaults and markets', () => {
  // 1X2 market (id 1)
  const classic = parseValidValues('1,2,X,1X,X2,12', 1);
  assert.deepStrictEqual(classic, ['1', '2', 'X', '1X', 'X2', '12']);

  // Score market (id 2)
  const score = parseValidValues('score', 2);
  assert.deepStrictEqual(score, COMMON_SCORES);

  // BTTS market (id 9)
  const btts = parseValidValues('YES,NO', 9);
  assert.deepStrictEqual(btts, ['YES', 'NO']);

  // Over goals (id 3)
  const overGoals = parseValidValues('0.5,1.5,2.5,3.5,4.5,5.5', 3);
  assert.deepStrictEqual(overGoals, ['0.5', '1.5', '2.5', '3.5', '4.5', '5.5']);
});

test('formatMarketPick: produces correct Spanish and English labels', () => {
  // 1X2 Home Win
  const p1 = formatMarketPick(1, '1');
  assert.strictEqual(p1.optLabel, '1 - Gana Local');
  assert.strictEqual(p1.es, 'Gana Local');
  assert.strictEqual(p1.en, 'Home Win');

  // 1X2 Draw
  const pX = formatMarketPick(1, 'X');
  assert.strictEqual(pX.optLabel, 'X - Empate');
  assert.strictEqual(pX.es, 'Empate');

  // Double chance 1X
  const p1X = formatMarketPick(1, '1X');
  assert.strictEqual(p1X.optLabel, '1X - Local o Empate');
  assert.strictEqual(p1X.es, 'Local o Empate (1X)');

  // Over 2.5 Goals (id 3)
  const pOver = formatMarketPick(3, '2.5');
  assert.strictEqual(pOver.optLabel, '+2.5 Goles (Más de 2.5)');
  assert.strictEqual(pOver.es, 'Más de 2.5 Goles');

  // BTTS YES (id 9)
  const pBtts = formatMarketPick(9, 'YES');
  assert.strictEqual(pBtts.optLabel, 'YES - Sí marcan ambos');
  assert.strictEqual(pBtts.es, 'Ambos Equipos Marcan: SÍ');

  // Correct Score (id 2)
  const pScore = formatMarketPick(2, '2-1');
  assert.strictEqual(pScore.optLabel, 'Marcador 2-1');
  assert.strictEqual(pScore.es, 'Marcador Exacto: 2-1');
});
