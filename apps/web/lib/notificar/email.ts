import "server-only";

/**
 * Aviso de novo lead para o gestor (item F1-11).
 *
 * A chave do Resend é a dependência E6 e ainda não existe. Sem ela a função
 * registra no log em vez de falhar: o e-mail é importante, mas não é motivo
 * para recusar um lead que já foi validado e gravado.
 *
 * Ao contrário do Turnstile, aqui NÃO falhamos fechado — perder o aviso custa
 * um atraso no primeiro contato; recusar a captura custa o cliente.
 */

type NovoLead = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  produto: string | null;
  origem: string;
};

function telefoneLegivel(t: string): string {
  const d = t.replace(/\D/g, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : t;
}

export async function avisarNovoLead(lead: NovoLead): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_REMETENTE;
  const destino = process.env.AVISO_NOVO_LEAD_PARA;
  const base = process.env.NEXT_PUBLIC_URL_BASE ?? "http://localhost:3000";

  if (!chave || !remetente || !destino) {
    console.info(
      `[novo lead] ${lead.nome} · ${telefoneLegivel(lead.telefone)} · ` +
        `${lead.produto ?? "sem produto"} · via ${lead.origem} · ${base}/esteira`,
    );
    return;
  }

  const linha = (r: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6F7580">${r}</td>` +
    `<td style="padding:4px 0;color:#071B34"><strong>${v}</strong></td></tr>`;

  try {
    const resposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: remetente,
        to: destino.split(",").map((e) => e.trim()),
        subject: `Novo lead: ${lead.nome}${lead.produto ? ` · ${lead.produto}` : ""}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px">
            <p style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6F7580">
              MX Leads · novo pedido de cotação
            </p>
            <h1 style="font-size:22px;color:#071B34;margin:8px 0 16px">${lead.nome}</h1>
            <table style="font-size:14px;border-collapse:collapse">
              ${linha("WhatsApp", telefoneLegivel(lead.telefone))}
              ${linha("E-mail", lead.email)}
              ${linha("Produto", lead.produto ?? "não informado")}
              ${linha("Origem", lead.origem)}
            </table>
            <p style="margin-top:24px">
              <a href="${base}/esteira"
                 style="background:#071B34;color:#fff;padding:10px 18px;border-radius:6px;
                        text-decoration:none;font-weight:600;font-size:14px">
                Abrir na esteira
              </a>
            </p>
            <p style="font-size:12px;color:#9AA0AA;margin-top:20px">
              Primeiro contato previsto para o próximo dia útil.
            </p>
          </div>`,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!resposta.ok) {
      console.error(`[novo lead] Resend recusou: HTTP ${resposta.status}`);
    }
  } catch (erro) {
    console.error("[novo lead] falha ao enviar aviso:", erro);
  }
}
