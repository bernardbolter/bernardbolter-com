import fs from 'node:fs/promises'
import path from 'node:path'

export type WhisperTranscription = {
  text: string
  language: string
}

type WhisperJsonResponse = {
  text?: string
  language?: string
}

/** faster-whisper sidecar — default matches ahmetoner/whisper-asr-webservice. */
export function getWhisperUrl(): string {
  return process.env.WHISPER_URL?.replace(/\/$/, '') || 'http://127.0.0.1:9000'
}

export function parseWhisperResponse(body: WhisperJsonResponse): WhisperTranscription {
  const text = body.text?.trim() ?? ''
  const language = body.language?.trim() || 'unknown'
  return { text, language }
}

/**
 * Transcribe a 16 kHz mono WAV via the local Whisper HTTP sidecar.
 *
 * Sidecar contract (whisper-asr-webservice):
 *   POST /asr?encode=true&task=transcribe&output=json
 *   multipart field: audio_file
 */
export async function transcribeAudioFile(wavPath: string): Promise<WhisperTranscription> {
  const audioBytes = await fs.readFile(wavPath)
  const form = new FormData()
  form.append('audio_file', new Blob([audioBytes]), path.basename(wavPath))

  const url = `${getWhisperUrl()}/asr?encode=true&task=transcribe&output=json`
  const response = await fetch(url, { method: 'POST', body: form })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `Whisper sidecar failed (${response.status}): ${detail.slice(0, 500) || response.statusText}`,
    )
  }

  const body = (await response.json()) as WhisperJsonResponse
  return parseWhisperResponse(body)
}
