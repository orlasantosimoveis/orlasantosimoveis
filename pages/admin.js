import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Admin() {
  const [titulo, setTitulo] = useState("");
  const [cidade, setCidade] = useState("");
  const [valor, setValor] = useState("");

  async function salvar() {
    const codigoGerado = "IMV-" + Date.now();

    const { error } = await supabase
      .from("imoveis")
      .insert([
        {
          codigo: codigoGerado,
          titulo: titulo,
          cidade: cidade,
          valor: valor === "" ? null : Number(valor),
        },
      ]);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    alert("Imóvel salvo! Código: " + codigoGerado);
    setTitulo("");
    setCidade("");
    setValor("");
  }

  return (
    <div style={{ padding: 40, fontFamily: "Arial" }}>
      <h1>Painel Admin - Orla Santos Imóveis</h1>

      <p>Título</p>
      <input value={titulo} onChange={(e) => setTitulo(e.target.value)} />

      <p>Cidade</p>
      <input value={cidade} onChange={(e) => setCidade(e.target.value)} />

      <p>Valor</p>
      <input value={valor} onChange={(e) => setValor(e.target.value)} />

      <br />
      <br />

      <button onClick={salvar}>Salvar imóvel</button>
    </div>
  );
}
