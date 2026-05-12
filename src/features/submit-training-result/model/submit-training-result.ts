import type { ExerciseType } from '#/entities/exercise'
import {
  getTrainingResultFields,
  parseOptionalNumber,
  type TrainingSetResultFormValues,
  type TrainingSubmissionFormValues,
} from '#/entities/training-result'

type RoutineBlockInput = {
  _id: string
  exercise: {
    _id: string
    type: ExerciseType
  }
  setTargets: Array<{
    setIndex: number
  }>
}

export function createTrainingSubmissionValues(
  blocks: RoutineBlockInput[],
): TrainingSubmissionFormValues {
  return {
    durationMinutes: '',
    notes: '',
    setResults: blocks.flatMap((block) =>
      block.setTargets.map((target) => ({
        completed: false,
        distanceMeters: '',
        durationSeconds: '',
        exerciseId: block.exercise._id,
        reps: '',
        routineExerciseBlockId: block._id,
        rpe: '',
        setIndex: target.setIndex,
        weightKg: '',
      })),
    ),
  }
}

export function validateTrainingSubmissionValues(
  values: TrainingSubmissionFormValues,
  exerciseTypeByBlockId: Map<string, ExerciseType>,
) {
  const errors: Record<string, string> = {}
  const completedRows = values.setResults.filter((row) => row.completed)

  if (completedRows.length === 0) {
    errors.form = 'Oznacz i uzupelnij przynajmniej jedna serie.'
  }

  const duration = parseOptionalNumber(values.durationMinutes)
  if (Number.isNaN(duration) || (duration !== undefined && duration < 0)) {
    errors.durationMinutes = 'Czas treningu musi byc nieujemna liczba minut.'
  }

  for (const [index, row] of values.setResults.entries()) {
    if (!row.completed) {
      continue
    }

    const type = exerciseTypeByBlockId.get(row.routineExerciseBlockId)
    if (!type) {
      errors[`setResults.${index}`] = 'Ta seria nie pasuje do rutyny.'
      continue
    }

    const fields = getTrainingResultFields(type).filter((field) => field !== 'rpe')

    for (const field of fields) {
      const value = parseOptionalNumber(row[field])
      if (value === undefined || Number.isNaN(value) || value < 0) {
        errors[`setResults.${index}.${field}`] = 'Uzupelnij wartosc.'
      }
    }

    const rpe = parseOptionalNumber(row.rpe)
    if (rpe !== undefined && (Number.isNaN(rpe) || rpe < 1 || rpe > 10)) {
      errors[`setResults.${index}.rpe`] = 'RPE musi byc od 1 do 10.'
    }
  }

  return errors
}

export function hasSetResultInput(row: TrainingSetResultFormValues) {
  return Boolean(
    row.distanceMeters?.trim() ||
      row.durationSeconds?.trim() ||
      row.reps?.trim() ||
      row.rpe?.trim() ||
      row.weightKg?.trim(),
  )
}

export function getCompletedSetResults(values: TrainingSubmissionFormValues) {
  return values.setResults.filter((row) => row.completed)
}
