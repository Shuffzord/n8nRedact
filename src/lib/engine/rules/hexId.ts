import type { Rule } from '../types'
import { fakeHex } from '../generators'

// A hex run of 32+ chars, not part of a longer hex run: Notion page/database ids
// (32) and n8n instance ids (64). Dashed UUIDs are handled separately.
const HEX_ID = /(?<![0-9a-fA-F])[0-9a-fA-F]{32,}(?![0-9a-fA-F])/g

export function hexIdRule(): Rule {
  return {
    id: 'hexId',
    category: 'uuid',
    label: 'Hex IDs (Notion pages, instance IDs)',
    enabled: true,
    apply(value, rctx, ctx) {
      const next = value.replace(HEX_ID, (m) =>
        ctx.record('uuid', m, rctx.path, (n) => fakeHex(n, m.length)),
      )
      return { value: next }
    },
  }
}
