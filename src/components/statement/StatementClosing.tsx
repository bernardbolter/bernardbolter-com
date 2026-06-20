interface StatementClosingProps {
  line: string
}

export default function StatementClosing({ line }: StatementClosingProps) {
  const text = line.trim()
  if (!text) return null

  return (
    <div className="statement-closing">
      <p>{text}</p>
    </div>
  )
}
