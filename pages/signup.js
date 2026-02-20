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
  const [tipo, setTipo] = useState("corretor"); // corretor | admin
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function cadastrar(e) {
    e.preventDefault();
    setMsg("");

    if (!nome.trim() || !email.trim() || !senha) {
      setMsg("Preencha nome, e-mail e senha.");
      return;
    }

    setLoading(true);

    // 1) cria usuário no Auth
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      setLoading(false);
      setMsg("Erro no cadastro: " + error.message);
      return;
    }

    const uid = data?.user?.id; // UUID do Auth
    if (!uid) {
      setLoading(false);
      setMsg("Usuário criado, mas não consegui pegar o UID.");
      return;
    }

    // 2) salva/atualiza perfil em public.usuarios
    const { error: errPerfil } = await supabase
      .from("usuarios")
      .upsert(
        [
          {
            auth_uid: uid,
            nome: nome.trim(),
            email: email.trim(),
            tipo,
          },
        ],
        { onConflict: "auth_uid" }
      );

    setLoading(false);

    if (errPerfil) {
      setMsg("Criou no Auth, mas erro ao salvar perfil: " + errPerfil.message);
      return;
    }

    setMsg("Cadastro concluído! Agora faça login.");
    router.push("/login");
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Criar usuário</h1>
      <p style={{ color: "#555" }}>Cria no Auth e salva o perfil na tabela <b>usuarios</b>.</p>

      {msg ? <div style={{ marginBottom: 12, fontWeight: 700 }}>{msg}</div> : null}

      <form onSubmit={cadastrar} style={{ display: "grid", gap: 10 }}>
        <label>
          Nome<br />
          <input value={nome} onChange={(e) => setNome(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          E-mail<br />
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Senha<br />
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Tipo<br />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ width: "100%", padding: 10 }}>
            <option value="corretor">corretor</option>
            <option value="admin">admin</option>
          </select>
        </label>

        <button disabled={loading} style={{ padding: 12 }}>
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>

        <button type="button" onClick={() => router.push("/login")} style={{ padding: 12 }}>
          Já tenho conta (Login)
        </button>
      </form>
    </div>
  );
}
