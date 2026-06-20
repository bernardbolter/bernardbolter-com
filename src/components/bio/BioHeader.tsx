interface BioHeaderProps {
  name?: string | null
  birthLine?: string | null
  livesAndWorksLine?: string | null
}

export default function BioHeader({ name, birthLine, livesAndWorksLine }: BioHeaderProps) {
  if (!name && !birthLine && !livesAndWorksLine) return null

  return (
    <header className="bio__header">
      {name ? <h2 className="bio__name">{name}</h2> : null}
      {birthLine ? <p className="bio__birth">{birthLine}</p> : null}
      {livesAndWorksLine ? <p className="bio__locations">{livesAndWorksLine}</p> : null}
    </header>
  )
}
