import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { expect, test } from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

const FIXTURE_IMAGE = path.join(process.cwd(), 'tests/fixtures/studio-upload.jpg')

function ensureFixtureImage() {
  const dir = path.dirname(FIXTURE_IMAGE)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(FIXTURE_IMAGE)) {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    writeFileSync(FIXTURE_IMAGE, png)
  }
}

test.describe('Studio Upload', () => {
  test.beforeAll(async () => {
    ensureFixtureImage()
    await seedTestUser()
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  async function login(page: import('@playwright/test').Page) {
    await page.goto('http://localhost:3000/studio/login')
    await page.fill('#studio-email', testUser.email)
    await page.fill('#studio-password', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/studio$/)
  }

  async function mockLocalUpload(page: import('@playwright/test').Page, mediaId: number) {
    await page.route('**/api/studio/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: mediaId, relativePath: 'inbox/2026/07/mock-photo.jpg' }),
      })
    })
  }

  test('uploads a photo with an existing line', async ({ page }) => {
    await login(page)
    await mockLocalUpload(page, 101)

    await page.evaluate(async () => {
      await fetch('/api/studio/lines', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'E2E existing line' }),
      })
    })

    await page.goto('http://localhost:3000/studio')
    await page.setInputFiles('#studio-upload-file', FIXTURE_IMAGE)
    await page.fill('.studio-lines-picker__input', 'E2E existing')
    await page.getByRole('button', { name: /E2E existing line/ }).click()
    await page.click('button.studio-upload__submit')
    await expect(page.locator('.studio-upload__success')).toContainText('Field note #')
  })

  test('inline-creates a line during upload', async ({ page }) => {
    await login(page)
    await mockLocalUpload(page, 102)

    await page.goto('http://localhost:3000/studio')
    await page.setInputFiles('#studio-upload-file', FIXTURE_IMAGE)
    const uniqueName = `E2E inline ${Date.now()}`
    await page.fill('.studio-lines-picker__input', uniqueName)
    await page.getByRole('button', { name: new RegExp(`Create Line.*${uniqueName}`) }).click()
    await expect(page.locator('.studio-lines-picker__chip')).toContainText(uniqueName)
    await page.click('button.studio-upload__submit')
    await expect(page.locator('.studio-upload__success')).toContainText('Field note #')
  })
})
