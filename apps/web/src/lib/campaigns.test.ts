import { describe, expect, it } from 'vitest'
import { closesAtFromLastDay, dayOf, lastDayOf, opensAtFromDay } from './campaigns'

describe('Dates de campagne', () => {
  it('convertit le dernier jour inclus en borne de clôture exclusive', () => {
    expect(opensAtFromDay('2026-09-01')).toBe('2026-09-01T00:00:00.000Z')
    expect(closesAtFromLastDay('2026-12-31')).toBe('2027-01-01T00:00:00.000Z')
    expect(closesAtFromLastDay('2028-02-28')).toBe('2028-02-29T00:00:00.000Z')
  })

  it('retrouve le dernier jour saisi à partir de la borne exclusive', () => {
    expect(dayOf(lastDayOf({ closesAt: '2027-01-01T00:00:00.000Z' }))).toBe('2026-12-31')
  })
})
