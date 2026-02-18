import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Admin() {
  const [titulo, setTitulo] = useState('')
  const [cidade, setCidade] = useState('')
  const [valor, setValor] = useState('')
  const [mensagem, setMensagem] = useState('')

  async function salvar() {
    setMensagem('Salvando...')

    const { data, error } = await supabase
      .from('moveis')
      .insert([{ titulo, cidade, valor: Number(valor) }])
      .select()

    if (error) {
      setMensagem('Erro ao salvar: ' + error.message)
      return
    }

    setMensagem('Imóvel salvo com sucesso! ID: ' + data?.[0]?.id)
    setTitulo('')
    setCidade('')
    setValor('')
  }

  return (
    <div style={{ padding: 40, fontFamily: 'Arial' }}>
      <h1>Painel Admin - Orla Santos Imóveis</h1>

      <input
        placeholder="Título"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Cidade"
        value={cidade}
        onChange={(e) => setCidade(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Valor (ex: 700000)"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      <br /><br />

      <button onClick={salvar}>Salvar imóvel</button>

      <br /><br />
      <strong>{mensagem}</strong>
    </div>
  )
}
