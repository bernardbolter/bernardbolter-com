import { expect, test } from '@playwright/test'

import { cleanupTestUser, seedTestUser, testUser } from '../helpers/seedUser'

test.describe('Studio Login', () => {
  test.beforeAll(async () => {
    await seedTestUser()
  })

  test.afterAll(async () => {
    await cleanupTestUser()
  })

  test('logs in from /studio/login and redirects to /studio', async ({ page }) => {
    await page.goto('http://localhost:3000/studio/login')
    await page.fill('#studio-email', testUser.email)
    await page.fill('#studio-password', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/studio$/)
    await expect(page).toHaveURL('http://localhost:3000/studio')
  })

  test('logout endpoint clears session for /studio', async ({ page }) => {
    await page.goto('http://localhost:3000/studio/login')
    await page.fill('#studio-email', testUser.email)
    await page.fill('#studio-password', testUser.password)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/studio$/)

    await page.evaluate(async () => {
      await fetch('/api/studio/logout', { method: 'POST', credentials: 'include' })
    })
    await page.goto('http://localhost:3000/studio')
    await expect(page).toHaveURL(/\/studio\/login(\?from=%2Fstudio)?/)
  })
})
