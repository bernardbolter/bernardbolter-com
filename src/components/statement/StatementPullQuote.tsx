interface StatementPullQuoteProps {
  line?: string | null
}

export default function StatementPullQuote({ line }: StatementPullQuoteProps) {
  const text = line?.trim()
  if (!text) return null

  return (
    <div className="statement-pullquote">
      <p>{text}</p>
    </div>
  )
}
