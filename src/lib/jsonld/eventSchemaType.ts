import type { Event } from '@/payload-types'

export function schemaOrgEventType(eventType: Event['eventType']): string {
  switch (eventType) {
    case 'solo-exhibition':
    case 'group-exhibition':
      return 'ExhibitionEvent'
    case 'art-fair':
      return 'Event'
    case 'publication':
    case 'bibliography':
      return 'PublicationEvent'
    case 'screening':
      return 'ScreeningEvent'
    case 'performance':
      return 'PerformanceEvent'
    case 'education':
      return 'EducationEvent'
    default:
      return 'Event'
  }
}
