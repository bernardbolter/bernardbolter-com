/** Parse non-OK chat API responses into a user-facing message + optional code. */
export function parseChatHttpError(
  status: number,
  body: unknown,
  rawText?: string,
): { message: string; code?: string } {
  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>
    if (typeof record.error === 'string') {
      return {
        message: record.error,
        code: typeof record.code === 'string' ? record.code : undefined,
      }
    }
    if (typeof record.message === 'string') {
      return { message: record.message }
    }
  }

  const text = rawText?.trim() ?? ''
  if (text && !text.startsWith('<')) {
    return { message: text.slice(0, 500) }
  }

  switch (status) {
    case 401:
      return {
        message:
          'You are not signed in to the admin. Log in again, then reopen this session.',
        code: 'UNAUTHORIZED',
      }
    case 429:
      return {
        message: 'Too many messages in a short time. Wait a minute and try again.',
        code: 'RATE_LIMIT',
      }
    case 412:
      return {
        message:
          'Setup is incomplete for this session (missing Artist or Practice Knowledge). See the steps below.',
        code: 'PRECONDITION',
      }
    case 500:
    case 502:
    case 503:
      return {
        message:
          'The server hit an error before the chat could stream. Your message may not have been saved — refresh the page and try again. If it keeps happening, check the terminal running npm run dev for details.',
        code: 'SERVER_ERROR',
      }
    default:
      return {
        message: `Chat request failed (HTTP ${status}). Refresh and try again.`,
        code: 'HTTP_ERROR',
      }
  }
}
