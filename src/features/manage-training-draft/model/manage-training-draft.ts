import type { TrainingSubmissionFormValues } from '#/entities/training-result'

export type TrainingDraftSaveState =
  | 'failed'
  | 'restored'
  | 'saved'
  | 'saving'
  | 'unsaved'

type TrainingDraftSetSnapshot = {
  completed: boolean
  distanceMeters?: number
  durationSeconds?: number
  exerciseId: string
  reps?: number
  routineExerciseBlockId: string
  rpe?: number
  setIndex: number
  weightKg?: number
}

export type TrainingDraftSnapshot = {
  durationMinutes?: number
  lastSavedAt: number
  notes?: string
  setResults: TrainingDraftSetSnapshot[]
}

export function applyTrainingDraftToValues(
  values: TrainingSubmissionFormValues,
  draft: TrainingDraftSnapshot,
): TrainingSubmissionFormValues {
  const draftRowsByKey = new Map(
    draft.setResults.map((row) => [getSetResultKey(row), row]),
  )

  return {
    durationMinutes:
      draft.durationMinutes === undefined ? '' : String(draft.durationMinutes),
    notes: draft.notes ?? '',
    setResults: values.setResults.map((row) => {
      const draftRow = draftRowsByKey.get(getSetResultKey(row))

      if (!draftRow) {
        return row
      }

      return {
        ...row,
        completed: draftRow.completed,
        distanceMeters: numberToInputValue(draftRow.distanceMeters),
        durationSeconds: numberToInputValue(draftRow.durationSeconds),
        reps: numberToInputValue(draftRow.reps),
        rpe: numberToInputValue(draftRow.rpe),
        weightKg: numberToInputValue(draftRow.weightKg),
      }
    }),
  }
}

export function createTrainingDraftSnapshot(values: TrainingSubmissionFormValues) {
  return JSON.stringify(values)
}

export function getTrainingDraftStatusCopy(
  state: TrainingDraftSaveState,
  lastSavedAt?: number,
) {
  switch (state) {
    case 'failed':
      return 'Nie zapisano najnowszych zmian. Sprobuj ponownie przed zamknieciem strony.'
    case 'restored':
      return lastSavedAt
        ? `Przywrocono szkic z ${formatDraftTime(lastSavedAt)}.`
        : 'Przywrocono szkic treningu.'
    case 'saved':
      return lastSavedAt
        ? `Szkic zapisany ${formatDraftTime(lastSavedAt)}.`
        : 'Szkic zapisany.'
    case 'saving':
      return 'Zapisywanie szkicu...'
    case 'unsaved':
      return 'Masz lokalne zmiany, ktore jeszcze nie dotarly do Convex.'
  }
}

export function getTrainingDraftStatusTone(state: TrainingDraftSaveState) {
  switch (state) {
    case 'failed':
      return 'error'
    case 'unsaved':
      return 'warning'
    case 'restored':
    case 'saved':
    case 'saving':
      return 'success'
  }
}

function getSetResultKey(row: {
  routineExerciseBlockId: string
  setIndex: number
}) {
  return `${row.routineExerciseBlockId}:${row.setIndex}`
}

function numberToInputValue(value?: number) {
  return value === undefined ? '' : String(value)
}

function formatDraftTime(timestamp: number) {
  return new Intl.DateTimeFormat('pl-PL', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
