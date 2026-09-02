"use client";

import { useEffect, useId, useState } from "react";
import { Botao } from "@/componentes/ui/botao";
import { Modal } from "@/componentes/ui/modal";
import { fase, type FaseId } from "@/lib/dominio/fases";
import { validarEntrada, type DadosDaMudanca } from "@/lib/dominio/regras";
import type { Lead } from "@/lib/dominio/tipos";
import { moeda } from "@/lib/formato";

/**
 * Modal que abre ANTES de confirmar a mudança de fase (§6, F2-7).
 *
 * Ele coleta exatamente o que a fase de destino exige — e usa a MESMA função
 * de validação que a API. Não é uma segunda regra: é a mesma, rodando cedo,
 * para a pessoa não tomar um erro depois de arrastar o cartão.
 */

type Props = {
  lead: Lead;
  destino: FaseId;
  motivosPerda: { id: number; label: string }[];
  salvando: boolean;
  onCancelar: () => void;
  onConfirmar: (dados: DadosDaMudanca) => void;
};

const hoje = () => new Date().toISOString().slice(0, 10);

export function ModalMudancaFase({
  lead,
  destino,
  motivosPerda,
  salvando,
  onCancelar,
  onConfirmar,
}: Props) {
  const f = fase(destino);

  const [dados, setDados] = useState<DadosDaMudanca>(() => ({
    proximaAcao: "",
    proximaAcaoEm: lead.proximaAcaoEm ?? "",
    valorEstimado: lead.valorEstimado ?? null,
    premioAnual: lead.valorEstimado ?? null,
    seguradora: "",
    motivoPerdaId: motivosPerda[0]?.id ?? null,
    retomarEm: "",
  }));
  const [erro, setErro] = useState<{ campo: string; mensagem: string } | null>(null);

  // Trocar de destino sem fechar o modal (seletor de fase da ficha) precisa
  // limpar o erro do destino anterior, senão ele fica pendurado.
  useEffect(() => setErro(null), [destino]);

  function muda<K extends keyof DadosDaMudanca>(campo: K, valor: DadosDaMudanca[K]) {
    setDados((d) => ({ ...d, [campo]: valor }));
    if (erro?.campo === campo) setErro(null);
  }

  function confirmar() {
    const veredito = validarEntrada(destino, dados);
    if (!veredito.ok) {
      setErro({ campo: veredito.campo, mensagem: veredito.mensagem });
      return;
    }
    onConfirmar(dados);
  }

  const erroDe = (campo: string) => (erro?.campo === campo ? erro.mensagem : null);

  return (
    <Modal
      aberto
      titulo={`Mover para ${f.nome}`}
      descricao={descricaoDe(destino, lead)}
      onFechar={onCancelar}
      acoes={
        <>
          <Botao variante="secundario" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao onClick={confirmar} disabled={salvando}>
            {salvando ? "Salvando…" : `Mover para ${f.nome}`}
          </Botao>
        </>
      }
    >
      {(destino === "reuniao" || destino === "acompanhamento") && (
        <>
          <CampoTexto
            rotulo="O que vem a seguir"
            valor={dados.proximaAcao ?? ""}
            onMuda={(v) => muda("proximaAcao", v)}
            dica="Deixe em branco para usar o padrão da fase."
            placeholder={destino === "reuniao" ? "Reunião marcada" : "Acompanhar"}
          />
          <CampoData
            rotulo="Quando"
            valor={dados.proximaAcaoEm ?? ""}
            minimo={hoje()}
            onMuda={(v) => muda("proximaAcaoEm", v)}
            erro={erroDe("proximaAcaoEm")}
          />
        </>
      )}

      {destino === "negociacao" && (
        <>
          <CampoValor
            rotulo="Valor estimado (R$/ano)"
            valor={dados.valorEstimado}
            onMuda={(v) => muda("valorEstimado", v)}
            erro={erroDe("valorEstimado")}
            dica="Entra na soma do rodapé da coluna."
          />
          <CampoData
            rotulo="Próxima ação (opcional)"
            valor={dados.proximaAcaoEm ?? ""}
            minimo={hoje()}
            onMuda={(v) => muda("proximaAcaoEm", v)}
          />
        </>
      )}

      {destino === "ganhou" && (
        <>
          <CampoValor
            rotulo="Prêmio anual fechado (R$)"
            valor={dados.premioAnual}
            onMuda={(v) => muda("premioAnual", v)}
            erro={erroDe("premioAnual")}
            dica={
              lead.valorEstimado
                ? `Estimado na negociação: ${moeda(lead.valorEstimado)}. A estimativa é preservada.`
                : undefined
            }
          />
          <CampoTexto
            rotulo="Seguradora (opcional)"
            valor={dados.seguradora ?? ""}
            onMuda={(v) => muda("seguradora", v)}
            placeholder="Porto Seguro"
          />
        </>
      )}

      {destino === "perdido" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="motivo" className="text-[13px] font-[600] text-heading">
            Motivo da perda
          </label>
          <select
            id="motivo"
            value={dados.motivoPerdaId ?? ""}
            onChange={(e) => muda("motivoPerdaId", Number(e.target.value) || null)}
            className={
              "h-[42px] rounded-[6px] border bg-surface px-3 text-[15px] text-texto " +
              (erroDe("motivoPerdaId") ? "border-bad" : "border-line-strong")
            }
          >
            <option value="">Escolha…</option>
            {motivosPerda.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          {erroDe("motivoPerdaId") ? (
            <p role="alert" className="text-[12.5px] text-bad">
              {erroDe("motivoPerdaId")}
            </p>
          ) : (
            <p className="text-[12.5px] text-muted">
              É o que responde “onde estamos perdendo negócios?” no fim do mês.
            </p>
          )}
        </div>
      )}

      {destino === "posterior" && (
        <CampoData
          rotulo="Retomar em"
          valor={dados.retomarEm ?? ""}
          minimo={hoje()}
          onMuda={(v) => muda("retomarEm", v)}
          erro={erroDe("retomarEm")}
          dica="Na data, o lead volta sozinho para Clientes potenciais."
        />
      )}
    </Modal>
  );
}

function descricaoDe(destino: FaseId, lead: Lead): string {
  switch (destino) {
    case "ganhou":
      return `${lead.nomeCompleto} fechou. Registre o prêmio para a taxa de ganho ficar correta.`;
    case "perdido":
      return `${lead.nomeCompleto} não fechou. O motivo é obrigatório.`;
    case "posterior":
      return `${lead.nomeCompleto} pediu para falar depois. Escolha quando retomar.`;
    default:
      return `Todo lead ativo precisa de uma próxima ação com data — sem ela, some do radar.`;
  }
}

/* ---------------------------------------------------------------- campos */

function CampoTexto({
  rotulo,
  valor,
  onMuda,
  placeholder,
  dica,
}: {
  rotulo: string;
  valor: string;
  onMuda: (v: string) => void;
  placeholder?: string;
  dica?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-[600] text-heading">{rotulo}</label>
      <input
        id={id}
        type="text"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onMuda(e.target.value)}
        className="h-[42px] rounded-[6px] border border-line-strong bg-surface px-3 text-[15px] text-texto placeholder:text-faint"
      />
      {dica ? <p className="text-[12.5px] text-muted">{dica}</p> : null}
    </div>
  );
}

function CampoData({
  rotulo,
  valor,
  onMuda,
  erro,
  dica,
  minimo,
}: {
  rotulo: string;
  valor: string;
  onMuda: (v: string) => void;
  erro?: string | null;
  dica?: string;
  minimo?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-[600] text-heading">{rotulo}</label>
      <input
        id={id}
        type="date"
        value={valor}
        min={minimo}
        onChange={(e) => onMuda(e.target.value)}
        aria-invalid={erro ? true : undefined}
        className={
          "tabular h-[42px] rounded-[6px] border bg-surface px-3 text-[15px] text-texto " +
          (erro ? "border-bad" : "border-line-strong")
        }
      />
      {erro ? (
        <p role="alert" className="text-[12.5px] text-bad">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-[12.5px] text-muted">{dica}</p>
      ) : null}
    </div>
  );
}

function CampoValor({
  rotulo,
  valor,
  onMuda,
  erro,
  dica,
}: {
  rotulo: string;
  valor: number | null | undefined;
  onMuda: (v: number | null) => void;
  erro?: string | null;
  dica?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-[600] text-heading">{rotulo}</label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={100}
        value={valor ?? ""}
        onChange={(e) => onMuda(e.target.value === "" ? null : Number(e.target.value))}
        aria-invalid={erro ? true : undefined}
        className={
          "tabular h-[42px] rounded-[6px] border bg-surface px-3 text-[15px] text-texto " +
          (erro ? "border-bad" : "border-line-strong")
        }
      />
      {erro ? (
        <p role="alert" className="text-[12.5px] text-bad">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-[12.5px] text-muted">{dica}</p>
      ) : null}
    </div>
  );
}
