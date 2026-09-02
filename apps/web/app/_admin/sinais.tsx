import Link from "next/link";
import type { SinaisSla } from "@/lib/leads/consulta";

/**
 * Sinais de SLA no topo do admin (F3-5).
 *
 * Substitui os alertas por e-mail, que saíram do escopo. Cada sinal é um LINK
 * que já leva ao recorte correspondente — um aviso que só informa vira ruído
 * em uma semana; um que leva direto ao trabalho, não.
 *
 * Some inteiro quando não há nada: faixa permanente dizendo "tudo em ordem"
 * treina a equipe a ignorar a região onde os problemas aparecem.
 */
export function SinaisSlaFaixa({ s }: { s: SinaisSla | null }) {
  if (!s) return null;

  const avisos: { texto: string; href: string; tom: "bad" | "warn" }[] = [];

  if (s.semDonoForaDoPrazo > 0) {
    avisos.push({
      texto:
        s.semDonoForaDoPrazo === 1
          ? "1 lead sem responsável há mais de 2h"
          : `${s.semDonoForaDoPrazo} leads sem responsável há mais de 2h`,
      href: "/esteira?resp=sem-dono",
      tom: "bad",
    });
  }

  if (s.followUpsAtrasados > 0) {
    avisos.push({
      texto:
        s.maiorAtrasoEmDias > 1
          ? `${s.followUpsAtrasados} follow-ups atrasados — o mais antigo há ${s.maiorAtrasoEmDias} dias`
          : `${s.followUpsAtrasados} follow-up${s.followUpsAtrasados > 1 ? "s" : ""} atrasado${s.followUpsAtrasados > 1 ? "s" : ""}`,
      href: "/lista",
      tom: "warn",
    });
  }

  if (s.retomadasPendentes > 0) {
    avisos.push({
      texto: `${s.retomadasPendentes} retomada(s) vencida(s) em Contato posterior`,
      href: "/esteira",
      tom: "warn",
    });
  }

  if (avisos.length === 0) return null;

  return (
    <div role="status" className="flex flex-wrap gap-x-5 gap-y-1 border-b border-line bg-surface-2 px-4 py-2 sm:px-6">
      {avisos.map((a) => (
        <Link
          key={a.texto}
          href={a.href}
          className={
            "flex items-center gap-1.5 text-[12.5px] font-[600] underline-offset-2 hover:underline " +
            (a.tom === "bad" ? "text-bad" : "text-warn")
          }
        >
          <i aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-current" />
          {a.texto}
        </Link>
      ))}
    </div>
  );
}
