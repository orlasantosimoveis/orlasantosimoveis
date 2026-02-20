import { useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function entrar(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    setLoading(false);

    if (error) {
      setMsg("Erro: " + error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Login</h1>

      {msg ? <div style={{ marginBottom: 12, fontWeight: 700 }}>{msg}</div> : null}

      <form onSubmit={entrar} style={{ display: "grid", gap: 10 }}>
        <label>
          E-mail<br />
          <input value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <label>
          Senha<br />
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} style={{ width: "100%", padding: 10 }} />
        </label>

        <button disabled={loading} style={{ padding: 12 }}>
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <button type="button" onClick={() => router.push("/signup")} style={{ padding: 12 }}>
          Criar usuário
        </button>
      </form>
    </div>
  );
}
