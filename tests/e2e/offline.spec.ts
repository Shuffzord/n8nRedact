import { test, expect } from '@playwright/test'

test('works offline after the first visit', async ({ page, context }) => {
  await page.goto('/')
  // Wait for the service worker to install, precache the shell, and take control.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('heading', { name: 'n8n Workflow Anonymizer' })).toBeVisible()
  // Still fully functional offline.
  const input = page.locator('.cm-content').first()
  await input.click()
  await input.fill('{"nodes":[{"parameters":{"e":"a@b.com"}}],"connections":{}}')
  await expect(page.locator('.cm-content').nth(1)).toContainText('example.com')

  await context.setOffline(false)
})
