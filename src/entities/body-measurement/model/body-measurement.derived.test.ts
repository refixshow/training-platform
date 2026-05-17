import { describe, expect, it } from 'vitest'

import {
  computeLeanBodyMass,
  getMetricFillStats,
  getMetricValue,
  getTrendDirection,
  isSameCalendarDay,
  selectDefaultMetric,
} from './body-measurement.derived'

describe('computeLeanBodyMass', () => {
  it('returns lean body mass from weight and body fat', () => {
    expect(computeLeanBodyMass({ bodyWeightKg: 80, bodyFatPercent: 20 })).toBe(64)
  })

  it('rounds to a single decimal', () => {
    expect(computeLeanBodyMass({ bodyWeightKg: 80.0, bodyFatPercent: 18.7 })).toBe(65)
  })

  it('returns null when weight is missing', () => {
    expect(computeLeanBodyMass({ bodyFatPercent: 20 })).toBeNull()
  })

  it('returns null when body fat is missing', () => {
    expect(computeLeanBodyMass({ bodyWeightKg: 80 })).toBeNull()
  })
})

describe('getMetricValue', () => {
  it('returns the stored value for a stored metric', () => {
    expect(
      getMetricValue({ bodyWeightKg: 80, bodyFatPercent: 20 }, 'bodyWeightKg'),
    ).toBe(80)
  })

  it('returns null for missing stored metric', () => {
    expect(getMetricValue({}, 'chestCm')).toBeNull()
  })

  it('computes the derived lean body mass', () => {
    expect(
      getMetricValue({ bodyWeightKg: 80, bodyFatPercent: 20 }, 'leanBodyMassKg'),
    ).toBe(64)
  })
})

describe('getTrendDirection', () => {
  it('returns up when current > previous', () => {
    expect(getTrendDirection(80, 81)).toBe('up')
  })

  it('returns down when current < previous', () => {
    expect(getTrendDirection(81, 80)).toBe('down')
  })

  it('returns flat for near-equal values', () => {
    expect(getTrendDirection(80, 80.02)).toBe('flat')
  })

  it('returns none when previous is missing', () => {
    expect(getTrendDirection(null, 80)).toBe('none')
  })
})

describe('selectDefaultMetric', () => {
  it('picks the metric with the most fills', () => {
    const entries = [
      { bodyWeightKg: 80, waistCm: 85 },
      { bodyWeightKg: 81 },
      { bodyWeightKg: 82, chestCm: 100 },
    ]

    expect(selectDefaultMetric(entries)).toBe('bodyWeightKg')
  })

  it('breaks ties by declaration order', () => {
    const entries = [
      { bodyWeightKg: 80, chestCm: 100 },
      { bodyWeightKg: 81, chestCm: 101 },
    ]

    expect(selectDefaultMetric(entries)).toBe('bodyWeightKg')
  })

  it('returns bodyWeightKg fallback when no entries', () => {
    expect(selectDefaultMetric([])).toBe('bodyWeightKg')
  })
})

describe('getMetricFillStats', () => {
  it('counts how many entries fill each metric', () => {
    const entries = [
      { bodyWeightKg: 80, bodyFatPercent: 20 },
      { bodyWeightKg: 81 },
      { chestCm: 100 },
    ]
    const stats = getMetricFillStats(entries)
    const weight = stats.find((s) => s.metric === 'bodyWeightKg')
    const chest = stats.find((s) => s.metric === 'chestCm')
    const lean = stats.find((s) => s.metric === 'leanBodyMassKg')

    expect(weight?.filled).toBe(2)
    expect(chest?.filled).toBe(1)
    expect(lean?.filled).toBe(1)
  })
})

describe('isSameCalendarDay', () => {
  it('returns true for two timestamps in the same day', () => {
    const dayStart = new Date('2026-05-15T00:30:00').getTime()
    const dayEnd = new Date('2026-05-15T23:30:00').getTime()
    expect(isSameCalendarDay(dayStart, dayEnd)).toBe(true)
  })

  it('returns false across the day boundary', () => {
    const before = new Date('2026-05-15T23:00:00').getTime()
    const after = new Date('2026-05-16T01:00:00').getTime()
    expect(isSameCalendarDay(before, after)).toBe(false)
  })
})
