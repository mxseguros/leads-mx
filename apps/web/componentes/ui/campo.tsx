"use client";

import type { InputHTMLAttributes } from "react";
import { useId } from "react";

/**
 * Campo de formulario (§4.4 e §5.7). Altura 42px, anel de foco de 3px.
 *
 * Regra do §5.7: o erro nunca aparece no primeiro caractere. Quem controla
 * quando mostrar e o formulario (no blur ou no envio); este componente so
 * exibe o que recebe. A mensagem fica ligada ao campo por aria-describedby,
 * para leitor de tela ouvir o motivo junto do campo.
 */

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  rotulo: string;
  erro?: string | null;
  dica?: string;
  /** Marca o campo como correto depois de validado (§5.7). */
  valido?: boolean;
};

export function Campo({
  rotulo,
  erro = null,
  dica,
  valido = false,
  className = "",
  required,
  ...resto
}: Props) {
  const id = useId();
  const idErro = `${id}-erro`;
  const idDica = `${id}-dica`;

  const borda = erro
    ? "border-bad"
    : valido
      ? "border-ok"
      : "border-line-strong";

  const descritoPor = [erro ? idErro : null, dica ? idDica : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-[600] font-(family-name:--font-display) text-heading"
      >
        {rotulo}
        {required ? <span className="text-bad"> *</span> : null}
      </label>

      <input
        id={id}
        required={required}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritoPor || undefined}
        className={
          `h-[42px] w-full rounded-[6px] border bg-surface px-3 text-[15px] ` +
          `text-texto placeholder:text-faint ${borda} ${className}`
        }
        {...resto}
      />

      {dica && !erro ? (
        <p id={idDica} className="text-[12.5px] text-muted">
          {dica}
        </p>
      ) : null}

      {erro ? (
        <p id={idErro} role="alert" className="text-[12.5px] text-bad">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
