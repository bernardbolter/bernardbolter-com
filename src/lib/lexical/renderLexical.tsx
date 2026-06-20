import Link from 'next/link'
import { cloneElement, isValidElement, type ReactNode } from 'react'

import type { SeriesMention } from '@/lib/bio/linkSeriesMentions'
import { linkSeriesMentionsInText } from '@/lib/bio/linkSeriesMentions'

type LexicalNode = {
  type?: string
  text?: string
  format?: number
  tag?: string
  listType?: string
  url?: string
  fields?: {
    url?: string
    newTab?: boolean
    linkType?: string
  }
  children?: LexicalNode[]
}

function readLinkUrl(node: LexicalNode): string | null {
  const url = node.fields?.url?.trim() || node.url?.trim()
  return url || null
}

function isInternalHref(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//')
}

function applyTextFormat(text: string, format: number | undefined): ReactNode {
  if (!format) return text
  let content: ReactNode = text
  if (format & 1) content = <strong>{content}</strong>
  if (format & 2) content = <em>{content}</em>
  if (format & 8) content = <u>{content}</u>
  if (format & 4) content = <s>{content}</s>
  if (format & 16) content = <code>{content}</code>
  return content
}

function renderInlineNodes(
  nodes: LexicalNode[] | undefined,
  keyPrefix: string,
  seriesMentions: SeriesMention[] = [],
): ReactNode[] {
  if (!nodes?.length) return []

  return nodes.flatMap((node, index) => {
    const key = `${keyPrefix}-inline-${index}`

    if (node.type === 'text') {
      const text = node.text ?? ''
      if (!text) return []

      const linked = linkSeriesMentionsInText(text, seriesMentions, key)
      return linked.map((segment, segmentIndex) => {
        if (typeof segment === 'string') {
          return applyTextFormat(segment, node.format)
        }
        if (
          isValidElement(segment) &&
          node.format &&
          typeof segment.props.children === 'string'
        ) {
          return cloneElement(segment, {
            children: applyTextFormat(segment.props.children, node.format),
          })
        }
        return segment
      })
    }

    if (node.type === 'linebreak') {
      return [<br key={key} />]
    }

    if (node.type === 'link' || node.type === 'autolink') {
      const href = readLinkUrl(node)
      const children = renderInlineNodes(node.children, key, [])
      if (!href || children.length === 0) return children

      const className = 'bio__inline-link'
      if (isInternalHref(href)) {
        return [
          <Link key={key} href={href} className={className}>
            {children}
          </Link>,
        ]
      }

      return [
        <a
          key={key}
          href={href}
          className={className}
          target={node.fields?.newTab ? '_blank' : undefined}
          rel={node.fields?.newTab ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>,
      ]
    }

    if (node.children?.length) {
      return renderInlineNodes(node.children, key, seriesMentions)
    }

    return []
  })
}

function renderBlockNodes(
  nodes: LexicalNode[] | undefined,
  seriesMentions: SeriesMention[] = [],
): ReactNode[] {
  if (!nodes?.length) return []

  return nodes.flatMap((node, index) => {
    const key = `block-${index}`

    if (node.type === 'paragraph') {
      const children = renderInlineNodes(node.children, key, seriesMentions)
      if (children.length === 0) return []
      return [<p key={key}>{children}</p>]
    }

    if (node.type === 'heading') {
      const children = renderInlineNodes(node.children, key, seriesMentions)
      if (children.length === 0) return []
      const tagName = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tag ?? '')
        ? (node.tag as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6')
        : 'h2'
      const HeadingTag = tagName
      return [<HeadingTag key={key}>{children}</HeadingTag>]
    }

    if (node.type === 'quote') {
      const children = renderInlineNodes(node.children, key, seriesMentions)
      if (children.length === 0) return []
      return [<blockquote key={key}>{children}</blockquote>]
    }

    if (node.type === 'list') {
      const Tag = node.listType === 'number' ? 'ol' : 'ul'
      const items = (node.children ?? [])
        .map((item, itemIndex) => {
          const itemChildren = renderInlineNodes(item.children, `${key}-item-${itemIndex}`, seriesMentions)
          if (itemChildren.length === 0) return null
          return <li key={`${key}-item-${itemIndex}`}>{itemChildren}</li>
        })
        .filter(Boolean)

      if (items.length === 0) return []
      return [<Tag key={key}>{items}</Tag>]
    }

    if (node.children?.length) {
      return renderBlockNodes(node.children, seriesMentions)
    }

    return []
  })
}

/** Renders Payload Lexical richText JSON to React (supports inline links from the editor). */
export function renderLexical(
  content: unknown,
  seriesMentions: SeriesMention[] = [],
): ReactNode[] {
  if (!content || typeof content !== 'object') return []

  const root = content as { root?: { children?: LexicalNode[] } }
  return renderBlockNodes(root.root?.children, seriesMentions)
}
