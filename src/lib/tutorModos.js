export const MODOS = [
  {
    chave: 'livre',
    titulo: 'Conversa livre',
    descricao: 'Pergunte o que quiser, do seu jeito.',
  },
  {
    chave: 'explicar',
    titulo: 'Me explique com calma',
    descricao: 'Peça para entender melhor um conceito do livro ou do tema do mês.',
  },
  {
    chave: 'perguntar',
    titulo: 'Me faça perguntas',
    descricao: 'O Tutor faz perguntas, uma de cada vez, para você refletir sobre o problema do mês.',
  },
  {
    chave: 'criticar',
    titulo: 'Critique meu raciocínio',
    descricao: 'Escreva uma ideia sua e receba contrapontos para fortalecer o pensamento.',
  },
]

export function rotuloModo(chave) {
  return MODOS.find((m) => m.chave === chave)?.titulo || chave
}
