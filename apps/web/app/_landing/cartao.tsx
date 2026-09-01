"use client";

import { useState } from "react";
import { FormularioCaptura } from "./formulario";

/**
 * Cartão branco flutuando sobre o hero (§5.1).
 *
 * Guarda o estado de sucesso, que SUBSTITUI o formulário — não aparece embaixo
 * dele. Quem acabou de enviar não deve ver de novo os campos que preencheu.
 */

type Props = {
  origem: string;
  produtoPadrao: string | null;
  textoConsentimento: string;
  urlPolitica: string;
  turnstileSiteKey: string | null;
  /** `null` esconde o botão do WhatsApp em vez de oferecer link quebrado. */
  linkWhatsapp: string | null;
};

export function CartaoCaptura(props: Props) {
  const [enviado, setEnviado] = useState<{ nome: string } | null>(null);

  return (
    <div className="rounded-[10px] border border-line bg-surface p-6 shadow-(--shadow-mx-2) sm:p-7">
      {enviado ? (
        <div className="flex flex-col gap-4 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid size-12 place-items-center rounded-full bg-ok-soft text-[22px] text-ok"
          >
            ✓
          </div>

          <div>
            <h2 className="text-[22px] font-[800] text-heading">
              Recebemos, {enviado.nome}!
            </h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              Um consultor da MX entra em contato pelo WhatsApp em até 1 dia útil.
              Se preferir adiantar, chame agora.
            </p>
          </div>

          {props.linkWhatsapp ? (
            <a
              href={props.linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[46px] items-center justify-center gap-2 rounded-[6px] bg-[#1F7A55] px-6 text-[15px] font-[700] text-white font-(family-name:--font-display) hover:brightness-110"
            >
              Chamar no WhatsApp
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => setEnviado(null)}
            className="text-[13px] font-[600] text-muted underline underline-offset-4 hover:text-heading"
          >
            Enviar outro pedido
          </button>
        </div>
      ) : (
        <>
          <div className="mb-5">
            <h2 className="text-[19px] font-[800] text-heading">Peça sua cotação</h2>
            <p className="mt-1 text-[13.5px] text-muted">
              Quatro campos. Sem CNPJ, sem formulário longo.
            </p>
          </div>

          <FormularioCaptura
            origem={props.origem}
            produtoPadrao={props.produtoPadrao}
            textoConsentimento={props.textoConsentimento}
            urlPolitica={props.urlPolitica}
            turnstileSiteKey={props.turnstileSiteKey}
            onSucesso={(nome) => setEnviado({ nome })}
          />
        </>
      )}
    </div>
  );
}
