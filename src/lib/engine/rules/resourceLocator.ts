import type { Rule } from '../types'
import { fakeResourceId } from '../generators'

const DASHED_UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const LONG_HEX = /^[0-9a-fA-F]{32,}$/

/**
 * Anonymizes the `value` of an n8n resourceLocator (`{ __rl: true, value, ... }`),
 * which holds the real external resource id — e.g. an Airtable base/table id
 * (`appXXXX`/`tblXXXX`) or a Postgres schema/table name. Values that other rules
 * already handle well are passed through untouched: URLs (the url rule scrubs
 * them), dashed UUIDs and long hex ids (uuid/hexId rules — keeping cross-document
 * referential integrity), and n8n expressions.
 */
export function resourceLocatorRule(): Rule {
  return {
    id: 'resourceLocator',
    category: 'resourceId',
    label: 'Resource IDs (Airtable, DB tables, …)',
    enabled: true,
    apply(value, rctx, ctx) {
      if (!value || !rctx.inResourceLocator) return { value }
      if (value.includes('{{')) return { value }
      if (/^https?:\/\//i.test(value)) return { value }
      if (DASHED_UUID.test(value) || LONG_HEX.test(value)) return { value }
      const replacement = ctx.record('resourceId', value, rctx.path, (n) =>
        fakeResourceId(value, n),
      )
      return { value: replacement, whole: true }
    },
  }
}
