"use client";

import { useEffect, useRef, useState } from "react";
import { validarCaptura, type ErrosPorCampo } from "@/lib/captura/esquema";
import { sugerirDominio } from "@/lib/captura/dominios";
import { mascararEmail, mascararNome, mascararTelefone } from "@/lib/captura/mascara";
import { capitalizarNome } from "@/lib/formato";
import { PRODUTOS } from "./conteudo";

/**
 * Formulário público de quatro campos (§5.1 e §5.7).
 *
 * Regra que manda no comportamento: a mensagem de erro só aparece depois que a
 * pessoa abandona o campo (blur) ou tenta enviar — nunca no primeiro caractere.
 * Depois que um campo já errou uma vez, ele passa a validar enquanto digita,
 * para o erro sumir na hora em que for corrigido.
 *
 * Este componente valida com o MESMO schema do servidor. Ele é conveniência;
 * a autoridade é a rota (§5.7).
 */

type Campo = "nome" | "sobrenome" | "telefone" | "email" | "consentimento";

type Props = {
  origem: string;
  produtoPadrao: string | null;
  textoConsentimento: string;
  urlPolitica: string;
  turnstileSiteKey: string | null;
  onSucesso: (nome: string, produto: string | null) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
    };
  }
}

export function FormularioCaptura({
  origem,
  produtoPadrao,
  textoConsentimento,
  urlPolitica,
  turnstileSiteKey,
  onSucesso,
}: Props) {
  const [valores, setValores] = useState({
    nome: "",
    sobrenome: "",
    telefone: "",
    email: "",
    produto: produtoPadrao ?? "",
    consentimento: false,
  });
  const [erros, setErros] = useState<ErrosPorCampo>({});
  const [tocados, setTocados] = useState<Set<Campo>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [falhaGeral, setFalhaGeral] = useState<string | null>(null);

  const formulario = useRef<HTMLFormElement>(null);
  const caixaTurnstile = useRef<HTMLDivElement>(null);
  const tokenTurnstile = useRef<string | null>(null);

  const sugestao = tocados.has("email") ? sugerirDominio(valores.email) : null;

  /** Valida tudo e devolve só os erros dos campos já tocados. */
  function revalidar(proximos: typeof valores, campos: Set<Campo>) {
    const r = validarCaptura({ ...proximos, produto: proximos.produto || null, origem });
    if (r.ok) {
      setErros({});
      return {};
    }
    const visiveis: ErrosPorCampo = {};
    for (const [campo, msg] of Object.entries(r.erros)) {
      if (campos.has(campo as Campo)) visiveis[campo as keyof ErrosPorCampo] = msg;
    }
    setErros(visiveis);
    return r.erros;
  }

  function mudar(campo: keyof typeof valores, bruto: string | boolean) {
    const valor =
      campo === "consentimento"
        ? bruto
        : campo === "telefone"
          ? mascararTelefone(String(bruto))
          : campo === "email"
            ? mascararEmail(String(bruto))
            : campo === "nome" || campo === "sobrenome"
              ? mascararNome(String(bruto))
              : String(bruto);

    const proximos = { ...valores, [campo]: valor };
    setValores(proximos);
    // Campo que já errou revalida a cada tecla, para o erro sumir ao corrigir.
    if (tocados.has(campo as Campo)) revalidar(proximos, tocados);
  }

  function sair(campo: Campo) {
    // Capitalização só agora: trocar a letra sob o cursor faz perder o lugar.
    const proximos =
      campo === "nome" || campo === "sobrenome"
        ? { ...valores, [campo]: capitalizarNome(valores[campo]).trim() }
        : valores;

    if (proximos !== valores) setValores(proximos);
    const marcados = new Set(tocados).add(campo);
    setTocados(marcados);
    revalidar(proximos, marcados);
  }

  useEffect(() => {
    if (!turnstileSiteKey || !caixaTurnstile.current) return;

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => {
      if (!caixaTurnstile.current) return;
      window.turnstile?.render(caixaTurnstile.current, {
        sitekey: turnstileSiteKey,
        size: "invisible",
        callback: (t: string) => (tokenTurnstile.current = t),
      });
    };
    document.head.appendChild(script);
    return () => script.remove();
  }, [turnstileSiteKey]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setFalhaGeral(null);

    const todos = new Set<Campo>(["nome", "sobrenome", "telefone", "email", "consentimento"]);
    setTocados(todos);
    const todosErros = revalidar(valores, todos);

    if (Object.keys(todosErros).length > 0) {
      // O primeiro campo inválido recebe foco (§5.7).
      const primeiro = Object.keys(todosErros)[0];
      formulario.current
        ?.querySelector<HTMLElement>(`[data-campo="${primeiro}"]`)
        ?.focus();
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch("/api/v1/leads/publico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...valores,
          produto: valores.produto || null,
          origem,
          origemDetalhe: typeof window !== "undefined" ? window.location.pathname : null,
          utm: utmDaUrl(),
          turnstile: tokenTurnstile.current,
          hp: (formulario.current?.elements.namedItem("empresa_site") as HTMLInputElement)?.value ?? "",
        }),
      });

      if (!resposta.ok) {
        const corpo = (await resposta.json().catch(() => null)) as
          | { error?: { message?: string; field?: string } }
          | null;
        const msg = corpo?.error?.message ?? "Não conseguimos enviar agora. Tente de novo.";
        const campo = corpo?.error?.field;
        if (campo) setErros({ [campo]: msg } as ErrosPorCampo);
        else setFalhaGeral(msg);
        window.turnstile?.reset();
        tokenTurnstile.current = null;
        return;
      }

      onSucesso(valores.nome, valores.produto || null);
    } catch {
      setFalhaGeral("Sem conexão. Verifique sua internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  const campo = (
    id: Campo,
    rotulo: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => {
    const temErro = Boolean(erros[id]);
    const valido = tocados.has(id) && !temErro && String(valores[id]).length > 0;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-[13px] font-[600] font-(family-name:--font-display) text-heading">
          {rotulo}
        </label>
        <input
          id={id}
          name={id}
          data-campo={id}
          value={String(valores[id])}
          onChange={(e) => mudar(id, e.target.value)}
          onBlur={() => sair(id)}
          aria-invalid={temErro || undefined}
          aria-describedby={temErro ? `${id}-erro` : undefined}
          className={
            "h-[42px] w-full rounded-[6px] border bg-surface px-3 text-[15px] text-texto " +
            "placeholder:text-faint " +
            (temErro ? "border-bad" : valido ? "border-ok" : "border-line-strong")
          }
          {...extra}
        />
        {temErro ? (
          <p id={`${id}-erro`} role="alert" className="text-[12.5px] text-bad">
            {erros[id]}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <form ref={formulario} onSubmit={enviar} noValidate className="flex flex-col gap-4">
      {/* Honeypot: fora da tela, sem tabulação, invisível para leitor de tela.
          Pessoa nenhuma preenche; robô que preenche formulário inteiro, sim. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="empresa_site">Não preencha este campo</label>
        <input id="empresa_site" name="empresa_site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {campo("nome", "Nome", { autoComplete: "given-name", placeholder: "Ana" })}
        {campo("sobrenome", "Sobrenome", { autoComplete: "family-name", placeholder: "Silva" })}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefone" className="text-[13px] font-[600] font-(family-name:--font-display) text-heading">
          WhatsApp
        </label>
        <div className="flex items-stretch">
          <span
            aria-hidden="true"
            className="tabular flex h-[42px] items-center rounded-l-[6px] border border-r-0 border-line-strong bg-surface-2 px-3 text-[15px] text-muted"
          >
            +55
          </span>
          <input
            id="telefone"
            name="telefone"
            data-campo="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 99999-0000"
            value={valores.telefone}
            onChange={(e) => mudar("telefone", e.target.value)}
            onBlur={() => sair("telefone")}
            aria-invalid={Boolean(erros.telefone) || undefined}
            aria-describedby={erros.telefone ? "telefone-erro" : undefined}
            className={
              "tabular h-[42px] w-full rounded-r-[6px] border bg-surface px-3 text-[15px] text-texto " +
              "placeholder:text-faint " +
              (erros.telefone
                ? "border-bad"
                : tocados.has("telefone") && valores.telefone
                  ? "border-ok"
                  : "border-line-strong")
            }
          />
        </div>
        {erros.telefone ? (
          <p id="telefone-erro" role="alert" className="text-[12.5px] text-bad">
            {erros.telefone}
          </p>
        ) : null}
      </div>

      {campo("email", "E-mail", {
        type: "email",
        inputMode: "email",
        autoCapitalize: "off",
        autoComplete: "email",
        spellCheck: false,
        placeholder: "ana@suaempresa.com.br",
      })}

      {/* Sugestão de domínio é aviso, nunca erro: não bloqueia o envio (§5.7). */}
      {sugestao && !erros.email ? (
        <p className="-mt-2 text-[12.5px] text-warn">
          Você quis dizer{" "}
          <button
            type="button"
            className="font-[600] underline underline-offset-2"
            onClick={() => {
              const corrigido = valores.email.replace(/@.*$/, `@${sugestao}`);
              mudar("email", corrigido);
            }}
          >
            @{sugestao}
          </button>
          ?
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="produto" className="text-[13px] font-[600] font-(family-name:--font-display) text-heading">
          Qual seguro? <span className="font-[400] text-muted">(opcional)</span>
        </label>
        <select
          id="produto"
          name="produto"
          value={valores.produto}
          onChange={(e) => mudar("produto", e.target.value)}
          className="h-[42px] w-full rounded-[6px] border border-line-strong bg-surface px-3 text-[15px] text-texto"
        >
          <option value="">Ainda não sei</option>
          {PRODUTOS.map((p) => (
            <option key={p.nome} value={p.nome}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <label
        className={
          "flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed " +
          (erros.consentimento ? "text-bad" : "text-muted")
        }
      >
        <input
          type="checkbox"
          data-campo="consentimento"
          checked={valores.consentimento}
          onChange={(e) => mudar("consentimento", e.target.checked)}
          onBlur={() => sair("consentimento")}
          aria-invalid={Boolean(erros.consentimento) || undefined}
          className="mt-0.5 size-4 shrink-0 accent-[var(--brand)]"
        />
        <span>
          {textoConsentimento}{" "}
          <a
            href={urlPolitica}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Política de Privacidade
          </a>
          .
        </span>
      </label>

      <div ref={caixaTurnstile} />

      {falhaGeral ? (
        <p role="alert" className="rounded-[6px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {falhaGeral}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={enviando}
        className={
          "h-[46px] rounded-[6px] bg-brand px-6 text-[15px] font-[700] text-on-brand " +
          "font-(family-name:--font-display) hover:bg-brand-hover disabled:opacity-60"
        }
      >
        {enviando ? "Enviando…" : "Quero minha cotação"}
      </button>

      <p className="text-center text-[11.5px] text-faint">
        Seus dados ficam com a MX. Sem disparo em massa, sem venda de cadastro.
      </p>
    </form>
  );
}

/** UTM da URL, para o gestor saber qual campanha trouxe o lead (§5.1). */
function utmDaUrl(): Record<string, string> | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const chave of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = p.get(chave);
    if (v) utm[chave] = v.slice(0, 200);
  }
  return Object.keys(utm).length ? utm : null;
}
