import type { SeriesMention } from '@/lib/bio/linkSeriesMentions'
import { renderLexical } from '@/lib/lexical/renderLexical'

interface BioProseProps {
  content: unknown
  seriesMentions?: SeriesMention[]
}

export default function BioProse({ content, seriesMentions = [] }: BioProseProps) {
  const blocks = renderLexical(content, seriesMentions)
  if (blocks.length === 0) return null

  return <div className="bio__main-content">{blocks}</div>
}
