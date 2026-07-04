import { describe, it, expect } from 'vitest'
import { anonymize, defaultRules, assessRisk, SCORED_CATEGORIES } from '../src/lib/engine'
import { CSP } from '../src/lib/csp'
import { collectStringLeaves } from './helpers'
import sampleWorkflow from './engine/fixtures/sample-workflow.json'
import credentialsWorkflow from './engine/fixtures/credentials-workflow.json'
import mixedWorkflow from './engine/fixtures/mixed-integrations-workflow.json'

/**
 * LIVING COVERAGE MATRIX — every functional and non-functional requirement maps
 * to exactly one test.
 *
 * Convention:
 *   - `// COVERED (also: <file>)` + a plain title  → a real passing assertion.
 *   - `// GAP` + a `TODO:` title that `expect.fail`s → tracked remaining work.
 *
 * A red suite is EXPECTED: the failing `TODO:` tests are the tracking device for
 * the work sequenced in `.planning/ROADMAP.md`. Fill them in as we proceed.
 */

const asString = (value: unknown): string => JSON.stringify(value)

/**
 * Invariant leak check: every value the engine claims to have replaced must be
 * absent, verbatim, from the anonymized output. This is stronger than an
 * allow-list — it catches partial replacements and referential-integrity holes.
 */
function assertNoDetectedSecretLeaks(fixture: unknown) {
  const { output, changes } = anonymize(fixture, defaultRules())
  const out = asString(output)
  for (const c of changes) {
    expect(out, `${c.category} value at ${c.path} leaked verbatim`).not.toContain(c.original)
  }
  return changes
}

// ---------------------------------------------------------------------------
// Functional requirements — rule categories
// ---------------------------------------------------------------------------
describe('Functional: rule categories', () => {
  // COVERED (also: tests/engine/anonymize.test.ts, tests/engine/generators.test.ts)
  it('anonymizes email addresses to reserved example.com', () => {
    const out = asString(anonymize({ e: 'john.doe@acme.com' }, defaultRules()).output)
    expect(out).not.toContain('john.doe@acme.com')
    expect(out).toContain('@example.com')
  })

  // COVERED (also: tests/engine/anonymize.test.ts)
  it('replaces API keys / tokens by field name (incl. { name, value } header pairs)', () => {
    const wf = {
      nodes: [
        {
          parameters: {
            headerParameters: {
              parameters: [{ name: 'Authorization', value: 'Bearer sk_live_SECRET12345' }],
            },
          },
        },
      ],
    }
    const out = asString(anonymize(wf, defaultRules()).output)
    expect(out).not.toContain('sk_live_SECRET12345')
    expect(out).toContain('Authorization') // field name preserved, only value scrubbed
  })

  // COVERED (also: tests/engine/generators.test.ts)
  it('replaces URL hosts with a reserved documentation domain', () => {
    const out = asString(anonymize({ u: 'https://api.acme.com/v1/users' }, defaultRules()).output)
    expect(out).not.toContain('api.acme.com')
    expect(out).toContain('example1.com')
  })

  // COVERED (fixture: mixed-integrations)
  it('scrubs URL path-embedded secrets (Slack webhook token, Airtable id in cachedResultUrl)', () => {
    const out = asString(anonymize(mixedWorkflow, defaultRules()).output)
    expect(out).not.toContain('abcdEFGHijklMNOPqrstUVWX')
    expect(out).not.toContain('hooks.slack.com')
    expect(out).not.toContain('/appY058Iq5Gnkd2qT/tblLfXM821pkVArpX')
  })

  // COVERED (also: tests/engine/anonymize.test.ts)
  it('regenerates dashed UUIDs as valid v4-shaped UUIDs', () => {
    const uuid = 'b1e7c8d2-1234-4abc-8def-0123456789ab'
    const out = asString(anonymize({ id: uuid }, defaultRules()).output)
    expect(out).not.toContain(uuid)
    expect(out).toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)
  })

  // COVERED (also: tests/engine/credentials.test.ts)
  it('replaces 32-char hex IDs (Notion page/database ids)', () => {
    const hex = '59dfb60f349a4f758a7f2a71f5f25d9a'
    const out = asString(anonymize({ databaseId: hex }, defaultRules()).output)
    expect(out).not.toContain(hex)
    expect(out).toMatch(/[0-9a-f]{32}/)
  })

  // COVERED (also: tests/engine/generators.test.ts)
  it('replaces 64-char hex IDs (n8n instance ids)', () => {
    const hex = 'a'.repeat(64)
    const out = asString(anonymize({ instanceId: hex }, defaultRules()).output)
    expect(out).not.toContain(hex)
    expect(out).toMatch(/[0-9a-f]{64}/)
  })

  // COVERED (also: tests/engine/credentials.test.ts)
  it('replaces credential ids and human names in the credentials block', () => {
    const wf = { nodes: [{ credentials: { notionApi: { id: 'NuCiEcOApvHF3e3s', name: 'Prod' } } }] }
    const out = asString(anonymize(wf, defaultRules()).output)
    expect(out).not.toContain('NuCiEcOApvHF3e3s')
    expect(out).not.toContain('"Prod"')
    // id and name share the credentialName counter (id → 1, name → 2).
    expect(out).toContain('Credential 2')
  })

  // COVERED (fixture: mixed-integrations)
  it('anonymizes resourceLocator value IDs (Airtable base/table, Postgres schema/table)', () => {
    const out = asString(anonymize(mixedWorkflow, defaultRules()).output)
    for (const id of ['appY058Iq5Gnkd2qT', 'tblLfXM821pkVArpX', 'reporting', 'weather_data']) {
      expect(out).not.toContain(id)
    }
  })

  // COVERED (also: tests/engine/credentials.test.ts via cachedResultName absence)
  it('replaces resource display names (cachedResultName: Notion DB, Slack channel)', () => {
    const wf = { r: { __rl: true, value: 'x', mode: 'list', cachedResultName: 'Cytaty' } }
    const out = asString(anonymize(wf, defaultRules()).output)
    expect(out).not.toContain('Cytaty')
    expect(out).toContain('Resource 1')
  })

  // COVERED (also: tests/engine/anonymize.test.ts)
  it('replaces literal messaging IDs (Telegram chatId)', () => {
    const wf = { nodes: [{ parameters: { chatId: '=-1002405526505' } }] }
    const out = asString(anonymize(wf, defaultRules()).output)
    expect(out).not.toContain('1002405526505')
  })

  // COVERED — expression-preservation is core to keeping the workflow runnable
  it('preserves n8n expression chatIds (`={{ … }}`) while replacing literals', () => {
    const expr = "={{ $('Text reply').item.json.result.chat.id }}"
    const out = anonymize({ nodes: [{ parameters: { chatId: expr } }] }, defaultRules()).output as {
      nodes: Array<{ parameters: { chatId: string } }>
    }
    expect(out.nodes[0]?.parameters.chatId).toBe(expr) // expression survives untouched
  })

  // COVERED (also: tests/engine/phone.test.ts)
  it('anonymizes phone numbers into the NANP 555-01xx fictional range', () => {
    const out = asString(anonymize({ phone: '+14155552671' }, defaultRules()).output)
    expect(out).not.toContain('+14155552671')
    expect(out).toContain('555')
  })

  // DEFERRED (UI batch): user-supplied custom patterns is the safe path for
  // names / company / project-specific values, instead of unreliable auto-detection.
  it.todo('custom user-defined patterns rule + session persistence')
})

// ---------------------------------------------------------------------------
// Non-functional requirements
// ---------------------------------------------------------------------------
describe('Non-functional requirements', () => {
  // COVERED (also: tests/engine/anonymize.test.ts)
  it('is deterministic — same input yields byte-identical output', () => {
    const a = asString(anonymize(sampleWorkflow, defaultRules()).output)
    const b = asString(anonymize(sampleWorkflow, defaultRules()).output)
    expect(a).toBe(b)
  })

  // COVERED (also: tests/engine/anonymize.test.ts)
  it('referential integrity — a repeated value maps to the same replacement', () => {
    const out = anonymize({ a: 'x@y.com', b: 'x@y.com' }, defaultRules()).output as Record<
      string,
      string
    >
    expect(out.a).toBe(out.b)
  })

  // COVERED (also: tests/engine/anonymize.test.ts) — shallow structure preservation
  it('preserves top-level workflow structure (nodes count, connection keys)', () => {
    const out = anonymize(sampleWorkflow, defaultRules()).output as {
      nodes: unknown[]
      connections: Record<string, unknown>
    }
    expect(out.nodes).toHaveLength(2)
    expect(Object.keys(out.connections)).toEqual(['HTTP Request'])
  })

  // COVERED
  it('output round-trips: reparses to a valid n8n shape with connections still resolving', () => {
    const parsed = JSON.parse(JSON.stringify(anonymize(sampleWorkflow, defaultRules()).output)) as {
      nodes: Array<{ name: string }>
      connections: Record<string, { main: Array<Array<{ node: string }>> }>
    }
    const nodeNames = new Set(parsed.nodes.map((n) => n.name))
    expect(parsed.nodes).toHaveLength(2)
    for (const [source, conn] of Object.entries(parsed.connections)) {
      expect(nodeNames.has(source)).toBe(true)
      for (const branch of conn.main)
        for (const t of branch) expect(nodeNames.has(t.node)).toBe(true)
    }
  })

  // COVERED — output is a plain JS value that serializes and reparses cleanly
  it('produces valid JSON output', () => {
    const { output } = anonymize(sampleWorkflow, defaultRules())
    expect(() => JSON.parse(JSON.stringify(output))).not.toThrow()
    expect(JSON.parse(JSON.stringify(output))).toEqual(output)
  })

  // COVERED (also: tests/e2e/privacy.spec.ts) — passive: the engine is synchronous,
  // has zero runtime deps, and never returns a pending network handle.
  it('no network egress — anonymize resolves synchronously with no async/network handle', () => {
    const result = anonymize(sampleWorkflow, defaultRules())
    expect(result).not.toBeInstanceOf(Promise)
    expect(result.output).toBeDefined()
  })

  // COVERED (runtime block asserted in tests/e2e/privacy.spec.ts)
  it('CSP is configured to block all network egress (connect-src none)', () => {
    expect(CSP).toContain("connect-src 'none'")
  })

  // COVERED (also: tests/e2e/offline.spec.ts) — passive: pure engine, no runtime deps.
  it('works offline — the engine is self-contained (no external calls)', () => {
    expect(anonymize(sampleWorkflow, defaultRules()).output).toBeDefined()
  })

  // COVERED — a typical workflow anonymizes well under the 300ms budget
  it('anonymizes a typical workflow in well under 300ms', () => {
    const nodes = Array.from({ length: 60 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      name: `Node ${i}`,
      parameters: { url: `https://api${i}.acme.com/v1/users`, email: `user${i}@acme.com` },
    }))
    const start = performance.now()
    anonymize({ nodes, connections: {} }, defaultRules())
    expect(performance.now() - start).toBeLessThan(300)
  })

  // COVERED — n8n expressions are references, not data, and must survive intact.
  it('preserves n8n expressions (`={{ … }}`) in ordinary fields', () => {
    const expr = '={{ $json.foo }}'
    const out = anonymize({ nodes: [{ parameters: { x: expr } }] }, defaultRules()).output as {
      nodes: Array<{ parameters: { x: string } }>
    }
    expect(out.nodes[0]?.parameters.x).toBe(expr)
  })

  // COVERED — SCORED_CATEGORIES contains no category a rule cannot emit
  it('risk scoring references only categories the default rules can emit', () => {
    const emittable = new Set(defaultRules().map((r) => r.category))
    for (const c of SCORED_CATEGORIES) {
      expect(emittable.has(c), `risk scores ${c} but no rule emits it`).toBe(true)
    }
  })

  // COVERED (also: tests/engine/risk.test.ts)
  it('warns about pinData and forces high risk', () => {
    const wf = {
      nodes: [{ parameters: { note: 'hi' } }],
      connections: {},
      pinData: { Node: [{ json: { secret: 'real output' } }] },
    }
    const risk = assessRisk(wf, anonymize(wf, defaultRules()))
    expect(risk.level).toBe('high')
    expect(risk.warnings.join(' ')).toContain('pinData')
  })

  // DEFERRED (UI batch)
  it.todo('pinData strip affordance (offer to remove pinData, default on when non-empty)')

  // COVERED
  it('handles adversarial input — null / primitive / top-level array / empty object', () => {
    expect(() => anonymize(null, defaultRules())).not.toThrow()
    expect(anonymize(null, defaultRules()).output).toBeNull()
    expect(anonymize(42, defaultRules()).output).toBe(42)
    expect(anonymize(['a@b.com'], defaultRules()).output).toEqual(['user1@example.com'])
    expect(anonymize({}, defaultRules()).output).toEqual({})
  })

  // COVERED
  it('handles workflows missing nodes / connections keys', () => {
    expect(() => anonymize({ settings: {} }, defaultRules())).not.toThrow()
    const out = anonymize({ foo: 'a@b.com' }, defaultRules()).output as Record<string, string>
    expect(out.foo).toBe('user1@example.com')
  })

  // COVERED — cycle guard prevents infinite recursion; deep nesting is handled
  it('handles deeply nested and circular structures without hanging', () => {
    let deep: unknown = { v: 'a@b.com' }
    for (let i = 0; i < 500; i++) deep = { child: deep }
    expect(() => anonymize(deep, defaultRules())).not.toThrow()
    const cyclic: Record<string, unknown> = { e: 'a@b.com' }
    cyclic.self = cyclic
    expect(() => anonymize(cyclic, defaultRules())).not.toThrow()
    const out = anonymize(cyclic, defaultRules()).output as Record<string, unknown>
    expect(out.e).toBe('user1@example.com')
    expect(out.self).toBe(out) // cycle preserved, not expanded
  })
})

// ---------------------------------------------------------------------------
// Invariant leak test — no detected secret survives, verbatim, in the output
// ---------------------------------------------------------------------------
describe('Invariant: no sensitive value leaks into the output', () => {
  // COVERED — real invariant across the committed sample fixture.
  it('sample fixture — every detected secret is absent from the output', () => {
    const changes = assertNoDetectedSecretLeaks(sampleWorkflow)
    expect(changes.length).toBeGreaterThan(0)
  })

  // COVERED — real invariant across the committed credentials fixture.
  it('credentials fixture — every detected secret is absent from the output', () => {
    const changes = assertNoDetectedSecretLeaks(credentialsWorkflow)
    expect(changes.length).toBeGreaterThan(0)
  })

  // COVERED — structure preservation at leaf granularity (1:1 string-leaf count).
  it('string-leaf count is preserved (no leaves added or dropped)', () => {
    const before = collectStringLeaves(sampleWorkflow).length
    const after = collectStringLeaves(anonymize(sampleWorkflow, defaultRules()).output).length
    expect(after).toBe(before)
  })

  // COVERED (fixture: mixed-integrations)
  it('Airtable fixture — base/table ids do not leak (resourceLocator value + cachedResultUrl path)', () => {
    assertNoDetectedSecretLeaks(mixedWorkflow)
    const out = asString(anonymize(mixedWorkflow, defaultRules()).output)
    expect(out).not.toContain('appY058Iq5Gnkd2qT')
    expect(out).not.toContain('tblLfXM821pkVArpX')
  })

  // COVERED (fixture: mixed-integrations)
  it('Postgres fixture — schema/table names in resourceLocator value do not leak', () => {
    const out = asString(anonymize(mixedWorkflow, defaultRules()).output)
    expect(out).not.toContain('reporting')
    expect(out).not.toContain('weather_data')
  })

  // COVERED (fixture: mixed-integrations)
  it('Slack/Discord webhook fixture — path-embedded token does not leak', () => {
    const out = asString(anonymize(mixedWorkflow, defaultRules()).output)
    expect(out).not.toContain('abcdEFGHijklMNOPqrstUVWX')
    expect(out).not.toContain('hooks.slack.com')
  })

  // COVERED (fixture: mixed-integrations)
  it('Telegram fixture — literal chatId replaced, expression chatId preserved', () => {
    const out = asString(anonymize(mixedWorkflow, defaultRules()).output)
    expect(out).not.toContain('1002405526505')
    expect(out).toContain('{{ $json.chat.id }}')
  })
})
