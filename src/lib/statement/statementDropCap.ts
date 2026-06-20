const DROP_CAP_MIN_CHARS = 40

type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
}

function extractParagraphText(nodes: LexicalNode[] | undefined): string {
  if (!nodes?.length) return ''

  return nodes
    .map((node) => {
      if (node.type === 'text') return node.text ?? ''
      if (node.children?.length) return extractParagraphText(node.children)
      return ''
    })
    .join('')
    .trim()
}

/** True when the first prose paragraph is long enough for the drop cap treatment. */
export function statementProseHasDropCap(content: unknown): boolean {
  if (!content || typeof content !== 'object') return false

  const root = content as { root?: { children?: LexicalNode[] } }
  const firstParagraph = root.root?.children?.find((node) => node.type === 'paragraph')
  if (!firstParagraph) return false

  return extractParagraphText(firstParagraph.children).length >= DROP_CAP_MIN_CHARS
}

export { DROP_CAP_MIN_CHARS }
