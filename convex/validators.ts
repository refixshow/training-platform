import { v } from 'convex/values'

export const exerciseEquipmentValues = [
  'none',
  'other',
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'plate',
  'resistance_band',
  'suspension',
] as const

export const exerciseTypeValues = [
  'weight_reps',
  'reps_only',
  'bodyweight',
  'assisted_bodyweight',
  'duration',
  'weight_duration',
  'distance_duration',
  'weight_distance',
] as const

export const exerciseEquipmentValidator = v.union(
  v.literal('none'),
  v.literal('other'),
  v.literal('barbell'),
  v.literal('dumbbell'),
  v.literal('kettlebell'),
  v.literal('machine'),
  v.literal('plate'),
  v.literal('resistance_band'),
  v.literal('suspension'),
)

export const exerciseTypeValidator = v.union(
  v.literal('weight_reps'),
  v.literal('reps_only'),
  v.literal('bodyweight'),
  v.literal('assisted_bodyweight'),
  v.literal('duration'),
  v.literal('weight_duration'),
  v.literal('distance_duration'),
  v.literal('weight_distance'),
)

export const muscleGroupValues = [
  'abdominals',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'chest',
  'upper_back',
  'lats',
  'traps',
  'lower_back',
  'glutes',
  'quadriceps',
  'hamstrings',
  'adductors',
  'calves',
  'neck',
  'cardio',
  'full_body',
] as const

export type MuscleGroup = (typeof muscleGroupValues)[number]

export const muscleGroupValidator = v.union(
  v.literal('abdominals'),
  v.literal('shoulders'),
  v.literal('biceps'),
  v.literal('triceps'),
  v.literal('forearms'),
  v.literal('chest'),
  v.literal('upper_back'),
  v.literal('lats'),
  v.literal('traps'),
  v.literal('lower_back'),
  v.literal('glutes'),
  v.literal('quadriceps'),
  v.literal('hamstrings'),
  v.literal('adductors'),
  v.literal('calves'),
  v.literal('neck'),
  v.literal('cardio'),
  v.literal('full_body'),
)

export const bodyMeasurementPayloadValidator = v.object({
  abdomenCm: v.optional(v.number()),
  bodyFatPercent: v.optional(v.number()),
  bodyWeightKg: v.optional(v.number()),
  chestCm: v.optional(v.number()),
  hipsCm: v.optional(v.number()),
  leftBicepCm: v.optional(v.number()),
  leftCalfCm: v.optional(v.number()),
  leftForearmCm: v.optional(v.number()),
  leftThighCm: v.optional(v.number()),
  neckCm: v.optional(v.number()),
  note: v.optional(v.string()),
  photoStorageId: v.optional(v.id('_storage')),
  rightBicepCm: v.optional(v.number()),
  rightCalfCm: v.optional(v.number()),
  rightForearmCm: v.optional(v.number()),
  rightThighCm: v.optional(v.number()),
  shoulderCm: v.optional(v.number()),
  waistCm: v.optional(v.number()),
})

export const bodyMeasurementNumericRanges: Record<
  string,
  { min: number; max: number }
> = {
  abdomenCm: { min: 40, max: 200 },
  bodyFatPercent: { min: 1, max: 70 },
  bodyWeightKg: { min: 30, max: 300 },
  chestCm: { min: 60, max: 200 },
  hipsCm: { min: 60, max: 200 },
  leftBicepCm: { min: 15, max: 70 },
  leftCalfCm: { min: 20, max: 70 },
  leftForearmCm: { min: 15, max: 60 },
  leftThighCm: { min: 30, max: 100 },
  neckCm: { min: 20, max: 80 },
  rightBicepCm: { min: 15, max: 70 },
  rightCalfCm: { min: 20, max: 70 },
  rightForearmCm: { min: 15, max: 60 },
  rightThighCm: { min: 30, max: 100 },
  shoulderCm: { min: 60, max: 200 },
  waistCm: { min: 40, max: 200 },
}
