import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_BUDGET_MS, formatElapsed } from '../../src/checks/budget.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const NUL = String.fromCharCode(0)

/** O git falso deste teste: o custo medido e o dos checks, nao o do git. */
const git = (args: readonly string[]): string => {
  if (args.includes('log')) {
    return `docs(RN-0001): x${NUL}\n`
  }
  if (args.includes('--unified=0')) {
    return ''
  }

  return `packages/living-docs/src/cli/index.ts${NUL}CHANGELOG.md${NUL}`
}

test('RNF-0005: o conjunto completo de checks cabe no teto declarado, medido', () => {
  const root = checkoutRoot()
  const inicio = process.hrtime.bigint()

  // O conjunto do living-docs e o que roda no PR: as duas execucoes de
  // `validate`. Nao e o tempo de um check.
  runValidate(root)
  runValidate(root, 'origin/master', git)

  const decorrido = Number(process.hrtime.bigint() - inicio) / 1e6

  assert.ok(
    decorrido < CHECK_BUDGET_MS,
    `o conjunto levou ${formatElapsed(decorrido)}, e o teto declarado e ${formatElapsed(CHECK_BUDGET_MS)} ` + '(RNF-0005) — meça antes de subir o teto',
  )
})

test('RNF-0005: cada comando devolve o que mediu, e a medida nao e estimada', () => {
  const root = checkoutRoot()

  const validado = runValidate(root)

  assert.equal(typeof validado.elapsedMs, 'number')
  assert.ok(validado.elapsedMs >= 0)
  // Uma varredura da arvore inteira nao custa zero: medida zerada e medida
  // que ninguem tomou.
  assert.ok(validado.elapsedMs > 0, 'elapsedMs veio zerado — o relogio nao foi lido')
})

test('RNF-0005: formatElapsed e legivel por quem le o log do PR', () => {
  assert.equal(formatElapsed(842), '842 ms')
  assert.equal(formatElapsed(1500), '1.5 s')
  assert.equal(formatElapsed(120_000), '120.0 s')
})
