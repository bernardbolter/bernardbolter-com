'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

import type { StartRecommendation } from '@/lib/artOfficial/startRecommendation'
import type { SessionType } from '@/lib/artOfficial/routing'

import './artOfficialInstructions.scss'

function InstructionBlock({
  title,
  children,
  defaultOpen = false,
  variant = 'default',
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  variant?: 'default' | 'highlight' | 'warning'
}) {
  const panelClass = [
    'art-official-instructions__panel',
    variant === 'highlight' && 'art-official-instructions__panel--highlight',
    variant === 'warning' && 'art-official-instructions__panel--warning',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <details className={panelClass} open={defaultOpen}>
      <summary className="art-official-instructions__summary">
        <span className="art-official-instructions__chevron" aria-hidden>
          ▸
        </span>
        <span className="art-official-instructions__summary-label">{title}</span>
      </summary>
      <div className="art-official-instructions__body">{children}</div>
    </details>
  )
}

export function ArtOfficialInstructions({
  recommendation,
  practiceKnowledgeHref,
  artistsHref,
  artistCreateHref,
  artistExists,
}: {
  recommendation: StartRecommendation
  practiceKnowledgeHref: string
  artistsHref: string
  artistCreateHref: string
  artistExists: boolean
}) {
  return (
    <section className="art-official-instructions">
      {!artistExists ? (
        <InstructionBlock
          title="Required: create your Artist record before any session"
          defaultOpen
          variant="warning"
        >
          <p style={{ marginTop: 0 }}>
            Art/Official could not find an <strong>Artist</strong> row in the CMS. Every session
            (including onboarding) is linked to that single identity record. Without it,{' '}
            <strong>Start session</strong> will fail with “Artist singleton not found.”
          </p>
          <ol style={{ margin: '0 0 12px', paddingLeft: 20 }}>
            <li style={{ marginBottom: 8 }}>
              Open{' '}
              <Link href={artistsHref}>
                Artists in the admin
              </Link>
              . This archive expects exactly <strong>one</strong> artist row (your profile).
            </li>
            <li style={{ marginBottom: 8 }}>
              Click <strong>Create New</strong> (or go directly to{' '}
              <Link href={artistCreateHref}>create Artist</Link>).
            </li>
            <li style={{ marginBottom: 8 }}>
              Fill <strong>Professional name</strong> (e.g. Bernard Bolter) and, if different,{' '}
              <strong>Legal / full name</strong> (e.g. Bernard John Bolter IV). Slug is generated
              from the professional name. <strong>Career stage</strong> defaults to Studio.
            </li>
            <li style={{ marginBottom: 8 }}>
              Save the record, then return to this page and refresh. The warning should disappear
              and <strong>Start session</strong> will work.
            </li>
            <li style={{ marginBottom: 0 }}>
              After the Artist exists, run <strong>Onboarding</strong> first so Practice Knowledge
              is populated before heavy artwork cataloguing.
            </li>
          </ol>
          <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
            If you already created an Artist but still see this message, check that you are logged
            in as a user with the <strong>admin</strong> or <strong>artist</strong> role and that
            the record was saved successfully.
          </p>
        </InstructionBlock>
      ) : null}

      <InstructionBlock title="Start here" defaultOpen variant="highlight">
        {!artistExists ? (
          <>
            <p className="art-official-instructions__note" style={{ marginTop: 0 }}>
              Create your Artist record first (see the section above). Onboarding is still the
              recommended first session once setup is complete.
            </p>
            <p className="art-official-instructions__meta">
              Suggested session type after setup:{' '}
              <strong>{sessionTypeLabel(recommendation.sessionType)}</strong>
            </p>
          </>
        ) : (
          <>
            <p className="art-official-instructions__headline" style={{ marginTop: 0 }}>
              {recommendation.headline}
            </p>
            <p className="art-official-instructions__note">{recommendation.reason}</p>
            <p className="art-official-instructions__meta">
              Suggested session type:{' '}
              <strong>{sessionTypeLabel(recommendation.sessionType)}</strong> — choose it below,
              then click Start session.
            </p>
          </>
        )}
      </InstructionBlock>

      <InstructionBlock title="What is Art/Official?">
        <p style={{ marginTop: 0 }}>
          Art/Official is a guided conversation with an AI assistant that helps you catalogue works
          and refine how your practice is described in the archive. It does not write to your
          artworks or artist profile until you explicitly commit at the end of a session.
        </p>
        <p style={{ marginBottom: 0 }}>
          During chat, proposed field values are staged on the session. You review everything in the
          confirmation panel, edit if needed, then commit. Committed artworks are saved as{' '}
          <strong>drafts</strong> in the CMS until you publish them separately.
        </p>
      </InstructionBlock>

      <InstructionBlock title="Session types — which to use when">
        <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
          <li style={{ marginBottom: 10 }}>
            <strong>Onboarding</strong> — First-time setup. Covers practice overview, series, visual
            language, art-historical touchstones, and preferred vocabulary. Updates{' '}
            <Link href={practiceKnowledgeHref}>Practice Knowledge</Link> when you commit. Do this
            once before heavy cataloguing unless that content is already complete. Requires an
            Artist record but does not require artworks yet.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Artwork cataloguing</strong> — One work per session. Four pre-upload questions in
            chat first (time, place in your practice, where you made it, then a{' '}
            <strong>blind description</strong> before either of you sees the image). Upload unlocks
            after that; then year, medium, series, meaning, and references. Commit creates a new{' '}
            <strong>draft artwork</strong>.
          </li>
          <li style={{ marginBottom: 10 }}>
            <strong>Artist statement</strong> — Conversation to draft or refresh your statement text.
            Commit updates the statement in Practice Knowledge / artist-facing content (not a new
            artwork).
          </li>
          <li style={{ marginBottom: 0 }}>
            <strong>Biography</strong> — Structured CV-style biography and career narrative. Commit
            updates biography material tied to your <Link href={artistsHref}>Artist</Link> record
            and related knowledge entries.
          </li>
        </ul>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>
          Typical order: Artist record → Onboarding → several Artwork cataloguing sessions → Statement
          and Biography when you want those texts brought up to date.
        </p>
      </InstructionBlock>

      <InstructionBlock title="Before you start (checklist)">
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>
            <strong>Artist record (required):</strong> exactly one row in{' '}
            <Link href={artistsHref}>Artists</Link>. Create via{' '}
            <Link href={artistCreateHref}>Create New</Link> if the list is empty. Art/Official cannot
            start without it.
          </li>
          <li style={{ marginBottom: 8 }}>
            Skim <Link href={practiceKnowledgeHref}>Practice Knowledge</Link>. Onboarding fills this;
            for artwork sessions the agent reads it so openings and questions match your practice.
          </li>
          <li style={{ marginBottom: 8 }}>
            For <strong>Artwork cataloguing</strong>, have a representative image file ready (JPEG or
            PNG is fine).
          </li>
          <li style={{ marginBottom: 0 }}>
            Allow 20–45 minutes for a first onboarding or artwork session. You can leave and return
            via the session list while status is in progress.
          </li>
        </ol>
      </InstructionBlock>

      <InstructionBlock title="During a session">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>
            <strong>Onboarding:</strong> use <strong>Begin onboarding</strong> in the session view to
            start the interview (no image upload). The agent asks one question at a time; commit when
            you are satisfied.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong>Artwork cataloguing:</strong> the guide above the chat shows one pre-upload
            question at a time (1 of 4). Answer only that question in the message box; upload
            unlocks after the blind description. Use <strong>Begin cataloguing</strong> or type
            your own opener.
          </li>
          <li style={{ marginBottom: 8 }}>
            Reply in your own words. Short answers are fine; the agent will ask follow-ups where
            detail is missing.
          </li>
          <li style={{ marginBottom: 8 }}>
            Watch the sidebar for staged field updates (conversation vs analysis). Nothing is final
            until commit.
          </li>
          <li style={{ marginBottom: 8 }}>
            When the dialogue feels complete, use the confirmation panel to review staged fields,
            adjust text, then <strong>Commit</strong>.
          </li>
          <li style={{ marginBottom: 0 }}>
            Sessions flagged <em>needs refinement</em> had weak phases in the dialogue; reopen them
            to clarify before committing another work.
          </li>
        </ul>
      </InstructionBlock>

      <InstructionBlock title="After commit">
        <p style={{ marginTop: 0 }}>
          Open the new or updated record in the CMS collections to review fields and media. Artworks
          commit as <strong>published</strong> — add or fix anything in admin before the record is
          live on the site. Practice Knowledge and artist texts can be edited manually anytime
          without running another session.
        </p>
        <p style={{ marginBottom: 0 }}>
          Raw transcripts stay on the <strong>Sessions</strong> collection for audit; they are not
          exposed on the public site.
        </p>
      </InstructionBlock>
    </section>
  )
}

function sessionTypeLabel(t: SessionType): string {
  switch (t) {
    case 'onboarding':
      return 'Onboarding'
    case 'artwork-cataloguing':
      return 'Artwork cataloguing'
    case 'triptych-cataloguing':
      return 'Triptych cataloguing'
    case 'artist-statement':
      return 'Artist statement'
    case 'biography':
      return 'Biography'
    default:
      return t
  }
}
