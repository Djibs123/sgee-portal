import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, sumAmounts } from './format'

// Intl insère des espaces insécables : on les normalise pour comparer.
const normalize = (value: string) => value.replace(/\s/g, ' ')

describe('format', () => {
  it('formate selon la devise réelle', () => {
    expect(normalize(formatMoney('297.27', 'EUR'))).toBe('297,27 €')
    expect(normalize(formatMoney(145000, 'XOF'))).toBe('145 000 F CFA')
    expect(formatMoney(null)).toBe('—')
    expect(formatMoney('abc')).toBe('—')
  })

  it('additionne des montants sans erreur d’arrondi', () => {
    expect(sumAmounts(['0.10', '0.20'])).toBe(0.3)
    expect(sumAmounts(['297.27', '297.27', '541.19'])).toBe(1135.73)
  })

  it('formate les dates en français, sans décalage de fuseau', () => {
    expect(formatDate('2026-04-01T00:00:00.000Z')).toBe('01/04/2026')
    expect(formatDate(null)).toBe('—')
  })
})
