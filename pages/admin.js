import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const STATUS_OPCOES = ["disponivel", "reservado", "vendido", "inativo"];

function brl(v) {
  if (v == null || v === "") return "-";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarCodigo() {
  return "IMV-" + Date.now();
}

export default function Admin() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [usuarioId, setUsuarioId] = useState("");
  const [usuarioNome, setUsuarioNome] = useState("");

  const [itens, setItens] = useState([]);
  const [nomesUsuarios, setNomesUsuarios] = useState({});

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [form, setForm] = useState({
    titulo: "",
    tipo: "",
    valor: "",
    cidade: "",
    bairro: "",
    endereco: "",
    descricao: "",
    status: "disponivel",
  });

  function onChange(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  // ---------------------------
  // Auth + Boot
  // ---------------------------
  useEffect(() => {
    let unsub = null;

    (async () => {
      setMsg("");
      setLoading(true);

      // 1) sessão (mais confiável)
      const { data: sess } = await supabase.auth.getSession();
      const session = sess?.session;

      if (!session) {
        // escuta login e manda pro /login
        const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (!newSession) {
            router.replace("/login");
            return;
          }
          // se logou agora, recarrega a página do admin
          window.location.reload();
        });
        unsub = data?.subscription;
        setLoading(false);
        router.replace("/login");
        return;
      }

      const user = session.user;
      setUsuarioId(user.id);

      // tenta buscar nome do usuário na tabela public.usuarios
      const { data: perfil, error: perfilErr } = await supabase
        .from("usuarios")
        .select("nome")
        .eq("id", user.id)
        .single();

      // fallback pro email, caso não exista perfil ainda
      if (!perfilErr && perfil?.nome) setUsuarioNome(perfil.nome);
      else setUsuarioNome(user.email || "Usuário");

      await carregarImoveis();

      setLoading(false);
    })();

    return () => {
      if (unsub) unsub.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // ---------------------------
  // Carregar imóveis + mapear nomes
  // ---------------------------
  async function carregarImoveis() {
    const { data, error } = await supabase
      .from("imoveis")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMsg("Erro ao carregar imóveis: " + error.message);
      setItens([]);
      return;
    }

    const lista = data || [];
    setItens(lista);

    // montar mapa (uuid -> nome) para "cadastrado_por_uuid"
    const ids = Array.from(
      new Set(lista.map((x) => x.cadastrado_por_uuid).filter(Boolean))
    );

    if (ids.length === 0) {
      setNomesUsuarios({});
      return;
    }

    const { data: users, error: e2 } = await supabase
      .from("usuarios")
      .select("id,nome")
      .in("id", ids);

    if (e2) {
      // não quebra a página, só não mostra nomes
      setMsg((m) => (m ? m + " | " : "") + "Aviso usuários: " + e2.message);
      setNomesUsuarios({});
      return;
    }

    const map = {};
    (users || []).forEach((u) => {
      map[u.id] = u.nome;
    });
    setNomesUsuarios(map);
  }

  // ---------------------------
  // CRUD
  // ---------------------------
  async function salvar(e) {
    e.preventDefault();
    setMsg("");

    if (!form.titulo?.trim()) {
      setMsg("Preencha o Título.");
      return;
    }

    setLoading(true);

    // garante sessão
    const { data: sess } = await supabase.auth.getSession();
    const session = sess?.session;
    if (!session) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    const payload = {
      codigo: gerarCodigo(),
      titulo: form.titulo.trim(),
      tipo: form.tipo?.trim() || null,
      valor: form.valor === "" ? null : Number(form.valor),
      cidade: form.cidade?.trim() || null,
      bairro: form.bairro?.trim() || null,
      endereco: form.endereco?.trim() || null,
      descricao: form.descricao?.trim() || null,
      status: form.status || "disponivel",

      // ✅ aqui é o correto (UUID)
      cadastrado_por_uuid: session.user.id,
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
      descricao: "",
      status: "disponivel",
    }));

    await carregarImoveis();
  }

  async function excluir(id) {
    if (!confirm("Tem certeza que deseja excluir este imóvel?")) return;

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

    const { error } = await supabase
      .from("imoveis")
      .update({ status: novoStatus })
      .eq("id", id);

    setLoading(false);

    if (error) {
      setMsg("Erro ao atualizar status: " + error.message);
      return;
    }

    setMsg("Status atualizado para: " + novoStatus);
    await carregarImoveis();
  }

  // ---------------------------
  // Filtros
  // ---------------------------
  const itensFiltrados = useMemo(() => {
    const t = filtroTexto.trim().toLowerCase();
    return (itens || []).filter((x) => {
      const okStatus = filtroStatus ? (x.status || "").toLowerCase() === filtroStatus : true;
      if (!t) return okStatus;

      const blob = [
        x.codigo,
        x.titulo,
        x.tipo,
        x.cidade,
        x.bairro,
        x.endereco,
        x.descricao,
        x.status,
        nomesUsuarios[x.cadastrado_por_uuid],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return okStatus && blob.includes(t);
    });
  }, [itens, filtroTexto, filtroStatus, nomesUsuarios]);

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 6 }}>Painel Admin — Orla Santos Imóveis</h1>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <b>Logado como:</b> {usuarioNome || "..."}
        </div>

        <button onClick={() => router.push("/signup")} disabled={loading}>
          Cadastrar usuário
        </button>

        <button onClick={sair} disabled={loading}>
          Sair
        </button>

        <div style={{ marginLeft: "auto", color: "#555" }}>
          {loading ? "Carregando..." : "Pronto."}{" "}
          {msg ? <span style={{ marginLeft: 10, fontWeight: 700 }}>{msg}</span> : null}
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={salvar} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, marginBottom: 18 }}>
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
              {STATUS_OPCOES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
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

          <label style={{ gridColumn: "span 4" }}>
            Descrição<br />
            <textarea value={form.descricao} onChange={(e) => onChange("descricao", e.target.value)} style={{ width: "100%", minHeight: 80 }} />
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
          placeholder="Buscar por código, título, cidade, bairro, status, cadastrador..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          style={{ flex: 1, padding: 10 }}
        />
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ padding: 10 }}>
          <option value="">Todos os status</option>
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
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
              <th style={th}>Tipo</th>
              <th style={th}>Cidade</th>
              <th style={th}>Bairro</th>
              <th style={th}>Valor</th>
              <th style={th}>Status</th>
              <th style={th}>Cadastrado por</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>

          <tbody>
            {itensFiltrados.map((x) => (
              <tr key={x.id}>
                <td style={tdMono}>{x.codigo}</td>
                <td style={td}>{x.titulo}</td>
                <td style={td}>{x.tipo || "-"}</td>
                <td style={td}>{x.cidade || "-"}</td>
                <td style={td}>{x.bairro || "-"}</td>
                <td style={td}>{x.valor != null ? brl(x.valor) : "-"}</td>
                <td style={td}>{x.status || "-"}</td>
                <td style={td}>{nomesUsuarios[x.cadastrado_por_uuid] || "-"}</td>

                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <select
                      value={x.status || "disponivel"}
                      onChange={(e) => mudarStatus(x.id, e.target.value)}
                      disabled={loading}
                    >
                      {STATUS_OPCOES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
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
                <td style={{ padding: 16 }} colSpan={9}>
                  Nenhum imóvel encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, color: "#666" }}>
        ✅ Cadastro só para usuários logados. Se quiser, no próximo passo eu fecho o banco (RLS) para impedir inserts sem login.
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
