import { z } from 'zod'

import type { ExerciseType } from '#/entities/exercise'

export const routineSetTargetSchema = z
  .object({
    distanceMeters: z.string().optional(),
    durationSeconds: z.string().optional(),
    reps: z.string().optional(),
    repsMax: z.string().optional(),
    repsMin: z.string().optional(),
    targetRpe: z.string().optional(),
    weightKg: z.string().optional(),
  })
  .passthrough()

export const routineBlockSchema = z.object({
  exerciseId: z.string().min(1, 'Wybierz cwiczenie.'),
  restSeconds: z.string().optional(),
  setTargets: z
    .array(routineSetTargetSchema)
    .min(1, 'Dodaj przynajmniej jedna serie.'),
  supersetGroup: z.string().optional(),
})

export const routineFormSchema = z.object({
  blocks: z
    .array(routineBlockSchema)
    .min(1, 'Dodaj przynajmniej jedno cwiczenie do rutyny.'),
  name: z
    .string()
    .trim()
    .min(1, 'Wpisz nazwe rutyny.')
    .max(120, 'Nazwa rutyny moze miec maksymalnie 120 znakow.'),
})

export type RoutineSetTargetFormValues = z.input<
  typeof routineSetTargetSchema
>

export type RoutineBlockFormValues = z.input<typeof routineBlockSchema>

export type RoutineFormValues = z.input<typeof routineFormSchema>

export const emptyRoutineFormValues: RoutineFormValues = {
  blocks: [],
  name: '',
}

export type SetTargetField =
  | 'distanceMeters'
  | 'durationSeconds'
  | 'reps'
  | 'repsRange'
  | 'targetRpe'
  | 'weightKg'

export function getSetTargetFields(type?: ExerciseType): SetTargetField[] {
  switch (type) {
    case 'weight_reps':
      return ['weightKg', 'repsRange', 'targetRpe']
    case 'reps_only':
    case 'bodyweight':
      return ['repsRange', 'targetRpe']
    case 'assisted_bodyweight':
      return ['weightKg', 'repsRange', 'targetRpe']
    case 'duration':
      return ['durationSeconds', 'targetRpe']
    case 'weight_duration':
      return ['weightKg', 'durationSeconds', 'targetRpe']
    case 'distance_duration':
      return ['distanceMeters', 'durationSeconds', 'targetRpe']
    case 'weight_distance':
      return ['weightKg', 'distanceMeters', 'targetRpe']
    default:
      return ['repsRange', 'targetRpe']
  }
}

export function createEmptySetTarget(
  type?: ExerciseType,
): RoutineSetTargetFormValues {
  const fields = getSetTargetFields(type)

  return {
    distanceMeters: fields.includes('distanceMeters') ? '' : undefined,
    durationSeconds: fields.includes('durationSeconds') ? '' : undefined,
    reps: fields.includes('reps') ? '' : undefined,
    repsMax: fields.includes('repsRange') ? '' : undefined,
    repsMin: fields.includes('repsRange') ? '' : undefined,
    targetRpe: '',
    weightKg: fields.includes('weightKg') ? '' : undefined,
  }
}

export function createRoutineBlock(
  exerciseId: string,
  type?: ExerciseType,
): RoutineBlockFormValues {
  return {
    exerciseId,
    restSeconds: '',
    setTargets: [createEmptySetTarget(type)],
    supersetGroup: '',
  }
}

export function parseOptionalNumber(value?: string) {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  return Number(value)
}

export function formatRoutineDate(timestamp?: number) {
  if (!timestamp) {
    return 'Brak daty'
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}
