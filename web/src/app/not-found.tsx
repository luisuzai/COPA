import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-content flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-mono text-sm tracking-eyebrow text-accent">404</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Página não encontrada
      </h1>
      <p className="mt-3 max-w-sm text-muted">
        O conteúdo que você procura não existe ou ainda não foi gerado.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
      >
        Voltar para a Home
      </Link>
    </div>
  );
}
