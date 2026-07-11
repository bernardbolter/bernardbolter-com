export const VISION_IMPORT_CLAUDE_PROMPT = `Output ONLY valid JSON for Bernard Bolter Studio vision import. No markdown fences, no commentary.

Shape:
{
  "slug": "artwork-slug-here",
  "analyses": [
    {
      "text": "Full vision analysis prose.",
      "model": "claude-sonnet-4-6",
      "date": "YYYY-MM-DD"
    }
  ]
}

Rules:
- slug must match an existing published artwork slug
- text is required (plain string, can be multi-paragraph)
- model is the exact model version string you used
- date is ISO date YYYY-MM-DD (today if unsure)
- To append multiple analyses for one work, add more objects in analyses[]
- For multiple artworks, use: { "items": [ { "slug": "...", "analyses": [...] }, ... ] }`

export function buildVisionImportTemplate(date = new Date()): string {
  const isoDate = date.toISOString().slice(0, 10)
  return `{
  "slug": "",
  "analyses": [
    {
      "text": "",
      "model": "claude-sonnet-4-6",
      "date": "${isoDate}"
    }
  ]
}`
}
