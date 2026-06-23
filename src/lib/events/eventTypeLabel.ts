import { EVENT_TYPE_OPTIONS } from '@/lib/artOfficial/eventTypeOptions'
import type { Event } from '@/payload-types'

export function eventTypeDisplayLabel(eventType: Event['eventType']): string | null {
  if (!eventType) return null
  if (eventType === 'other') return null
  const match = EVENT_TYPE_OPTIONS.find((option) => option.value === eventType)
  return match?.label ?? null
}
