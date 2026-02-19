import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Login() {

  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");

  async function entrar() {

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/admin");

  }

  return (
    <div style={{padding:40}}>

      <h1>Login - Orla Santos Imóveis</h1>

      <input
        placeholder="Email"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />

      <br/><br/>

      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e)=>setSenha(e.target.value)}
      />

      <br/><br/>

      <button onClick={entrar}>
        Entrar
      </button>

      <br/><br/>

      {msg}

    </div>
  );

}
