export function hojeISO() {
  const agora = new Date()
  const fuso = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000)
  return fuso.toISOString().slice(0, 10)
}

export function rotuloDestaque(data) {
  if (!data) return 'PRÓXIMO ENCONTRO'
  const hoje = hojeISO()
  if (data === hoje) return 'ENCONTRO DE HOJE'
  if (data > hoje) return 'PRÓXIMO ENCONTRO'
  return 'ENCONTRO EM DESTAQUE'
}

// Escolhe qual encontro deve aparecer em destaque, pela data (não por um status
// manual): o próximo agendado, ou o mais recente já passado se não houver futuro.
export function escolherEncontroDestaque(encontros) {
  if (!encontros || encontros.length === 0) return null

  const comData = encontros.filter((e) => e.data)
  if (comData.length > 0) {
    const hoje = hojeISO()
    const futuros = comData.filter((e) => e.data >= hoje).sort((a, b) => a.data.localeCompare(b.data))
    if (futuros.length > 0) return futuros[0]

    const passados = comData.filter((e) => e.data < hoje).sort((a, b) => b.data.localeCompare(a.data))
    if (passados.length > 0) return passados[0]
  }

  const naoConcluidos = encontros.filter((e) => e.status !== 'concluido').sort((a, b) => a.numero - b.numero)
  if (naoConcluidos.length > 0) return naoConcluidos[0]

  return [...encontros].sort((a, b) => a.numero - b.numero)[0]
}
