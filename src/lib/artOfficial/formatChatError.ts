/** Turn Anthropic / fetch errors into a short admin-friendly message. */
export function formatChatError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Chat request failed.'
  }

  const raw = err.message

  try {
    const parsed = JSON.parse(raw) as {
      error?: { type?: string; message?: string }
    }
    if (parsed.error?.message) {
      if (parsed.error.message.includes('model:')) {
        const model = parsed.error.message.replace(/^model:\s*/, '')
        return `Anthropic model not found: "${model}". Set ART_OFFICIAL_MODEL in .env to a current model (e.g. claude-sonnet-4-6) and restart the dev server.`
      }
      return parsed.error.message
    }
  } catch {
    // not JSON
  }

  if (raw.includes('model:')) {
    const match = raw.match(/model:\s*([^\s"}]+)/)
    const model = match?.[1] ?? 'unknown'
    return `Anthropic model not found: "${model}". Update ART_OFFICIAL_MODEL in .env (try claude-sonnet-4-6) and restart npm run dev.`
  }

  const lower = raw.toLowerCase()
  if (lower.includes('internal server error')) {
    return 'Anthropic or the app server returned an internal error. Wait a moment and send again. If it repeats, refresh the page and check the dev server terminal for a stack trace.'
  }
  if (lower.includes('overloaded') || lower.includes('529')) {
    return 'The AI API is temporarily overloaded. Wait 30–60 seconds and try again.'
  }
  if (
    lower.includes('prompt is too long') ||
    lower.includes('context length') ||
    lower.includes('too many tokens')
  ) {
    return 'This conversation is too long for one request. Start a new biography session or send a shorter message.'
  }
  if (lower.includes('credit balance') || lower.includes('billing')) {
    return 'Anthropic API billing or quota issue. Check your Anthropic account and API key.'
  }
  if (lower.includes('authentication') || lower.includes('api key')) {
    return 'Anthropic API key problem. Check ANTHROPIC_API_KEY in .env and restart the dev server.'
  }

  return raw
}
