import Link from "next/link";
import { Avatar } from "@/componentes/ui/avatar";
import { AlternadorTema } from "./tema";

/**
 * Casca do admin: sidebar navy de 232px + área de conteúdo (§5.3).
 *
 * Extraída quando a Lista entrou, para as duas telas não divergirem. Antes
 * disso ela morava dentro da esteira.
 */

export type ItemNav = { href: string; rotulo: string };

const NAVEGACAO: ItemNav[] = [
  { href: "/esteira", rotulo: "Esteira" },
  { href: "/lista", rotulo: "Lista" },
  { href: "/configuracoes", rotulo: "Configurações" },
];

export function Moldura({
  perfil,
  atual,
  children,
}: {
  perfil: { nome: string; iniciais: string; papel: string };
  atual: string;
  children: React.ReactNode;
}) {
  const podeVer = (href: string) =>
    href !== "/configuracoes" || perfil.papel === "gestor";

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[232px] shrink-0 flex-col justify-between bg-[var(--mx-navy)] px-4 py-5 md:flex">
        <div>
          <div className="mb-8 flex items-center gap-2.5 px-1">
            <span className="grid size-8 place-items-center rounded-[6px] bg-[var(--mx-sky)] font-(family-name:--font-display) text-[13px] font-[800] text-[var(--mx-navy)]">
              MX
            </span>
            <span className="font-(family-name:--font-display) text-[10.5px] font-[700] uppercase tracking-[.13em] text-[#8FA8C4]">
              Leads
            </span>
          </div>

          <nav className="flex flex-col gap-0.5">
            {NAVEGACAO.filter((i) => podeVer(i.href)).map((item) =>
              item.href === atual ? (
                <span
                  key={item.href}
                  aria-current="page"
                  className="rounded-[6px] bg-[rgba(202,227,247,.14)] px-3 py-2 text-[13.5px] font-[600] text-white"
                >
                  {item.rotulo}
                </span>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-[6px] px-3 py-2 text-[13.5px] text-[#A8BCD4] hover:bg-[rgba(202,227,247,.08)] hover:text-white"
                >
                  {item.rotulo}
                </Link>
              ),
            )}
            <span
              aria-disabled="true"
              title="Chega na v2"
              className="px-3 py-2 text-[13.5px] text-[#5A6E88]"
            >
              Relatórios
            </span>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-[rgba(202,227,247,.18)] px-1 pt-4">
          <AlternadorTema />
          <div className="flex items-center gap-2.5">
            <Avatar iniciais={perfil.iniciais} nome={perfil.nome} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-[600] text-white">{perfil.nome}</p>
              <p className="text-[11px] capitalize text-[#8FA8C4]">{perfil.papel}</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}

/**
 * Topo com título, contagem e a alternância Board/Lista (§5.3).
 * No celular a navegação da sidebar some, então ela reaparece aqui.
 */
export function TopoAdmin({
  titulo,
  contagem,
  atual,
  acoes,
}: {
  titulo: string;
  contagem?: string;
  atual: string;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
      <h1 className="text-[20px] font-[800] sm:text-[22px]">{titulo}</h1>
      {contagem ? <span className="tabular text-[13px] text-muted">{contagem}</span> : null}

      <div className="ml-auto flex items-center gap-2">
        <div className="flex rounded-[6px] border border-line-strong p-0.5">
          {[
            { href: "/esteira", rotulo: "Board" },
            { href: "/lista", rotulo: "Lista" },
          ].map((v) => (
            <Link
              key={v.href}
              href={v.href}
              aria-current={v.href === atual ? "page" : undefined}
              className={
                "rounded-[4px] px-3 py-1 text-[13px] font-[600] " +
                (v.href === atual
                  ? "bg-brand text-on-brand"
                  : "text-muted hover:text-heading")
              }
            >
              {v.rotulo}
            </Link>
          ))}
        </div>
        {acoes}
      </div>
    </header>
  );
}
