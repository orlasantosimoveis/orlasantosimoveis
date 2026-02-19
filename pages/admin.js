import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// util: formata número em BRL
function brl(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// util: normaliza status
const STATUS_OPCOES = ["disponivel", "reservado", "vendido", "inativo"];

export default function Admin() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // filtros
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  // form
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
    // campos internos que existem na sua tabela (pelo print)
    proprietario_id: "",
    observacoes_internas: "",
    captador_id: "",
    cadastrado_por: "",
    vendido_por: "",
    valor_venda: "",
    comissao_percentual: "",
  });

  const [itens, setItens] = useState([]);

  async function carregar() {
    setLoading(true);
    setMsg("");
    const { data, error } = await supabase
      .from("imoveis")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      setMsg("Erro ao carregar: " + error.message);
      return;
    }
    setItens(data || []);
  }

useEffect(() => {
  (async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.push("/login");
      return;
    }
    carregar();
  })();
}, []);



  function onChange(name, value) {
    setForm((p) => ({ ...p, [name]: value }));
  }

  // gera codigo IMV
  function gerarCodigo() {
    return "IMV-" + Date.now();
  }

  async function salvar(e) {
    e?.preventDefault?.();
    setLoading(true);
    setMsg("");

    // Monta payload com apenas campos preenchidos (evita inserir "" onde deveria ser null)
    const payload = {
      codigo: gerarCodigo(),
      titulo: form.titulo?.trim(),
      tipo: form.tipo?.trim() || null,
      valor: form.valor === "" ? null : Number(form.valor),
      cidade: form.cidade?.trim() || null,
      bairro: form.bairro?.trim() || null,
      endereco: form.endereco?.trim() || null,
      area_total: form.area_total === "" ? null : Number(form.area_total),
      area_construida: form.area_construida === "" ? null : Number(form.area_construida),
      quartos: form.quartos === "" ? null : Number(form.quartos),
      banheiros: form.banheiros === "" ? null : Number(form.banheiros),
      vagas: form.vagas === "" ? null : Number(form.vagas),
      descricao: form.descricao?.trim() || null,
      status: form.status || "disponivel",

      proprietario_id: form.proprietario_id?.trim() || null,
      observacoes_internas: form.observacoes_internas?.trim() || null,
      captador_id: form.captador_id?.trim() || null,
      cadastrado_por: form.cadastrado_por?.trim() || null,
      vendido_por: form.vendido_por?.trim() || null,
      valor_venda: form.valor_venda === "" ? null : Number(form.valor_venda),
      comissao_percentual: form.comissao_percentual === "" ? null : Number(form.comissao_percentual),
    };

    // titulo é obrigatório no seu schema (NO)
    if (!payload.titulo) {
      setLoading(false);
      setMsg("Preencha pelo menos o TÍTULO.");
      return;
    }

    const { data, error } = await supabase
      .from("imoveis")
      .insert([payload])
      .select("id,codigo");

    setLoading(false);

    if (error) {
      setMsg("Erro ao salvar: " + error.message);
      return;
    }

    const codigo = data?.[0]?.codigo || "(sem código)";
    setMsg("Imóvel salvo! Código: " + codigo);

    // limpa alguns campos principais
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

    await carregar();
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
    await carregar();
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
    await carregar();
  }

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
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return okStatus && blob.includes(t);
    });
  }, [itens, filtroTexto, filtroStatus]);

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 6 }}>Painel Admin — Orla Santos Imóveis</h1>
      <div style={{ color: "#444", marginBottom: 16 }}>
        {loading ? "Carregando..." : "Pronto."}{" "}
        {msg ? <span style={{ marginLeft: 10, fontWeight: 700 }}>{msg}</span> : null}
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
            Proprietário ID<br />
            <input value={form.proprietario_id} onChange={(e) => onChange("proprietario_id", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Captador ID<br />
            <input value={form.captador_id} onChange={(e) => onChange("captador_id", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Cadastrado por<br />
            <input value={form.cadastrado_por} onChange={(e) => onChange("cadastrado_por", e.target.value)} style={{ width: "100%" }} />
          </label>

          <label>
            Vendido por<br />
            <input value={form.vendido_por} onChange={(e) => onChange("vendido_por", e.target.value)} style={{ width: "100%" }} />
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
          <button type="button" disabled={loading} onClick={carregar} style={{ padding: "10px 14px" }}>
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
              <th style={th}>Endereço</th>
              <th style={th}>Valor</th>
              <th style={th}>Status</th>
              <th style={th}>Detalhes</th>
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
                <td style={td}>{x.endereco || "-"}</td>
                <td style={td}>{x.valor != null ? brl(x.valor) : "-"}</td>
                <td style={td}>{x.status || "-"}</td>

                <td style={td}>
                  <div style={{ lineHeight: 1.3 }}>
                    <div><b>Área:</b> {x.area_total ?? "-"} / {x.area_construida ?? "-"}</div>
                    <div><b>Qts/Bnh/Vgs:</b> {x.quartos ?? "-"} / {x.banheiros ?? "-"} / {x.vagas ?? "-"}</div>
                    <div><b>Comissão %:</b> {x.comissao_percentual ?? "-"}</div>
                    <div><b>Valor venda:</b> {x.valor_venda != null ? brl(x.valor_venda) : "-"}</div>
                    <div><b>Captador:</b> {x.captador_id ?? "-"}</div>
                    <div><b>Cadastrado por:</b> {x.cadastrado_por ?? x.cadastradoPorId ?? "-"}</div>
                    <div><b>Vendido por:</b> {x.vendido_por ?? "-"}</div>
                    <div><b>Data captação:</b> {x.data_captacao ? new Date(x.data_captacao).toLocaleString("pt-BR") : "-"}</div>
                    <div><b>Data venda:</b> {x.data_venda ? new Date(x.data_venda).toLocaleString("pt-BR") : "-"}</div>
                    <div><b>Criado:</b> {x.created_at ? new Date(x.created_at).toLocaleString("pt-BR") : "-"}</div>
                  </div>
                </td>

                <td style={td}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <select
                      value={x.status || ""}
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
                <td style={{ padding: 16 }} colSpan={10}>
                  Nenhum imóvel encontrado.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, color: "#666" }}>
        Dica: depois que estiver tudo certo, a gente coloca <b>login</b> e fecha as permissões (LGPD/segurança).
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
