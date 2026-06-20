import type { Artist } from '@/payload-types'

import ContactPhoto from './ContactPhoto'
import ContactProvenance from './ContactProvenance'
import ContactSocials from './ContactSocials'
import ContactStatus from './ContactStatus'

type Props = {
  artist: Artist
}

export default function ContactZoneA({ artist }: Props) {
  return (
    <div className="contact-zone-a mx-auto w-full">
      <div className="contact-zone-a__grid">
        <div className="contact-zone-a__photo">
          <ContactPhoto artist={artist} />
          <ContactStatus artist={artist} />
        </div>
        <div className="contact-zone-a__prose">
          <ContactProvenance artist={artist} />
          <ContactSocials artist={artist} />
        </div>
      </div>
    </div>
  )
}
