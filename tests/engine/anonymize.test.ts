import { describe, it, expect } from 'vitest'
import { anonymize, defaultRules } from '../../src/lib/engine'
import workflow from './fixtures/sample-workflow.json'

interface TestWorkflow {
  nodes: Array<{
    parameters: {
      toEmail?: string
      text?: string
      headerParameters?: { parameters: Array<{ name: string; value: string }> }
    }
  }>
  connections: Record<string, { main: Array<Array<{ node: string }>> }>
  settings: Record<string, unknown>
}

const run = () => anonymize(workflow, defaultRules())
const output = () => run().output as TestWorkflow

describe('anonymize', () => {
  it('removes every seeded secret from the output', () => {
    const text = JSON.stringify(run().output)
    for (const secret of [
      'john.doe@acme.com',
      'ops@acme.com',
      'sk_live_ABC123def456GHI',
      'xoxb-9999-SECRETTOKENvalue',
      'api.acme.com',
      'hooks.acme.com',
      'b1e7c8d2-1234-4abc-8def-0123456789ab',
      'e4b0f1a5-4567-4def-bfbc-3456789abcde',
    ]) {
      expect(text).not.toContain(secret)
    }
  })

  it('produces valid JSON that preserves workflow structure', () => {
    const out = output()
    expect(out.nodes).toHaveLength(2)
    // Connections are keyed by node name; node names are not secrets, so the
    // graph stays intact and importable.
    expect(Object.keys(out.connections)).toEqual(['HTTP Request'])
    expect(out.connections['HTTP Request']?.main[0]?.[0]?.node).toBe('Send Email')
    expect(out.settings).toEqual({ executionOrder: 'v1' })
  })

  it('is deterministic — same input yields byte-identical output', () => {
    expect(JSON.stringify(run().output)).toBe(JSON.stringify(run().output))
  })

  it('preserves referential integrity — a repeated value maps identically', () => {
    const out = output()
    const toEmail = out.nodes[1]?.parameters.toEmail
    // ops@acme.com appears in both `toEmail` and the `text` body.
    expect(out.nodes[1]?.parameters.text).toContain(toEmail)
    expect(toEmail).toBe('user2@example.com')
  })

  it('replaces secret-by-fieldname values whole but leaves benign fields alone', () => {
    const headers = output().nodes[0]?.parameters.headerParameters?.parameters ?? []
    const auth = headers.find((h) => h.name === 'Authorization')!
    const trace = headers.find((h) => h.name === 'X-Trace')!
    expect(auth.value).not.toContain('sk_live')
    expect(auth.value).toHaveLength('Bearer sk_live_ABC123def456GHI'.length)
    expect(trace.value).toBe('plain-non-secret')
  })

  it('counts replacements per category', () => {
    const counts = run().countsByCategory
    expect(counts.email).toBeGreaterThanOrEqual(3)
    expect(counts.apiKey).toBe(2)
    expect(counts.url).toBe(2)
    expect(counts.uuid).toBe(4)
  })

  it('does not mutate the caller input', () => {
    const before = JSON.stringify(workflow)
    run()
    expect(JSON.stringify(workflow)).toBe(before)
  })

  it('applies only enabled rules', () => {
    const rules = defaultRules().map((r) => (r.category === 'email' ? { ...r, enabled: false } : r))
    const text = JSON.stringify(anonymize(workflow, rules).output)
    expect(text).toContain('john.doe@acme.com')
  })
})
