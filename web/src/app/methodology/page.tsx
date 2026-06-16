import type { Metadata } from "next";

import { getProbabilities } from "@/lib/data";

export const metadata: Metadata = {
  title: "Metodologia",
  description:
    "Como o PULSE calcula as probabilidades da Copa do Mundo 2026: rating Elo, " +
    "simulação Monte Carlo de 100.000 torneios, limitações do modelo e como interpretar.",
};

export default function MethodologyPage() {
  const { simulations } = getProbabilities();

  return (
    <article className="container-content max-w-2xl py-12 sm:py-16">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Metodologia</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Como o PULSE calcula as probabilidades
      </h1>
      <p className="mt-5 text-lg text-muted">
        Sem achismo. Cada número vem de um modelo estatístico transparente — força
        das seleções via Elo e {simulations.toLocaleString("pt-BR")} simulações do
        torneio inteiro. A IA só traduz os números em texto; ela nunca calcula
        probabilidade.
      </p>

      <div className="mt-12 space-y-10">
        <Section title="1. Rating Elo — a força de cada seleção">
          <p>
            Cada seleção tem um rating <strong className="text-foreground">Elo</strong>,
            o mesmo sistema usado no xadrez. Quanto maior o Elo, mais forte o time. A
            diferença de Elo entre dois times define a probabilidade de cada resultado:
          </p>
          <Formula>P(A vence) = 1 / (1 + 10^((Elo_B − Elo_A) / 400))</Formula>
          <p>
            Os ratings partem de um valor pré-Copa (baseado na força histórica) e são
            atualizados após cada jogo: quem vence ganha pontos do adversário, e
            goleadas pesam mais. O rating é recalculado do zero a cada rodada a partir
            de todos os resultados — então é sempre consistente.
          </p>
        </Section>

        <Section title={`2. Monte Carlo — ${simulations.toLocaleString("pt-BR")} Copas simuladas`}>
          <p>
            Saber a chance de um jogo é fácil. Saber a chance de{" "}
            <em>ser campeão</em> exige simular o torneio inteiro — muitas vezes. O
            modelo joga a Copa completa{" "}
            <strong className="text-foreground">
              {simulations.toLocaleString("pt-BR")} vezes
            </strong>
            : cada partida é sorteada pela probabilidade do Elo (gols via distribuição
            de Poisson), os grupos são resolvidos e o mata-mata é disputado até a final.
          </p>
          <p>
            Contamos em quantas dessas simulações cada seleção avança em cada fase. Se o
            Brasil é campeão em 9 de cada 100 torneios simulados, sua chance de título é
            de ~9%. É daí que vem cada porcentagem do site.
          </p>
        </Section>

        <Section title="3. Mata-mata: a variância de jogo único">
          <p>
            Em jogo único, qualquer um ganha. Por isso o mata-mata não usa só o
            favoritismo do Elo: modelamos o resultado no tempo normal e tratamos o
            empate como decisão por pênaltis (~moeda). Isso injeta a incerteza real de
            uma Copa — favoritos vencem, mas não são imbatíveis.
          </p>
        </Section>

        <Section title="4. A IA explica, não calcula">
          <p>
            As análises em texto são geradas por IA a partir <em>dos números já
            calculados</em>. A fronteira é rígida: o modelo estatístico produz as
            probabilidades; a IA apenas as transforma em linguagem natural. Nenhum
            número do site é inventado por IA.
          </p>
        </Section>

        <Section title="5. Limitações (e honestidade)">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              O modelo não conhece lesões, suspensões, contexto tático ou motivação.
            </li>
            <li>
              Os ratings iniciais são estimativas; o modelo se corrige ao longo da Copa.
            </li>
            <li>
              Probabilidade não é certeza. Um evento de 10% acontece — em 1 a cada 10
              Copas.
            </li>
          </ul>
        </Section>

        <Section title="Como interpretar">
          <p>
            Prefira pensar em frequências, não em porcentagens isoladas. “12%” soa
            abstrato; “1 título a cada 8 Copas” é tangível. O PULSE foi desenhado para
            contar essa história — não só mostrar o número.
          </p>
        </Section>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-4 overflow-x-auto rounded-lg border border-border bg-surface px-4 py-3 font-mono text-sm text-foreground">
      {children}
    </p>
  );
}
