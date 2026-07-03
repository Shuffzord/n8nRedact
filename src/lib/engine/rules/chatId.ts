import type { Rule } from '../types'
import { fakeToken } from '../generators'

function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Field names whose literal numeric value identifies a private chat/user/channel.
const ID_KEY_HINTS = ['chatid', 'channelid', 'groupid', 'fromid', 'senderid']

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
      const norm = normalize(fieldName)
      const isIdKey = ID_KEY_HINTS.some((hint) => norm.includes(hint))
      if (!isIdKey || !/\d{5,}/.test(value)) return { value }
      const replacement = ctx.record('chatId', value, rctx.path, (n) => fakeToken(value, n))
      return { value: replacement, whole: true }
    },
  }
}
