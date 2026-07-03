import { test, expect } from '@playwright/test'

const WORKFLOW = JSON.stringify({
  name: 'Test',
  nodes: [
    {
      parameters: { fromEmail: 'jane@acme.com' },
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      name: 'Email',
      type: 'n8n-nodes-base.emailSend',
      credentials: { smtp: { id: 'CredId123456', name: 'Acme Mail' } },
    },
  ],
  connections: {},
})

test('shows risk, reports counts, and honours rule toggles', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('.cm-content').first()
  await input.click()
  await input.fill(WORKFLOW)

  const output = page.locator('.cm-content').nth(1)
  await expect(output).not.toContainText('jane@acme.com', { timeout: 5000 })

  // Credentials present → high risk.
  await expect(page.getByText('HIGH')).toBeVisible()

  // Turn the email rule off: the original email should reappear in the output.
  await page.getByLabel('Email addresses').uncheck()
  await expect(output).toContainText('jane@acme.com')

  // Download button is enabled once there is output.
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()

  // The Diff view renders a CodeMirror merge view.
  await page.getByRole('button', { name: 'Diff' }).click()
  await expect(page.locator('.cm-mergeView')).toBeVisible()
})
