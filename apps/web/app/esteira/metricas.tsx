import type { Metricas } from "@/lib/dominio/tipos";
import { moeda, porcentagem } from "@/lib/formato";

/**
 * Faixa de métricas acima do board (§5.3, F3-1).
 *
 * Fina de propósito: o §3 diz que a esteira é a home, não um dashboard. Ela
 * responde as três perguntas do produto de relance — quem entrou e não foi
 * atendido, o que precisa ser feito hoje, onde estamos perdendo — sem tirar
 * espaço das colunas.
 *
 * Cada número tem um segundo valor abaixo, e é ele que costuma disparar a
 * ação: "12 novos" é informação, "2 sem responsável" é tarefa.
 */

export function FaixaMetricas({ m }: { m: Metricas | null }) {
  if (!m) {
    // Zeros mentiriam: o gestor leria "nenhum atrasado" quando na verdade a
    // consulta caiu.
    return (
      <div
        role="status"
        className="border-b border-line bg-warn-soft px-6 py-2.5 text-[13px] text-warn"
      >
        Não foi possível calcular as métricas agora. Os cartões abaixo continuam corretos.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-4">
      <Metrica
        rotulo="Novos · 7 dias"
        valor={String(m.novos7d)}
        detalhe={
          m.semResponsavel > 0
            ? { texto: `${m.semResponsavel} sem responsável`, tom: "atencao" }
            : { texto: "todos atribuídos", tom: "calmo" }
        }
      />

      <Metrica
        rotulo="Em andamento"
        valor={String(m.emAndamento)}
        detalhe={{
          texto: m.valorEmNegociacao > 0 ? `${moeda(m.valorEmNegociacao)} em negociação` : "sem valor em negociação",
          tom: "calmo",
        }}
      />

      <Metrica
        rotulo="Taxa de ganho · 30 dias"
        valor={porcentagem(m.taxaGanho30d)}
        detalhe={{
          texto:
            m.taxaGanho30d === null
              ? "nenhum fechamento ainda"
              : `${m.ganhos30d} ganhos · ${m.perdas30d} perdidos`,
          tom: "calmo",
        }}
      />

      <Metrica
        rotulo="Follow-ups"
        valor={String(m.atrasados)}
        tom={m.atrasados > 0 ? "ruim" : "neutro"}
        detalhe={
          m.paraHoje > 0
            ? { texto: `${m.paraHoje} para hoje`, tom: "hoje" }
            : { texto: "nada para hoje", tom: "calmo" }
        }
        sufixo={m.atrasados > 0 ? "atrasados" : "em dia"}
      />
    </div>
  );
}

function Metrica({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  sufixo,
}: {
  rotulo: string;
  valor: string;
  detalhe: { texto: string; tom: "calmo" | "atencao" | "hoje" };
  tom?: "neutro" | "ruim";
  sufixo?: string;
}) {
  const corDetalhe =
    detalhe.tom === "atencao" ? "text-bad" : detalhe.tom === "hoje" ? "text-warn" : "text-muted";

  return (
    <div className="bg-surface px-4 py-3 sm:px-6">
      <p className="rotulo">{rotulo}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={
            "tabular font-(family-name:--font-display) text-[24px] font-[800] leading-none " +
            (tom === "ruim" ? "text-bad" : "text-heading")
          }
        >
          {valor}
        </span>
        {sufixo ? <span className="text-[12px] text-muted">{sufixo}</span> : null}
      </p>
      <p className={`mt-1 text-[12.5px] ${corDetalhe}`}>{detalhe.texto}</p>
    </div>
  );
}
