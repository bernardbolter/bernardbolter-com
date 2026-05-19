'use client'

import {
  ARTWORK_UPLOAD_DONE_TOP,
  ARTWORK_UPLOAD_DONE_UPLOADED,
} from '@/lib/artOfficial/artworkUploadCopy'
import {
  BLIND_DESCRIPTION_TIPS,
  PRE_UPLOAD_OVERVIEW,
  PRE_UPLOAD_STEPS,
  PRE_UPLOAD_WHY_PARAGRAPHS,
  resolvePreUploadStep,
} from '@/lib/artOfficial/preUploadGuide'

export function PreUploadPanel({
  hasFirstImpression,
  preUploadStep,
  assistantTurns,
  awaitingAssistant,
  needsImageUpload,
}: {
  hasFirstImpression: boolean
  preUploadStep?: number | null
  assistantTurns: number
  awaitingAssistant: boolean
  /** True when blind description is saved but artwork image not uploaded yet */
  needsImageUpload?: boolean
}) {
  const phaseComplete = hasFirstImpression
  const currentStep = resolvePreUploadStep({
    preUploadStep,
    assistantTurns,
    hasFirstImpression,
    awaitingAssistant,
  })
  const step = PRE_UPLOAD_STEPS[currentStep - 1]

  if (phaseComplete) {
    if (!needsImageUpload) {
      return (
        <p className="art-official-preupload__done-banner art-official-preupload__done-banner--uploaded">
          {ARTWORK_UPLOAD_DONE_UPLOADED}
        </p>
      )
    }
    return (
      <p className="art-official-preupload__done-banner" id="preupload-complete">
        {ARTWORK_UPLOAD_DONE_TOP}
      </p>
    )
  }

  return (
    <section className="art-official-preupload" aria-labelledby="preupload-heading">
      <h2 id="preupload-heading" className="art-official-preupload__title">
        Before you upload
      </h2>
      {currentStep === 1 ? (
        <div className="art-official-preupload__why">
          {PRE_UPLOAD_WHY_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph.slice(0, 48)}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      <p className="art-official-preupload__overview">{PRE_UPLOAD_OVERVIEW}</p>

      <div
        className="art-official-preupload__progress"
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={4}
        aria-label={`Pre-upload question ${currentStep} of 4`}
      >
        {PRE_UPLOAD_STEPS.map((s) => (
          <span
            key={s.number}
            className={
              s.number < currentStep
                ? 'art-official-preupload__dot art-official-preupload__dot--done'
                : s.number === currentStep
                  ? 'art-official-preupload__dot art-official-preupload__dot--current'
                  : 'art-official-preupload__dot'
            }
            aria-hidden
          />
        ))}
        <span className="art-official-preupload__progress-label">
          Question {currentStep} of 4
        </span>
      </div>

      <article
        className={
          currentStep === 4
            ? 'art-official-preupload__step art-official-preupload__step--blind'
            : 'art-official-preupload__step'
        }
      >
        <h3 className="art-official-preupload__step-title">{step.title}</h3>
        <blockquote className="art-official-preupload__question">{step.question}</blockquote>
        <p className="art-official-preupload__purpose">{step.purpose}</p>
        {currentStep === 4 ? (
          <ul className="art-official-preupload__tips">
            {BLIND_DESCRIPTION_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : null}
      </article>

      <p className="art-official-preupload__status">
        {awaitingAssistant
          ? 'Art/Official is responding…'
          : 'Type your answer in the chat below, then send.'}
      </p>
    </section>
  )
}
