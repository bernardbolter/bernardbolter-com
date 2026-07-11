'use client'

import FrontendError from './error'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  console.error('[global-error]', error.digest ?? error.message)
  return (
    <html lang="en">
      <body>
        <FrontendError error={error} reset={reset} />
      </body>
    </html>
  )
}
