import { z } from 'zod'

import type { ExerciseType } from '#/entities/exercise'

export type TrainingResultField =
  | 'distanceMeters'
  | 'durationSeconds'
  | 'reps'
  | 'rpe'
  | 'weightKg'

export const trainingSetResultSchema = z.object({
  completed: z.boolean(),
  distanceMeters: z.string().optional(),
  durationSeconds: z.string().optional(),
  exerciseId: z.string().min(1),
  reps: z.string().optional(),
  routineExerciseBlockId: z.string().min(1),
  rpe: z.string().optional(),
  setIndex: z.number().int().positive(),
  weightKg: z.string().optional(),
})

export const trainingSubmissionFormSchema = z.object({
  durationMinutes: z.string().optional(),
  notes: z.string().max(1200, 'Notatka moze miec maksymalnie 1200 znakow.'),
  setResults: z.array(trainingSetResultSchema),
})

export type TrainingSetResultFormValues = z.input<
  typeof trainingSetResultSchema
>

export type TrainingSubmissionFormValues = z.input<
  typeof trainingSubmissionFormSchema
>

export function getTrainingResultFields(type: ExerciseType): TrainingResultField[] {
  switch (type) {
    case 'weight_reps':
      return ['weightKg', 'reps', 'rpe']
    case 'reps_only':
    case 'bodyweight':
      return ['reps', 'rpe']
    case 'assisted_bodyweight':
      return ['weightKg', 'reps', 'rpe']
    case 'duration':
      return ['durationSeconds', 'rpe']
    case 'weight_duration':
      return ['weightKg', 'durationSeconds', 'rpe']
    case 'distance_duration':
      return ['distanceMeters', 'durationSeconds', 'rpe']
    case 'weight_distance':
      return ['weightKg', 'distanceMeters', 'rpe']
  }
}

export function getTrainingResultFieldLabel(
  field: TrainingResultField,
  type?: ExerciseType,
) {
  if (field === 'weightKg' && type === 'assisted_bodyweight') {
    return 'Asysta'
  }

  switch (field) {
    case 'distanceMeters':
      return 'Dystans'
    case 'durationSeconds':
      return 'Czas'
    case 'reps':
      return 'Powt.'
    case 'rpe':
      return 'RPE'
    case 'weightKg':
      return 'Ciezar'
  }
}

export function getTrainingResultFieldUnit(field: TrainingResultField) {
  switch (field) {
    case 'distanceMeters':
      return 'm'
    case 'durationSeconds':
      return 'sek.'
    case 'reps':
      return 'powt.'
    case 'rpe':
      return '1-10'
    case 'weightKg':
      return 'kg'
  }
}

export function parseOptionalNumber(value?: string) {
  if (value === undefined || value.trim() === '') {
    return undefined
  }

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function formatTrainingDuration(seconds?: number) {
  if (seconds === undefined) {
    return 'bez celu'
  }

  if (seconds < 60) {
    return `${seconds} sek.`
  }

  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60

  return restSeconds > 0 ? `${minutes} min ${restSeconds} sek.` : `${minutes} min`
}

export function formatTrainingDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function formatVolumeKg(value?: number) {
  if (value === undefined) {
    return 'bez obliczonego wolumenu'
  }

  return `${Math.round(value)} kg`
}
