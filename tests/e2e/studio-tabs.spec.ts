import { expect, test } from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

async function loginStudio(page: import('@playwright/test').Page) {
  await page.goto('http://localhost:3000/studio/login')
  await page.fill('#studio-email', testUser.email)
  await page.fill('#studio-password', testUser.password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/studio$/)
}

test.describe('Studio tabs', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('paintings tab lists and new form', async ({ page }) => {
    await loginStudio(page)
    await page.goto('http://localhost:3000/studio/paintings')
    await expect(page.getByRole('heading', { name: 'Paintings' })).toBeVisible()
    await page.getByRole('link', { name: 'New painting' }).click()
    await expect(page.getByRole('heading', { name: 'New painting' })).toBeVisible()
  })

  test('notes tab shows filters', async ({ page }) => {
    await loginStudio(page)
    await page.goto('http://localhost:3000/studio/notes')
    await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible()
    await expect(page.getByLabel('Filter field notes')).toBeVisible()
  })

  test('episodes tab lists and create form', async ({ page }) => {
    await loginStudio(page)
    await page.goto('http://localhost:3000/studio/episodes')
    await expect(page.getByRole('heading', { name: 'Episodes' })).toBeVisible()
    await page.getByRole('link', { name: 'New episode' }).click()
    await expect(page.getByRole('heading', { name: 'New episode' })).toBeVisible()
  })

  test('digest tab renders sections', async ({ page }) => {
    await loginStudio(page)
    await page.goto('http://localhost:3000/studio/digest')
    await expect(page.getByRole('heading', { name: 'Digest' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Open paintings' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Practice overview (this week)' })).toBeVisible()
  })
})
