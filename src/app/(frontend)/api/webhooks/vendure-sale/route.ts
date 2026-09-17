import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  applyTriptychPrintSalesFromLines,
} from '@/lib/commerce/decrementTriptychPrintCount'
import {
  collectLineSelections,
  parseVendureSalePayload,
} from '@/lib/commerce/vendureSalePayload'
import {
  isUniqueConstraintError,
  verifyVendureWebhookSignature,
} from '@/lib/commerce/vendureWebhookSignature'
import type { WebhookEvent } from '@/payload-types'
import config from '@payload-config'

export const runtime = 'nodejs'

type PayloadClient = Awaited<ReturnType<typeof getPayload>>
type WebhookJson = WebhookEvent['rawPayload']

type DbTransactions = {
  beginTransaction?: () => Promise<string | number | boolean | null>
  commitTransaction?: (id: string | number) => Promise<void>
  rollbackTransaction?: (id: string | number) => Promise<void>
}

function asWebhookJson(value: unknown): WebhookJson {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  if (Array.isArray(value) || (typeof value === 'object' && value !== undefined)) {
    return value as WebhookJson
  }
  return null
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

function duplicateOk() {
  return NextResponse.json({ ok: true, duplicate: true })
}

/**
 * App Router Route Handlers do not auto-parse JSON.
 * `request.arrayBuffer()` is the raw body bytes HMAC must be computed over.
 * Do not `JSON.stringify` a parsed object — that changes bytes and breaks the signature.
 */
async function readRawBody(request: Request): Promise<Buffer> {
  return Buffer.from(await request.arrayBuffer())
}

async function orderAlreadyProcessed(payload: PayloadClient, orderCode: string): Promise<boolean> {
  const existing = await payload.find({
    collection: 'webhook-events',
    where: { orderCode: { equals: orderCode } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { orderCode: true },
  })
  return existing.docs.length > 0
}

async function persistSale(args: {
  payload: PayloadClient
  orderId: string
  orderCode: string
  channel: string | null
  occurredAt: string | null
  rawPayload: WebhookJson
  selectionIds: WebhookJson
  selectionSnapshot: WebhookJson
  updates: Array<{ triptychId: number | string; printSets: unknown }>
  transactionID?: string | number
}) {
  const req = args.transactionID != null ? { transactionID: args.transactionID } : undefined

  await args.payload.create({
    collection: 'webhook-events',
    data: {
      orderCode: args.orderCode,
      orderId: args.orderId,
      channel: args.channel,
      occurredAt: args.occurredAt,
      receivedAt: new Date().toISOString(),
      rawPayload: args.rawPayload,
      selectionIds: args.selectionIds,
      selectionSnapshot: args.selectionSnapshot,
      processed: false,
    },
    overrideAccess: true,
    req,
  })

  for (const update of args.updates) {
    await args.payload.update({
      collection: 'triptychs',
      id: update.triptychId,
      data: { printSets: update.printSets } as never,
      overrideAccess: true,
      context: { skipHooks: true },
      req,
    })
  }
}

/**
 * Vendure → Payload sync when an order settles.
 * Decrements `printSets[].printAvailableCount` for matching lines.
 * Stores the raw event for later SmallPrints backfill; processed stays false.
 *
 * POST /api/webhooks/vendure-sale
 */
export async function POST(request: Request) {
  const secret = process.env.VENDURE_WEBHOOK_SECRET
  if (!secret) {
    return jsonError('Webhook is not configured', 500)
  }

  const rawBody = await readRawBody(request)
  const verified = verifyVendureWebhookSignature({
    timestampHeader: request.headers.get('x-vendure-timestamp'),
    signatureHeader: request.headers.get('x-vendure-signature'),
    rawBody,
    secret,
  })
  if (!verified.ok) {
    return jsonError(verified.error, 401)
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const parsed = parseVendureSalePayload(parsedJson)
  if (!parsed.ok) {
    return jsonError(parsed.error, 400)
  }

  const sale = parsed.data
  const selections = collectLineSelections(sale.lines)

  let payload: PayloadClient
  try {
    payload = await getPayload({ config })
  } catch {
    return jsonError('Database unavailable', 500)
  }

  try {
    if (await orderAlreadyProcessed(payload, sale.orderCode)) {
      return duplicateOk()
    }

    const { docs } = await payload.find({
      collection: 'triptychs',
      limit: 500,
      depth: 0,
      overrideAccess: true,
      select: { printSets: true },
    })

    const applied = applyTriptychPrintSalesFromLines(docs, sale.lines)
    if (!applied.ok) {
      return jsonError('quantitySold must be a positive number', 400)
    }

    const persistArgs = {
      payload,
      orderId: sale.orderId,
      orderCode: sale.orderCode,
      channel: sale.channel,
      occurredAt: sale.occurredAt,
      rawPayload: asWebhookJson(parsedJson),
      selectionIds: asWebhookJson(selections.selectionIds),
      selectionSnapshot: asWebhookJson(selections.selectionSnapshot),
      updates: applied.updates,
    }

    const db = payload.db as DbTransactions
    const transactionID = (await db.beginTransaction?.()) ?? null
    const canUseTx =
      transactionID !== null &&
      transactionID !== false &&
      typeof db.commitTransaction === 'function' &&
      typeof db.rollbackTransaction === 'function'

    if (canUseTx) {
      const txId = transactionID as string | number
      try {
        await persistSale({ ...persistArgs, transactionID: txId })
        await db.commitTransaction!(txId)
      } catch (err) {
        await db.rollbackTransaction!(txId)
        throw err
      }
    } else {
      await persistSale(persistArgs)
    }

    return NextResponse.json({
      ok: true,
      orderCode: sale.orderCode,
      duplicate: false,
    })
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return duplicateOk()
    }

    console.error(
      'vendure-sale webhook failed',
      err instanceof Error ? err.message : 'unknown error',
    )
    return jsonError('Internal error', 500)
  }
}
