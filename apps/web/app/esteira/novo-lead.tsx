"use client";

import { useState } from "react";
import { Botao } from "@/componentes/ui/botao";
import { Modal } from "@/componentes/ui/modal";
import { mascararEmail, mascararNome, mascararTelefone } from "@/lib/captura/mascara";
import { capitalizarNome } from "@/lib/formato";
import { fase, type FaseId } from "@/lib/dominio/fases";
import type { Referencias } from "@/lib/leads/consulta";

/**
 * Cadastro manual (§5.3, F2-10).
 *
 * Abre pelo "+" do cabeçalho de cada coluna — e a coluna clicada vira a fase
 * inicial, porque quem clica no "+" de Reunião está registrando alguém que já
 * tem reunião marcada, não um lead do zero.
 *
 * Usa as mesmas máscaras do formulário público: quem digita o DDD errado
 * digita errado nos dois lugares.
 */

type Props = {
  faseInicial: FaseId;
  referencias: Referencias;
  onFechar: () => void;
  onCriado: () => void;
};

export function NovoLead({ faseInicial, referencias, onFechar, onCriado }: Props) {
  const [valores, setValores] = useState({
    nome: "",
    sobrenome: "",
    telefone: "",
    email: "",
    empresa: "",
    produtoId: "",
    responsavelId: "",
    origemSlug: "manual",
  });
  const [erro, setErro] = useState<{ campo?: string; mensagem: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  function muda(campo: keyof typeof valores, bruto: string) {
    const valor =
      campo === "telefone"
        ? mascararTelefone(bruto)
        : campo === "email"
          ? mascararEmail(bruto)
          : campo === "nome" || campo === "sobrenome"
            ? mascararNome(bruto)
            : bruto;

    setValores((v) => ({ ...v, [campo]: valor }));
    if (erro?.campo === campo) setErro(null);
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);

    const resposta = await fetch("/api/v1/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: capitalizarNome(valores.nome).trim(),
        sobrenome: capitalizarNome(valores.sobrenome).trim(),
        telefone: valores.telefone,
        email: valores.email,
        empresa: valores.empresa || null,
        produtoId: valores.produtoId ? Number(valores.produtoId) : null,
        responsavelId: valores.responsavelId || null,
        origemSlug: valores.origemSlug,
        fase: faseInicial,
      }),
    });

    setSalvando(false);

    if (!resposta.ok) {
      const corpo = (await resposta.json().catch(() => null)) as
        | { error?: { message?: string; field?: string } }
        | null;
      setErro({
        campo: corpo?.error?.field,
        mensagem: corpo?.error?.message ?? "Não conseguimos cadastrar agora.",
      });
      return;
    }

    onCriado();
  }

  const erroDe = (campo: string) => (erro?.campo === campo ? erro.mensagem : null);

  return (
    <Modal
      aberto
      titulo="Novo lead"
      descricao={`Entra em ${fase(faseInicial).nome}, com 1º contato agendado para o próximo dia útil.`}
      onFechar={onFechar}
      acoes={
        <>
          <Botao variante="secundario" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Botao>
          <Botao onClick={salvar} disabled={salvando}>
            {salvando ? "Cadastrando…" : "Cadastrar lead"}
          </Botao>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo="Nome" valor={valores.nome} onMuda={(v) => muda("nome", v)} erro={erroDe("nome")} />
        <Campo
          rotulo="Sobrenome"
          valor={valores.sobrenome}
          onMuda={(v) => muda("sobrenome", v)}
          erro={erroDe("sobrenome")}
        />
      </div>

      <Campo
        rotulo="WhatsApp"
        valor={valores.telefone}
        onMuda={(v) => muda("telefone", v)}
        erro={erroDe("telefone")}
        placeholder="(11) 99999-0000"
        tabular
      />
      <Campo
        rotulo="E-mail"
        valor={valores.email}
        onMuda={(v) => muda("email", v)}
        erro={erroDe("email")}
        placeholder="contato@empresa.com.br"
      />
      <Campo
        rotulo="Empresa (opcional)"
        valor={valores.empresa}
        onMuda={(v) => muda("empresa", v)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Selecao
          rotulo="Produto"
          valor={valores.produtoId}
          onMuda={(v) => muda("produtoId", v)}
          opcoes={[
            { valor: "", texto: "Não informado" },
            ...referencias.produtos.map((p) => ({ valor: String(p.id), texto: p.label })),
          ]}
        />
        <Selecao
          rotulo="Origem"
          valor={valores.origemSlug}
          onMuda={(v) => muda("origemSlug", v)}
          opcoes={referencias.origens.map((o) => ({ valor: o.slug, texto: o.label }))}
        />
      </div>

      <Selecao
        rotulo="Responsável"
        valor={valores.responsavelId}
        onMuda={(v) => muda("responsavelId", v)}
        opcoes={[
          { valor: "", texto: "Eu mesmo" },
          ...referencias.equipe.map((p) => ({ valor: p.id, texto: p.nome })),
        ]}
      />

      {erro && !erro.campo ? (
        <p role="alert" className="rounded-[6px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {erro.mensagem}
        </p>
      ) : null}
    </Modal>
  );
}

function Campo({
  rotulo,
  valor,
  onMuda,
  erro,
  placeholder,
  tabular = false,
}: {
  rotulo: string;
  valor: string;
  onMuda: (v: string) => void;
  erro?: string | null;
  placeholder?: string;
  tabular?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-[600] text-heading">{rotulo}</label>
      <input
        type="text"
        value={valor}
        placeholder={placeholder}
        onChange={(e) => onMuda(e.target.value)}
        aria-invalid={erro ? true : undefined}
        className={
          (tabular ? "tabular " : "") +
          "h-[42px] rounded-[6px] border bg-surface px-3 text-[15px] text-texto placeholder:text-faint " +
          (erro ? "border-bad" : "border-line-strong")
        }
      />
      {erro ? (
        <p role="alert" className="text-[12.5px] text-bad">
          {erro}
        </p>
      ) : null}
    </div>
  );
}

function Selecao({
  rotulo,
  valor,
  opcoes,
  onMuda,
}: {
  rotulo: string;
  valor: string;
  opcoes: { valor: string; texto: string }[];
  onMuda: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-[600] text-heading">{rotulo}</label>
      <select
        value={valor}
        onChange={(e) => onMuda(e.target.value)}
        className="h-[42px] rounded-[6px] border border-line-strong bg-surface px-3 text-[15px] text-texto"
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}
