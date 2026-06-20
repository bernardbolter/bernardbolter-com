import { renderLexical } from '@/lib/lexical/renderLexical'

interface StatementMiddleBodyProps {
  content: unknown
}

export default function StatementMiddleBody({ content }: StatementMiddleBodyProps) {
  const blocks = renderLexical(content)
  if (blocks.length === 0) return null

  return <div className="statement-middle-body bio__main-content">{blocks}</div>
}
