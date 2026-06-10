// schema.org structured data (JSON-LD). Next.js recommends embedding JSON-LD as
// a <script type="application/ld+json"> in the rendered tree — Google reads it
// from anywhere in the document. Accepts a single schema object or an array.
//
// The payload is escaped before injection: some values (card titles, wallet
// handles) originate from the MnStr API and are user-controlled, so a raw
// `</script>` inside one would otherwise break out of the script context.
// Escaping <, >, & as unicode keeps the JSON valid for parsers while making
// breakout impossible.
type JsonLdData = Record<string, unknown>;

function serialize(data: JsonLdData | JsonLdData[]): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export default function JsonLd({ data }: { data: JsonLdData | JsonLdData[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}
