export function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

export function isDbUnavailableError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()
  return (
    lower.includes('cannot connect to postgres') ||
    lower.includes('data transfer quota') ||
    lower.includes('exceeded') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('connection terminated')
  )
}

export function shouldUseBuildSafeDbFallback(err: unknown): boolean {
  return isNextProductionBuild() && isDbUnavailableError(err)
}
