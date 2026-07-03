import type { Rule } from '../types'
import { fakeUrl } from '../generators'

// Requires a scheme so bare reserved domains in replacements aren't re-matched.
const URL_RE = /https?:\/\/[^\s"'<>()]+/g

export function urlRule(): Rule {
  return {
    id: 'url',
    category: 'url',
    label: 'URLs',
    enabled: true,
    apply(value, rctx, ctx) {
      const next = value.replace(URL_RE, (m) =>
        ctx.record('url', m, rctx.path, (n) => fakeUrl(m, n)),
      )
      return { value: next }
    },
  }
}
