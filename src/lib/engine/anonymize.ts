import { AnonymizationContext } from './context'
import type { AnonymizeResult, Rule } from './types'

function applyRules(
  value: string,
  key: string | null,
  nameHint: string | null,
  inResourceLocator: boolean,
  path: string,
  rules: Rule[],
  ctx: AnonymizationContext,
): string {
  let current = value
  for (const rule of rules) {
    const result = rule.apply(current, { key, nameHint, inResourceLocator, path }, ctx)
    current = result.value
    if (result.whole) break
  }
  return current
}

/** Recursively transforms string leaves in place; other primitives pass through. */
function walk(
  node: unknown,
  key: string | null,
  nameHint: string | null,
  inResourceLocator: boolean,
  path: string,
  rules: Rule[],
  ctx: AnonymizationContext,
): unknown {
  if (typeof node === 'string') {
    return applyRules(node, key, nameHint, inResourceLocator, path, rules, ctx)
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = walk(node[i], key, null, false, `${path}[${i}]`, rules, ctx)
    }
    return node
  }
  if (node !== null && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    // n8n stores headers/query params as `{ name, value }` pairs; the sensitive
    // signal is the sibling `name`, not the object key (`value`).
    const pairName = typeof obj.name === 'string' ? obj.name : null
    // resourceLocator objects (`{ __rl: true, value, mode, ... }`) hold the real
    // external resource id in `value`.
    const isRl = obj.__rl === true
    for (const k of Object.keys(obj)) {
      const childHint = k === 'value' ? pairName : null
      const childRl = isRl && k === 'value'
      obj[k] = walk(obj[k], k, childHint, childRl, path ? `${path}.${k}` : k, rules, ctx)
    }
    return obj
  }
  return node
}

/**
 * Anonymize a parsed JSON value against a set of rules.
 *
 * The input is deep-cloned, so the caller's object is never mutated. Only
 * enabled rules are applied. The result is deterministic: the same input and
 * rule set always produce byte-identical output.
 */
export function anonymize(json: unknown, rules: Rule[]): AnonymizeResult {
  const ctx = new AnonymizationContext()
  const enabled = rules.filter((r) => r.enabled)
  const output = walk(structuredClone(json), null, null, false, '', enabled, ctx)

  const countsByCategory: Record<string, number> = {}
  for (const change of ctx.changes) {
    countsByCategory[change.category] = (countsByCategory[change.category] ?? 0) + 1
  }

  return { output, changes: ctx.changes, countsByCategory }
}
