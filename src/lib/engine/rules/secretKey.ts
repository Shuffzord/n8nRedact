import type { Rule } from '../types'
import { fakeToken } from '../generators'

// Substrings that, when present in a field name, mean the whole value is a secret.
const SECRET_KEY_HINTS = [
  'password',
  'passwd',
  'passphrase',
  'secret',
  'token',
  'apikey',
  'authorization',
  'accesskey',
  'privatekey',
  'clientsecret',
  'credential',
  'bearer',
]

function normalize(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Replaces the entire value of a field whose name signals a secret (e.g.
 * `Authorization`, `apiKey`, `client_secret`). This catches secrets that have
 * no recognisable pattern of their own — the common case for cURL-imported
 * HTTP Request headers in n8n workflows.
 */
export function secretKeyRule(): Rule {
  return {
    id: 'secretKey',
    category: 'apiKey',
    label: 'Credentials / API keys (by field name)',
    enabled: true,
    apply(value, rctx, ctx) {
      const fieldName = rctx.nameHint ?? rctx.key
      if (!value || fieldName === null) return { value }
      const norm = normalize(fieldName)
      const isSecret = SECRET_KEY_HINTS.some((hint) => norm.includes(hint))
      if (!isSecret) return { value }
      const replacement = ctx.record('apiKey', value, rctx.path, (n) => fakeToken(value, n))
      return { value: replacement, whole: true }
    },
  }
}
