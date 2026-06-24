'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { generatePayloadCookie, getPayload } from 'payload'

import config from '@payload-config'
import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

export type StudioLoginState = { error?: string } | null

function studioDestination(from: string): string {
  const trimmed = from.trim()
  if (!trimmed.startsWith('/studio')) return '/studio'
  return trimmed
}

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    String((error as { digest?: string }).digest).startsWith('NEXT_REDIRECT')
  )
}

export async function studioLoginAction(
  _prev: StudioLoginState,
  formData: FormData,
): Promise<StudioLoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const destination = studioDestination(String(formData.get('from') ?? '/studio'))

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  try {
    const payload = await getPayload({ config })
    const result = await payload.login({
      collection: 'users',
      data: { email, password },
    })

    if (!result.token || !result.user) {
      return { error: 'Login failed. Check email and password.' }
    }

    if (!isArtistOrAdmin(result.user)) {
      return {
        error:
          'This account does not have studio access. Sign in at /admin or ask for the Artist or Admin role.',
      }
    }

    const usersCollection = payload.collections.users
    const cookie = generatePayloadCookie({
      collectionAuthConfig: usersCollection.config.auth,
      cookiePrefix: payload.config.cookiePrefix,
      token: result.token,
      returnCookieAsObject: true,
    })

    const cookieStore = await cookies()
    cookieStore.set(cookie.name, cookie.value ?? '', {
      domain: cookie.domain,
      expires: cookie.expires ? new Date(cookie.expires) : undefined,
      httpOnly: cookie.httpOnly ?? true,
      maxAge: cookie.maxAge,
      path: cookie.path ?? '/',
      sameSite: (cookie.sameSite?.toLowerCase() ?? 'lax') as 'lax' | 'none' | 'strict',
      secure: cookie.secure,
    })

    redirect(destination)
  } catch (error) {
    if (isNextRedirect(error)) throw error
    return { error: 'Login failed. Check email and password.' }
  }
}
