import { montarRepertorio } from './encontros'

// Monta o texto do botão "Copiar contexto da Academia" (Memorial, seção 13): resolve o
// problema de cada participante ter que reexplicar o estágio da Academia numa IA à parte.
export function montarTextoContexto(encontros, encontroAtual) {
  const { livrosConcluidos } = montarRepertorio(encontros || [])

  const livro = encontroAtual?.livro || 'não definido ainda'
  const autor = encontroAtual?.autor || ''
  const trecho = encontroAtual?.trecho_em_estudo
  const perguntaCentral = encontroAtual?.problema_governanca || 'não definida ainda'
  const listaConcluidos = livrosConcluidos.length
    ? livrosConcluidos.map((e) => `${e.livro}${e.autor ? ` (${e.autor})` : ''}`).join(', ')
    : 'nenhum ainda — este é o primeiro ciclo do grupo'

  return `Faço parte da academIA, uma comunidade de aprendizagem sobre o uso da Inteligência Artificial aplicada à governança e à tomada de decisões em Conselhos de Administração.
Estamos estudando: ${livro}${autor ? `, de ${autor}` : ''}${trecho ? ` — ${trecho}` : ''}.
Pergunta central deste ciclo: ${perguntaCentral}
Já concluímos: ${listaConcluidos}.
Por favor, fundamente suas respostas apenas nesses materiais e na minha experiência. Autores que ainda não estudamos podem ser mencionados apenas como referência futura, nunca como base do argumento.`
}
