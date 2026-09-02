"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/componentes/ui/botao";
import { Aviso, useAviso } from "@/componentes/ui/aviso";
import type { Configuracoes } from "@/lib/configuracoes";

/**
 * Configurações (§5.6, F3-6). Só o gestor chega aqui.
 *
 * São os valores que a MX muda sem deploy: número de WhatsApp, template da
 * mensagem, texto de consentimento, motivos de perda, produtos, origens e a
 * equipe. Cada seção salva sozinha — um botão "Salvar tudo" no fim da página
 * faria a pessoa perder uma alteração ao trocar de aba.
 */

type Item = { id: number; label: string; ativo: boolean };

type Pessoa = {
  id: string;
  nome: string;
  iniciais: string;
  papel: "gestor" | "consultor";
  ativa: boolean;
};

export function Painel({
  config,
  motivos,
  produtos,
  origens,
  equipe,
  euId,
}: {
  config: Configuracoes;
  motivos: Item[];
  produtos: Item[];
  origens: Item[];
  equipe: Pessoa[];
  euId: string;
}) {
  const router = useRouter();
  const { estado: aviso, mostrar, fechar } = useAviso();

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-9 px-4 py-8 sm:px-6">
      <MinhaSenha onAviso={mostrar} />
      <Whatsapp config={config} onAviso={mostrar} />
      <Consentimento config={config} onAviso={mostrar} onSalvo={() => router.refresh()} />
      <Listas
        motivos={motivos}
        produtos={produtos}
        origens={origens}
        onAviso={mostrar}
        onMudou={() => router.refresh()}
      />
      <Equipe equipe={equipe} euId={euId} onAviso={mostrar} onMudou={() => router.refresh()} />
      <Aviso estado={aviso} onFechar={fechar} />
    </div>
  );
}

/* ------------------------------------------------------------------ seções */

function MinhaSenha({ onAviso }: { onAviso: (m: string) => void }) {
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setErro(null);
    if (senha !== repetir) {
      setErro("As duas senhas não são iguais.");
      return;
    }

    setSalvando(true);
    const r = await fetch("/api/v1/senha", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha }),
    });
    setSalvando(false);

    if (!r.ok) {
      const c = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      setErro(c?.error?.message ?? "Não conseguimos trocar a senha.");
      return;
    }
    setSenha("");
    setRepetir("");
    onAviso("Senha atualizada.");
  }

  return (
    <Secao
      titulo="Minha senha"
      descricao="A senha entra em /entrar sem depender de e-mail. É o caminho do dia a dia; o link por e-mail fica para quem esquecer."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="senha-nova" className="text-[13px] font-[600] text-heading">
            Nova senha
          </label>
          <input
            id="senha-nova"
            type="password"
            value={senha}
            autoComplete="new-password"
            onChange={(e) => setSenha(e.target.value)}
            className="h-[42px] rounded-[6px] border border-line-strong bg-surface px-3 text-[15px] text-texto"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="senha-repetir" className="text-[13px] font-[600] text-heading">
            Repetir
          </label>
          <input
            id="senha-repetir"
            type="password"
            value={repetir}
            autoComplete="new-password"
            onChange={(e) => setRepetir(e.target.value)}
            className="h-[42px] rounded-[6px] border border-line-strong bg-surface px-3 text-[15px] text-texto"
          />
        </div>
      </div>

      <p className="text-[12.5px] text-muted">Mínimo de 8 caracteres.</p>

      {erro ? (
        <p role="alert" className="text-[12.5px] text-bad">
          {erro}
        </p>
      ) : null}

      <Botao
        onClick={salvar}
        disabled={salvando || senha.length < 8 || !repetir}
        className="self-start"
      >
        {salvando ? "Salvando…" : "Trocar senha"}
      </Botao>
    </Secao>
  );
}

function Whatsapp({
  config,
  onAviso,
}: {
  config: Configuracoes;
  onAviso: (m: string) => void;
}) {
  const [numero, setNumero] = useState(config.numeroWhatsapp);
  const [template, setTemplate] = useState(config.templateWhatsapp);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const r = await fetch("/api/v1/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroWhatsapp: numero, templateWhatsapp: template }),
    });
    setSalvando(false);

    if (!r.ok) {
      const c = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      setErro(c?.error?.message ?? "Não conseguimos salvar.");
      return;
    }
    onAviso("WhatsApp atualizado.");
  }

  const previa = template
    .replace(/\{nome\}/g, "Ana")
    .replace(/\{produto\}/g, "Frota");

  return (
    <Secao
      titulo="WhatsApp"
      descricao="O número que recebe os contatos e a mensagem que já vem preenchida quando alguém clica em WhatsApp."
    >
      <Campo
        rotulo="Número comercial"
        valor={numero}
        onMuda={setNumero}
        dica="Com país e DDD, só dígitos — ex.: 5511999990000."
        tabular
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wa-template" className="text-[13px] font-[600] text-heading">Mensagem</label>
        <textarea
          id="wa-template"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-[6px] border border-line-strong bg-surface p-2.5 text-[14px] text-texto"
        />
        <p className="text-[12.5px] text-muted">
          Use <span className="mono">{"{nome}"}</span> e <span className="mono">{"{produto}"}</span>{" "}
          — eles são trocados pelos dados do lead.
        </p>
      </div>

      {template ? (
        <div className="rounded-[6px] bg-surface-2 p-3">
          <p className="rotulo mb-1">Prévia</p>
          <p className="text-[13.5px] text-texto">{previa}</p>
        </div>
      ) : null}

      {erro ? <p className="text-[12.5px] text-bad">{erro}</p> : null}
      <Botao onClick={salvar} disabled={salvando} className="self-start">
        {salvando ? "Salvando…" : "Salvar WhatsApp"}
      </Botao>
    </Secao>
  );
}

function Consentimento({
  config,
  onAviso,
  onSalvo,
}: {
  config: Configuracoes;
  onAviso: (m: string) => void;
  onSalvo: () => void;
}) {
  const [texto, setTexto] = useState(config.textoConsentimento);
  const [url, setUrl] = useState(config.urlPolitica);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mudou = texto !== config.textoConsentimento;

  async function salvar() {
    setSalvando(true);
    setErro(null);
    const r = await fetch("/api/v1/configuracoes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textoConsentimento: texto, urlPolitica: url }),
    });
    setSalvando(false);

    if (!r.ok) {
      const c = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      setErro(c?.error?.message ?? "Não conseguimos salvar.");
      return;
    }
    const d = (await r.json()) as { novaVersao: string | null };
    onAviso(d.novaVersao ? `Salvo. Nova versão do consentimento: ${d.novaVersao}` : "Salvo.");
    onSalvo();
  }

  return (
    <Secao
      titulo="Consentimento LGPD"
      descricao="O texto que aparece ao lado do checkbox na landing, e o link da política de privacidade."
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="lgpd-texto" className="text-[13px] font-[600] text-heading">Texto do consentimento</label>
        <textarea
          id="lgpd-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-[6px] border border-line-strong bg-surface p-2.5 text-[14px] text-texto"
        />
        <p className="text-[12.5px] text-muted">
          Versão atual: <span className="mono">{config.versaoConsentimento}</span>
        </p>
      </div>

      <Campo rotulo="URL da Política de Privacidade" valor={url} onMuda={setUrl} />

      {mudou ? (
        <p className="rounded-[6px] bg-warn-soft px-3 py-2 text-[13px] text-warn">
          Mudar este texto cria uma <strong>versão nova</strong>, com a data de hoje. Os leads já
          capturados continuam apontando para a versão que a pessoa realmente leu — é isso que
          sustenta a resposta a um pedido do titular.
        </p>
      ) : null}

      {erro ? <p className="text-[12.5px] text-bad">{erro}</p> : null}
      <Botao onClick={salvar} disabled={salvando} className="self-start">
        {salvando ? "Salvando…" : "Salvar consentimento"}
      </Botao>
    </Secao>
  );
}

function Listas({
  motivos,
  produtos,
  origens,
  onAviso,
  onMudou,
}: {
  motivos: Item[];
  produtos: Item[];
  origens: Item[];
  onAviso: (m: string) => void;
  onMudou: () => void;
}) {
  const [novo, setNovo] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function alternar(tabela: string, id: number, ativo: boolean) {
    const r = await fetch("/api/v1/configuracoes/listas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabela, id, ativo }),
    });
    if (!r.ok) {
      onAviso("Não conseguimos salvar a alteração.");
      return;
    }
    onMudou();
  }

  async function adicionarMotivo() {
    if (!novo.trim()) return;
    setSalvando(true);
    const r = await fetch("/api/v1/configuracoes/listas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: novo }),
    });
    setSalvando(false);

    if (!r.ok) {
      const c = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      onAviso(c?.error?.message ?? "Não conseguimos adicionar.");
      return;
    }
    setNovo("");
    onAviso("Motivo adicionado.");
    onMudou();
  }

  return (
    <Secao
      titulo="Listas"
      descricao="Itens desativados somem dos seletores, mas continuam nos leads antigos — nada é apagado."
    >
      <Lista titulo="Motivos de perda" itens={motivos} tabela="lost_reasons" onAlternar={alternar} />

      <div className="flex gap-2">
        <input
          type="text"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && adicionarMotivo()}
          placeholder="Novo motivo de perda"
          className="h-9 flex-1 rounded-[6px] border border-line-strong bg-surface px-3 text-[14px] text-texto placeholder:text-faint"
        />
        <Botao variante="secundario" onClick={adicionarMotivo} disabled={salvando || !novo.trim()}>
          Adicionar
        </Botao>
      </div>

      <Lista titulo="Produtos" itens={produtos} tabela="products" onAlternar={alternar} />
      <Lista titulo="Origens" itens={origens} tabela="lead_sources" onAlternar={alternar} />
    </Secao>
  );
}

function Lista({
  titulo,
  itens,
  tabela,
  onAlternar,
}: {
  titulo: string;
  itens: Item[];
  tabela: string;
  onAlternar: (tabela: string, id: number, ativo: boolean) => void;
}) {
  return (
    <div>
      <p className="rotulo mb-2">{titulo}</p>
      <ul className="flex flex-col divide-y divide-line rounded-[6px] border border-line">
        {itens.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className={"text-[13.5px] " + (i.ativo ? "text-texto" : "text-faint line-through")}>
              {i.label}
            </span>
            <button
              type="button"
              onClick={() => onAlternar(tabela, i.id, !i.ativo)}
              className="text-[12px] font-[600] text-muted underline underline-offset-2 hover:text-heading"
            >
              {i.ativo ? "Desativar" : "Reativar"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Equipe({
  equipe,
  euId,
  onAviso,
  onMudou,
}: {
  equipe: Pessoa[];
  euId: string;
  onAviso: (m: string) => void;
  onMudou: () => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<"consultor" | "gestor">("consultor");
  const [senha, setSenha] = useState("");
  const [convidando, setConvidando] = useState(false);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [criouComSenha, setCriouComSenha] = useState<string | null>(null);

  async function convidar() {
    setConvidando(true);
    setLinkGerado(null);
    setCriouComSenha(null);
    const r = await fetch("/api/v1/configuracoes/equipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, papel, senha: senha || undefined }),
    });
    setConvidando(false);

    if (!r.ok) {
      const c = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      onAviso(c?.error?.message ?? "Não conseguimos criar o acesso.");
      return;
    }
    const d = (await r.json()) as { link: string | null };
    if (!d.link) setCriouComSenha(email);
    setNome("");
    setEmail("");
    setSenha("");
    setLinkGerado(d.link);
    onMudou();
  }

  async function alterar(id: string, patch: { papel?: "gestor" | "consultor"; ativa?: boolean }) {
    const r = await fetch("/api/v1/configuracoes/equipe", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    if (!r.ok) {
      const c = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
      onAviso(c?.error?.message ?? "Não conseguimos salvar.");
      return;
    }
    onMudou();
  }

  return (
    <Secao
      titulo="Equipe"
      descricao="Quem tem acesso ao admin. Consultor trabalha a esteira; gestor também exclui leads e mexe aqui."
    >
      <ul className="flex flex-col divide-y divide-line rounded-[6px] border border-line">
        {equipe.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className={"block text-[13.5px] font-[600] " + (p.ativa ? "text-heading" : "text-faint")}>
                {p.nome}
                {p.id === euId ? <span className="ml-1.5 text-[11px] font-[400] text-muted">(você)</span> : null}
              </span>
              <span className="text-[12px] capitalize text-muted">
                {p.papel}
                {p.ativa ? "" : " · desligado"}
              </span>
            </span>

            <select
              value={p.papel}
              disabled={p.id === euId}
              onChange={(e) => alterar(p.id, { papel: e.target.value as "gestor" | "consultor" })}
              className="h-8 rounded-[6px] border border-line-strong bg-surface px-2 text-[13px] text-texto disabled:opacity-50"
            >
              <option value="consultor">Consultor</option>
              <option value="gestor">Gestor</option>
            </select>

            <button
              type="button"
              disabled={p.id === euId}
              onClick={() => alterar(p.id, { ativa: !p.ativa })}
              className="text-[12px] font-[600] text-muted underline underline-offset-2 hover:text-heading disabled:opacity-40 disabled:no-underline"
            >
              {p.ativa ? "Desligar" : "Reativar"}
            </button>
          </li>
        ))}
      </ul>

      <div className="rounded-[6px] border border-line bg-surface-2 p-3">
        <p className="rotulo mb-2">Adicionar alguém</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            className="h-9 rounded-[6px] border border-line-strong bg-surface px-3 text-[14px] text-texto placeholder:text-faint"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@mxseguros.com.br"
            className="h-9 rounded-[6px] border border-line-strong bg-surface px-3 text-[14px] text-texto placeholder:text-faint"
          />
          <select
            value={papel}
            onChange={(e) => setPapel(e.target.value as "consultor" | "gestor")}
            className="h-9 rounded-[6px] border border-line-strong bg-surface px-2 text-[14px] text-texto"
          >
            <option value="consultor">Consultor</option>
            <option value="gestor">Gestor</option>
          </select>
        </div>

        <input
          type="text"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="Senha inicial (opcional, mínimo 8 caracteres)"
          autoComplete="off"
          className="mt-2 h-9 w-full rounded-[6px] border border-line-strong bg-surface px-3 text-[14px] text-texto placeholder:text-faint"
        />

        <Botao
          onClick={convidar}
          disabled={convidando || !nome.trim() || !email.trim()}
          className="mt-2"
        >
          {convidando ? "Criando…" : "Criar acesso"}
        </Botao>

        <p className="mt-2 max-w-[68ch] text-[12px] text-muted">
          Não enviamos e-mail. <strong>Com senha</strong>, a pessoa entra direto em
          /entrar. <strong>Sem senha</strong>, aparece aqui um link para você repassar — e
          ela define a senha depois, nesta mesma tela.
        </p>

        {criouComSenha ? (
          <div className="mt-3 rounded-[6px] border border-ok bg-ok-soft p-3">
            <p className="text-[13px] font-[600] text-heading">Acesso criado com senha</p>
            <p className="mt-1 text-[12px] text-texto">
              <strong>{criouComSenha}</strong> já pode entrar em /entrar. Combine a senha
              por um canal seguro — ela não fica guardada em lugar nenhum que dê para
              consultar depois.
            </p>
          </div>
        ) : null}

        {linkGerado ? (
          <div className="mt-3 rounded-[6px] border border-ok bg-ok-soft p-3">
            <p className="text-[13px] font-[600] text-heading">Acesso criado</p>
            <p className="mt-1 text-[12px] text-texto">
              Copie e mande para a pessoa. Vale 1 hora e serve uma vez só.
            </p>
            <code className="mono mt-2 block break-all rounded-[4px] bg-surface p-2 text-[11.5px] text-texto">
              {linkGerado}
            </code>
          </div>
        ) : null}
      </div>
    </Secao>
  );
}

/* --------------------------------------------------------------- auxiliares */

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-b border-line pb-3">
        <h2 className="text-[18px] font-[800]">{titulo}</h2>
        <p className="mt-1 max-w-[68ch] text-[13.5px] text-muted">{descricao}</p>
      </div>
      {children}
    </section>
  );
}

function Campo({
  rotulo,
  valor,
  onMuda,
  dica,
  tabular = false,
}: {
  rotulo: string;
  valor: string;
  onMuda: (v: string) => void;
  dica?: string;
  tabular?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-[600] text-heading">{rotulo}</label>
      <input
        id={id}
        type="text"
        value={valor}
        onChange={(e) => onMuda(e.target.value)}
        className={
          (tabular ? "tabular " : "") +
          "h-[42px] rounded-[6px] border border-line-strong bg-surface px-3 text-[15px] text-texto"
        }
      />
      {dica ? <p className="text-[12.5px] text-muted">{dica}</p> : null}
    </div>
  );
}
