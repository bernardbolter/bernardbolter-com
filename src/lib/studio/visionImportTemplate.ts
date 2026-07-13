import {
  buildVisionPhoneWorkflowPrompt,
  VISION_ANALYSIS_PROMPT_A1_0,
  VISION_IMPORT_JSON_RULES,
  VISION_PROMPT_VERSION,
} from './visionAnalysisPrompt'

export {
  VISION_ANALYSIS_PROMPT_A1_0,
  VISION_IMPORT_JSON_RULES,
  VISION_PROMPT_VERSION,
  buildVisionAnalysisPrompt,
  buildVisionImportJsonPrompt,
  buildVisionPhoneWorkflowPrompt,
} from './visionAnalysisPrompt'

/** Full phone workflow: A-1.0 analysis + Studio import JSON. */
export const VISION_IMPORT_CLAUDE_PROMPT = buildVisionPhoneWorkflowPrompt()

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
