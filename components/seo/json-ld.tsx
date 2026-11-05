/**
 * schema.org structured data for search engines. `<` is escaped so text in
 * the data (fund names, descriptions) can't close the script tag.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
