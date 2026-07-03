import { describe, it, expect } from 'vitest'
import { anonymize, defaultRules, assessRisk } from '../../src/lib/engine'

describe('assessRisk', () => {
  it('rates a workflow with credentials as high risk', () => {
    const wf = {
      nodes: [
        {
          parameters: { fromEmail: 'a@b.com' },
          credentials: { api: { id: 'abc', name: 'Prod' } },
        },
      ],
      connections: {},
    }
    const risk = assessRisk(wf, anonymize(wf, defaultRules()))
    expect(risk.level).toBe('high')
    expect(risk.reasons.join(' ')).toContain('credential reference')
  })

  it('rates a workflow with only emails/urls as medium risk', () => {
    const wf = { nodes: [{ parameters: { u: 'https://x.com/a', e: 'a@b.com' } }], connections: {} }
    expect(assessRisk(wf, anonymize(wf, defaultRules())).level).toBe('medium')
  })

  it('rates an empty workflow as low risk', () => {
    const wf = { nodes: [{ parameters: { note: 'hello' } }], connections: {} }
    expect(assessRisk(wf, anonymize(wf, defaultRules())).level).toBe('low')
  })

  it('warns about pinData and forces high risk', () => {
    const wf = {
      nodes: [{ parameters: { note: 'hello' } }],
      connections: {},
      pinData: { SomeNode: [{ json: { secret: 'real output' } }] },
    }
    const risk = assessRisk(wf, anonymize(wf, defaultRules()))
    expect(risk.level).toBe('high')
    expect(risk.warnings.join(' ')).toContain('pinData')
  })
})
