import { z } from 'zod'

import { metricDefinitions, storedMetricKeys, type StoredMetricKey } from './body-measurement.constants'

const NOTE_MAX_LENGTH = 500

function optionalNumberField(min: number, max: number) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === undefined || value === '' ? undefined : value))
    .superRefine((value, ctx) => {
      if (value === undefined) {
        return
      }

      const normalized = value.replace(',', '.')
      const parsed = Number(normalized)

      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: 'custom', message: 'Wpisz liczbe.' })
        return
      }

      if (parsed < min || parsed > max) {
        ctx.addIssue({
          code: 'custom',
          message: `Wpisz wartosc miedzy ${formatRange(min)} a ${formatRange(max)}.`,
        })
      }
    })
    .transform((value) => {
      if (value === undefined) {
        return undefined
      }
      return Number(value.replace(',', '.'))
    })
}

function formatRange(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 1,
  }).format(value)
}

const numericFieldsShape = storedMetricKeys.reduce(
  (acc, key) => {
    const metric = metricDefinitions.find((definition) => definition.key === key)

    if (!metric) {
      throw new Error(`Missing metric definition for ${key}`)
    }

    acc[key] = optionalNumberField(metric.min, metric.max)
    return acc
  },
  {} as Record<StoredMetricKey, ReturnType<typeof optionalNumberField>>,
)

export const bodyMeasurementFormSchema = z
  .object({
    ...numericFieldsShape,
    note: z
      .string()
      .trim()
      .max(NOTE_MAX_LENGTH, `Notatka moze miec maksymalnie ${NOTE_MAX_LENGTH} znakow.`)
      .optional()
      .transform((value) => (value === undefined || value === '' ? undefined : value)),
    photoFileName: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    const hasNumeric = storedMetricKeys.some((key) => values[key] !== undefined)
    const hasPhoto = (values.photoFileName ?? '').length > 0

    if (!hasNumeric && !hasPhoto) {
      ctx.addIssue({
        code: 'custom',
        message: 'Uzupelnij przynajmniej jeden pomiar albo dodaj zdjecie.',
        path: ['bodyWeightKg'],
      })
    }
  })

export type BodyMeasurementFormValues = Record<StoredMetricKey, string> & {
  note: string
  photoFileName: string
}

export type BodyMeasurementParsedValues = z.output<typeof bodyMeasurementFormSchema>

export const emptyBodyMeasurementFormValues: BodyMeasurementFormValues = {
  ...storedMetricKeys.reduce(
    (acc, key) => {
      acc[key] = ''
      return acc
    },
    {} as Record<StoredMetricKey, string>,
  ),
  note: '',
  photoFileName: '',
}
