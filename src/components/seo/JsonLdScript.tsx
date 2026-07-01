type JsonLdScriptProps = {
  data: Record<string, unknown> | Record<string, unknown>[]
}

/** Server-safe JSON-LD script for `<head>` — sanitizes `<` per Next.js guidance. */
export function JsonLdScript({ data }: JsonLdScriptProps) {
  const payload = Array.isArray(data) ? data : [data]

  return (
    <>
      {payload.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(entry).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  )
}
