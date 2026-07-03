export type Category =
  | 'email'
  | 'apiKey'
  | 'url'
  | 'uuid'
  | 'ip'
  | 'phone'
  | 'jwt'
  | 'name'
  | 'company'
  | 'dbBucket'
  | 'resourceId'
  | 'credentialName'
  | 'chatId'
  | 'custom'

/** Where a string leaf sits in the document, given to rules for context. */
export interface RuleContext {
  /** The parent object key this value is stored under (null for array items). */
  key: string | null
  /**
   * Effective field name for n8n `{ name, value }` pairs: when this value is the
   * `value` of such a pair (e.g. an HTTP header), this is the sibling `name`.
   */
  nameHint: string | null
  /** True when this value is the `value` of an n8n resourceLocator (`__rl: true`). */
  inResourceLocator: boolean
  /** Dotted JSON path to the value, e.g. `nodes[0].parameters.url`. */
  path: string
}

/** A single anonymization replacement that was applied. */
export interface Change {
  path: string
  category: Category
  original: string
  replacement: string
}

export interface RuleResult {
  value: string
  /** When true, the value was replaced whole and no further rules should run. */
  whole?: boolean
}

export interface Rule {
  id: string
  category: Category
  label: string
  enabled: boolean
  apply(value: string, rctx: RuleContext, ctx: AnonymizationContextApi): RuleResult
}

/** The subset of the context that rules are allowed to use. */
export interface AnonymizationContextApi {
  /**
   * Map an original value to a deterministic replacement and log the occurrence.
   * Repeated originals in the same category return the identical replacement
   * (referential integrity).
   */
  record(category: Category, original: string, path: string, make: (n: number) => string): string
}

export interface AnonymizeResult {
  output: unknown
  changes: Change[]
  countsByCategory: Record<string, number>
}
