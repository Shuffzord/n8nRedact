import type { AnonymizeResult, Category } from './types'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskReport {
  level: RiskLevel
  reasons: string[]
  /** Residual exposure the rules cannot fully handle — needs a human decision. */
  warnings: string[]
}

// Categories whose presence means the original workflow exposed high-value data.
// Only categories that a default rule can actually emit are listed here (see the
// SCORED_CATEGORIES ⊆ rule categories test).
const HIGH_CATEGORIES: Category[] = ['apiKey', 'credentialName', 'chatId']
const MEDIUM_CATEGORIES: Category[] = ['email', 'url', 'dbBucket', 'resourceId', 'uuid']

/** Every category the risk model scores — exported so tests can assert no dead entries. */
export const SCORED_CATEGORIES: readonly Category[] = [...HIGH_CATEGORIES, ...MEDIUM_CATEGORIES]

const REASON_LABELS: Partial<Record<Category, string>> = {
  apiKey: 'credential/API key value(s)',
  credentialName: 'credential reference(s)',
  chatId: 'messaging id(s)',
  email: 'email address(es)',
  url: 'URL(s)',
  dbBucket: 'resource name(s)',
  resourceId: 'resource id(s)',
  uuid: 'id(s)',
}

function reasonFor(category: Category, count: number): string {
  return `${count} ${REASON_LABELS[category] ?? category}`
}

/**
 * Scores how exposed the original workflow was, based on what the rules found,
 * and surfaces residual risks (like pinned execution data) that the deterministic
 * rules cannot safely anonymize on their own.
 */
export function assessRisk(input: unknown, result: AnonymizeResult): RiskReport {
  const counts = result.countsByCategory
  const reasons: string[] = []

  let level: RiskLevel = 'low'
  for (const c of HIGH_CATEGORIES) if (counts[c]) reasons.push(reasonFor(c, counts[c]!))
  for (const c of MEDIUM_CATEGORIES) if (counts[c]) reasons.push(reasonFor(c, counts[c]!))

  if (HIGH_CATEGORIES.some((c) => counts[c])) level = 'high'
  else if (MEDIUM_CATEGORIES.some((c) => counts[c])) level = 'medium'

  const warnings: string[] = []
  const obj = input as Record<string, unknown> | null
  const pinData = obj && typeof obj === 'object' ? obj.pinData : undefined
  if (pinData && typeof pinData === 'object' && Object.keys(pinData).length > 0) {
    level = 'high'
    warnings.push(
      'Contains pinData (pinned execution data): this can hold real input/output values that rules cannot fully anonymize. Remove it before sharing.',
    )
  }

  return { level, reasons, warnings }
}
