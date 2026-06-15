/**
 * Injeta dados estruturados (schema.org) como JSON-LD no HTML.
 * Ajuda o Google a entender que a página é sobre um time/jogo de futebol.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
