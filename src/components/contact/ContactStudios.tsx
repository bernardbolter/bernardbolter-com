import { getContactStudioLocations } from '@/lib/contact/contactStudioLocations'
import type { Artist } from '@/payload-types'

type Props = {
  artist: Artist
}

function StudioCard({
  location,
}: {
  location: ReturnType<typeof getContactStudioLocations>[number]
}) {
  const cardContent = (
    <>
      <div className="aspect-video w-full overflow-hidden">
        <img
          src={location.mapImageUrl}
          alt={location.mapAlt}
          width={location.mapImageWidth}
          height={location.mapImageHeight}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="px-[1rem] py-[0.75rem]">
        {location.buildingName ? (
          <p className="font-heading text-sm font-semibold text-primary">{location.buildingName}</p>
        ) : null}
        {location.streetAddress ? (
          <p className="font-heading text-[0.8125rem] leading-[1.5] text-muted">
            {location.streetAddress}
          </p>
        ) : null}
        <p className="font-heading text-[0.8125rem] leading-[1.5] text-muted">
          {location.city}, {location.country}
        </p>
      </div>
    </>
  )

  const className =
    'block h-full overflow-hidden rounded-[0.25rem] border border-[#eee] bg-white transition-[border-color] hover:border-[#ccc]'

  if (location.mapLinkUrl) {
    return (
      <a
        href={location.mapLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} no-underline`}
      >
        {cardContent}
      </a>
    )
  }

  return <div className={className}>{cardContent}</div>
}

export default function ContactStudios({ artist }: Props) {
  const studioLocations = getContactStudioLocations(artist)
  if (!studioLocations.length) return null

  return (
    <section className="w-full border-t border-[var(--ui-line)] pt-[1.875rem]">
      <h3 className="mb-[0.75rem] font-heading text-base font-bold text-primary">Studios</h3>
      <div className="grid w-full grid-cols-1 gap-[1.5rem] l:grid-cols-2">
        {studioLocations.map((location) => (
          <StudioCard key={location.id} location={location} />
        ))}
      </div>
    </section>
  )
}
