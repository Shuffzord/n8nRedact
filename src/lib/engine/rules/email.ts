import type { Rule } from '../types'
import { fakeEmail } from '../generators'

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

export function emailRule(): Rule {
  return {
    id: 'email',
    category: 'email',
    label: 'Email addresses',
    enabled: true,
    apply(value, rctx, ctx) {
      const next = value.replace(EMAIL, (m) =>
        ctx.record('email', m, rctx.path, (n) => fakeEmail(n)),
      )
      return { value: next }
    },
  }
}
