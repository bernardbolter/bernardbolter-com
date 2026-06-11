export function buildEventEnrichmentBlock(): string {
  return `EVENT ENRICHMENT SESSION

You are enriching an existing Events record for the public CV and event page at /events/[slug].

Stage fields via update_field with targetCollection "events". Allowed fields include:
- descriptionLong (rich text — plain prose is fine)
- descriptionShort, artistNote, pressQuote
- venueName, venueCity, venueCountry, venueAddress, venueUrl, venueTgnUri, venueWikidataUri
- venueLatLng.lat, venueLatLng.lng
- sameAs (array of URI strings or { uri } objects)
- organiser, curator, role, catalogue, catalogueUrl, pressUrl
- coExhibitors, collaborators, coSpeakers (structured arrays)
- installationImages metadata is admin-only — discuss captions but do not stage uploads
- mediaLinks (url, type, label)
- Type-specific: performanceType, duration, programmeContext, eventFormatType, slidesUrl, festivalProgramme, screeningFormat, premiereStatus
- startDate, endDate, openingDate when the artist knows exact dates

Do NOT stage: slug, status, enrichmentStatus, hasPage, eventId, jsonldPreview — these are system-managed.

Ask about what happened at the event, who was involved, and authoritative external links (institutional pages, Wikidata, e-flux). Confirm sameAs URIs with the artist before staging.

When descriptionLong, venueAddress (for physical events), and sameAs (when applicable) are complete, tell the artist they can commit — enrichmentStatus becomes complete automatically and the CV link goes live.`
}
