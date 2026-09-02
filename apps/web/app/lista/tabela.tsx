"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChipFase } from "@/componentes/ui/chip";
import { Avatar } from "@/componentes/ui/avatar";
import { Ficha } from "../esteira/ficha";
import { ModalMudancaFase } from "../esteira/modais";
import { Filtros } from "../esteira/filtros";
import { Aviso, useAviso } from "@/componentes/ui/aviso";
import { aplicarFiltros, paraQueryString, type EstadoFiltros } from "@/lib/leads/filtros";
import {
  direcaoPadrao,
  ordenarLista,
  type Coluna,
  type Direcao,
} from "@/lib/leads/ordenacao";
import { pedeConfirmacao, type DadosDaMudanca } from "@/lib/dominio/regras";
import { fase, type FaseId } from "@/lib/dominio/fases";
import type { Lead } from "@/lib/dominio/tipos";
import type { Referencias } from "@/lib/leads/consulta";
import { dataCurta, dataLonga, telefone } from "@/lib/formato";

/**
 * Visão Lista (§5.5, F3-2).
 *
 * Mesmos filtros e mesma ficha do board — é a mesma esteira vista de outro
 * ângulo, não uma tela paralela. O que muda é a ordenação: aqui quem manda é a
 * coluna clicada, não a urgência.
 */

const CABECALHOS: { id: Coluna; rotulo: string; classe?: string }[] = [
  { id: "nome", rotulo: "Nome" },
  { id: "telefone", rotulo: "WhatsApp", classe: "tabular" },
  { id: "email", rotulo: "E-mail" },
  { id: "produto", rotulo: "Produto" },
  { id: "fase", rotulo: "Fase" },
  { id: "responsavel", rotulo: "Responsável" },
  { id: "proximaAcao", rotulo: "Próxima ação" },
  { id: "criado", rotulo: "Criado", classe: "tabular" },
  { id: "origem", rotulo: "Origem" },
];

export function Tabela({
  leadsIniciais,
  referencias,
  ehGestor,
  numeroWhatsapp,
  filtrosIniciais,
}: {
  leadsIniciais: Lead[];
  referencias: Referencias;
  ehGestor: boolean;
  numeroWhatsapp: string | null;
  filtrosIniciais: EstadoFiltros;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(leadsIniciais);
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [coluna, setColuna] = useState<Coluna>("criado");
  const [direcao, setDirecao] = useState<Direcao>("desc");
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [pendente, setPendente] = useState<{ lead: Lead; destino: FaseId } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const { estado: aviso, mostrar, fechar } = useAviso();

  const visiveis = useMemo(
    () => ordenarLista(aplicarFiltros(leads, filtros), coluna, direcao),
    [leads, filtros, coluna, direcao],
  );

  const aberto = leads.find((l) => l.id === abertoId) ?? null;

  function ordenarPor(nova: Coluna) {
    if (nova === coluna) {
      setDirecao((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setColuna(nova);
    setDirecao(direcaoPadrao(nova));
  }

  function atualizar(id: string, patch: Partial<Lead>) {
    setLeads((atuais) => atuais.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function pedirFase(lead: Lead, destino: FaseId) {
    if (lead.fase === destino) return;
    if (pedeConfirmacao(destino)) {
      setPendente({ lead, destino });
      return;
    }
    void mover(lead, destino, {});
  }

  async function mover(lead: Lead, destino: FaseId, dados: DadosDaMudanca) {
    setSalvando(true);
    const resposta = await fetch(`/api/v1/leads/${lead.id}/fase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ para: destino, ...dados }),
    });
    setSalvando(false);

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      mostrar(corpo?.error?.message ?? "Não conseguimos mover o lead.");
      return;
    }

    setPendente(null);
    atualizar(lead.id, { fase: destino });
    mostrar(`${lead.nome} → ${fase(destino).nome}`, async () => {
      const volta = await fetch(`/api/v1/leads/${lead.id}/desfazer`, { method: "POST" });
      if (volta.ok) {
        const { para } = (await volta.json()) as { para: FaseId };
        atualizar(lead.id, { fase: para });
      }
      router.refresh();
    });
    router.refresh();
  }

  async function excluir(lead: Lead) {
    const resposta = await fetch(`/api/v1/leads/${lead.id}`, { method: "DELETE" });
    if (!resposta.ok) {
      mostrar("Não conseguimos excluir o lead.");
      return;
    }
    setLeads((atuais) => atuais.filter((l) => l.id !== lead.id));
    setAbertoId(null);
    mostrar(`${lead.nome} foi excluído.`);
    router.refresh();
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2 sm:px-6">
        <a
          href={`/api/v1/export.csv?${paraQueryString(filtros)}`}
          className="flex h-9 items-center rounded-[6px] border border-line-strong px-3 text-[13px] font-[600] text-heading hover:bg-surface-2"
          // O download é do navegador; sem isto ele tentaria navegar para o CSV.
          download
        >
          Exportar CSV
        </a>
        <span className="text-[12px] text-faint">
          {visiveis.length === leads.length
            ? "exporta todos os leads"
            : `exporta os ${visiveis.length} filtrados`}
        </span>
      </div>

      <Filtros
        filtros={filtros}
        referencias={referencias}
        total={visiveis.length}
        onMuda={setFiltros}
      />

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1080px] border-collapse">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {CABECALHOS.map((c) => {
                const ativa = c.id === coluna;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={ativa ? (direcao === "asc" ? "ascending" : "descending") : "none"}
                    className="border-b border-line px-3 py-2 text-left"
                  >
                    <button
                      type="button"
                      onClick={() => ordenarPor(c.id)}
                      className={
                        "flex items-center gap-1 font-(family-name:--font-display) text-[10.5px] font-[700] uppercase tracking-[.1em] " +
                        (ativa ? "text-heading" : "text-muted hover:text-heading")
                      }
                    >
                      {c.rotulo}
                      <span aria-hidden="true" className="text-[9px]">
                        {ativa ? (direcao === "asc" ? "▲" : "▼") : ""}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {visiveis.length === 0 ? (
              <tr>
                <td colSpan={CABECALHOS.length} className="px-4 py-10 text-center text-[13.5px] text-faint">
                  Nenhum lead com esses filtros.
                </td>
              </tr>
            ) : (
              visiveis.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setAbertoId(lead.id)}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setAbertoId(lead.id);
                  }}
                  className="cursor-pointer border-b border-line hover:bg-surface-2 focus-visible:bg-surface-2"
                >
                  <td className="px-3 py-2.5 text-[13.5px] font-[600] text-heading">
                    {lead.nomeCompleto}
                    {lead.empresa ? (
                      <span className="block text-[12px] font-[400] text-muted">{lead.empresa}</span>
                    ) : null}
                  </td>
                  <td className="tabular px-3 py-2.5 text-[13px] text-texto">
                    {telefone(lead.telefone)}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-texto">{lead.email}</td>
                  <td className="px-3 py-2.5 text-[13px] text-texto">{lead.produto ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <ChipFase id={lead.fase} />
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[13px] text-texto">
                      <Avatar
                        iniciais={lead.responsavel?.iniciais ?? "?"}
                        nome={lead.responsavel?.nome}
                        semDono={lead.semResponsavel}
                      />
                      {lead.responsavel?.nome ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px]">
                    {lead.proximaAcao ? (
                      <span className={lead.atrasado ? "text-bad" : lead.paraHoje ? "text-warn" : "text-texto"}>
                        {lead.proximaAcao}
                        <span className="tabular ml-1.5 text-muted">
                          {dataCurta(lead.proximaAcaoEm)}
                        </span>
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="tabular px-3 py-2.5 text-[13px] text-muted">
                    {dataLonga(lead.criadoEm.slice(0, 10))}
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-muted">{lead.origem.rotulo}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {aberto ? (
        <Ficha
          lead={aberto}
          referencias={referencias}
          ehGestor={ehGestor}
          numeroWhatsapp={numeroWhatsapp}
          onFechar={() => setAbertoId(null)}
          onPedirFase={(destino) => pedirFase(aberto, destino)}
          onCampoSalvo={(patch) => atualizar(aberto.id, patch)}
          onExcluir={() => void excluir(aberto)}
        />
      ) : null}

      {pendente ? (
        <ModalMudancaFase
          lead={pendente.lead}
          destino={pendente.destino}
          motivosPerda={referencias.motivosPerda}
          salvando={salvando}
          onCancelar={() => setPendente(null)}
          onConfirmar={(dados) => void mover(pendente.lead, pendente.destino, dados)}
        />
      ) : null}

      <Aviso estado={aviso} onFechar={fechar} />
    </>
  );
}
