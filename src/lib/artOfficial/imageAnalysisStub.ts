export type ImageAnalysisResult = {
  dominantColors: string[]
  aspectRatio: 'landscape' | 'portrait' | 'square'
  detectedSubjects: string[]
  compositionalNotes: string
  paintedFieldColors: string[]
  paintedFieldRects: Array<{ color: string; x: number; y: number; w: number; h: number }>
}

export async function runImageAnalysisStub(_args: {
  mediaId: number
}): Promise<ImageAnalysisResult> {
  return {
    dominantColors: ['#3a4a5b', '#d8c9a3', '#f1ede4'],
    aspectRatio: 'landscape',
    detectedSubjects: [],
    compositionalNotes: 'Stub analysis — replace with real pipeline.',
    paintedFieldColors: [],
    paintedFieldRects: [],
  }
}
