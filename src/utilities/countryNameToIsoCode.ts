/** Common country names on artist records → ISO 3166-1 alpha-2. */
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  germany: 'DE',
  deutschland: 'DE',
  usa: 'US',
  'united states': 'US',
  'united states of america': 'US',
  'u.s.a.': 'US',
  'u.s.': 'US',
  'united kingdom': 'GB',
  uk: 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  france: 'FR',
  switzerland: 'CH',
  schweiz: 'CH',
  italy: 'IT',
  spain: 'ES',
  netherlands: 'NL',
  belgium: 'BE',
  austria: 'AT',
  canada: 'CA',
  australia: 'AU',
  japan: 'JP',
  china: 'CN',
  mexico: 'MX',
  brazil: 'BR',
}

/** Map a stored country label to ISO 3166-1 alpha-2 when possible. */
export function countryNameToIsoCode(country: string | null | undefined): string | undefined {
  if (!country?.trim()) return undefined

  const trimmed = country.trim()
  if (/^[a-z]{2}$/i.test(trimmed)) return trimmed.toUpperCase()

  return COUNTRY_NAME_TO_ISO[trimmed.toLowerCase()]
}
