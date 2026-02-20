import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Signup() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");

  async function cadastrar(e) {
    e.preventDefault();
    setMsg("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) return setMsg("Erro: " + error.message);

    const userId = data?.user?.id;
    if (!userId) return setMsg("Usuário criado, mas não retornou ID.");

    // grava perfil na tabela usuarios
    const { error: e2 } = await supabase
      .from("usuarios")
      .upsert([{ id: userId, nome: nome.trim(), role: "user" }], { onConflict: "id" });

    if (e2) return setMsg("Usuário criado, mas erro ao salvar perfil: " + e2.message);

    setMsg("Usuário cadastrado! Agora faça login.");
    setTimeout(() => router.push("/login"), 800);
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "Arial" }}>
      <h1>Cadastrar usuário</h1>

      <form onSubmit={cadastrar} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <button type="submit">Cadastrar</button>
      </form>

      {msg ? <p style={{ color: msg.startsWith("Erro") ? "crimson" : "green" }}>{msg}</p> : null}

      <p style={{ marginTop: 16 }}>
        <a href="/login">Voltar pro login</a>
      </p>
    </div>
  );
}
