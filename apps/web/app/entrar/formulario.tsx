"use client";

import { useActionState } from "react";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { enviarMagicLink, type ResultadoEntrada } from "./acoes";

export function FormularioEntrada({ destino }: { destino: string }) {
  const [resultado, acao, enviando] = useActionState<ResultadoEntrada | null, FormData>(
    enviarMagicLink,
    null,
  );

  if (resultado?.ok) {
    return (
      <div className="rounded-[8px] border border-ok bg-ok-soft p-4">
        <p className="font-(family-name:--font-display) text-[15px] font-[700] text-heading">
          Link enviado
        </p>
        <p className="mt-1 text-[13.5px] text-texto">
          Abra o e-mail que acabou de chegar em{" "}
          <strong>{resultado.email}</strong> e clique em entrar. O link vale por
          uma hora.
        </p>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="destino" value={destino} />

      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="nome@mxseguros.com.br"
        required
        erro={resultado && !resultado.ok ? resultado.erro : null}
        dica="Enviamos um link de acesso. Não existe senha."
      />

      <Botao type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Receber link de acesso"}
      </Botao>
    </form>
  );
}
