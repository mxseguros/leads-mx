import type { Metadata } from "next";
import { LockupMX } from "@/componentes/marca";
import { FormularioEntrada } from "./formulario";

export const metadata: Metadata = { title: "Entrar" };

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ destino?: string; erro?: string }>;
}) {
  const { destino, erro } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-[380px]">
        {/* Fundo muda com o tema: modo adaptavel, o logo segue a cor do texto. */}
        <div className="mb-8 text-heading">
          <LockupMX altura={26} titulo="MX Corretora de seguros" />
        </div>

        <h1 className="text-[26px] font-[800] leading-tight">
          Entrar no MX Leads
        </h1>
        <p className="mt-2 mb-6 text-[14px] text-muted">
          Acesso restrito à equipe da MX.
        </p>

        {erro === "sessao" ? (
          <div
            role="alert"
            className="mb-5 rounded-[8px] border border-warn bg-warn-soft p-3 text-[13px] text-texto"
          >
            Sua sessão expirou. Entre de novo para continuar.
          </div>
        ) : null}

        <FormularioEntrada destino={destino ?? "/esteira"} />

        <p className="mt-8 text-[12.5px] text-faint">
          Não recebeu o convite? Peça ao gestor comercial para cadastrar seu
          e-mail.
        </p>
      </div>
    </main>
  );
}
