import type { Rule } from '../types'
import { fakeResourceName } from '../generators'

function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// n8n resourceLocator fields cache the human-readable name of the selected
// resource (e.g. a Notion database "Cytaty", a Slack channel, a Sheet).
const RESOURCE_NAME_HINTS = ['cachedresultname']

/**
 * Anonymizes the display names of selected resources. These reveal what a user's
 * databases / sheets / channels are called, which is identifying even though it
 * isn't a secret.
 */
export function resourceNameRule(): Rule {
  return {
    id: 'resourceName',
    category: 'dbBucket',
    label: 'Resource names (Notion DB, channels)',
    enabled: true,
    apply(value, rctx, ctx) {
      if (!value || rctx.key === null) return { value }
      const norm = normalize(rctx.key)
      if (!RESOURCE_NAME_HINTS.some((hint) => norm.includes(hint))) return { value }
      const replacement = ctx.record('dbBucket', value, rctx.path, (n) => fakeResourceName(n))
      return { value: replacement, whole: true }
    },
  }
}
