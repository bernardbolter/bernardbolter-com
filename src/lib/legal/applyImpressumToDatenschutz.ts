import type { Artist } from '@/payload-types'

import { lexicalBulletList } from '@/lib/legal/buildLexicalDoc'

export type DatenschutzControllerInfo = {
  legalName: string
  streetAddress?: string
  postalCityCountry: string
  publicEmail?: string
}

export function impressumToControllerInfo(
  impressum: Artist['impressum'] | null | undefined,
): DatenschutzControllerInfo | null {
  const legalName = impressum?.legalName?.trim()
  if (!legalName) return null

  const postalCityCountry = [impressum?.postalCode, impressum?.city, impressum?.country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')

  return {
    legalName,
    streetAddress: impressum?.streetAddress?.trim() || undefined,
    postalCityCountry,
    publicEmail: impressum?.publicEmail?.trim() || undefined,
  }
}

export function controllerLinesForLocale(
  controller: DatenschutzControllerInfo,
  locale: 'en' | 'de',
): string[] {
  const emailLabel = locale === 'de' ? 'E-Mail' : 'Email'
  const lines = [controller.legalName]
  if (controller.streetAddress) lines.push(controller.streetAddress)
  if (controller.postalCityCountry) lines.push(controller.postalCityCountry)
  if (controller.publicEmail) lines.push(`${emailLabel}: ${controller.publicEmail}`)
  return lines
}

type LexicalBlock = Record<string, unknown>
type LexicalRoot = { root?: { children?: LexicalBlock[] } }

function headingText(block: LexicalBlock): string {
  const children = block.children as Array<{ type?: string; text?: string }> | undefined
  if (!children?.length) return ''
  return children
    .map((child) => (child.type === 'text' ? (child.text ?? '') : ''))
    .join('')
    .trim()
}

function patchMailtoInBlock(block: LexicalBlock, email: string): void {
  const walk = (node: Record<string, unknown>) => {
    if (node.type === 'link') {
      const fields = node.fields as { url?: string } | undefined
      if (fields?.url?.startsWith('mailto:')) {
        fields.url = `mailto:${email}`
        const children = node.children as Array<{ type?: string; text?: string }> | undefined
        const textChild = children?.find((child) => child.type === 'text')
        if (textChild) textChild.text = email
      }
    }
    const children = node.children as Record<string, unknown>[] | undefined
    children?.forEach(walk)
  }
  walk(block)
}

/** Replace controller address and contact email from Artist → Impressum at render time. */
export function applyImpressumToDatenschutz(
  content: unknown,
  impressum: Artist['impressum'] | null | undefined,
  locale: 'en' | 'de',
): unknown {
  const controller = impressumToControllerInfo(impressum)
  if (!controller || !content || typeof content !== 'object') return content

  const cloned = structuredClone(content) as LexicalRoot
  const blocks = cloned.root?.children
  if (!blocks?.length) return content

  const controllerHeading = locale === 'de' ? '1. Verantwortlicher' : '1. Controller'
  const controllerIndex = blocks.findIndex(
    (block) => block.type === 'heading' && headingText(block) === controllerHeading,
  )

  if (controllerIndex !== -1) {
    const lines = controllerLinesForLocale(controller, locale)
    for (let index = controllerIndex + 1; index < blocks.length; index += 1) {
      if (blocks[index]?.type === 'list') {
        blocks[index] = lexicalBulletList(lines)
        break
      }
      if (blocks[index]?.type === 'heading') break
    }
  }

  if (controller.publicEmail) {
    for (const block of blocks) {
      patchMailtoInBlock(block, controller.publicEmail)
    }
  }

  return cloned
}
