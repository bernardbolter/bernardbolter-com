import { describe, expect, it } from 'vitest'

import { lexicalToPlain } from '@/lib/artOfficial/lexicalToPlain'

describe('lexicalToPlain', () => {
  it('converts paragraph, list, and heading', () => {
    const content = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: 'Hello world.' }],
          },
          {
            type: 'list',
            listType: 'bullet',
            children: [
              {
                type: 'listitem',
                children: [{ type: 'text', text: 'First item' }],
              },
              {
                type: 'listitem',
                children: [{ type: 'text', text: 'Second item' }],
              },
            ],
          },
          {
            type: 'heading',
            tag: 'h2',
            children: [{ type: 'text', text: 'Section' }],
          },
        ],
      },
    }

    const plain = lexicalToPlain(content)
    expect(plain).toContain('Hello world.')
    expect(plain).toContain('- First item')
    expect(plain).toContain('- Second item')
    expect(plain).toContain('SECTION')
  })

  it('returns empty string for null content', () => {
    expect(lexicalToPlain(null)).toBe('')
  })
})
