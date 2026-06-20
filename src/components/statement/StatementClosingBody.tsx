import { renderLexical } from '@/lib/lexical/renderLexical'

interface StatementClosingBodyProps {
  content: unknown
}

export default function StatementClosingBody({ content }: StatementClosingBodyProps) {
  const blocks = renderLexical(content)
  if (blocks.length === 0) return null

  return <div className="statement-closing-body bio__main-content">{blocks}</div>
}
