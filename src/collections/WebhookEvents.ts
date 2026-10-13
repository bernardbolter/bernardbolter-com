import type { CollectionConfig } from 'payload'

import { isArtistOrAdmin } from '@/access/isArtistOrAdmin'

/**
 * Idempotency log for inbound Vendure sale webhooks.
 * One row per orderCode. Print counts apply on first insert; selection-based
 * SmallPrints counting is deferred (processed stays false until that exists).
 */
export const WebhookEvents: CollectionConfig = {
  slug: 'webhook-events',
  labels: { singular: 'Webhook event', plural: 'Webhook events' },
  admin: {
    useAsTitle: 'orderCode',
    defaultColumns: ['orderCode', 'channel', 'processed', 'occurredAt', 'receivedAt'],
    description:
      'Inbound Vendure sale webhooks. Unique on orderCode so retries never double-apply counts.',
  },
  access: {
    read: ({ req: { user } }) => isArtistOrAdmin(user),
    create: ({ req: { user } }) => isArtistOrAdmin(user),
    update: ({ req: { user } }) => isArtistOrAdmin(user),
    delete: ({ req: { user } }) => isArtistOrAdmin(user),
  },
  fields: [
    {
      name: 'orderCode',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        readOnly: true,
        description: 'Vendure order code — idempotency key.',
      },
    },
    {
      name: 'orderId',
      type: 'text',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'channel',
      type: 'text',
      admin: { readOnly: true },
    },
    {
      name: 'occurredAt',
      type: 'date',
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'receivedAt',
      type: 'date',
      required: true,
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'rawPayload',
      type: 'json',
      required: true,
      admin: {
        readOnly: true,
        description: 'Full webhook JSON as received, for audit and later backfill.',
      },
    },
    {
      name: 'selectionIds',
      type: 'json',
      admin: {
        readOnly: true,
        description: 'Per-line selectionIds from the webhook (null on lines with no selection).',
      },
    },
    {
      name: 'selectionSnapshot',
      type: 'json',
      admin: {
        readOnly: true,
        description:
          'Per-line selectionSnapshot from the webhook. SmallPrints counting is not applied yet.',
      },
    },
    {
      name: 'processed',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'False until selection-based SmallPrints counts can be applied. Print available counts are applied on insert regardless.',
      },
    },
  ],
}
