import type { ReactNode } from "react";
import { fase, type FaseId } from "@/lib/dominio/fases";

/**
 * Chips (§4.4): produto em sage suave, fase na cor da fase a 16% com o texto
 * na cor cheia, origem em texto discreto.
 */

export function ChipProduto({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[4px] bg-sage-soft px-2 py-[3px] text-[11.5px] font-[600] text-heading">
      {children}
    </span>
  );
}

export function ChipFase({ id }: { id: FaseId }) {
  const f = fase(id);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-[3px] text-[11.5px] font-[600]"
      style={{
        // 28 em hex = 16% de opacidade: a mesma proporcao do prototipo.
        backgroundColor: `color-mix(in srgb, ${f.cor} 16%, transparent)`,
        color: f.cor,
      }}
    >
      <i
        aria-hidden="true"
        className="size-[7px] rounded-full"
        style={{ backgroundColor: f.cor }}
      />
      {f.nome}
    </span>
  );
}

export function ChipOrigem({ children }: { children: ReactNode }) {
  return <span className="text-[11.5px] text-faint">{children}</span>;
}

/**
 * Badge da proxima acao. O estado e a informacao principal do cartao (§3,
 * principio 4): atraso em vermelho sobe para a metrica e para a ficha.
 */
export function BadgeProximaAcao({
  texto,
  data,
  estado,
}: {
  texto: string;
  data: string;
  estado: "normal" | "hoje" | "atrasado" | "fechado";
}) {
  const cores = {
    normal: "bg-surface-2 text-muted",
    hoje: "bg-warn-soft text-warn",
    atrasado: "bg-bad-soft text-bad",
    fechado: "bg-ok-soft text-ok",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-[3px] text-[11.5px] font-[600] ${cores[estado]}`}
    >
      <span>{texto}</span>
      {data ? <span className="tabular opacity-80">{data}</span> : null}
    </span>
  );
}
