type LexicalInline = Record<string, unknown>
type LexicalBlock = Record<string, unknown>

function textNode(text: string): LexicalInline {
  return { type: 'text', text, version: 1 }
}

function linkNode(url: string, label: string): LexicalInline {
  return {
    type: 'link',
    fields: { url, newTab: true, linkType: 'custom' },
    children: [textNode(label)],
    version: 1,
  }
}

export function lexicalParagraph(parts: Array<string | { url: string; label: string }>): LexicalBlock {
  const children = parts.map((part) =>
    typeof part === 'string' ? textNode(part) : linkNode(part.url, part.label),
  )
  return {
    type: 'paragraph',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

export function lexicalHeading(text: string, tag: 'h2' | 'h3' = 'h2'): LexicalBlock {
  return {
    type: 'heading',
    tag,
    children: [textNode(text)],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

export function lexicalBulletList(items: string[]): LexicalBlock {
  return {
    type: 'list',
    listType: 'bullet',
    children: items.map((item) => ({
      type: 'listitem',
      children: [textNode(item)],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    })),
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

export function lexicalDocument(blocks: LexicalBlock[]): {
  root: {
    type: string
    children: LexicalBlock[]
    direction: string
    format: string
    indent: number
    version: number
  }
} {
  return {
    root: {
      type: 'root',
      children: blocks,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}
