/** Parse JSON pasted from Claude; tolerates ```json fences. */
export function parseImportJson(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('Paste JSON first.')
  }

  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  const body = fenceMatch ? fenceMatch[1]!.trim() : trimmed

  return JSON.parse(body)
}
