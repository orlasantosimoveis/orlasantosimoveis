import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_OPCOES = ["disponivel", "reservado", "vendido", "inativo"];

function brl(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Admin() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [perfil, setPerfil] = useState(null); // { id (int), auth_uid, nome, email, tipo }
  const [captadores, setCaptadores] = useState([]); // usuarios
  const [proprietarios, setProprietarios] = useState([]); // proprietarios

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [form, setForm] = useState({
    titulo: "",
    tipo: "",
    valor: "",
    cidade: "",
    bairro: "",
    endereco: "",
    area_total: "",
    area_construida: "",
    quartos: "",
    banheiros: "",
    vagas: "",
    descricao: "",
    status: "disponivel",

    proprietario_id: "",   // vai ser ID (int) do proprietario
    captador_id: "",       // vai ser ID (int) do usuario
    valor_venda: "",
    comissao_percentual: "",
    observacoes_internas: "",
  });

  const [itens, setItens] = useState([]);

  function onChange(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function gerarCodigo() {
    return "IMV-" + Date.now();
  }

  // 1) Força login + carrega perfil
  useEffect(() => {
    (async () => {
      setMsg("");
      const { data } = await supabase.auth.getSession();
      const session = data?.session;

      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const uid = session.user.id;

      // busca perfil na tabela usuarios
      const { data: perfilDb, error } = await supabase
        .from("usuarios")
        .select("id, auth_uid, nome, email, tipo")
        .eq("auth_uid", uid)
        .single();

      if (error) {
        // perfil não existe ainda
        setPerfil({
          id: null,
          auth_uid: uid,
          nome: session.user.email,
          email: session.user.email,
          tipo: "corretor",
        });
        setMsg("Seu perfil não está cadastrado em 'usuarios'. Vá em /signup e crie seu usuário corretamente.");
        return;
      }

      setPerfil(perfilDb);
    })();
  }, [router]);

  // 2) Carrega combos (captadores e proprietarios)
  useEffect(() => {
    if (!perfil) return;
    (async () => {
      // captadores (usuários) – você pode filtrar só tipo='corretor' se quiser
      const { data: users } = await supabase
        .from("usuarios")
        .select("id,nome,tipo")
        .order("nome", { ascending: true });

      setCaptadores(users || []);

      // proprietários – assumindo que existe coluna nome
      const { data: props } = await supabase
        .from("proprietarios")
        .select("id,nome")
        .order("nome", { ascending: true });

      setProprietarios(props || []);
    })();
  }, [perfil]);

  async function carregarImoveis() {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase
      .from("imoveis")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMsg("Erro ao carregar imóveis: " + error.message);
      return;
    }

    setItens(data || []);
  }

  useEffect(() => {
    if (!perfil) return;
    carregarImoveis();
  }, [perfil]);

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function salvar(e) {
    e?.preventDefault?.();
    setMsg("");

    if (!perfil) return;

    if (!form.titulo.trim()) {
      setMsg("Preencha o TÍTULO.");
      return;
    }

    setLoading(true);

    // cuidado: captador_id e proprietario_id são INT (por isso usamos Number)
    const payload = {
      codigo: gerarCodigo(),
      titulo: form.titulo.trim(),
      tipo: form.tipo.trim() || null,
      valor: form.valor === "" ? null : Number(form.valor),
      cidade: form.cidade.trim() || null,
      bairro: form.bairro.trim() || null,
      endereco: form.endereco.trim() || null,
      area_total: form.area_total === "" ? null : Number(form.area_total),
      area_construida: form.area_construida === "" ? null : Number(form.area_construida),
      quartos: form.quartos === "" ? null : Number(form.quartos),
      banheiros: form.banheiros === "" ? null : Number(form.banheiros),
      vagas: form.vagas === "" ? null : Number(form.vagas),
      descricao: form.descricao.trim() || null,
      status: form.status || "disponivel",

      // combos (int)
      proprietario_id: form.proprietario_id ? Number(form.proprietario_id) : null,
      captador_id: form.captador_id ? Number(form.captador_id) : null,

      // quem cadastrou (automatico)
      cadastrado_por: perfil.nome || perfil.email || "usuário",
      // se sua tabela tiver cadastradoPorId (int), tenta gravar também:
      ...(perfil.id ? { cadastradoPorId: Number(perfil.id) } : {}),

      observacoes_internas: form.observacoes_internas.trim() || null,
      valor_venda: form.valor_venda === "" ? null : Number(form.valor_venda),
      comissao_percentual: form.comissao_percentual === "" ? null : Number(form.comissao_percentual),
    };

    const { error } = await supabase.from("imoveis").insert([payload]);

    setLoading(false);

    if (error) {
      setMsg("Erro ao salvar: " + error.message);
      return;
    }

    setMsg("Imóvel salvo com sucesso!");
    setForm((p) => ({
      ...p,
      titulo: "",
      tipo: "",
      valor: "",
      cidade: "",
      bairro: "",
      endereco: "",
      area_total: "",
      area_construida: "",
      quartos: "",
      banheiros: "",
      vagas: "",
      descricao: "",
      status: "disponivel",
      proprietario_id: "",
      captador_id: "",
      valor_venda: "",
      comissao_percentual: "",
      observacoes_internas: "",
    }));

    await carregarImoveis();
  }

  async function excluir(id) {
    if (!confirm("Excluir este imóvel?")) return;
    setLoading(true);
    setMsg("");

    const { error } = await supabase.from("imoveis").delete().eq("id", id);

    setLoading(false);
    if (error) {
      setMsg("Erro ao excluir: " + error.message);
      return;
    }

    setMsg("Imóvel excluído.");
    await carregarImoveis();
  }

  async function mudarStatus(id, novoStatus) {
    setLoading(true);
    setMsg("");

    const { error } = await supabase.from("imoveis").update({ status: novoStatus }).eq("id", id);

    setLoading(false);
    if (error) {
      setMsg("Erro ao atualizar status: " + error.message);
      return;
    }

    setMsg("Status atualizado.");
    await carregarImoveis();
  }

  const itensFiltrados = useMemo(() => {
    const t = filtroTexto.trim().toLowerCase();
    return (itens || []).filter((x) => {
      const okStatus = filtroStatus ? (x.status || "").toLowerCase() === filtroStatus : true;
      if (!t) return okStatus;

      const blob = [
        x.codigo, x.titulo, x.tipo, x.cidade, x.bairro, x.endereco, x.descricao, x.status
      ].filter(Boolean).join(" ").toLowerCase();

      return okStatus && blob.includes(t);
    });
  }, [itens, filtroTexto, filtroStatus]);

  // enquanto carrega perfil, não mostra nada
  if (!perfil) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
        Carregando...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Painel Admin — Orla Santos Imóveis</h1>
          <div style={{ color: "#444" }}>
            Logado como: <b>{perfil.nome || perfil.email}</b> ({perfil.tipo || "usuário"})
          </div>
          {msg ? <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div> : null}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => router.push("/signup")} style={{ padding: "10px 14px" }}>
            Criar usuário
          </button>
          <button onClick={sair} style={{ padding: "10px 14px" }}>
            Sair
          </button>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={salvar} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, marginTop: 16, marginBottom: 18 }}>
        <h2 style={{ marginTop: 0 }}>Cadastrar imóvel</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <label>
            Título*<br />
            <input value={form.titulo} onChange={(e) => onChange("titulo", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Tipo<br />
            <input value={form.tipo} onChange={(e) => onChange("tipo", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Valor<br />
            <input value={form.valor} onChange={(e) => onChange("valor", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Status<br />
            <select value={form.status} onChange={(e) => onChange("status", e.target.value)} style={{ width: "100%" }}>
              {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <label>
            Cidade<br />
            <input value={form.cidade} onChange={(e) => onChange("cidade", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Bairro<br />
            <input value={form.bairro} onChange={(e) => onChange("bairro", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label style={{ gridColumn: "span 2" }}>
            Endereço<br />
            <input value={form.endereco} onChange={(e) => onChange("endereco", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Área total<br />
            <input value={form.area_total} onChange={(e) => onChange("area_total", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Área construída<br />
            <input value={form.area_construida} onChange={(e) => onChange("area_construida", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Quartos<br />
            <input value={form.quartos} onChange={(e) => onChange("quartos", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Banheiros<br />
            <input value={form.banheiros} onChange={(e) => onChange("banheiros", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Vagas<br />
            <input value={form.vagas} onChange={(e) => onChange("vagas", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Comissão %<br />
            <input value={form.comissao_percentual} onChange={(e) => onChange("comissao_percentual", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Valor venda<br />
            <input value={form.valor_venda} onChange={(e) => onChange("valor_venda", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Proprietário (combo)<br />
            <select value={form.proprietario_id} onChange={(e) => onChange("proprietario_id", e.target.value)} style={{ width: "100%" }}>
              <option value="">Selecione...</option>
              {proprietarios.map((p) => (
                <option key={p.id} value={p.id}>{p.nome ?? `ID ${p.id}`}</option>
              ))}
            </select>
          </label>

          <label>
            Captador (combo)<br />
            <select value={form.captador_id} onChange={(e) => onChange("captador_id", e.target.value)} style={{ width: "100%" }}>
              <option value="">Selecione...</option>
              {captadores.map((u) => (
                <option key={u.id} value={u.id}>{u.nome ?? `ID ${u.id}`}</option>
              ))}
            </select>
          </label>

          <label>
            Cadastrado por (automático)<br />
            <input value={perfil.nome || perfil.email} disabled style={{ width: "100%", background: "#f4f4f4" }} />
          </label>

          <label style={{ gridColumn: "span 4" }}>
            Descrição<br />
            <textarea value={form.descricao} onChange={(e) => onChange("descricao", e.target.value)} style={{ width: "100%", minHeight: 80 }} />
          </label>

          <label style={{ gridColumn: "span 4" }}>
            Observações internas<br />
            <textarea value={form.observacoes_internas} onChange={(e) => onChange("observacoes_internas", e.target.value)} style={{ width: "100%", minHeight: 70 }} />
          </label>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button type="submit" disabled={loading} style={{ padding: "10px 14px" }}>
            {loading ? "Salvando..." : "Salvar imóvel"}
          </button>
          <button type="button" disabled={loading} onClick={carregarImoveis} style={{ padding: "10px 14px" }}>
            Recarregar lista
          </button>
        </div>
      </form>

      {/* FILTROS */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <input
          placeholder="Buscar por código, título, cidade, bairro, status..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          style={{ flex: 1, padding: 10 }}
        />
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ padding: 10 }}>
          <option value="">Todos os status</option>
          {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* LISTA */}
      <h2 style={{ marginTop: 0 }}>Imóveis cadastrados ({itensFiltrados.length})</h2>

      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={th}>Código</th>
              <th style={th}>Título</th>
              <th style={th}>Cidade</th>
              <th style={th}>Bairro</th>
              <th style={th}>Valor</th>
              <th style={th}>Status</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {itensFiltrados.map((x) => (
              <tr key={x.id}>
                <td style={tdMono}>{x.codigo}</td>
                <td style={td}>{x.titulo}</td>
                <td style={td}>{x.cidade || "-"}</td>
                <td style={td}>{x.bairro || "-"}</td>
                <td style={td}>{x.valor != null ? brl(x.valor) : "-"}</td>
                <td style={td}>{x.status || "-"}</td>

                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <select
                      value={x.status || ""}
                      onChange={(e) => mudarStatus(x.id, e.target.value)}
                      disabled={loading}
                    >
                      {STATUS_OPCOES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button onClick={() => excluir(x.id)} disabled={loading} style={{ padding: "6px 10px" }}>
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {itensFiltrados.length === 0 ? (
              <tr>
                <td style={{ padding: 16 }} colSpan={7}>
                  Nenhum imóvel encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid #ddd",
  whiteSpace: "nowrap",
};

const td = {
  padding: "10px 8px",
  borderBottom: "1px solid #eee",
  verticalAlign: "top",
};

const tdMono = {
  ...td,
  fontFamily: "monospace",
  fontSize: 12,
  whiteSpace: "nowrap",
};
