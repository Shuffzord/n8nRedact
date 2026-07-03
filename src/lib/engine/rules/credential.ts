import type { Rule } from '../types'
import { fakeCredentialName, fakeToken } from '../generators'

// Matches the id / name inside an n8n credentials block:
//   nodes[i].credentials.<type>.id  and  nodes[i].credentials.<type>.name
const CREDENTIAL_FIELD = /\.credentials\.[^.[\]]+\.(id|name)$/

/**
 * Anonymizes credential references. n8n exports never contain the secret itself,
 * but they do carry the credential's id and human-given name — both of which
 * identify the source instance and are the most common real leak. Values map
 * deterministically, so the same credential stays consistent across every node
 * that uses it.
 */
export function credentialRule(): Rule {
  return {
    id: 'credential',
    category: 'credentialName',
    label: 'Credential names & IDs',
    enabled: true,
    apply(value, rctx, ctx) {
      if (!value || !CREDENTIAL_FIELD.test(rctx.path)) return { value }
      const isName = rctx.key === 'name'
      const replacement = ctx.record('credentialName', value, rctx.path, (n) =>
        isName ? fakeCredentialName(n) : fakeToken(value, n),
      )
      return { value: replacement, whole: true }
    },
  }
}
