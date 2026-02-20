import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_OPCOES = ["disponivel", "reservado", "vendido", "inativo"];

function brl(v) {
  if (v == null) return "-";
  return Number(v).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function Admin() {

  const router = useRouter();
const [usuarioNome, setUsuarioNome] = useState("");
  import { useRouter } from "next/router";
// ... (o resto permanece)

export default function Admin() {
  const router = useRouter();
  const [usuarioNome, setUsuarioNome] = useState("");

 useEffect(() => {
  (async () => {
    const { data } = await supabase.auth.getSession();
    const session = data?.session;

    if (!session) {
      router.replace("/login");
      return;
    }

    const userId = session.user.id;

    const { data: perfil } = await supabase
      .from("usuarios")
      .select("nome")
      .eq("id", userId)
      .single();

    setUsuarioNome(perfil?.nome || session.user.email || "...");
    carregarImoveis(); // ou carregar() dependendo do seu arquivo
  })();
}, [router]);

 async function sair() {
  await supabase.auth.signOut();
  router.push("/login");
}

  // ... resto do seu código

  const [usuarioNome, setUsuarioNome] = useState("");
  const [usuarioId, setUsuarioId] = useState("");

  const [form, setForm] = useState({
    titulo: "",
    tipo: "",
    valor: "",
    cidade: "",
    bairro: "",
    endereco: "",
    status: "disponivel",
  });

  const [itens, setItens] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  function onChange(nome, valor) {
    setForm((p) => ({ ...p, [nome]: valor }));
  }

  function gerarCodigo() {
    return "IMV-" + Date.now();
  }

  async function carregarUsuario() {

    const { data } = await supabase.auth.getUser();

    if (!data?.user) return;

    setUsuarioId(data.user.id);

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nome")
      .eq("id", data.user.id)
      .single();

    if (usuario) setUsuarioNome(usuario.nome);
  }

  async function carregarImoveis() {

    const { data } = await supabase
      .from("imoveis")
      .select("*")
      .order("created_at", { ascending: false });

    setItens(data || []);
  }

  useEffect(() => {

  async function iniciar() {

    const { data } = await supabase.auth.getUser();

    if (!data?.user) {

      window.location.href = "/login";
      return;
    }

    await carregarUsuario();
    await carregarImoveis();
  }

  iniciar();

}, []);


  async function salvar(e) {

    e.preventDefault();

    if (!form.titulo) {
      setMsg("Digite o título");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("imoveis")
      .insert({
        codigo: gerarCodigo(),
        titulo: form.titulo,
        tipo: form.tipo || null,
        valor: form.valor ? Number(form.valor) : null,
        cidade: form.cidade || null,
        bairro: form.bairro || null,
        endereco: form.endereco || null,
        status: form.status,
        cadastradoPorId: usuarioId
      });

    setLoading(false);

    if (error) {
      setMsg("Erro: " + error.message);
      return;
    }

    setMsg("Imóvel salvo com sucesso");

    setForm({
      titulo: "",
      tipo: "",
      valor: "",
      cidade: "",
      bairro: "",
      endereco: "",
      status: "disponivel",
    });

    carregarImoveis();
  }

  async function excluir(id) {

    if (!confirm("Excluir imóvel?")) return;

    await supabase
      .from("imoveis")
      .delete()
      .eq("id", id);

    carregarImoveis();
  }

  async function mudarStatus(id, status) {

    await supabase
      .from("imoveis")
      .update({ status })
      .eq("id", id);

    carregarImoveis();
  }

  return (
    <div style={{ marginBottom: 12 }}>
  <b>Logado como:</b> {usuarioNome || "..."}
  <div style={{ marginTop: 8, display: "flex", gap: 10 }}>
    <button onClick={() => router.push("/signup")}>Cadastrar usuário</button>
    <button onClick={sair}>Sair</button>
  </div>
</div>

    <div style={{ padding: 30, fontFamily: "Arial" }}>

      <h1>Painel Admin — Orla Santos Imóveis</h1>

      <div style={{ marginBottom: 20 }}>
        Logado como: <b>{usuarioNome || "..."}</b>
      </div>

      <form onSubmit={salvar}>

        <h2>Cadastrar imóvel</h2>

        <input
          placeholder="Título"
          value={form.titulo}
          onChange={(e) => onChange("titulo", e.target.value)}
        /><br /><br />

        <input
          placeholder="Tipo"
          value={form.tipo}
          onChange={(e) => onChange("tipo", e.target.value)}
        /><br /><br />

        <input
          placeholder="Valor"
          value={form.valor}
          onChange={(e) => onChange("valor", e.target.value)}
        /><br /><br />

        <input
          placeholder="Cidade"
          value={form.cidade}
          onChange={(e) => onChange("cidade", e.target.value)}
        /><br /><br />

        <input
          placeholder="Bairro"
          value={form.bairro}
          onChange={(e) => onChange("bairro", e.target.value)}
        /><br /><br />

        <input
          placeholder="Endereço"
          value={form.endereco}
          onChange={(e) => onChange("endereco", e.target.value)}
        /><br /><br />

        <select
          value={form.status}
          onChange={(e) => onChange("status", e.target.value)}
        >
          {STATUS_OPCOES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <br /><br />

        <button disabled={loading}>
          {loading ? "Salvando..." : "Salvar imóvel"}
        </button>

      </form>

      <hr />

      <h2>Imóveis cadastrados</h2>

      <table border="1" cellPadding="8">

        <thead>
          <tr>
            <th>Código</th>
            <th>Título</th>
            <th>Cidade</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>

        <tbody>

          {itens.map((i) => (

            <tr key={i.id}>

              <td>{i.codigo}</td>
              <td>{i.titulo}</td>
              <td>{i.cidade}</td>
              <td>{brl(i.valor)}</td>

              <td>

                <select
                  value={i.status}
                  onChange={(e) =>
                    mudarStatus(i.id, e.target.value)
                  }
                >
                  {STATUS_OPCOES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

              </td>

              <td>
                <button onClick={() => excluir(i.id)}>
                  Excluir
                </button>
              </td>

            </tr>

          ))}

        </tbody>

      </table>

      <div style={{ marginTop: 20 }}>
        {msg}
      </div>

    </div>
  );
}
