import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCoachAdmin, requireTrainee } from './auth'
import {
  bodyMeasurementNumericRanges,
  bodyMeasurementPayloadValidator,
} from './validators'

const MAX_ENTRIES_PER_QUERY = 500
const NOTE_MAX_LENGTH = 500

type BodyMeasurementPayload = typeof bodyMeasurementPayloadValidator.type

type Ctx = Pick<MutationCtx | QueryCtx, 'auth' | 'db' | 'storage'>

export const listForTrainee = query({
  args: {},
  handler: async (ctx) => {
    const trainee = await requireTrainee(ctx)

    return await loadMeasurementsForTrainee(ctx, trainee._id)
  },
})

export const listForClient = query({
  args: {
    traineeId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const trainee = await ctx.db.get(args.traineeId)

    if (!trainee || trainee.role !== 'trainee' || trainee.coachId !== coach._id) {
      throw new Error('Nie masz dostepu do tego klienta.')
    }

    const entries = await loadMeasurementsForTrainee(ctx, trainee._id)

    return {
      trainee: {
        _id: trainee._id,
        email: trainee.email,
        name: trainee.name,
      },
      entries,
    }
  },
})

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireTrainee(ctx)
    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
    capturedAt: v.optional(v.number()),
    payload: bodyMeasurementPayloadValidator,
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const parsed = parseMeasurementPayload(args.payload)
    const now = Date.now()
    const capturedAt = args.capturedAt ?? now

    if (!hasAnySignal(parsed)) {
      throw new Error('Uzupelnij przynajmniej jeden pomiar albo dolacz zdjecie.')
    }

    const measurementId = await ctx.db.insert('bodyMeasurements', {
      ...parsed,
      capturedAt,
      createdAt: now,
      traineeId: trainee._id,
    })

    return { measurementId }
  },
})

export const update = mutation({
  args: {
    measurementId: v.id('bodyMeasurements'),
    payload: bodyMeasurementPayloadValidator,
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const measurement = await ctx.db.get(args.measurementId)

    if (!measurement || measurement.traineeId !== trainee._id) {
      throw new Error('Nie mozesz edytowac tego pomiaru.')
    }

    if (!isSameCalendarDay(measurement.capturedAt, Date.now())) {
      throw new Error('Pomiar mozna edytowac tylko w dniu jego dodania.')
    }

    const parsed = parseMeasurementPayload(args.payload)

    if (!hasAnySignal(parsed)) {
      throw new Error('Pomiar musi miec przynajmniej jedna wartosc albo zdjecie.')
    }

    if (
      measurement.photoStorageId &&
      parsed.photoStorageId !== measurement.photoStorageId
    ) {
      await ctx.storage.delete(measurement.photoStorageId)
    }

    await ctx.db.patch(args.measurementId, {
      abdomenCm: parsed.abdomenCm,
      bodyFatPercent: parsed.bodyFatPercent,
      bodyWeightKg: parsed.bodyWeightKg,
      chestCm: parsed.chestCm,
      hipsCm: parsed.hipsCm,
      leftBicepCm: parsed.leftBicepCm,
      leftCalfCm: parsed.leftCalfCm,
      leftForearmCm: parsed.leftForearmCm,
      leftThighCm: parsed.leftThighCm,
      neckCm: parsed.neckCm,
      note: parsed.note,
      photoStorageId: parsed.photoStorageId,
      rightBicepCm: parsed.rightBicepCm,
      rightCalfCm: parsed.rightCalfCm,
      rightForearmCm: parsed.rightForearmCm,
      rightThighCm: parsed.rightThighCm,
      shoulderCm: parsed.shoulderCm,
      updatedAt: Date.now(),
      waistCm: parsed.waistCm,
    })
  },
})

export const remove = mutation({
  args: {
    measurementId: v.id('bodyMeasurements'),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const measurement = await ctx.db.get(args.measurementId)

    if (!measurement || measurement.traineeId !== trainee._id) {
      throw new Error('Nie mozesz usunac tego pomiaru.')
    }

    if (!isSameCalendarDay(measurement.capturedAt, Date.now())) {
      throw new Error('Pomiar mozna usunac tylko w dniu jego dodania.')
    }

    if (measurement.photoStorageId) {
      await ctx.storage.delete(measurement.photoStorageId)
    }

    await ctx.db.delete(args.measurementId)
  },
})

async function loadMeasurementsForTrainee(ctx: Ctx, traineeId: Id<'users'>) {
  const rows = await ctx.db
    .query('bodyMeasurements')
    .withIndex('by_trainee_and_captured_at', (q) => q.eq('traineeId', traineeId))
    .order('desc')
    .take(MAX_ENTRIES_PER_QUERY)

  return await Promise.all(rows.map((row) => toMeasurementView(ctx, row)))
}

async function toMeasurementView(ctx: Ctx, row: Doc<'bodyMeasurements'>) {
  const photoUrl = row.photoStorageId
    ? await ctx.storage.getUrl(row.photoStorageId)
    : null

  return {
    _id: row._id,
    abdomenCm: row.abdomenCm,
    bodyFatPercent: row.bodyFatPercent,
    bodyWeightKg: row.bodyWeightKg,
    capturedAt: row.capturedAt,
    chestCm: row.chestCm,
    createdAt: row.createdAt,
    hipsCm: row.hipsCm,
    leftBicepCm: row.leftBicepCm,
    leftCalfCm: row.leftCalfCm,
    leftForearmCm: row.leftForearmCm,
    leftThighCm: row.leftThighCm,
    neckCm: row.neckCm,
    note: row.note,
    photoStorageId: row.photoStorageId,
    photoUrl,
    rightBicepCm: row.rightBicepCm,
    rightCalfCm: row.rightCalfCm,
    rightForearmCm: row.rightForearmCm,
    rightThighCm: row.rightThighCm,
    shoulderCm: row.shoulderCm,
    updatedAt: row.updatedAt,
    waistCm: row.waistCm,
  }
}

function parseMeasurementPayload(payload: BodyMeasurementPayload): BodyMeasurementPayload {
  const cleaned: BodyMeasurementPayload = {}

  for (const [key, range] of Object.entries(bodyMeasurementNumericRanges)) {
    const value = (payload as Record<string, number | undefined>)[key]

    if (value === undefined) {
      continue
    }

    if (!Number.isFinite(value)) {
      throw new Error(`Wartosc dla pola ${key} musi byc liczba.`)
    }

    if (value < range.min || value > range.max) {
      throw new Error(
        `Wartosc dla pola ${key} musi byc miedzy ${range.min} a ${range.max}.`,
      )
    }

    ;(cleaned as Record<string, number>)[key] = Math.round(value * 10) / 10
  }

  const note = payload.note?.trim()

  if (note !== undefined && note.length > 0) {
    if (note.length > NOTE_MAX_LENGTH) {
      throw new Error(`Notatka moze miec maksymalnie ${NOTE_MAX_LENGTH} znakow.`)
    }
    cleaned.note = note
  }

  if (payload.photoStorageId) {
    cleaned.photoStorageId = payload.photoStorageId
  }

  return cleaned
}

function hasAnySignal(payload: BodyMeasurementPayload): boolean {
  for (const key of Object.keys(bodyMeasurementNumericRanges)) {
    if ((payload as Record<string, number | undefined>)[key] !== undefined) {
      return true
    }
  }

  return Boolean(payload.photoStorageId)
}

function isSameCalendarDay(timestampA: number, timestampB: number): boolean {
  const a = new Date(timestampA)
  const b = new Date(timestampB)

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
