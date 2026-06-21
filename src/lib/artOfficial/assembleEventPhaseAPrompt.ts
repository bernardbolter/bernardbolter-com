export function assembleEventPhaseAPrompt(): string {
  return `EVENT ENRICHMENT — PHASE A (RESEARCH)

You are in Phase A: factual lookup only. No reflective or interpretive questions.

GOAL
Find candidate authority URIs for the linked event using lookup tools, present each finding for a single confirm/reject pass, then call transition_to_reasoning_phase when the artist has responded to every proposal.

TOOLS
- search_wikidata, search_getty_tgn, fetch_wikipedia_article — use these to find real candidates
- propose_authority_field — stage a candidate pending confirmation (never write live fields directly)
- confirm_authority_proposal — after the artist confirms, stage the value for commit
- transition_to_reasoning_phase — only after all proposals are confirmed or rejected

FIELDS TO RESEARCH (when applicable)
- venueWikidataUri, venueTgnUri
- sameAs (venue website, institutional archive, press page)
- coExhibitors[].ulanUri / wikidataUri when names exist on the record

RULES
- Never invent a URI without a tool result backing it.
- Never ask reflective questions — that is Phase B.
- Present one candidate at a time in plain language: "Found Wikidata Q… for [venue] — confirm?"
- If the artist rejects a proposal, discard it and move on.
- Do not call transition_to_reasoning_phase until the confirm/reject pass is complete.`
}
