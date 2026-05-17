import type { ExerciseType } from '#/entities/exercise'

import {
  formatTrainingDuration,
  getTrainingResultFieldUnit,
  type TrainingResultField,
} from './training-result.schema'

const DAY_MS = 86_400_000

export type ReviewRange = '7d' | '4w' | '12w' | 'all'

export const REVIEW_RANGE_VALUES: readonly ReviewRange[] = [
  '7d',
  '4w',
  '12w',
  'all',
] as const

export interface ReviewRangeOption {
  value: ReviewRange
  label: string
  shortLabel: string
}

export const REVIEW_RANGE_OPTIONS: readonly ReviewRangeOption[] = [
  { value: '7d', label: '7 dni', shortLabel: '7d' },
  { value: '4w', label: '4 tygodnie', shortLabel: '4 tyg.' },
  { value: '12w', label: '12 tygodni', shortLabel: '12 tyg.' },
  { value: 'all', label: 'Wszystko', shortLabel: 'Wszystko' },
]

export const DEFAULT_REVIEW_RANGE: ReviewRange = '4w'

export function isReviewRange(value: unknown): value is ReviewRange {
  return (
    typeof value === 'string' &&
    (REVIEW_RANGE_VALUES as readonly string[]).includes(value)
  )
}

export function getReviewRangeStart(
  range: ReviewRange,
  now: number = Date.now(),
): number | undefined {
  switch (range) {
    case '7d':
      return now - 7 * DAY_MS
    case '4w':
      return now - 28 * DAY_MS
    case '12w':
      return now - 84 * DAY_MS
    case 'all':
      return undefined
  }
}

export function formatReviewListDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  }).format(new Date(timestamp))
}

export function formatReviewDetailDate(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    weekday: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}

export function formatVolumeForReview(value?: number) {
  if (value === undefined || value === 0) {
    return null
  }

  return `${new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 0,
  }).format(Math.round(value))} kg`
}

export function formatDurationMinutesForReview(value?: number) {
  if (value === undefined) {
    return null
  }

  if (value < 60) {
    return `${value} min`
  }

  const hours = Math.floor(value / 60)
  const rest = value % 60

  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

export function formatSetsCount(completed?: number, planned?: number) {
  if (planned === undefined && completed === undefined) {
    return null
  }

  const completedValue = completed ?? 0

  if (planned === undefined) {
    return `${completedValue} serii`
  }

  return `${completedValue} / ${planned} serii`
}

export interface ReviewSetSubmission {
  distanceMeters?: number
  durationSeconds?: number
  exerciseId?: string
  reps?: number
  rpe?: number
  setIndex: number
  weightKg?: number
}

export interface ReviewSetTarget {
  distanceMeters?: number
  durationSeconds?: number
  reps?: number
  repsMax?: number
  repsMin?: number
  setIndex: number
  targetRpe?: number
  weightKg?: number
}

export function formatSetSubmittedValues(
  submission: ReviewSetSubmission,
  fields: readonly TrainingResultField[],
) {
  const parts: string[] = []

  for (const field of fields) {
    const formatted = formatSetField(field, submission)
    if (formatted) {
      parts.push(formatted)
    }
  }

  return parts.join(' · ')
}

export function formatSetTargetValues(
  target: ReviewSetTarget | undefined,
  fields: readonly TrainingResultField[],
) {
  if (!target) {
    return null
  }

  const parts: string[] = []

  for (const field of fields) {
    const formatted = formatTargetField(field, target)
    if (formatted) {
      parts.push(formatted)
    }
  }

  if (parts.length === 0) {
    return null
  }

  return parts.join(' · ')
}

export function formatPlanSummary(
  type: ExerciseType,
  targets: readonly ReviewSetTarget[],
  restSeconds?: number,
) {
  if (targets.length === 0) {
    return null
  }

  const setCount = targets.length
  const first = targets[0]
  const fields = getPlanSummaryFields(type)
  const valueParts: string[] = []

  for (const field of fields) {
    const formatted = formatTargetField(field, first)
    if (formatted) {
      valueParts.push(formatted)
    }
  }

  const restPart =
    restSeconds !== undefined && restSeconds > 0
      ? `przerwa ${formatTrainingDuration(restSeconds)}`
      : null

  const parts = [`${setCount} × ${valueParts.join(' · ') || '—'}`]
  if (restPart) {
    parts.push(restPart)
  }

  return `Plan: ${parts.join(', ')}`
}

type PlanField = TrainingResultField

function getPlanSummaryFields(type: ExerciseType): readonly PlanField[] {
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

function formatSetField(field: TrainingResultField, submission: ReviewSetSubmission) {
  switch (field) {
    case 'weightKg':
      return submission.weightKg !== undefined
        ? `${formatNumber(submission.weightKg)} kg`
        : null
    case 'reps':
      return submission.reps !== undefined
        ? `${formatNumber(submission.reps)} powt.`
        : null
    case 'rpe':
      return submission.rpe !== undefined ? `RPE ${formatNumber(submission.rpe)}` : null
    case 'durationSeconds':
      return submission.durationSeconds !== undefined
        ? formatTrainingDuration(submission.durationSeconds)
        : null
    case 'distanceMeters':
      return submission.distanceMeters !== undefined
        ? `${formatNumber(submission.distanceMeters)} m`
        : null
  }
}

function formatTargetField(field: TrainingResultField, target: ReviewSetTarget) {
  switch (field) {
    case 'weightKg':
      return target.weightKg !== undefined
        ? `${formatNumber(target.weightKg)} kg`
        : null
    case 'reps':
      return formatTargetReps(target)
    case 'rpe':
      return target.targetRpe !== undefined ? `RPE ${formatNumber(target.targetRpe)}` : null
    case 'durationSeconds':
      return target.durationSeconds !== undefined
        ? formatTrainingDuration(target.durationSeconds)
        : null
    case 'distanceMeters':
      return target.distanceMeters !== undefined
        ? `${formatNumber(target.distanceMeters)} m`
        : null
  }
}

function formatTargetReps(target: ReviewSetTarget) {
  if (target.repsMin !== undefined && target.repsMax !== undefined) {
    return `${formatNumber(target.repsMin)}-${formatNumber(target.repsMax)} powt.`
  }

  if (target.reps !== undefined) {
    return `${formatNumber(target.reps)} powt.`
  }

  return null
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 1,
  }).format(value)
}

export function getFieldUnitLabel(field: TrainingResultField) {
  return getTrainingResultFieldUnit(field)
}
