/** Abre ou fecha bloco de código cercado. O grupo guarda o tamanho da cerca. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/;

/**
 * O texto sem bloco cercado, e **com** a marcação inline intacta.
 *
 * Preservar a contagem de linhas não é detalhe — é o que permite reportar a
 * linha do achado. E a cerca precisa fechar com uma do **mesmo tamanho ou
 * maior** (CommonMark): sem isso, um bloco aberto com quatro crases fecha na
 * primeira cerca de três que estiver dentro dele, e o resto do arquivo volta a
 * ser lido como prosa — que é exatamente como um exemplo de código vira um
 * falso positivo.
 *
 * É a metade que serve a quem **procura** um ID escrito entre crases: apagar
 * código inline apagaria justamente o que se procura, mas o exemplo dentro de
 * uma cerca continua sendo exemplo (`CI-7`, item de Definition of Done).
 */
export function stripFences(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let fence: string | null = null;

  for (const line of lines) {
    const mark = FENCE.exec(line)?.[1];

    if (fence === null) {
      if (mark !== undefined) {
        fence = mark;
        out.push('');
        continue;
      }
      out.push(line);
      continue;
    }

    if (mark !== undefined && mark[0] === fence[0] && mark.length >= fence.length) {
      fence = null;
    }
    out.push('');
  }

  return out.join('\n');
}

/**
 * O texto sem código: bloco cercado e marcação inline saem, e as linhas ficam.
 *
 * É `stripFences` seguido do apagamento do código inline — quem compara prosa
 * (`duplicatedSentences`, `sentencesOf`) quer as duas coisas fora.
 */
export function stripCode(source: string): string {
  return stripFences(source)
    .split('\n')
    .map((line) => line.replace(/`[^`\n]*`/g, ''))
    .join('\n');
}

/** Prosa comparável: minúscula, sem marcação, sem pontuação, espaço colapsado. */
export function normalizeProse(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`~]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const BLOCK_START = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+|\|)/;
const MARKER = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+)/;

/**
 * Frases do documento, já sem código, com a linha em que cada uma começa.
 *
 * O parágrafo é juntado **antes** do corte em frases: prosa quebrada em oitenta
 * colunas não pode escapar de uma comparação por frase só por causa de onde o
 * editor deu enter (`ADR-0009`). Item de lista, título, citação e linha de
 * tabela começam frase nova — juntá-los ao parágrafo anterior inventaria uma
 * frase que ninguém escreveu.
 */
export function sentencesOf(source: string): { text: string; line: number }[] {
  const lines = stripCode(source).split('\n');
  const sentences: { text: string; line: number }[] = [];

  let buffer: string[] = [];
  let start = 0;

  const flush = (): void => {
    if (buffer.length === 0) return;
    const paragraph = buffer.join(' ').replace(/\s+/g, ' ').trim();
    buffer = [];
    for (const piece of paragraph.split(/(?<=[.!?])\s+/)) {
      const text = piece.trim();
      if (text !== '') sentences.push({ text, line: start });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    if (raw.trim() === '') {
      flush();
      continue;
    }
    if (BLOCK_START.test(raw)) flush();
    if (buffer.length === 0) start = i + 1;
    buffer.push(raw.replace(MARKER, '').trim());
  }
  flush();

  return sentences;
}
