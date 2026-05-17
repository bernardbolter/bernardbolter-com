import { NextResponse } from 'next/server'
import { getPayload } from 'payload'

import {
  decrementTriptychPrintAvailableCount,
  findTriptychByVendurePrintProductId,
} from '@/lib/commerce/decrementTriptychPrintCount'
import config from '@payload-config'

type WebhookBody = {
  vendureProductId?: string
  quantitySold?: number
}

function verifyWebhookSecret(request: Request): boolean {
  const expected = process.env.VENDURE_WEBHOOK_SECRET
  if (!expected) return false

  const headerSecret = request.headers.get('x-vendure-webhook-secret')
  if (headerSecret && headerSecret === expected) return true

  const auth = request.headers.get('authorization')
  if (auth === `Bearer ${expected}`) return true

  return false
}

/**
 * Vendure → Payload sync when a triptych print edition sells.
 * Decrements `printSets[].printAvailableCount` on the matching Triptych record.
 *
 * POST /api/webhooks/vendure-sale
 * Body: { vendureProductId: string, quantitySold: number }
 */
export async function POST(request: Request) {
  if (!verifyWebhookSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: WebhookBody
  try {
    body = (await request.json()) as WebhookBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const vendureProductId =
    typeof body.vendureProductId === 'string' ? body.vendureProductId.trim() : ''
  const quantitySold = body.quantitySold

  if (!vendureProductId) {
    return NextResponse.json({ error: 'vendureProductId is required' }, { status: 400 })
  }

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'triptychs',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: {
      printSets: true,
    },
  })

  const triptych = findTriptychByVendurePrintProductId(docs, vendureProductId)
  if (!triptych) {
    return NextResponse.json({ error: 'Triptych not found for product ID' }, { status: 404 })
  }

  const result = decrementTriptychPrintAvailableCount(
    triptych,
    vendureProductId,
    typeof quantitySold === 'number' ? quantitySold : Number(quantitySold),
  )

  if (!result.ok) {
    if (result.reason === 'not-found') {
      return NextResponse.json({ error: 'Print set row not found' }, { status: 404 })
    }
    if (result.reason === 'invalid-quantity') {
      return NextResponse.json({ error: 'quantitySold must be a positive number' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Triptych has no print sets' }, { status: 412 })
  }

  await payload.update({
    collection: 'triptychs',
    id: result.triptychId,
    data: { printSets: result.printSets },
    overrideAccess: true,
    context: { skipHooks: true },
  })

  return NextResponse.json({
    ok: true,
    triptychId: result.triptychId,
    printSets: result.printSets,
  })
}
