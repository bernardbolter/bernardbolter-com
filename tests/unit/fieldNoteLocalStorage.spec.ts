import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { resolveMediaStorageUrl, toLocalFieldNoteUrl } from '@/lib/studio/fieldNoteLocalPaths'
import {
  FIELDNOTE_LOCAL_URL_PREFIX,
  buildInboxRelativePath,
  getFieldNotesMediaRoot,
  isLocalFieldNoteMedia,
  resolveAbsolutePathUnderRoot,
  resolveLocalFieldNoteRelativePath,
  writeInboxFile,
} from '@/lib/studio/fieldNoteLocalStorage'

describe('fieldNoteLocalStorage', () => {
  const previousRoot = process.env.FIELDNOTES_MEDIA_ROOT

  afterEach(async () => {
    if (process.env.FIELDNOTES_MEDIA_ROOT) {
      await fs.rm(process.env.FIELDNOTES_MEDIA_ROOT, { recursive: true, force: true })
    }
    if (previousRoot) {
      process.env.FIELDNOTES_MEDIA_ROOT = previousRoot
    } else {
      delete process.env.FIELDNOTES_MEDIA_ROOT
    }
  })

  it('builds inbox relative paths', () => {
    const relative = buildInboxRelativePath('clip.MOV', new Date('2026-07-15T10:00:00Z'))
    expect(relative).toMatch(/^inbox\/2026\/07\/[0-9a-f-]{36}-clip\.MOV$/)
  })

  it('writes and resolves local media paths', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fieldnotes-'))
    process.env.FIELDNOTES_MEDIA_ROOT = root

    const relativePath = buildInboxRelativePath('test.mp4')
    await writeInboxFile(Buffer.from('hello'), relativePath)

    const absolute = resolveAbsolutePathUnderRoot(getFieldNotesMediaRoot(), relativePath)
    expect(await fs.readFile(absolute, 'utf8')).toBe('hello')

    const media = {
      url: toLocalFieldNoteUrl(relativePath),
      filename: relativePath,
    }
    expect(isLocalFieldNoteMedia(media)).toBe(true)
    expect(resolveLocalFieldNoteRelativePath(media)).toBe(relativePath)
    expect(media.url).toBe(`${FIELDNOTE_LOCAL_URL_PREFIX}${relativePath}`)
  })

  it('resolves storage URLs for inbox vs CDN filenames', () => {
    process.env.NEXT_PUBLIC_IMAGE_DOMAIN = 'https://cdn.example'
    expect(resolveMediaStorageUrl('inbox/2026/07/clip.mp4')).toBe(
      'fieldnote-local:inbox/2026/07/clip.mp4',
    )
    expect(resolveMediaStorageUrl('artworks/photo.jpg')).toBe(
      'https://cdn.example/artworks/photo.jpg',
    )
    delete process.env.NEXT_PUBLIC_IMAGE_DOMAIN
  })

  it('rejects path traversal', () => {
    const root = path.join(os.tmpdir(), 'fieldnotes-safe')
    expect(() => resolveAbsolutePathUnderRoot(root, '../etc/passwd')).toThrow(
      'Invalid local media path',
    )
  })
})
