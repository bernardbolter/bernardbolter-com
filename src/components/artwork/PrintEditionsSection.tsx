import type { Artwork } from '@/payload-types'

type Props = {
  artwork: Artwork
}

function formatPrice(price: number, currency: string | null | undefined): string {
  const code = currency ?? 'EUR'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(price)
}

export default function PrintEditionsSection({ artwork }: Props) {
  const editions = artwork.editions ?? []
  if (editions.length === 0) return null

  return (
    <div className="artwork-image__info--print-editions-wrapper">
      <h2>Print Editions</h2>
      <ul className="artwork-image__info--print-editions">
        {editions.map((edition) => {
          const parts = [
            edition.formatLabel,
            edition.widthCm && edition.heightCm ? `${edition.widthCm} × ${edition.heightCm} cm` : null,
            edition.substrate,
            typeof edition.pricePerPrint === 'number'
              ? formatPrice(edition.pricePerPrint, edition.currency)
              : null,
            typeof edition.remaining === 'number' && typeof edition.totalEditionSize === 'number'
              ? `${edition.remaining} of ${edition.totalEditionSize} remaining`
              : null,
          ].filter(Boolean)

          return <li key={edition.id ?? edition.formatLabel}>{parts.join(' · ')}</li>
        })}
      </ul>
      {artwork.editionNotes ? (
        <p className="artwork-page__prose px-3 py-2">{artwork.editionNotes}</p>
      ) : null}
    </div>
  )
}
