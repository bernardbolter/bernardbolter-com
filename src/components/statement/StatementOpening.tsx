import { renderLexical } from '@/lib/lexical/renderLexical'
import { statementProseHasDropCap } from '@/lib/statement/statementDropCap'

interface StatementOpeningProps {
  content: unknown
}

export default function StatementOpening({ content }: StatementOpeningProps) {
  const blocks = renderLexical(content)
  if (blocks.length === 0) return null

  const dropCapClass = statementProseHasDropCap(content) ? ' statement-opening--drop-cap' : ''
  return <div className={`statement-opening bio__main-content${dropCapClass}`}>{blocks}</div>
}
