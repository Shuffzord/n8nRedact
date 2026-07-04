import { describe, it, expect } from 'vitest'
import { anonymize, defaultRules } from '../../src/lib/engine'

const run = (json: unknown) => anonymize(json, defaultRules()).output as Record<string, unknown>

describe('numeric messaging ids', () => {
  it('replaces a numeric chatId with a different number of the same sign and digit count', () => {
    const out = run({ chatId: -1002405526505 })
    expect(typeof out.chatId).toBe('number') // stays a JSON number, not a string
    expect(out.chatId).not.toBe(-1002405526505)
    expect(out.chatId as number).toBeLessThan(0) // sign preserved
    expect(String(Math.abs(out.chatId as number))).toHaveLength('1002405526505'.length)
  })

  it('replaces a positive numeric senderId', () => {
    const out = run({ senderId: 123456789 })
    expect(typeof out.senderId).toBe('number')
    expect(out.senderId).not.toBe(123456789)
    expect(out.senderId as number).toBeGreaterThan(0)
    expect(String(out.senderId)).toHaveLength(9)
  })

  it('records the replacement in the chatId category', () => {
    const { changes, countsByCategory } = anonymize({ chatId: -1002405526505 }, defaultRules())
    expect(countsByCategory.chatId).toBe(1)
    expect(changes.some((c) => c.category === 'chatId')).toBe(true)
  })

  it('leaves non-messaging numbers untouched', () => {
    const input = {
      position: [2304, -528],
      typeVersion: 2,
      createdAt: 1719878400000, // a big timestamp
      retries: 12345,
      index: 7,
    }
    const out = run(input)
    expect(out.position).toEqual([2304, -528])
    expect(out.typeVersion).toBe(2)
    expect(out.createdAt).toBe(1719878400000)
    expect(out.retries).toBe(12345)
    expect(out.index).toBe(7)
  })

  it('is deterministic — same input yields the same fake', () => {
    const a = run({ chatId: -1002405526505 })
    const b = run({ chatId: -1002405526505 })
    expect(a.chatId).toBe(b.chatId)
  })

  it('referential integrity — the same numeric id maps identically across fields', () => {
    const out = run({ chatId: 987654321, fromId: 987654321, groupId: 111222333 })
    expect(out.chatId).toBe(out.fromId)
    expect(out.groupId).not.toBe(out.chatId)
  })

  it('respects the toggle — a disabled chatId rule leaves the number alone', () => {
    const rules = defaultRules().map((r) => (r.id === 'chatId' ? { ...r, enabled: false } : r))
    const out = anonymize({ chatId: -1002405526505 }, rules).output as { chatId: number }
    expect(out.chatId).toBe(-1002405526505)
  })
})
