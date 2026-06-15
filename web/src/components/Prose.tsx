import { cn } from "@/lib/utils";

/**
 * Renderiza o Markdown simples vindo da IA (parágrafos + **negrito**) como
 * HTML real — importante para SEO, pois o texto fica no HTML servido, não
 * injetado por JS. Mantemos um parser mínimo para evitar dependências.
 */
function renderInline(text: string, keyPrefix: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
}

export function Prose({
  markdown,
  className,
}: {
  markdown: string;
  className?: string;
}) {
  const paragraphs = markdown.split(/\n\n+/).filter(Boolean);
  return (
    <div className={cn("space-y-4 leading-relaxed text-muted", className)}>
      {paragraphs.map((p, i) => (
        <p key={i}>{renderInline(p, String(i))}</p>
      ))}
    </div>
  );
}
