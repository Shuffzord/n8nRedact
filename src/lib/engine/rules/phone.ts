import type { Rule } from '../types'
import { fakePhone } from '../generators'

/**
 * Conservative phone-number matcher. It only fires on values that are clearly
 * phone-shaped, because a looser matcher (any digit run) would corrupt ids,
 * timestamps, and messaging chatIds — a false positive is worse than a miss.
 *
 * A match requires either a leading `+` (E.164) or explicit separators in a
 * recognised grouping — never a bare digit run. The alternatives are:
 *   1. `\+\d{7,15}`                         E.164 compact  (`+14155552671`)
 *   2. `\+\d{1,3}(?:[ ]\d{2,4}){2,5}`       E.164 spaced   (`+1 234 567 8901`)
 *   3. `\(\d{3}\)[ ]?\d{3}[ -]\d{4}`        US w/ area     (`(415) 555-2671`)
 *   4. `\d{3}[ -]\d{3}[ -]\d{4}`            US 3-3-4       (`123-456-7890`)
 * The `(?<![\d+])` / `(?!\d)` guards keep it from biting a slice out of a longer
 * digit string, and the strict 3-3-4 grouping in (4) rejects dashed dates like
 * `2025-01-07` (which is 4-2-2).
 */
const PHONE =
  /(?<![\d+])(?:\+\d{7,15}|\+\d{1,3}(?:[ ]\d{2,4}){2,5}|\(\d{3}\)[ ]?\d{3}[ -]\d{4}|\d{3}[ -]\d{3}[ -]\d{4})(?!\d)/g

export function phoneRule(): Rule {
  return {
    id: 'phone',
    category: 'phone',
    label: 'Phone numbers',
    enabled: true,
    apply(value, rctx, ctx) {
      if (value.includes('{{')) return { value } // expression reference, not data
      const next = value.replace(PHONE, (m) =>
        ctx.record('phone', m, rctx.path, (n) => fakePhone(m, n)),
      )
      return { value: next }
    },
  }
}
