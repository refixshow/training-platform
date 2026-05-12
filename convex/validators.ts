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
