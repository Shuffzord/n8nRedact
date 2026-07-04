import type { AnonymizationContextApi, Rule } from '../types'
import { fakeNumericId, fakeToken } from '../generators'

function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Field names whose literal value identifies a private chat/user/channel.
const ID_KEY_HINTS = ['chatid', 'channelid', 'groupid', 'fromid', 'senderid']

/** True when a field name marks its value as a private messaging id. */
export function isMessagingIdKey(fieldName: string | null): boolean {
  if (fieldName === null) return false
  const norm = normalize(fieldName)
  return ID_KEY_HINTS.some((hint) => norm.includes(hint))
}

/**
 * Number-aware companion to {@link chatIdRule}. A Telegram `chatId` (or similar)
 * is sometimes stored as a JSON *number* (e.g. `-1002405526505`), which leaks
 * because `walk` skips numbers. When `fieldName` is a messaging-id key and the
 * value is an integer of at least five digits, returns a deterministic fake
 * number of the same sign and digit count; otherwise the value is returned
 * unchanged. The replacement is recorded in the shared `chatId` category, so
 * referential integrity holds across the numeric and string forms of an id.
 */
export function anonymizeNumericId(
  value: number,
  fieldName: string | null,
  path: string,
  ctx: AnonymizationContextApi,
): number {
  if (!isMessagingIdKey(fieldName)) return value
  if (!Number.isSafeInteger(value) || String(Math.abs(value)).length < 5) return value
  const replacement = ctx.record('chatId', String(value), path, (n) =>
    String(fakeNumericId(value, n)),
  )
  return Number(replacement)
}

/**
 * Anonymizes literal messaging IDs (e.g. a Telegram `chatId` like
 * `-1002405526505`, which pinpoints a private group). Only fires for literal
 * values — n8n expressions such as `={{ $json.chat.id }}` are references, not
 * data, and are left untouched so the workflow keeps working.
 */
export function chatIdRule(): Rule {
  return {
    id: 'chatId',
    category: 'chatId',
    label: 'Messaging IDs (Telegram chat/group)',
    enabled: true,
    apply(value, rctx, ctx) {
      const fieldName = rctx.nameHint ?? rctx.key
      if (!value || fieldName === null) return { value }
      if (value.includes('{{')) return { value } // expression reference, not data
      if (!isMessagingIdKey(fieldName) || !/\d{5,}/.test(value)) return { value }
      const replacement = ctx.record('chatId', value, rctx.path, (n) => fakeToken(value, n))
      return { value: replacement, whole: true }
    },
  }
}
