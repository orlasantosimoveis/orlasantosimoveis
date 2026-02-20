import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const STATUS_OPCOES = ["disponivel", "reservado", "vendido", "inativo"];

function brl(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Admin() {
  const router = useRouter();

  const [boot, setBoot] = useState("iniciando"); // iniciando | ok | erro
  const [bootMsg, setBootMsg] = useState("Iniciando...");
  const [loading, setLoading] = useState(false);

  const [perfil, setPerfil] = useState(null);
  const [captadores, setCaptadores] = useState([]);
  const [proprietarios, setProprietarios] = useState([]);
  const [itens, setItens] = useState([]);

  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  const [form, setForm] = useState({
    titulo: "",
    tipo: "",
    valor: "",
    cidade: "",
    bairro: "",
    endereco: "",
    status: "disponivel",
    proprietario_id: "",
    captador_id: "",
  });

  function onChange(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  function gerarCodigo() {
    return "IMV-" + Date.now();
  }

  // BOOT: valida env + session + perfil
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!supabase) {
          if (!alive) return;
          setBoot("erro");
          setBootMsg(
            "ERRO: Variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não estão configuradas na Vercel."
          );
          return;
        }

        if (!alive) return;
        setBootMsg("Checando sessão (login)...");

        const { data: sessData, error: sessErr } = await supabase.auth.getSession();

        if (sessErr) {
          if (!alive) return;
          setBoot("erro");
          setBootMsg("Erro ao pegar sessão: " + sessErr.message);
          return;
        }

        const session = sessData?.session;
        const user = session?.user;

        if (!user) {
          // não logado
          router.replace("/login");
          return;
        }

        if (!alive) return;
        setBootMsg("Buscando seu perfil na tabela usuarios...");

        const uid = user.id;

        const { data: perfilDb, error: perfilErr } = await supabase
          .from("usuarios")
          .select("id, auth_uid, nome, email, tipo")
          .eq("auth_uid", uid)
          .maybeSingle();

        // Se não tem perfil, ainda assim deixa entrar (mas avisa)
        const finalPerfil =
          perfilDb ||
          ({
            id: null,
            auth_uid: uid,
            nome: user.email,
            email: user.email,
            tipo: "corretor",
          });

        if (!alive) return;
        setPerfil(finalPerfil);

        if (perfilErr) {
          // pode ser RLS ou tabela/coluna
          setBootMsg("Aviso: não consegui ler 'usuarios': " + perfilErr.message);
        } else if (!perfilDb) {
          setBootMsg("Aviso: seu perfil não existe em 'usuarios'. Crie em /signup.");
        } else {
          setBootMsg("OK.");
        }

        if (!alive) return;
        setBoot("ok");
      } catch (e) {
        if (!alive) return;
        setBoot("erro");
        setBootMsg("Falha inesperada no boot: " + (e?.message || String(e)));
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  // Carrega combos e imóveis
  useEffect(() => {
    if (boot !== "ok" || !perfil || !supabase) return;

    (async () => {
      try {
        setLoading(true);

        const { data: users } = await supabase
          .from("usuarios")
          .select("id,nome,tipo")
          .order("nome", { ascending: true });

        setCaptadores(users || []);

        const { data: props } = await supabase
          .from("proprietarios")
          .select("id,nome")
          .order("nome", { ascending: true });

        setProprietarios(props || []);

        const { data: imvs } = await supabase
          .from("imoveis")
          .select("*")
          .order("created_at", { ascending: false });

        setItens(imvs || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [boot, perfil]);

  async function sair() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function salvar(e) {
    e.preventDefault();
    if (!supabase) return;

    if (!form.titulo.trim()) {
      alert("Preencha o título.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        codigo: gerarCodigo(),
        titulo: form.titulo.trim(),
        tipo: form.tipo.trim() || null,
        valor: form.valor === "" ? null : Number(form.valor),
        cidade: form.cidade.trim() || null,
        bairro: form.bairro.trim() || null,
        endereco: form.endereco.trim() || null,
        status: form.status || "disponivel",

        // int (combo)
        proprietario_id: form.proprietario_id ? Number(form.proprietario_id) : null,
        captador_id: form.captador_id ? Number(form.captador_id) : null,

        // automático
        cadastrado_por: perfil?.nome || perfil?.email || "usuário",
      };

      const { error } = await supabase.from("imoveis").insert([payload]);
      if (error) {
        alert("Erro ao salvar: " + error.message);
        return;
      }

      alert("Imóvel salvo!");
      setForm((p) => ({ ...p, titulo: "", tipo: "", valor: "", cidade: "", bairro: "", endereco: "" }));

      const { data: imvs } = await supabase
        .from("imoveis")
        .select("*")
        .order("created_at", { ascending: false });

      setItens(imvs || []);
    } finally {
      setLoading(false);
    }
  }

  const itensFiltrados = useMemo(() => {
    const t = filtroTexto.trim().toLowerCase();
    return (itens || []).filter((x) => {
      const okStatus = filtroStatus ? (x.status || "").toLowerCase() === filtroStatus : true;
      if (!t) return okStatus;

      const blob = [x.codigo, x.titulo, x.tipo, x.cidade, x.bairro, x.endereco, x.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return okStatus && blob.includes(t);
    });
  }, [itens, filtroTexto, filtroStatus]);

  // UI BOOT
  if (boot !== "ok") {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 900, margin: "0 auto" }}>
        <h1>Painel Admin — Orla Santos Imóveis</h1>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10, marginTop: 10 }}>
          <b>Status:</b> {boot.toUpperCase()} <br />
          <b>Detalhe:</b> {bootMsg}
          <div style={{ marginTop: 10, color: "#666" }}>
            Se ficar aqui travado, abre o Console (F12) e vai aparecer o erro.
          </div>
        </div>
      </div>
    );
  }

  // UI OK
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>Painel Admin — Orla Santos Imóveis</h1>
          <div style={{ color: "#444" }}>
            Logado como: <b>{perfil?.nome || perfil?.email}</b> ({perfil?.tipo || "usuário"})
          </div>
          <div style={{ color: "#666", marginTop: 6 }}>{bootMsg}</div>
        </div>
        <button onClick={sair} style={{ padding: "10px 14px" }}>
          Sair
        </button>
      </div>

      <form onSubmit={salvar} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, marginTop: 16 }}>
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

          <label>
            Proprietário<br />
            <select value={form.proprietario_id} onChange={(e) => onChange("proprietario_id", e.target.value)} style={{ width: "100%" }}>
              <option value="">Selecione...</option>
              {proprietarios.map((p) => (
                <option key={p.id} value={p.id}>{p.nome ?? `ID ${p.id}`}</option>
              ))}
            </select>
          </label>

          <label>
            Captador<br />
            <select value={form.captador_id} onChange={(e) => onChange("captador_id", e.target.value)} style={{ width: "100%" }}>
              <option value="">Selecione...</option>
              {captadores.map((u) => (
                <option key={u.id} value={u.id}>{u.nome ?? `ID ${u.id}`}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ marginTop: 12 }}>
          <button disabled={loading} style={{ padding: "10px 14px" }}>
            {loading ? "Salvando..." : "Salvar imóvel"}
          </button>
        </div>
      </form>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
        <input
          placeholder="Buscar..."
          value={filtroTexto}
          onChange={(e) => setFiltroTexto(e.target.value)}
          style={{ flex: 1, padding: 10 }}
        />
        <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} style={{ padding: 10 }}>
          <option value="">Todos</option>
          {STATUS_OPCOES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <h2>Imóveis ({itensFiltrados.length})</h2>
      <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f6f6f6" }}>
              <th style={th}>Código</th>
              <th style={th}>Título</th>
              <th style={th}>Cidade</th>
              <th style={th}>Bairro</th>
              <th style={th}>Valor</th>
              <th style={th}>Status</th>
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
              </tr>
            ))}
            {itensFiltrados.length === 0 ? (
              <tr>
                <td style={{ padding: 14 }} colSpan={6}>
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

const th = { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid #ddd", whiteSpace: "nowrap" };
const td = { padding: "10px 8px", borderBottom: "1px solid #eee" };
const tdMono = { ...td, fontFamily: "monospace", fontSize: 12, whiteSpace: "nowrap" };
