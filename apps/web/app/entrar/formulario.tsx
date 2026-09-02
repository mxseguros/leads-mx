"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "@/componentes/ui/botao";
import { Campo } from "@/componentes/ui/campo";
import { entrarComSenha, enviarMagicLink, type ResultadoEntrada } from "./acoes";

/**
 * Entrada da equipe.
 *
 * Senha é o padrão porque não depende de nada externo. O magic link fica um
 * clique adiante, para quem esqueceu a senha — e some da tela principal, que
 * é onde a pessoa está toda manhã.
 */
export function FormularioEntrada({ destino }: { destino: string }) {
  const [modo, setModo] = useState<"senha" | "link">("senha");

  return modo === "senha" ? (
    <PorSenha destino={destino} aoTrocar={() => setModo("link")} />
  ) : (
    <PorLink destino={destino} aoTrocar={() => setModo("senha")} />
  );
}

function PorSenha({ destino, aoTrocar }: { destino: string; aoTrocar: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [resultado, acao, enviando] = useActionState<ResultadoEntrada | null, FormData>(
    entrarComSenha,
    null,
  );

  // Navega de verdade, e não `router.refresh()`: refresh só rebusca a rota
  // atual, e o redirect que o middleware devolve nessa requisição não move o
  // navegador — a pessoa ficava parada em /entrar já autenticada.
  //
  // `replace` e não `push`: voltar depois de entrar não pode cair na tela de
  // login de novo.
  useEffect(() => {
    if (resultado?.ok) router.replace(destino);
  }, [resultado, router, destino]);

  const erroDe = (campo: "email" | "senha") =>
    resultado && !resultado.ok && resultado.campo === campo ? resultado.erro : null;

  const erroGeral =
    resultado && !resultado.ok && !resultado.campo ? resultado.erro : null;

  return (
    <form action={acao} className="flex flex-col gap-4">
      {/*
        E-mail CONTROLADO de propósito.

        O React 19 limpa os campos não controlados quando a action termina.
        Numa tela de login isso significa: errou a senha, perdeu o e-mail
        também, e tem que redigitar os dois. Segurar o e-mail no estado
        preserva o que a pessoa já escreveu.

        A senha continua não controlada, e limpar ela depois de uma tentativa
        errada é o comportamento que se espera de um login.
      */}
      <Campo
        rotulo="E-mail"
        name="email"
        type="email"
        autoComplete="username"
        inputMode="email"
        autoCapitalize="off"
        spellCheck={false}
        placeholder="nome@mxseguros.com.br"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erro={erroDe("email")}
      />

      <Campo
        rotulo="Senha"
        name="senha"
        type="password"
        autoComplete="current-password"
        required
        erro={erroDe("senha")}
      />

      {erroGeral ? (
        <p role="alert" className="rounded-[6px] bg-bad-soft px-3 py-2 text-[13px] text-bad">
          {erroGeral}
        </p>
      ) : null}

      <Botao type="submit" disabled={enviando}>
        {enviando ? "Entrando…" : "Entrar"}
      </Botao>

      <button
        type="button"
        onClick={aoTrocar}
        className="self-center text-[12.5px] text-muted underline underline-offset-2 hover:text-heading"
      >
        Esqueci a senha — receber link por e-mail
      </button>
    </form>
  );
}

function PorLink({ destino, aoTrocar }: { destino: string; aoTrocar: () => void }) {
  const [resultado, acao, enviando] = useActionState<ResultadoEntrada | null, FormData>(
    enviarMagicLink,
    null,
  );

  if (resultado?.ok) {
    return (
      <div className="rounded-[6px] border border-ok bg-ok-soft p-4">
        <p className="font-(family-name:--font-display) text-[15px] font-[700] text-heading">
          Link enviado
        </p>
        <p className="mt-1 text-[13.5px] text-texto">
          Abra o e-mail que chegou em <strong>{resultado.email}</strong> e clique em entrar.
          O link vale por uma hora.
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
        dica="Enviamos um link de acesso, sem senha."
      />

      <Botao type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Receber link de acesso"}
      </Botao>

      <button
        type="button"
        onClick={aoTrocar}
        className="self-center text-[12.5px] text-muted underline underline-offset-2 hover:text-heading"
      >
        Voltar e entrar com senha
      </button>
    </form>
  );
}
