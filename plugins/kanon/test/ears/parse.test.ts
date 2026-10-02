import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCriterion } from '../../plugin/src/ears/parse.ts'

function rules(criterion: string): string[] {
  return parseCriterion(criterion).problems.map(problem => problem.rule)
}

test('RN-0047: each of the six shapes is told apart by its keywords', () => {
  const cases: [string, string][] = [
    ['THE Checkout SHALL show the total.', 'Ubiquitous'],
    ['WHEN the customer pays, THE Checkout SHALL issue a receipt.', 'Event'],
    ['WHILE the cart is empty, THE Checkout SHALL hide the pay button.', 'State'],
    ['IF the coupon is expired, THEN THE Checkout SHALL reject it.', 'Unwanted'],
    ['WHERE gift wrapping is enabled, THE Checkout SHALL offer it.', 'Optional'],
    ['WHILE the cart is open, WHEN the customer adds an item, THE Checkout SHALL update the total.', 'Complex'],
    ['WHERE loyalty is enabled, WHILE the customer is signed in, IF the points are missing, THEN THE Checkout SHALL show zero.', 'Complex'],
  ]

  for (const [criterion, pattern] of cases) {
    const parsed = parseCriterion(criterion)

    assert.deepEqual(parsed.problems, [], criterion)
    assert.equal(parsed.pattern, pattern, criterion)
    assert.equal(parsed.system, 'Checkout', criterion)
  }
})

test('RN-0047: the body is in the language of the project, and only the keywords are English', () => {
  const parsed = parseCriterion('IF o cupom estiver expirado, THEN THE Checkout SHALL rejeitá-lo e exibir "Cupom expirado".')

  assert.deepEqual(parsed.problems, [])
  assert.equal(parsed.pattern, 'Unwanted')
})

test('RN-0047: a keyword in lowercase is not a keyword', () => {
  assert.deepEqual(rules('When the customer pays, THE Checkout SHALL issue a receipt.'), ['pattern'])
  assert.deepEqual(rules('The Checkout shall show the total.'), ['shape', 'shape'])
})

test('RN-0047: clauses out of order, repeated or left empty follow no pattern', () => {
  assert.deepEqual(rules('WHEN the customer pays, WHILE the cart is open, THE Checkout SHALL issue a receipt.'), ['pattern'])
  assert.deepEqual(rules('WHILE open, WHILE paid, THE Checkout SHALL issue a receipt.'), ['pattern'])
  assert.deepEqual(rules('IF the coupon is expired, THE Checkout SHALL reject it.'), ['pattern'])
  assert.deepEqual(rules('WHEN, THE Checkout SHALL issue a receipt.'), ['pattern'])
  assert.deepEqual(rules('THE Checkout SHALL reject it WHEN the coupon is expired.'), ['pattern'])
})

test('RN-0047: a keyword inside a quoted message is part of the body', () => {
  const parsed = parseCriterion('IF the coupon is expired, THEN THE Checkout SHALL show "WHEN IN DOUBT, ASK THE SELLER".')

  assert.deepEqual(parsed.problems, [])
  assert.equal(parsed.pattern, 'Unwanted')
})

test('RN-0048: exactly one SHALL, with a response after it', () => {
  assert.deepEqual(rules('THE Checkout SHALL reject the coupon and SHALL show a message.'), ['shape'])
  assert.deepEqual(rules('WHEN the customer pays, THE Checkout issues a receipt.'), ['shape'])
  assert.deepEqual(rules('THE Checkout SHALL.'), ['shape'])
  assert.deepEqual(rules('THE Checkout SHALL "Coupon expired".'), [])
})

test('RN-0048: exactly one system before the SHALL', () => {
  assert.deepEqual(rules('WHEN the customer pays, SHALL issue a receipt.'), ['shape'])
  assert.deepEqual(rules('THE Checkout and THE Billing SHALL issue a receipt.'), ['shape'])
  assert.deepEqual(rules('THE SHALL issue a receipt.'), ['shape'])
})

test('RN-0048: at most one trigger, and never a trigger with an unwanted condition', () => {
  assert.deepEqual(rules('WHEN the customer pays, WHEN the bank answers, THE Checkout SHALL issue a receipt.'), ['shape'])
  assert.deepEqual(rules('IF a, THEN IF b, THEN THE Checkout SHALL stop.'), ['shape'])
  assert.deepEqual(rules('WHEN the customer pays, IF the card is declined, THEN THE Checkout SHALL say so.'), ['shape'])
})
