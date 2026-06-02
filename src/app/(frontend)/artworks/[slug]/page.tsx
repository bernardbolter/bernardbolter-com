import { redirect } from 'next/navigation'

export const revalidate = 3600

type Props = { params: Promise<{ slug: string }> }

export default async function LegacyArtworkRoute({ params }: Props) {
  const { slug } = await params
  redirect(`/${slug}`)
}
