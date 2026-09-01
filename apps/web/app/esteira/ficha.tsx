"use client";

import { useEffect, useRef, useState } from "react";
import { Botao } from "@/componentes/ui/botao";
import { Gaveta } from "@/componentes/ui/gaveta";
import { Avatar } from "@/componentes/ui/avatar";
import { FASES, fase, type FaseId } from "@/lib/dominio/fases";
import type { Lead } from "@/lib/dominio/tipos";
import type { Evento, Referencias } from "@/lib/leads/consulta";
import { dataHora, dataLonga, idade, moeda, telefone } from "@/lib/formato";

/**
 * Ficha do lead (§5.4): gaveta de 460px com o board visível atrás.
 *
 * Salvamento automático no blur, não em botão "Salvar": o consultor está no
 * telefone enquanto edita, e um botão a mais é uma chance a mais de perder o
 * que digitou.
 */

type Props = {
  lead: Lead;
  referencias: Referencias;
  ehGestor: boolean;
  numeroWhatsapp: string | null;
  onFechar: () => void;
  onPedirFase: (destino: FaseId) => void;
  onCampoSalvo: (patch: Partial<Lead>) => void;
  onExcluir: () => void;
};

export function Ficha({
  lead,
  referencias,
  ehGestor,
  numeroWhatsapp,
  onFechar,
  onPedirFase,
  onCampoSalvo,
  onExcluir,
}: Props) {
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [nota, setNota] = useState("");
  const [salvandoNota, setSalvandoNota] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setEventos(null);
    fetch(`/api/v1/leads/${lead.id}/historico`)
      .then((r) => (r.ok ? r.json() : { eventos: [] }))
      .then((d) => ativo && setEventos(d.eventos ?? []))
      .catch(() => ativo && setEventos([]));
    return () => {
      ativo = false;
    };
  }, [lead.id]);

  async function salvarCampo(campo: string, valor: unknown) {
    setAviso(null);
    const resposta = await fetch(`/api/v1/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor }),
    });

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      // O valor anterior fica no banco (§5.7): a ficha mostra o erro e não
      // finge que salvou.
      setAviso(corpo?.error?.message ?? "Não conseguimos salvar essa alteração.");
      return false;
    }

    onCampoSalvo({ [campo]: valor } as Partial<Lead>);
    return true;
  }

  async function adicionarNota() {
    const texto = nota.trim();
    if (!texto) return;

    setSalvandoNota(true);
    const resposta = await fetch(`/api/v1/leads/${lead.id}/notas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    setSalvandoNota(false);

    if (resposta.ok) {
      setNota("");
      const r = await fetch(`/api/v1/leads/${lead.id}/historico`);
      if (r.ok) setEventos((await r.json()).eventos ?? []);
    }
  }

  const wa = numeroWhatsapp
    ? `https://wa.me/55${lead.telefone}?text=${encodeURIComponent(
        `Olá ${lead.nome}, sou consultor da MX Corretora de Seguros.`,
      )}`
    : null;

  return (
    <Gaveta
      aberta
      titulo={lead.nomeCompleto}
      onFechar={onFechar}
      rodape={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11.5px] text-faint">Alterações salvam sozinhas.</span>
          {ehGestor ? (
            <button
              type="button"
              onClick={onExcluir}
              className="text-[12px] font-[600] text-bad underline underline-offset-2"
            >
              Excluir lead
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Identificação */}
        <div className="flex items-start gap-3">
          <Avatar
            iniciais={lead.responsavel?.iniciais ?? "?"}
            nome={lead.responsavel?.nome}
            semDono={lead.semResponsavel}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] text-muted">
              {lead.origem.rotulo} · criado {idade(lead.diasDeVida)}
            </p>
            {lead.empresa ? (
              <p className="mt-0.5 text-[13.5px] font-[600] text-heading">{lead.empresa}</p>
            ) : null}
          </div>
        </div>

        {/* Avisos contextuais (§5.4) */}
        {lead.atrasado ? (
          <Alerta tom="bad">
            Follow-up atrasado desde {dataLonga(lead.proximaAcaoEm)}.
          </Alerta>
        ) : null}
        {lead.semResponsavel && !lead.terminal ? (
          <Alerta tom="warn">Ninguém está cuidando deste lead ainda.</Alerta>
        ) : null}
        {aviso ? <Alerta tom="bad">{aviso}</Alerta> : null}

        {/* Ações a um clique (§3, princípio 7) */}
        <div className="flex flex-wrap gap-2">
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center rounded-[6px] bg-[#1F7A55] px-4 text-[14px] font-[600] text-white"
            >
              WhatsApp
            </a>
          ) : null}
          <a
            href={`mailto:${lead.email}`}
            className="flex h-10 items-center rounded-[6px] border border-line-strong px-4 text-[14px] font-[600] text-heading"
          >
            E-mail
          </a>
          <a
            href={`tel:+55${lead.telefone}`}
            className="flex h-10 items-center rounded-[6px] border border-line-strong px-4 text-[14px] font-[600] text-heading"
          >
            Ligar
          </a>
        </div>

        {/* Seletor de fase — o caminho por teclado e por celular (§3, princípio 6) */}
        <section>
          <p className="rotulo mb-2">Fase</p>
          <div className="flex flex-wrap gap-1.5">
            {FASES.map((f) => {
              const atual = f.id === lead.fase;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => !atual && onPedirFase(f.id)}
                  aria-current={atual ? "true" : undefined}
                  className={
                    "rounded-full border px-3 py-1.5 text-[12px] font-[600] " +
                    (atual
                      ? "border-transparent text-white"
                      : "border-line-strong text-muted hover:text-heading")
                  }
                  style={atual ? { backgroundColor: f.cor } : undefined}
                >
                  {f.nome}
                </button>
              );
            })}
          </div>
        </section>

        {/* Contato */}
        <section className="flex flex-col gap-3">
          <p className="rotulo">Contato</p>
          <CampoInline rotulo="Nome" valor={lead.nome} onSalvar={(v) => salvarCampo("nome", v)} />
          <CampoInline
            rotulo="Sobrenome"
            valor={lead.sobrenome}
            onSalvar={(v) => salvarCampo("sobrenome", v)}
          />
          <CampoInline
            rotulo="WhatsApp"
            valor={telefone(lead.telefone)}
            onSalvar={(v) => salvarCampo("telefone", v.replace(/\D/g, ""))}
          />
          <CampoInline rotulo="E-mail" valor={lead.email} onSalvar={(v) => salvarCampo("email", v)} />
          <CampoInline
            rotulo="Empresa"
            valor={lead.empresa ?? ""}
            onSalvar={(v) => salvarCampo("empresa", v)}
          />
        </section>

        {/* Oportunidade */}
        <section className="flex flex-col gap-3">
          <p className="rotulo">Oportunidade</p>

          <CampoSelecao
            rotulo="Responsável"
            valor={lead.responsavel?.id ?? ""}
            opcoes={[
              { valor: "", texto: "Sem responsável" },
              ...referencias.equipe.map((p) => ({ valor: p.id, texto: p.nome })),
            ]}
            onSalvar={(v) => salvarCampo("responsavelId", v || null)}
          />

          <CampoSelecao
            rotulo="Produto"
            valor={
              referencias.produtos.find((p) => p.label === lead.produto)?.id.toString() ?? ""
            }
            opcoes={[
              { valor: "", texto: "Não informado" },
              ...referencias.produtos.map((p) => ({ valor: String(p.id), texto: p.label })),
            ]}
            onSalvar={(v) => salvarCampo("produtoId", v ? Number(v) : null)}
          />

          <CampoInline
            rotulo="Próxima ação"
            valor={lead.proximaAcao ?? ""}
            onSalvar={(v) => salvarCampo("proximaAcao", v)}
          />
          <CampoInline
            rotulo="Data da próxima ação"
            tipo="date"
            valor={lead.proximaAcaoEm ?? ""}
            onSalvar={(v) => salvarCampo("proximaAcaoEm", v || null)}
          />

          {lead.valorEstimado !== null || lead.fase === "negociacao" ? (
            <CampoInline
              rotulo="Valor estimado (R$/ano)"
              tipo="number"
              valor={lead.valorEstimado?.toString() ?? ""}
              onSalvar={(v) => salvarCampo("valorEstimado", v ? Number(v) : null)}
            />
          ) : null}

          {/* Condicionais: só existem quando fazem sentido (§5.4) */}
          {lead.fase === "ganhou" ? (
            <ValorFixo rotulo="Prêmio anual" texto={moeda(lead.premioAnual)} extra={lead.seguradora} />
          ) : null}
          {lead.fase === "perdido" && lead.motivoPerda ? (
            <ValorFixo rotulo="Motivo da perda" texto={lead.motivoPerda} />
          ) : null}
          {lead.fase === "posterior" && lead.retomarEm ? (
            <ValorFixo rotulo="Retomar em" texto={dataLonga(lead.retomarEm)} />
          ) : null}
        </section>

        {/* Histórico */}
        <section>
          <p className="rotulo mb-2">Histórico</p>

          <div className="mb-4 flex flex-col gap-2">
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              placeholder="O que aconteceu nesta conversa?"
              className="w-full resize-y rounded-[6px] border border-line-strong bg-surface p-2.5 text-[14px] text-texto placeholder:text-faint"
            />
            <Botao
              variante="secundario"
              onClick={adicionarNota}
              disabled={salvandoNota || !nota.trim()}
              className="self-start"
            >
              {salvandoNota ? "Salvando…" : "Adicionar nota"}
            </Botao>
          </div>

          {eventos === null ? (
            <p className="text-[13px] text-faint">Carregando…</p>
          ) : eventos.length === 0 ? (
            <p className="text-[13px] text-faint">Nada registrado ainda.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {eventos.map((e) => (
                <li key={e.id} className="border-l-2 border-line pl-3">
                  <p className="text-[13.5px] leading-snug text-texto">{descreverEvento(e)}</p>
                  <p className="mt-0.5 text-[11.5px] text-faint">
                    {e.autor ?? "Sistema"} · {dataHora(e.em)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Gaveta>
  );
}

/* ------------------------------------------------------------- auxiliares */

function descreverEvento(e: Evento): string {
  const p = e.payload;
  switch (e.tipo) {
    case "created":
      return `Lead criado via ${String(p.origem ?? "formulário")}`;
    case "stage_changed":
      return p.desfazer
        ? `Movimentação desfeita — voltou para ${String(p.para)}`
        : `${String(p.de ?? "?")} → ${String(p.para ?? "?")}`;
    case "note":
      return String(p.text ?? "");
    case "assigned":
      return "Responsável alterado";
    case "next_action":
      return "Próxima ação atualizada";
    case "field_changed":
      return `Campos atualizados: ${Object.keys(p).join(", ")}`;
    case "duplicate_submission":
      return "Novo pedido pelo formulário (lead já existia)";
    default:
      return String(p.acao ?? "Evento do sistema");
  }
}

function Alerta({ tom, children }: { tom: "bad" | "warn"; children: React.ReactNode }) {
  const cores = tom === "bad" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn";
  return (
    <p role="status" className={`rounded-[6px] px-3 py-2 text-[13px] ${cores}`}>
      {children}
    </p>
  );
}

function ValorFixo({
  rotulo,
  texto,
  extra,
}: {
  rotulo: string;
  texto: string;
  extra?: string | null;
}) {
  return (
    <div>
      <p className="text-[12px] text-muted">{rotulo}</p>
      <p className="tabular text-[14px] font-[600] text-heading">
        {texto}
        {extra ? <span className="font-[400] text-muted"> · {extra}</span> : null}
      </p>
    </div>
  );
}

/**
 * Campo que salva ao sair (blur) e só se o valor mudou.
 *
 * Salvar a cada tecla geraria um evento por caractere no histórico.
 */
function CampoInline({
  rotulo,
  valor,
  onSalvar,
  tipo = "text",
}: {
  rotulo: string;
  valor: string;
  onSalvar: (v: string) => Promise<boolean>;
  tipo?: "text" | "date" | "number";
}) {
  const [atual, setAtual] = useState(valor);
  const [salvando, setSalvando] = useState(false);
  const original = useRef(valor);

  useEffect(() => {
    setAtual(valor);
    original.current = valor;
  }, [valor]);

  async function sair() {
    if (atual === original.current) return;
    setSalvando(true);
    const ok = await onSalvar(atual);
    setSalvando(false);
    if (ok) original.current = atual;
    else setAtual(original.current); // Recusado: volta ao que o banco tem.
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] text-muted">
        {rotulo}
        {salvando ? <span className="ml-1.5 text-faint">salvando…</span> : null}
      </label>
      <input
        type={tipo}
        value={atual}
        onChange={(e) => setAtual(e.target.value)}
        onBlur={sair}
        className="h-[38px] rounded-[6px] border border-line bg-surface px-2.5 text-[14px] text-texto"
      />
    </div>
  );
}

function CampoSelecao({
  rotulo,
  valor,
  opcoes,
  onSalvar,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; texto: string }[];
  onSalvar: (v: string) => Promise<boolean>;
}) {
  const [atual, setAtual] = useState(valor);
  useEffect(() => setAtual(valor), [valor]);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] text-muted">{rotulo}</label>
      <select
        value={atual}
        onChange={async (e) => {
          const v = e.target.value;
          setAtual(v);
          const ok = await onSalvar(v);
          if (!ok) setAtual(valor);
        }}
        className="h-[38px] rounded-[6px] border border-line bg-surface px-2.5 text-[14px] text-texto"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export { fase };
