/** Minimal Lexical JSON from plain text (paragraphs separated by blank lines). */
export function plainToLexical(text: string): {
  root: {
    type: string
    children: Array<Record<string, unknown>>
    direction: string
    format: string
    indent: number
    version: number
  }
} {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const children =
    paragraphs.length > 0
      ? paragraphs.map((paragraph) => ({
          type: 'paragraph',
          children: [{ type: 'text', text: paragraph.replace(/\n/g, ' ') }],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        }))
      : [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '' }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        ]

  return {
    root: {
      type: 'root',
      children,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}
