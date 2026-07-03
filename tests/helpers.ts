/** Shared test helpers for the coverage matrix. */

/**
 * Collect every string leaf in a JSON-like value, in traversal order.
 *
 * Used by the invariant leak test to inventory the original document's strings
 * and to confirm the anonymizer preserves structure (a 1:1 leaf count).
 */
export function collectStringLeaves(value: unknown): string[] {
  const out: string[] = []
  const visit = (node: unknown): void => {
    if (typeof node === 'string') {
      out.push(node)
    } else if (Array.isArray(node)) {
      for (const item of node) visit(item)
    } else if (node !== null && typeof node === 'object') {
      for (const v of Object.values(node as Record<string, unknown>)) visit(v)
    }
  }
  visit(value)
  return out
}
