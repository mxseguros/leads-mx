"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Aviso, useAviso } from "@/componentes/ui/aviso";
import { Avatar } from "@/componentes/ui/avatar";
import { BadgeProximaAcao, ChipOrigem, ChipProduto } from "@/componentes/ui/chip";
import { FASES, ehFaseValida, fase, type FaseId } from "@/lib/dominio/fases";
import { ordenarCartoes } from "@/lib/dominio/mapear";
import { pedeConfirmacao, type DadosDaMudanca } from "@/lib/dominio/regras";
import type { Lead } from "@/lib/dominio/tipos";
import type { Referencias } from "@/lib/leads/consulta";
import { dataCurta, moeda, telefone } from "@/lib/formato";
import { Ficha } from "./ficha";
import { ModalMudancaFase } from "./modais";
import { NovoLead } from "./novo-lead";
import { Filtros } from "./filtros";
import { aplicarFiltros, type EstadoFiltros } from "@/lib/leads/filtros";

/**
 * O board (§5.3). Mantém o estado dos cartões no cliente para o arrasto e o
 * Desfazer serem instantâneos, e reconcilia com o servidor a cada mudança.
 *
 * Mover de fase tem dois caminhos (§3, princípio 6): arrastar aqui, e o
 * seletor de fase da ficha — que é o caminho de teclado, celular e leitor de
 * tela. Os dois passam pelo mesmo modal e pela mesma rota.
 */

type Props = {
  leadsIniciais: Lead[];
  referencias: Referencias;
  ehGestor: boolean;
  numeroWhatsapp: string | null;
  filtrosIniciais: EstadoFiltros;
};

export function Quadro({
  leadsIniciais,
  referencias,
  ehGestor,
  numeroWhatsapp,
  filtrosIniciais,
}: Props) {
  const router = useRouter();
  const [leads, setLeads] = useState(leadsIniciais);
  const [filtros, setFiltros] = useState(filtrosIniciais);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<Lead | null>(null);
  const [pendente, setPendente] = useState<{ lead: Lead; destino: FaseId } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [novoEm, setNovoEm] = useState<FaseId | null>(null);
  const { estado: aviso, mostrar, fechar } = useAviso();

  const sensores = useSensors(
    // Distância mínima: sem isso, clicar num cartão para abrir a ficha vira
    // um micro-arrasto e a ficha nunca abre.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const visiveis = useMemo(() => aplicarFiltros(leads, filtros), [leads, filtros]);
  const aberto = leads.find((l) => l.id === abertoId) ?? null;

  const atualizar = useCallback((id: string, patch: Partial<Lead>) => {
    setLeads((atuais) => atuais.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  /** Pede a mudança: abre modal quando a fase exige dados, senão manda direto. */
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

    // Desfazer por 6 s (§6). A rota não recebe a fase de destino: ela lê a foto
    // que o próprio evento guardou, e restaura também os campos sobrescritos.
    mostrar(`${lead.nome} → ${fase(destino).nome}`, async () => {
      const volta = await fetch(`/api/v1/leads/${lead.id}/desfazer`, { method: "POST" });
      if (volta.ok) {
        const { para } = (await volta.json()) as { para: FaseId };
        atualizar(lead.id, { fase: para });
      }
      router.refresh();
    });

    // Reconcilia os campos derivados (atrasado, soma da coluna) com o servidor.
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

  function aoSoltar(evento: DragEndEvent) {
    setArrastando(null);
    const destino = String(evento.over?.id ?? "");
    const lead = leads.find((l) => l.id === String(evento.active.id));
    if (!lead || !ehFaseValida(destino)) return;
    pedirFase(lead, destino);
  }

  return (
    <>
      <Filtros
        filtros={filtros}
        referencias={referencias}
        total={visiveis.length}
        onMuda={setFiltros}
      />

      <DndContext
        sensors={sensores}
        onDragStart={(e: DragStartEvent) =>
          setArrastando(leads.find((l) => l.id === String(e.active.id)) ?? null)
        }
        onDragCancel={() => setArrastando(null)}
        onDragEnd={aoSoltar}
      >
        <div className="min-h-0 flex-1 overflow-x-auto px-6 py-5">
          <div className="flex h-full gap-3">
            {FASES.map((f) => (
              <Coluna
                key={f.id}
                fase={f.id}
                leads={ordenarCartoes(visiveis.filter((l) => l.fase === f.id))}
                onAbrir={setAbertoId}
                onNovo={setNovoEm}
              />
            ))}
          </div>
        </div>

        {/* O cartão que segue o cursor. Sem ele, arrastar parece travado. */}
        <DragOverlay dropAnimation={null}>
          {arrastando ? <Cartao lead={arrastando} sobrevoando /> : null}
        </DragOverlay>
      </DndContext>

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

      {novoEm ? (
        <NovoLead
          faseInicial={novoEm}
          referencias={referencias}
          onFechar={() => setNovoEm(null)}
          onCriado={() => {
            setNovoEm(null);
            mostrar("Lead cadastrado.");
            // Recarrega do servidor: o lead novo precisa vir com os derivados
            // (atrasado, dias de vida) calculados pela view, nao chutados aqui.
            router.refresh();
          }}
        />
      ) : null}

      <Aviso estado={aviso} onFechar={fechar} />
    </>
  );
}

/* ----------------------------------------------------------------- coluna */

function Coluna({
  fase: id,
  leads,
  onAbrir,
  onNovo,
}: {
  fase: FaseId;
  leads: Lead[];
  onAbrir: (id: string) => void;
  onNovo: (fase: FaseId) => void;
}) {
  const f = fase(id);
  const { setNodeRef, isOver } = useDroppable({ id });

  const atrasados = leads.filter((l) => l.atrasado).length;
  const soma = leads.reduce((t, l) => t + (l.valorEstimado ?? 0), 0);

  return (
    <section
      ref={setNodeRef}
      aria-label={f.nome}
      className={
        "flex w-[272px] shrink-0 flex-col rounded-[8px] border bg-surface-2 transition-colors " +
        (isOver ? "border-focus bg-accent-soft/40" : "border-line")
      }
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <i
          aria-hidden="true"
          className="size-[9px] shrink-0 rounded-full"
          style={{ backgroundColor: f.cor }}
        />
        <h2 className="min-w-0 flex-1 truncate text-[13px] font-[700]">{f.nome}</h2>
        <span className="tabular text-[12px] text-muted">{leads.length}</span>
        {atrasados > 0 ? (
          <span
            title={`${atrasados} atrasado(s)`}
            className="tabular rounded-[4px] bg-bad-soft px-1.5 text-[11px] font-[600] text-bad"
          >
            {atrasados}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => onNovo(id)}
          aria-label={`Novo lead em ${f.nome}`}
          title={`Novo lead em ${f.nome}`}
          className="grid size-5 place-items-center rounded-[4px] text-[15px] leading-none text-muted hover:bg-surface-3 hover:text-heading"
        >
          +
        </button>
      </header>

      <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2">
        {leads.length === 0 ? (
          <p className="px-1 py-3 text-[12.5px] leading-relaxed text-faint">{f.vazio}</p>
        ) : (
          leads.map((lead) => <Cartao key={lead.id} lead={lead} onAbrir={onAbrir} />)
        )}
      </div>

      {id === "negociacao" && soma > 0 ? (
        <footer className="tabular border-t border-line px-3 py-2 text-[12px] font-[600] text-muted">
          {moeda(soma)}
        </footer>
      ) : null}
    </section>
  );
}

/* ----------------------------------------------------------------- cartão */

function Cartao({
  lead,
  onAbrir,
  sobrevoando = false,
}: {
  lead: Lead;
  onAbrir?: (id: string) => void;
  sobrevoando?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: sobrevoando,
  });

  return (
    <article
      ref={sobrevoando ? undefined : setNodeRef}
      {...(sobrevoando ? {} : attributes)}
      {...(sobrevoando ? {} : listeners)}
      onClick={() => onAbrir?.(lead.id)}
      onKeyDown={(e) => {
        // Enter abre a ficha; a barra de espaço fica para o dnd-kit iniciar o
        // arrasto por teclado.
        if (e.key === "Enter") {
          e.preventDefault();
          onAbrir?.(lead.id);
        }
      }}
      className={
        "cursor-pointer rounded-[6px] border border-line bg-surface p-3 text-left shadow-(--shadow-mx-1) " +
        (lead.semResponsavel ? "border-l-[3px] border-l-[var(--st-potenciais)] " : "") +
        (isDragging ? "opacity-40 " : "") +
        (sobrevoando ? "rotate-1 shadow-(--shadow-mx-3)" : "")
      }
    >
      <div className="mb-2 flex items-center gap-2">
        {lead.produto ? <ChipProduto>{lead.produto}</ChipProduto> : null}
        <ChipOrigem>{lead.origem.rotulo}</ChipOrigem>
      </div>

      <p className="text-[14px] font-[700] leading-snug text-heading">{lead.nomeCompleto}</p>
      <p className="tabular mt-0.5 text-[12.5px] text-muted">{telefone(lead.telefone)}</p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {lead.proximaAcao ? (
          <BadgeProximaAcao
            texto={lead.proximaAcao}
            data={dataCurta(lead.proximaAcaoEm)}
            estado={
              lead.terminal
                ? "fechado"
                : lead.atrasado
                  ? "atrasado"
                  : lead.paraHoje
                    ? "hoje"
                    : "normal"
            }
          />
        ) : (
          <span className="text-[11.5px] text-faint">Sem próxima ação</span>
        )}
        <Avatar
          iniciais={lead.responsavel?.iniciais ?? "?"}
          nome={lead.responsavel?.nome}
          semDono={lead.semResponsavel}
        />
      </div>

      {lead.valorEstimado ? (
        <p className="tabular mt-2 text-[12.5px] font-[600] text-heading">
          {moeda(lead.valorEstimado)}
        </p>
      ) : null}
    </article>
  );
}
