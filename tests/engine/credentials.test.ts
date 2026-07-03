import { describe, it, expect } from 'vitest'
import { anonymize, defaultRules } from '../../src/lib/engine'
import workflow from './fixtures/credentials-workflow.json'

interface CredWorkflow {
  nodes: Array<{
    parameters: { databaseId?: string; url?: string }
    credentials: { notionApi: { id: string; name: string } }
  }>
}

const run = () => anonymize(workflow, defaultRules())
const output = () => run().output as CredWorkflow

describe('credential & hex-id rules', () => {
  it('removes credential ids, credential names, and 32-hex ids', () => {
    const text = JSON.stringify(run().output)
    for (const secret of [
      'NuCiEcOApvHF3e3s',
      'Notion account',
      '59dfb60f349a4f758a7f2a71f5f25d9a',
    ]) {
      expect(text).not.toContain(secret)
    }
  })

  it('keeps a credential consistent across every node that uses it', () => {
    const out = output()
    expect(out.nodes[0]?.credentials.notionApi.id).toBe(out.nodes[1]?.credentials.notionApi.id)
    expect(out.nodes[0]?.credentials.notionApi.name).toBe(out.nodes[1]?.credentials.notionApi.name)
    expect(out.nodes[0]?.credentials.notionApi.name).toBe('Credential 2')
  })

  it('anonymizes a standalone hex id and drops the URL path entirely', () => {
    const out = output()
    const id = out.nodes[0]?.parameters.databaseId
    expect(id).toMatch(/^[0-9a-f]{32}$/)
    expect(id).not.toBe('59dfb60f349a4f758a7f2a71f5f25d9a')
    // The path (which carried the same Notion id) is dropped, not preserved.
    expect(out.nodes[0]?.parameters.url).toBe('https://example1.com')
  })
})
