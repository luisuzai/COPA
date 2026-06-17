import type { Metadata } from "next";
import Link from "next/link";

import { getProbabilities } from "@/lib/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Metodologia",
  description:
    "Como o PULSE calcula as probabilidades da Copa do Mundo 2026: rating Elo, " +
    "modelo de gols de Poisson, simulação Monte Carlo de 100.000 torneios, o " +
    "formato 2026 (32 vagas no mata-mata), limitações e como interpretar.",
};

export default function MethodologyPage() {
  const { simulations } = getProbabilities();
  const sims = simulations.toLocaleString("pt-BR");

  return (
    <article className="container-content max-w-2xl py-12 sm:py-16">
      <p className="text-xs uppercase tracking-eyebrow text-muted">Metodologia</p>
      <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        Como o PULSE calcula as probabilidades
      </h1>
      <p className="mt-5 text-lg text-muted">
        Sem achismo. Cada número vem de um modelo estatístico transparente — a
        força das seleções via <strong className="text-foreground">Elo</strong>,
        um modelo de gols de <strong className="text-foreground">Poisson</strong>{" "}
        e <strong className="text-foreground">{sims}</strong> simulações do
        torneio inteiro. A IA só traduz os números em texto; ela nunca calcula
        probabilidade.
      </p>

      {/* Resumo em uma linha do fluxo */}
      <div className="mt-8 flex flex-wrap items-center gap-2 text-xs text-muted">
        {["Resultados reais", "Rating Elo", "Gols (Poisson)", `${sims} simulações`, "Probabilidades", "IA narra"].map(
          (step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 font-mono">
                {step}
              </span>
              {i < arr.length - 1 && <span className="text-border" aria-hidden>→</span>}
            </span>
          ),
        )}
      </div>

      <div className="mt-12 space-y-10">
        <Section title="1. O formato da Copa 2026">
          <p>
            A primeira Copa com{" "}
            <strong className="text-foreground">48 seleções</strong>. Elas são
            divididas em <strong className="text-foreground">12 grupos de 4</strong>.
            Diferente das edições anteriores, não são só os 2 primeiros que
            passam:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Os <strong className="text-foreground">2 primeiros de cada grupo</strong>{" "}
              avançam direto — 24 seleções.
            </li>
            <li>
              Os <strong className="text-foreground">8 melhores 3º colocados</strong>{" "}
              entre os 12 grupos completam o chaveamento — mais 8 seleções.
            </li>
          </ul>
          <p>
            Resultado: <strong className="text-foreground">32 das 48</strong>{" "}
            seleções chegam ao mata-mata (as 16-avos de final). É por isso que,
            num grupo, a “chance de avançar” pode somar bem mais que 200%: um 3º
            colocado forte tem caminho real para se classificar, e três times do
            mesmo grupo podem perfeitamente passar de 50% cada.
          </p>
        </Section>

        <Section title="2. Rating Elo — a força de cada seleção">
          <p>
            Cada seleção tem um rating <strong className="text-foreground">Elo</strong>,
            o mesmo sistema usado no xadrez. Quanto maior o Elo, mais forte o time. A
            diferença de Elo entre dois times define a probabilidade de cada resultado:
          </p>
          <MathBlock legend="Elo = força da seleção; só importa a diferença entre dois times.">
            <V>P</V>
            <span>(A&nbsp;vence)</span>
            <Op>=</Op>
            <Frac
              num={<span>1</span>}
              den={
                <span className="inline-flex items-center">
                  1&nbsp;+&nbsp;10
                  <Sup>
                    (Elo<Sub>B</Sub>&nbsp;−&nbsp;Elo<Sub>A</Sub>)&nbsp;/&nbsp;400
                  </Sup>
                </span>
              }
            />
          </MathBlock>
          <p>
            Os ratings partem de um valor pré-Copa (baseado na força histórica) e são
            atualizados após cada jogo: quem vence ganha pontos do adversário e{" "}
            <strong className="text-foreground">goleadas pesam mais</strong> (a margem
            de gols multiplica o ajuste). A soma de Elo é conservada — o que um time
            ganha, o outro perde. O rating é recalculado do zero a partir de todos os
            resultados a cada rodada, então é sempre consistente.
          </p>
        </Section>

        <Section title="3. De Elo a gols — o modelo de Poisson">
          <p>
            Para simular um jogo não basta saber quem é favorito; é preciso um{" "}
            <em>placar</em>. A diferença de Elo vira um número esperado de gols
            (lambda) para cada lado, e o placar é sorteado de uma distribuição de{" "}
            <strong className="text-foreground">Poisson</strong> — a distribuição
            clássica para contagem de eventos raros como gols.
          </p>
          <MathBlock legend="Cada time calcula seu próprio λ; ~250 pontos de Elo ≈ 1 gol de diferença.">
            <V>λ</V>
            <Sub>time</Sub>
            <Op>=</Op>
            <span>1,35</span>
            <Op>+</Op>
            <Frac
              num={
                <span>
                  Elo<Sub>time</Sub>&nbsp;−&nbsp;Elo<Sub>adv</Sub>
                </span>
              }
              den={<span>500</span>}
            />
          </MathBlock>
          <p>
            Em números: um time parte de ~1,35 gol esperado num jogo equilibrado, e
            cada <strong className="text-foreground">250 pontos de Elo</strong> de
            vantagem valem cerca de 1 gol a mais de expectativa. Cruzando as duas
            Poisson, chega-se à chance de vitória, empate e derrota — e ao placar
            provável que aparece nas páginas de jogo.
          </p>
        </Section>

        <Section title={`4. Monte Carlo — ${sims} Copas simuladas`}>
          <p>
            Saber a chance de um jogo é fácil. Saber a chance de{" "}
            <em>ser campeão</em> exige simular o torneio inteiro — muitas vezes. O
            modelo joga a Copa completa{" "}
            <strong className="text-foreground">{sims} vezes</strong>: cada partida
            tem o placar sorteado pelo modelo de gols, os 12 grupos são resolvidos
            (incluindo a disputa dos melhores terceiros) e o mata-mata é disputado
            até a final.
          </p>
          <p>
            Contamos em quantas dessas simulações cada seleção alcança cada fase. Se
            o Brasil é campeão em 9 de cada 100 torneios simulados, sua chance de
            título é de ~9%. É daí que vem cada porcentagem do site. O desempate
            dentro do grupo segue a ordem oficial:{" "}
            <span className="font-mono text-foreground">
              pontos › saldo › gols pró
            </span>{" "}
            (e um desempate aleatório residual).
          </p>
        </Section>

        <Section title="5. Mata-mata: a variância de jogo único">
          <p>
            Em jogo único, qualquer um ganha. Por isso o mata-mata não usa só o
            favoritismo do Elo: modelamos o resultado no tempo normal pelo modelo de
            gols e tratamos o <strong className="text-foreground">empate como
            decisão por pênaltis</strong> (~moeda, 50/50).
          </p>
          <MathBlock>
            <V>P</V>
            <span>(avança)</span>
            <Op>=</Op>
            <V>P</V>
            <span>(vence)</span>
            <Op>+</Op>
            <Frac num={<span>1</span>} den={<span>2</span>} className="text-[0.8em]" />
            <Op className="mx-1">·</Op>
            <V>P</V>
            <span>(empate)</span>
          </MathBlock>
          <p>
            Isso injeta a incerteza real de uma Copa e calibra para baixo o
            favoritismo dos mais fortes — favoritos vencem, mas não são imbatíveis.
          </p>
        </Section>

        <Section title="6. A IA explica, não calcula">
          <p>
            As análises em texto são geradas por IA a partir{" "}
            <em>dos números já calculados</em>. A fronteira é rígida: o modelo
            estatístico produz as probabilidades; a IA apenas as transforma em
            linguagem natural. Nenhum número do site é inventado por IA.
          </p>
        </Section>

        <Section title="7. Dados e atualização">
          <p>
            Os jogos, placares e a classificação vêm da{" "}
            <a
              href="https://www.football-data.org/"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-accent-strong"
            >
              football-data.org
            </a>
            . A cada rodada o pipeline reprocessa tudo — ingestão dos resultados,
            recálculo do Elo, nova simulação e geração das análises — e publica os
            dados estáticos. A data do último processamento aparece no rodapé e no
            topo do site.
          </p>
        </Section>

        <Section title="8. Limitações (e honestidade)">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              O modelo não conhece lesões, suspensões, contexto tático ou motivação.
            </li>
            <li>
              O plano de dados gratuito não traz estatísticas avançadas (posse,
              finalizações, xG real) — trabalhamos com resultados, classificação e forma.
            </li>
            <li>
              O chaveamento dos melhores terceiros usa um seeding aproximado, não o
              template oficial da FIFA (refinamento previsto).
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

        <Section title="Glossário rápido">
          <dl className="space-y-3">
            <Term name="Chance de avançar">
              Probabilidade de chegar ao mata-mata — somando os dois caminhos: terminar
              em 1º/2º <em>ou</em> como um dos 8 melhores terceiros.
            </Term>
            <Term name="Chance de título / final / semi">
              Fração das {sims} simulações em que a seleção alcança aquela fase.
            </Term>
            <Term name="Variação (pp)">
              Quanto a chance mudou desde a rodada anterior, em{" "}
              <strong className="text-foreground">pontos percentuais</strong> (não em %
              relativo). De 10% para 12% é +2 pp.
            </Term>
            <Term name="Elo">
              Medida de força relativa. Não tem unidade absoluta — só importa a
              diferença entre dois times.
            </Term>
          </dl>
        </Section>

        <Section title="Como interpretar">
          <p>
            Prefira pensar em frequências, não em porcentagens isoladas. “12%” soa
            abstrato; “1 título a cada 8 Copas” é tangível. O PULSE foi desenhado para
            contar essa história — não só mostrar o número.
          </p>
          <p className="text-sm">
            Quer ver na prática?{" "}
            <Link href="/groups/" className="text-accent hover:text-accent-strong">
              Explore os grupos
            </Link>{" "}
            ou{" "}
            <Link href="/simulator/" className="text-accent hover:text-accent-strong">
              mude os resultados no simulador
            </Link>
            .
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

/** Bloco de fórmula matemática: centralizado, com legenda opcional. */
function MathBlock({
  children,
  legend,
}: {
  children: React.ReactNode;
  legend?: string;
}) {
  return (
    <div className="my-5 flex flex-col items-center gap-2.5 rounded-lg border border-border bg-surface px-4 py-6">
      <div className="max-w-full overflow-x-auto">
        <div className="flex items-center justify-center whitespace-nowrap text-lg text-foreground sm:text-xl">
          {children}
        </div>
      </div>
      {legend && <p className="text-center text-xs text-muted">{legend}</p>}
    </div>
  );
}

/** Fração empilhada com barra (numerador sobre denominador). */
function Frac({
  num,
  den,
  className,
}: {
  num: React.ReactNode;
  den: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-col items-center align-middle leading-none",
        className,
      )}
    >
      <span className="px-2 pb-1">{num}</span>
      <span className="w-full border-t border-current px-2 pt-1">{den}</span>
    </span>
  );
}

/** Expoente (sobrescrito). */
function Sup({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative -top-[0.5em] ml-0.5 text-[0.7em]">{children}</span>
  );
}

/** Índice (subscrito). */
function Sub({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative top-[0.35em] text-[0.62em] text-muted">{children}</span>
  );
}

/** Variável (itálico, como na notação matemática). */
function V({ children }: { children: React.ReactNode }) {
  return <span className="italic">{children}</span>;
}

/** Operador com respiro lateral. */
function Op({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn("mx-2 text-muted", className)}>{children}</span>;
}

function Term({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 bg-surface px-4 py-3">
      <dt className="font-medium text-foreground">{name}</dt>
      <dd className="mt-1 text-sm text-muted">{children}</dd>
    </div>
  );
}
