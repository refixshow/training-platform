import { describe, expect, it } from 'vitest'

import {
  bodyMeasurementFormSchema,
  emptyBodyMeasurementFormValues,
} from './body-measurement.schema'

describe('bodyMeasurementFormSchema', () => {
  it('accepts a single weight value as enough signal', () => {
    const result = bodyMeasurementFormSchema.safeParse({
      ...emptyBodyMeasurementFormValues,
      bodyWeightKg: '82',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bodyWeightKg).toBe(82)
    }
  })

  it('parses Polish decimal separator', () => {
    const result = bodyMeasurementFormSchema.safeParse({
      ...emptyBodyMeasurementFormValues,
      bodyWeightKg: '82,4',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bodyWeightKg).toBe(82.4)
    }
  })

  it('rejects values outside the metric range', () => {
    const result = bodyMeasurementFormSchema.safeParse({
      ...emptyBodyMeasurementFormValues,
      bodyWeightKg: '500',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((issue) =>
        issue.path.includes('bodyWeightKg'),
      )
      expect(issue?.message).toMatch(/miedzy/)
    }
  })

  it('rejects entries that have no value and no photo', () => {
    const result = bodyMeasurementFormSchema.safeParse({
      ...emptyBodyMeasurementFormValues,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/Uzupelnij/)
    }
  })

  it('accepts entries with only a photo', () => {
    const result = bodyMeasurementFormSchema.safeParse({
      ...emptyBodyMeasurementFormValues,
      photoFileName: 'progress.jpg',
    })

    expect(result.success).toBe(true)
  })

  it('rejects a note longer than 500 chars', () => {
    const result = bodyMeasurementFormSchema.safeParse({
      ...emptyBodyMeasurementFormValues,
      bodyWeightKg: '82',
      note: 'a'.repeat(501),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes('note'))).toBe(true)
    }
  })

  it('rejects non-numeric text', () => {
    const result = bodyMeasurementFormSchema.safeParse({
      ...emptyBodyMeasurementFormValues,
      bodyWeightKg: 'osiemdziesiat',
    })

    expect(result.success).toBe(false)
  })
})
