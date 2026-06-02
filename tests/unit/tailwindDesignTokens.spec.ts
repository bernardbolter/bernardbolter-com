import { describe, expect, it } from 'vitest'
import tailwindConfig from '../../tailwind.config.js'

const theme = tailwindConfig.theme as {
  screens?: Record<string, string>
  extend?: {
    colors?: Record<string, string>
    zIndex?: Record<string, string>
    spacing?: Record<string, string>
    maxWidth?: Record<string, string>
    fontFamily?: Record<string, string[]>
  }
}

describe('tailwind design tokens (step 1.1)', () => {
  it('uses custom breakpoints only (no default sm/md/lg)', () => {
    const screens = theme.screens ?? {}
    expect(Object.keys(screens).sort()).toEqual(['l', 'm', 's', 'xl'])
    expect(screens).not.toHaveProperty('sm')
    expect(screens).not.toHaveProperty('md')
  })

  it('exposes surface, text, z-index, and spacing tokens', () => {
    const extend = theme.extend ?? {}
    const colors = extend.colors ?? {}
    const zIndex = extend.zIndex ?? {}
    const spacing = extend.spacing ?? {}

    expect(colors['surface-page']).toBe('var(--surface-page)')
    expect(colors.dark).toBe('var(--text-dark)')
    expect(zIndex.chrome).toBe('2000')
    expect(zIndex.modal).toBe('9000')
    expect(spacing['space-7']).toBe('1rem')
    expect(extend.maxWidth?.grid).toBe('1500px')
  })

  it('maps heading fonts per design system', () => {
    const fonts = theme.extend?.fontFamily ?? {}
    expect(fonts.heading?.[0]).toBe('var(--font-barlow-condensed)')
    expect(fonts.body?.[0]).toBe('var(--font-barlow)')
    expect(fonts.title?.[0]).toBe('var(--font-staatliches)')
  })
})
