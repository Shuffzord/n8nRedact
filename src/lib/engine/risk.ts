import type { AnonymizeResult, Category } from './types'

export type RiskLevel = 'low' | 'medium' | 'high'

export interface RiskReport {
  level: RiskLevel
  reasons: string[]
  /** Residual exposure the rules cannot fully handle — needs a human decision. */
  warnings: string[]
}

// Categories whose presence means the original workflow exposed high-value data.
const HIGH_CATEGORIES: Category[] = ['apiKey', 'jwt', 'credentialName', 'chatId']
const MEDIUM_CATEGORIES: Category[] = [
  'email',
  'url',
  'ip',
  'phone',
  'dbBucket',
  'resourceId',
  'uuid',
]

const REASON_LABELS: Partial<Record<Category, string>> = {
  apiKey: 'credential/API key value(s)',
  jwt: 'JWT/token(s)',
  credentialName: 'credential reference(s)',
  chatId: 'messaging id(s)',
  email: 'email address(es)',
  url: 'URL(s)',
  ip: 'IP address(es)',
  phone: 'phone number(s)',
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
