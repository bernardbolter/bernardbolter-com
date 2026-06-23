import type { Event } from '@/payload-types'

export function schemaOrgEventType(eventType: Event['eventType']): string {
  switch (eventType) {
    case 'solo-exhibition':
    case 'group-exhibition':
    case 'art-fair':
      return 'ExhibitionEvent'
    case 'performance':
      return 'PerformanceEvent'
    case 'education':
      return 'EducationEvent'
    default:
      return 'Event'
  }
}
