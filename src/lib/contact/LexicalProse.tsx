import type { ReactNode } from 'react'

type LexicalNode = {
  type?: string
  text?: string
  children?: LexicalNode[]
  tag?: string
  listType?: string
  fields?: { url?: string; newTab?: boolean }
}

function renderInline(nodes: LexicalNode[] | undefined, keyPrefix: string): ReactNode[] {
  if (!nodes?.length) return []

  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`

    if (node.type === 'text') {
      return node.text ?? ''
    }

    if (node.type === 'link' && node.fields?.url) {
      return (
        <a
          key={key}
          href={node.fields.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {renderInline(node.children, key)}
        </a>
      )
    }

    if (node.type === 'linebreak') {
      return <br key={key} />
    }

    if (node.children?.length) {
      return <span key={key}>{renderInline(node.children, key)}</span>
    }

    return null
  })
}

function hasInlineContent(nodes: LexicalNode[] | undefined): boolean {
  return renderInline(nodes, 'inline').some((node) => node !== null && node !== '')
}

function renderBlock(node: LexicalNode, index: number): ReactNode {
  if (node.type === 'paragraph' || node.type === 'quote') {
    if (!hasInlineContent(node.children)) return null
    return <p key={index}>{renderInline(node.children, `p-${index}`)}</p>
  }

  if (node.type === 'heading') {
    const text = renderInline(node.children, `h-${index}`)
    if (!text.length) return null
    const Tag = node.tag === 'h3' ? 'h3' : node.tag === 'h2' ? 'h2' : 'h4'
    return <Tag key={index}>{text}</Tag>
  }

  if (node.type === 'list') {
    const Tag = node.listType === 'number' ? 'ol' : 'ul'
    const items = (node.children ?? [])
      .map((item, itemIndex) => {
        if (!hasInlineContent(item.children)) return null
        return <li key={itemIndex}>{renderInline(item.children, `li-${index}-${itemIndex}`)}</li>
      })
      .filter(Boolean)
    if (!items.length) return null
    return <Tag key={index}>{items}</Tag>
  }

  if (node.children?.length) {
    return node.children.map((child, childIndex) => renderBlock(child, childIndex))
  }

  return null
}

type Props = {
  content: unknown
  className?: string
}

/** Renders Payload Lexical richText as semantic prose blocks. */
export default function LexicalProse({ content, className }: Props) {
  if (!content || typeof content !== 'object') return null

  const root = (content as { root?: { children?: LexicalNode[] } }).root?.children ?? []
  const blocks = root.map((node, index) => renderBlock(node, index)).filter(Boolean)

  if (!blocks.length) return null

  return <div className={className}>{blocks}</div>
}
