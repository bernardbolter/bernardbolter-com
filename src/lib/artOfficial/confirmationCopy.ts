export function wrapUpSummary(sessionType: string | null | undefined): string {
  switch (sessionType) {
    case 'artwork-cataloguing':
      return 'When you are finished in chat, open this panel to review what was staged (see the sidebar), then commit. That writes a draft Artwork in the CMS — you can add media, fix fields, and publish from the Artworks collection afterward.'
    case 'triptych-cataloguing':
      return 'When the triptych dialogue is complete, commit to save staged corpus fields to the Triptychs record. Panel wiring and video files stay in the CMS admin.'
    case 'onboarding':
      return 'When Practice Knowledge sections are staged, commit to write them to the knowledge base. You can re-apply later if you update the session.'
    case 'sequencing':
      return 'When order and date anchors are staged, commit to write sortIndex and anchors to Artworks and recompute timelineDate/dateDisplay for the series.'
    case 'biography':
    case 'artist-statement':
      return 'When the text is ready, commit to update your Artist record with the staged biography or statement fields.'
    case 'event-enrichment':
      return 'When the event narrative, tags, and keywords are staged, commit to update the Events record. Complete the tag wrap-up pass before committing.'
    default:
      return 'When you are done in chat, commit to save staged fields to the CMS.'
  }
}

export function commitButtonHint(sessionType: string | null | undefined): string {
  switch (sessionType) {
    case 'artwork-cataloguing':
      return 'Creates or updates a draft artwork from everything staged in this session (sidebar). Nothing is published until you publish in Artworks.'
    case 'onboarding':
      return 'Writes staged Practice Knowledge sections to the database and marks the session complete.'
    case 'sequencing':
      return 'Applies staged sortIndex and date anchors, recomputes timelineDate/dateDisplay, and marks the session complete.'
    case 'event-enrichment':
      return 'Writes staged event fields to the linked Events record and marks the session complete.'
    default:
      return 'Saves staged fields from this session to the CMS and marks the session complete.'
  }
}
