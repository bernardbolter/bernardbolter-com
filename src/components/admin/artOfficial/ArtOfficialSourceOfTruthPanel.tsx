'use client'

import { useMemo, useState } from 'react'

import './artOfficialSourceOfTruth.scss'

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'code'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'hr' }

function inlineFormat(text: string): Array<string | { bold: string }> {
  const parts: Array<string | { bold: string }> = []
  const re = /\*\*([^*]+)\*\*/g
  let last = 0
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ bold: match[1]! })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : [text]
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineFormat(text).map((part, i) =>
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <strong key={i}>{part.bold}</strong>
        ),
      )}
    </>
  )
}

function parseMarkdownLight(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  let inCode = false
  let codeBuf: string[] = []

  while (i < lines.length) {
    const line = lines[i] ?? ''

    if (line.trim().startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'code', text: codeBuf.join('\n') })
        codeBuf = []
        inCode = false
      } else {
        inCode = true
      }
      i += 1
      continue
    }
    if (inCode) {
      codeBuf.push(line)
      i += 1
      continue
    }

    if (line.trim() === '---') {
      blocks.push({ type: 'hr' })
      i += 1
      continue
    }

    if (line.startsWith('|') && line.includes('|')) {
      const tableLines: string[] = []
      while (i < lines.length && (lines[i] ?? '').startsWith('|')) {
        tableLines.push(lines[i]!)
        i += 1
      }
      const parseRow = (row: string) =>
        row
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
      const headers = parseRow(tableLines[0] ?? '')
      const body = tableLines
        .slice(2)
        .filter((row) => !/^\|[\s|:-]+$/.test(row))
        .map(parseRow)
      if (headers.length) blocks.push({ type: 'table', headers, rows: body })
      continue
    }

    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.slice(4).trim() })
      i += 1
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
      i += 1
      continue
    }
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2).trim() })
      i += 1
      continue
    }

    const listMatch = line.match(/^[-*]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/)
    if (listMatch) {
      blocks.push({ type: 'li', text: listMatch[1]!.trim() })
      i += 1
      continue
    }

    if (!line.trim()) {
      i += 1
      continue
    }

    blocks.push({ type: 'p', text: line.trim() })
    i += 1
  }

  if (codeBuf.length) blocks.push({ type: 'code', text: codeBuf.join('\n') })
  return blocks
}

export function ArtOfficialSourceOfTruthPanel({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false)
  const blocks = useMemo(() => parseMarkdownLight(markdown), [markdown])

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <details className="art-official-sot">
      <summary className="art-official-sot__summary">
        <span className="art-official-sot__chevron" aria-hidden>
          ▸
        </span>
        <span className="art-official-sot__summary-label">
          Source of truth — field map, envelopes, editions, events, blocked fields
        </span>
      </summary>
      <div className="art-official-sot__toolbar">
        <p className="art-official-sot__note">
          Live operator index for Art/Official. When a session paste or dialogue disagrees with a
          spec file, check here first. Bernard is final arbiter on intent disagreements.
        </p>
        <button type="button" className="art-official-sot__copy" onClick={() => void copyAll()}>
          {copied ? 'Copied' : 'Copy markdown'}
        </button>
      </div>
      <div className="art-official-sot__content">
        {blocks.map((block, index) => {
          if (block.type === 'h1') {
            return (
              <h2 key={index} className="art-official-sot__h1">
                <Inline text={block.text} />
              </h2>
            )
          }
          if (block.type === 'h2') {
            return (
              <h3 key={index} className="art-official-sot__h2">
                <Inline text={block.text} />
              </h3>
            )
          }
          if (block.type === 'h3') {
            return (
              <h4 key={index} className="art-official-sot__h3">
                <Inline text={block.text} />
              </h4>
            )
          }
          if (block.type === 'p') {
            return (
              <p key={index} className="art-official-sot__p">
                <Inline text={block.text} />
              </p>
            )
          }
          if (block.type === 'li') {
            return (
              <div key={index} className="art-official-sot__li">
                <Inline text={block.text} />
              </div>
            )
          }
          if (block.type === 'code') {
            return (
              <pre key={index} className="art-official-sot__code">
                <code>{block.text}</code>
              </pre>
            )
          }
          if (block.type === 'hr') {
            return <hr key={index} className="art-official-sot__hr" />
          }
          if (block.type === 'table') {
            return (
              <div key={index} className="art-official-sot__table-wrap">
                <table className="art-official-sot__table">
                  <thead>
                    <tr>
                      {block.headers.map((header) => (
                        <th key={header}>
                          <Inline text={header} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
          return null
        })}
      </div>
      <p className="art-official-sot__footer">
        File: <code>docs/corpus/art-official-source-of-truth.md</code>
      </p>
    </details>
  )
}
