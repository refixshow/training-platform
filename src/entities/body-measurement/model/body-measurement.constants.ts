export const storedMetricKeys = [
  'bodyWeightKg',
  'bodyFatPercent',
  'neckCm',
  'shoulderCm',
  'chestCm',
  'leftBicepCm',
  'rightBicepCm',
  'leftForearmCm',
  'rightForearmCm',
  'abdomenCm',
  'waistCm',
  'hipsCm',
  'leftThighCm',
  'rightThighCm',
  'leftCalfCm',
  'rightCalfCm',
] as const

export type StoredMetricKey = (typeof storedMetricKeys)[number]

export const derivedMetricKeys = ['leanBodyMassKg'] as const

export type DerivedMetricKey = (typeof derivedMetricKeys)[number]

export type MetricKey = StoredMetricKey | DerivedMetricKey

export type MetricUnit = 'kg' | '%' | 'cm'

export type MetricGroup = 'body' | 'composition' | 'torso' | 'upper' | 'lower'

export interface MetricDef {
  key: MetricKey
  label: string
  shortLabel: string
  unit: MetricUnit
  min: number
  max: number
  step: number
  group: MetricGroup
  derived?: true
}

export const metricDefinitions: readonly MetricDef[] = [
  { key: 'bodyWeightKg', label: 'Waga ciala', shortLabel: 'Waga', unit: 'kg', min: 30, max: 300, step: 0.1, group: 'body' },
  { key: 'bodyFatPercent', label: 'Tkanka tluszczowa', shortLabel: 'Tluszcz', unit: '%', min: 1, max: 70, step: 0.1, group: 'composition' },
  { key: 'leanBodyMassKg', label: 'Masa beztluszczowa', shortLabel: 'Beztluszczowa', unit: 'kg', min: 0, max: 300, step: 0.1, group: 'composition', derived: true },
  { key: 'neckCm', label: 'Szyja', shortLabel: 'Szyja', unit: 'cm', min: 20, max: 80, step: 0.1, group: 'torso' },
  { key: 'shoulderCm', label: 'Barki', shortLabel: 'Barki', unit: 'cm', min: 60, max: 200, step: 0.1, group: 'torso' },
  { key: 'chestCm', label: 'Klatka piersiowa', shortLabel: 'Klatka', unit: 'cm', min: 60, max: 200, step: 0.1, group: 'torso' },
  { key: 'abdomenCm', label: 'Brzuch', shortLabel: 'Brzuch', unit: 'cm', min: 40, max: 200, step: 0.1, group: 'torso' },
  { key: 'waistCm', label: 'Talia', shortLabel: 'Talia', unit: 'cm', min: 40, max: 200, step: 0.1, group: 'torso' },
  { key: 'hipsCm', label: 'Biodra', shortLabel: 'Biodra', unit: 'cm', min: 60, max: 200, step: 0.1, group: 'torso' },
  { key: 'leftBicepCm', label: 'Biceps lewy', shortLabel: 'Biceps L', unit: 'cm', min: 15, max: 70, step: 0.1, group: 'upper' },
  { key: 'rightBicepCm', label: 'Biceps prawy', shortLabel: 'Biceps P', unit: 'cm', min: 15, max: 70, step: 0.1, group: 'upper' },
  { key: 'leftForearmCm', label: 'Przedramie lewe', shortLabel: 'Przedramie L', unit: 'cm', min: 15, max: 60, step: 0.1, group: 'upper' },
  { key: 'rightForearmCm', label: 'Przedramie prawe', shortLabel: 'Przedramie P', unit: 'cm', min: 15, max: 60, step: 0.1, group: 'upper' },
  { key: 'leftThighCm', label: 'Udo lewe', shortLabel: 'Udo L', unit: 'cm', min: 30, max: 100, step: 0.1, group: 'lower' },
  { key: 'rightThighCm', label: 'Udo prawe', shortLabel: 'Udo P', unit: 'cm', min: 30, max: 100, step: 0.1, group: 'lower' },
  { key: 'leftCalfCm', label: 'Lydka lewa', shortLabel: 'Lydka L', unit: 'cm', min: 20, max: 70, step: 0.1, group: 'lower' },
  { key: 'rightCalfCm', label: 'Lydka prawa', shortLabel: 'Lydka P', unit: 'cm', min: 20, max: 70, step: 0.1, group: 'lower' },
]

export const metricGroupOrder: readonly MetricGroup[] = ['body', 'composition', 'torso', 'upper', 'lower']

export const metricGroupLabels: Record<MetricGroup, string> = {
  body: 'Waga',
  composition: 'Sklad ciala',
  torso: 'Tulow',
  upper: 'Konczyny gorne',
  lower: 'Konczyny dolne',
}

const metricByKey: Record<MetricKey, MetricDef> = metricDefinitions.reduce(
  (acc, metric) => {
    acc[metric.key] = metric
    return acc
  },
  {} as Record<MetricKey, MetricDef>,
)

export function getMetricDef(key: MetricKey): MetricDef {
  return metricByKey[key]
}

export function formatMetricValue(key: MetricKey, value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const metric = getMetricDef(key)
  const formatted = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: metric.step >= 1 ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value)

  return `${formatted} ${metric.unit}`
}
