import type { Rule } from '../types'
import { secretKeyRule } from './secretKey'
import { credentialRule } from './credential'
import { resourceNameRule } from './resourceName'
import { resourceLocatorRule } from './resourceLocator'
import { chatIdRule } from './chatId'
import { uuidRule } from './uuid'
import { emailRule } from './email'
import { urlRule } from './url'
import { hexIdRule } from './hexId'

/**
 * The default rule set, in application order. Whole-value rules (secret fields,
 * credential id/name, messaging ids) run first so their contents aren't
 * re-scanned. Among the pattern rules, `hexId` runs after `url` so it also
 * anonymizes hex ids left inside a replaced URL's path (e.g. a Notion page id).
 */
export function defaultRules(): Rule[] {
  return [
    secretKeyRule(),
    credentialRule(),
    resourceNameRule(),
    resourceLocatorRule(),
    chatIdRule(),
    uuidRule(),
    emailRule(),
    urlRule(),
    hexIdRule(),
  ]
}

export {
  secretKeyRule,
  credentialRule,
  resourceNameRule,
  resourceLocatorRule,
  chatIdRule,
  uuidRule,
  emailRule,
  urlRule,
  hexIdRule,
}
