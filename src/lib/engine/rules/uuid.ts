import type { Rule } from '../types'
import { fakeUuid } from '../generators'

const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g

export function uuidRule(): Rule {
  return {
    id: 'uuid',
    category: 'uuid',
    label: 'UUIDs / IDs',
    enabled: true,
    apply(value, rctx, ctx) {
      const next = value.replace(UUID, (m) => ctx.record('uuid', m, rctx.path, (n) => fakeUuid(n)))
      return { value: next }
    },
  }
}
