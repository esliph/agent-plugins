import { execSync } from 'node:child_process'

/**
 * Executor de comando do repositório validado, injetável: o teste prova `ownership/generated-drift`
 * sem depender de um gerador real na máquina.
 *
 * Irmão de `GitRunner` (src/git/staged.ts) com uma diferença deliberada: este
 * **não** falha aberta. Falha aberta é política de hook (`RNF-0001`), onde o
 * custo do silêncio é uma pergunta a menos; aqui o custo é um contrato mentindo
 * com a autoridade de um check que passou. Quem trata o erro é `ownership/generated-drift`.
 */
export type CommandRunner = (command: string, cwd: string) => string

/** Teto de um gerador. Generoso: `ownership/generated-drift` roda no PR, não dentro de um hook. */
export const TIMEOUT_MS = 60_000

export const runCommand: CommandRunner = (command, cwd) =>
  execSync(command, {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // stderr capturado, não herdado: ele vira a mensagem da finding.
    stdio: ['ignore', 'pipe', 'pipe'],
  })
