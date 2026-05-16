type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
  tag?: string
  listType?: string
}

function walkNodes(nodes: LexicalNode[] | undefined, lines: string[]): void {
  if (!nodes?.length) return

  for (const node of nodes) {
    if (node.type === 'text' && node.text) {
      const last = lines[lines.length - 1]
      if (last !== undefined && !last.endsWith('\n')) {
        lines[lines.length - 1] = last + node.text
      } else {
        lines.push(node.text)
      }
      continue
    }

    if (node.type === 'heading') {
      const text = extractInlineText(node.children)
      if (text) {
        lines.push(text.toUpperCase())
        lines.push('')
      }
      continue
    }

    if (node.type === 'list') {
      const prefix = node.listType === 'number' ? '' : '- '
      for (const item of node.children ?? []) {
        const text = extractInlineText(item.children)
        if (text) lines.push(`${prefix}${text}`)
      }
      lines.push('')
      continue
    }

    if (node.type === 'paragraph' || node.type === 'quote') {
      const text = extractInlineText(node.children)
      if (text) lines.push(text)
      lines.push('')
      continue
    }

    if (node.children?.length) {
      walkNodes(node.children, lines)
    }
  }
}

function extractInlineText(nodes: LexicalNode[] | undefined): string {
  if (!nodes?.length) return ''
  return nodes
    .map((n) => (n.type === 'text' ? (n.text ?? '') : extractInlineText(n.children)))
    .join('')
    .trim()
}

/** Converts Lexical richText JSON to plain text for system prompts. */
export function lexicalToPlain(content: unknown): string {
  if (!content || typeof content !== 'object') return ''

  const root = content as { root?: { children?: LexicalNode[] } }
  const lines: string[] = []
  walkNodes(root.root?.children, lines)

  return lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
