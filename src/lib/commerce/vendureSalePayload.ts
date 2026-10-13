export type VendureSaleLine = {
  vendureProductId: string
  vendureVariantId: string | null
  quantitySold: number
  selectionIds: unknown
  selectionSnapshot: unknown
}

export type VendureSalePayload = {
  event: string | null
  orderId: string
  orderCode: string
  occurredAt: string | null
  channel: string | null
  lines: VendureSaleLine[]
}

export type ParseSalePayloadResult =
  | { ok: true; data: VendureSalePayload }
  | { ok: false; error: string }

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseQuantitySold(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function parseLine(value: unknown, index: number): VendureSaleLine | { error: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { error: `lines[${index}] must be an object` }
  }

  const row = value as Record<string, unknown>
  const vendureProductId = asTrimmedString(row.vendureProductId)
  if (!vendureProductId) {
    return { error: `lines[${index}].vendureProductId is required` }
  }

  const quantitySold = parseQuantitySold(row.quantitySold)
  if (quantitySold === null || quantitySold < 1) {
    return { error: `lines[${index}].quantitySold must be a positive number` }
  }

  const vendureVariantId = asTrimmedString(row.vendureVariantId)

  return {
    vendureProductId,
    vendureVariantId,
    quantitySold,
    selectionIds: row.selectionIds ?? null,
    selectionSnapshot: row.selectionSnapshot ?? null,
  }
}

export function parseVendureSalePayload(body: unknown): ParseSalePayloadResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'Malformed body' }
  }

  const data = body as Record<string, unknown>
  const orderId = asTrimmedString(data.orderId)
  const orderCode = asTrimmedString(data.orderCode)

  if (!orderId) return { ok: false, error: 'orderId is required' }
  if (!orderCode) return { ok: false, error: 'orderCode is required' }

  if (!Array.isArray(data.lines)) {
    return { ok: false, error: 'lines must be an array' }
  }

  if (data.lines.length === 0) {
    return { ok: false, error: 'lines must not be empty' }
  }

  const lines: VendureSaleLine[] = []
  for (let i = 0; i < data.lines.length; i += 1) {
    const line = parseLine(data.lines[i], i)
    if ('error' in line) return { ok: false, error: line.error }
    lines.push(line)
  }

  const occurredAtRaw = asTrimmedString(data.occurredAt)
  let occurredAt: string | null = null
  if (occurredAtRaw) {
    const parsed = new Date(occurredAtRaw)
    occurredAt = Number.isNaN(parsed.getTime()) ? occurredAtRaw : parsed.toISOString()
  }

  return {
    ok: true,
    data: {
      event: asTrimmedString(data.event),
      orderId,
      orderCode,
      occurredAt,
      channel: asTrimmedString(data.channel),
      lines,
    },
  }
}

export function collectLineSelections(lines: VendureSaleLine[]): {
  selectionIds: unknown
  selectionSnapshot: unknown
} {
  const selectionIds = lines.map((line) => line.selectionIds)
  const selectionSnapshot = lines.map((line) => line.selectionSnapshot)
  const hasIds = selectionIds.some((value) => value != null)
  const hasSnapshots = selectionSnapshot.some((value) => value != null)

  return {
    selectionIds: hasIds ? selectionIds : null,
    selectionSnapshot: hasSnapshots ? selectionSnapshot : null,
  }
}
