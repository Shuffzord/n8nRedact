import { test, expect } from '@playwright/test'

const WORKFLOW = JSON.stringify({
  name: 'Test',
  nodes: [
    {
      parameters: {
        url: 'https://api.acme.com/v1',
        headerParameters: {
          parameters: [{ name: 'Authorization', value: 'Bearer sk_live_SECRET12345' }],
        },
        fromEmail: 'jane@acme.com',
      },
      id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      name: 'HTTP',
      type: 'n8n-nodes-base.httpRequest',
      credentials: { httpHeaderAuth: { id: 'CredId123456', name: 'Acme Key' } },
    },
  ],
  connections: {},
})

const SECRETS = ['jane@acme.com', 'sk_live_SECRET12345', 'api.acme.com', 'CredId123456', 'Acme Key']

test('anonymizes in-browser and leaks nothing to the network', async ({ page }) => {
  // Record every request to any origin other than the app itself.
  const foreignRequests: string[] = []
  page.on('request', (req) => {
    const url = req.url()
    if (!url.startsWith('http://localhost:4188') && !url.startsWith('data:')) {
      foreignRequests.push(url)
    }
  })

  await page.goto('/')

  // Type the workflow into the editable (first) CodeMirror pane.
  const input = page.locator('.cm-content').first()
  await input.click()
  await input.fill(WORKFLOW)

  // The anonymized pane should fill in and drop every secret.
  const output = page.locator('.cm-content').nth(1)
  await expect(output).toContainText('example.com', { timeout: 5000 })

  const outputText = (await output.textContent()) ?? ''
  for (const secret of SECRETS) {
    expect(outputText, `output must not contain ${secret}`).not.toContain(secret)
  }

  // The status bar reflects that the input was recognised and replaced.
  await expect(page.getByText('Looks like an n8n workflow')).toBeVisible()
  await expect(page.getByText(/\d+ replacement/)).toBeVisible()

  // The core promise: nothing left the browser.
  expect(foreignRequests, 'no request should go to any foreign origin').toEqual([])
})
