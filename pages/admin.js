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

  async function salvar() {
    const { error } = await supabase
      .from('imoveis')
      .insert([{ titulo, cidade, valor }])

    if (error) {
      alert('Erro ao salvar')
    } else {
      alert('Imóvel salvo com sucesso')
    }
  }

  return (
    <div style={{padding:40}}>
      <h1>Painel Admin - Orla Santos Imóveis</h1>

      <input
        placeholder="Título"
        value={titulo}
        onChange={(e)=>setTitulo(e.target.value)}
      /><br/><br/>

      <input
        placeholder="Cidade"
        value={cidade}
        onChange={(e)=>setCidade(e.target.value)}
      /><br/><br/>

      <input
        placeholder="Valor"
        value={valor}
        onChange={(e)=>setValor(e.target.value)}
      /><br/><br/>

      <button onClick={salvar}>
        Salvar imóvel
      </button>
    </div>
  )
}

