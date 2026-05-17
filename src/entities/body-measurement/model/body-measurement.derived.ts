import {
  metricDefinitions,
  storedMetricKeys,
  type MetricKey,
  type StoredMetricKey,
} from './body-measurement.constants'

export interface BodyMeasurementValues {
  bodyWeightKg?: number
  bodyFatPercent?: number
  neckCm?: number
  shoulderCm?: number
  chestCm?: number
  abdomenCm?: number
  waistCm?: number
  hipsCm?: number
  leftBicepCm?: number
  rightBicepCm?: number
  leftForearmCm?: number
  rightForearmCm?: number
  leftThighCm?: number
  rightThighCm?: number
  leftCalfCm?: number
  rightCalfCm?: number
}

export function computeLeanBodyMass(entry: BodyMeasurementValues): number | null {
  if (entry.bodyWeightKg === undefined || entry.bodyFatPercent === undefined) {
    return null
  }

  const lean = entry.bodyWeightKg * (1 - entry.bodyFatPercent / 100)

  return Math.round(lean * 10) / 10
}

export function getMetricValue(
  entry: BodyMeasurementValues,
  metric: MetricKey,
): number | null {
  if (metric === 'leanBodyMassKg') {
    return computeLeanBodyMass(entry)
  }

  const value = entry[metric as StoredMetricKey]

  return value === undefined ? null : value
}

export type TrendDirection = 'up' | 'down' | 'flat' | 'none'

export function getTrendDirection(
  previous: number | null | undefined,
  current: number | null | undefined,
): TrendDirection {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return 'none'
  }

  const delta = current - previous

  if (Math.abs(delta) < 0.05) {
    return 'flat'
  }

  return delta > 0 ? 'up' : 'down'
}

export interface MetricFillStats {
  metric: MetricKey
  filled: number
}

export function getMetricFillStats(
  entries: readonly BodyMeasurementValues[],
): MetricFillStats[] {
  return metricDefinitions.map((metric) => {
    let filled = 0

    for (const entry of entries) {
      const value = getMetricValue(entry, metric.key)

      if (value !== null) {
        filled += 1
      }
    }

    return { metric: metric.key, filled }
  })
}

export function selectDefaultMetric(entries: readonly BodyMeasurementValues[]): MetricKey {
  const stats = getMetricFillStats(entries).filter((stat) => stat.filled > 0)

  if (stats.length === 0) {
    return 'bodyWeightKg'
  }

  stats.sort((a, b) => {
    if (b.filled !== a.filled) {
      return b.filled - a.filled
    }

    const indexA = metricDefinitions.findIndex((metric) => metric.key === a.metric)
    const indexB = metricDefinitions.findIndex((metric) => metric.key === b.metric)

    return indexA - indexB
  })

  return stats[0]!.metric
}

export function hasAnyStoredValue(entry: BodyMeasurementValues): boolean {
  return storedMetricKeys.some((key) => entry[key] !== undefined)
}

export function isSameCalendarDay(timestampA: number, timestampB: number): boolean {
  const a = new Date(timestampA)
  const b = new Date(timestampB)

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isToday(timestamp: number, now: number = Date.now()): boolean {
  return isSameCalendarDay(timestamp, now)
}
