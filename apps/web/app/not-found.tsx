import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <p className="rotulo">Erro 404</p>
        <h1 className="mt-2 text-[28px] font-[800]">Página não encontrada</h1>
        <p className="mt-2 text-[14px] text-muted">
          O endereço mudou ou nunca existiu.
        </p>
        <Link
          href="/esteira"
          className="mt-6 inline-block text-[14px] font-[600] text-heading underline underline-offset-4"
        >
          Ir para a esteira
        </Link>
      </div>
    </main>
  );
}
