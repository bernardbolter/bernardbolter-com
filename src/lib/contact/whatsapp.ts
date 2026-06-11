export function buildWhatsAppUrl(number: string, prefilledMessage?: string | null): string {
  const digits = number.replace(/\D/g, '')
  const base = `https://wa.me/${digits}`
  const message = prefilledMessage?.trim()
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}
