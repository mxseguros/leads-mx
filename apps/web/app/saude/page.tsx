import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { clienteServidor, perfilAtual } from "@/lib/supabase/servidor";
import { Moldura } from "../_admin/moldura";

export const metadata: Metadata = { title: "Saúde da captura" };

/**
 * Painel de saúde do formulário (F4-3).
 *
 * É o primeiro lugar a olhar quando alguém diz "pararam de chegar leads". A
 * pergunta que ele responde não é "quantos leads entraram" — isso as métricas
 * já dizem — e sim "de tudo que bateu na porta, o que foi recusado e por quê".
 *
 * Zero tentativas num dia útil é o sinal mais importante da tela: significa que
 * ninguém chegou na landing, e aí o problema está antes do formulário.
 */

type Dia = {
  dia: string;
  tentativas: number;
  criados: number;
  duplicados: number;
  invalidos: number;
  honeypot: number;
  turnstile: number;
  limite: number;
  erros: number;
};

const CABECALHOS = [
  "Dia",
  "Tentativas",
  "Leads",
  "Duplicados",
  "Inválidos",
  "Honeypot",
  "Turnstile",
  "Limite",
  "Erros",
];

export default async function PaginaSaude() {
  const perfil = await perfilAtual();
  if (!perfil) redirect("/entrar");
  if (perfil.papel !== "gestor") redirect("/esteira");

  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("v_saude_captura").select("*").limit(30);
  const dias = (data ?? []) as unknown as Dia[];

  const total = dias.reduce(
    (t, d) => ({
      tentativas: t.tentativas + d.tentativas,
      criados: t.criados + d.criados,
      recusados: t.recusados + d.honeypot + d.turnstile + d.limite,
      invalidos: t.invalidos + d.invalidos,
      erros: t.erros + d.erros,
    }),
    { tentativas: 0, criados: 0, recusados: 0, invalidos: 0, erros: 0 },
  );

  return (
    <Moldura perfil={perfil} atual="/saude">
      <header className="border-b border-line px-4 py-3 sm:px-6">
        <h1 className="text-[20px] font-[800] sm:text-[22px]">Saúde da captura</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          Últimos 30 dias. Só o desfecho de cada envio — nenhum dado pessoal fica aqui.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        {error ? (
          <div
            role="alert"
            className="rounded-[8px] border border-warn bg-warn-soft p-4 text-[13.5px] text-texto"
          >
            A tabela de diagnóstico ainda não existe neste banco. Aplique a migration{" "}
            <span className="mono">20260902140000_retencao_e_saude.sql</span>.
          </div>
        ) : dias.length === 0 ? (
          <div className="rounded-[8px] border border-line bg-surface p-6 text-[13.5px] text-muted">
            <p className="font-[600] text-heading">Nenhuma tentativa registrada ainda.</p>
            <p className="mt-1 max-w-[62ch]">
              Ou a landing não recebeu visita desde que o diagnóstico entrou no ar, ou o
              formulário parou de chegar até aqui. Um envio de teste pela landing resolve a
              dúvida em trinta segundos.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[8px] border border-line bg-line sm:grid-cols-5">
              <Bloco rotulo="Tentativas" valor={total.tentativas} />
              <Bloco rotulo="Viraram lead" valor={total.criados} tom="ok" />
              <Bloco
                rotulo="Recusados"
                valor={total.recusados}
                dica="honeypot, Turnstile e limite"
              />
              <Bloco
                rotulo="Dados inválidos"
                valor={total.invalidos}
                dica="a pessoa errou o preenchimento"
              />
              <Bloco rotulo="Erros" valor={total.erros} tom={total.erros > 0 ? "bad" : "neutro"} />
            </div>

            <div className="overflow-x-auto rounded-[8px] border border-line">
              <table className="w-full min-w-[720px] border-collapse bg-surface">
                <thead className="bg-surface-2">
                  <tr>
                    {CABECALHOS.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-b border-line px-3 py-2 text-left font-(family-name:--font-display) text-[10.5px] font-[700] uppercase tracking-[.1em] text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dias.map((d) => (
                    <tr key={d.dia} className="border-b border-line last:border-0">
                      <td className="tabular px-3 py-2 text-[13px] font-[600] text-heading">
                        {d.dia.split("-").reverse().slice(0, 2).join("/")}
                      </td>
                      <td className="tabular px-3 py-2 text-[13px]">{d.tentativas}</td>
                      <td className="tabular px-3 py-2 text-[13px] text-ok">{d.criados}</td>
                      <td className="tabular px-3 py-2 text-[13px] text-muted">{d.duplicados}</td>
                      <td className="tabular px-3 py-2 text-[13px] text-muted">{d.invalidos}</td>
                      <td className="tabular px-3 py-2 text-[13px] text-muted">{d.honeypot}</td>
                      <td className="tabular px-3 py-2 text-[13px] text-muted">{d.turnstile}</td>
                      <td className="tabular px-3 py-2 text-[13px] text-muted">{d.limite}</td>
                      <td
                        className={
                          "tabular px-3 py-2 text-[13px] " +
                          (d.erros > 0 ? "text-bad" : "text-muted")
                        }
                      >
                        {d.erros}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 max-w-[76ch] text-[12.5px] text-muted">
              <strong>Como ler:</strong> honeypot e Turnstile altos são robôs sendo barrados, e
              isso é o sistema funcionando. Inválidos altos apontam para um campo confuso no
              formulário — a coluna do erro diz qual. Erros acima de zero merecem investigação:
              é a MX perdendo lead por falha nossa.
            </p>
          </>
        )}
      </div>
    </Moldura>
  );
}

function Bloco({
  rotulo,
  valor,
  dica,
  tom = "neutro",
}: {
  rotulo: string;
  valor: number;
  dica?: string;
  tom?: "neutro" | "ok" | "bad";
}) {
  return (
    <div className="bg-surface px-4 py-3">
      <p className="rotulo">{rotulo}</p>
      <p
        className={
          "tabular mt-1 font-(family-name:--font-display) text-[22px] font-[800] leading-none " +
          (tom === "ok" ? "text-ok" : tom === "bad" ? "text-bad" : "text-heading")
        }
      >
        {valor}
      </p>
      {dica ? <p className="mt-1 text-[11.5px] text-muted">{dica}</p> : null}
    </div>
  );
}
