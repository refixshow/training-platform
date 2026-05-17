import {
  DEFAULT_REVIEW_RANGE,
  isReviewRange,
  type ReviewRange,
  type ReviewSetSubmission,
  type ReviewSetTarget,
} from '#/entities/training-result'

export interface ReviewListSearchParams {
  range: ReviewRange
  programId?: string
}

export function parseReviewListSearch(search: Record<string, unknown>): ReviewListSearchParams {
  return {
    programId:
      typeof search.programId === 'string' && search.programId.length > 0
        ? search.programId
        : undefined,
    range: isReviewRange(search.range) ? search.range : DEFAULT_REVIEW_RANGE,
  }
}

export interface ReconciledSet {
  setIndex: number
  routineExerciseBlockId: string | null
  submission: ReviewSetSubmission | null
  target: ReviewSetTarget | null
}

export interface ReconciledExerciseBlock {
  id: string
  routineExerciseBlockId: string | null
  exerciseId: string | null
  exerciseName: string
  exerciseType?: ReconciledExerciseType
  restSeconds?: number
  supersetGroup?: string
  customEquipment?: string | null
  equipment?: ReconciledEquipment | null
  videoUrl?: string | null
  plannedSetCount: number
  sets: ReconciledSet[]
}

type ReconciledExerciseType =
  | 'assisted_bodyweight'
  | 'bodyweight'
  | 'distance_duration'
  | 'duration'
  | 'reps_only'
  | 'weight_distance'
  | 'weight_duration'
  | 'weight_reps'

type ReconciledEquipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'none'
  | 'other'
  | 'plate'
  | 'resistance_band'
  | 'suspension'

interface PlanBlockInput {
  _id: string
  exerciseId: string
  exercise: {
    _id: string
    name: string
    type: ReconciledExerciseType
    customEquipment?: string
    equipment: ReconciledEquipment
    videoUrl?: string
  }
  order: number
  restSeconds?: number
  supersetGroup?: string
  setTargets: Array<{
    distanceMeters?: number
    durationSeconds?: number
    reps?: number
    repsMax?: number
    repsMin?: number
    setIndex: number
    targetRpe?: number
    weightKg?: number
  }>
}

interface SubmittedSetInput {
  distanceMeters?: number
  durationSeconds?: number
  exerciseId: string
  exercise?: {
    _id: string
    name: string
    type: ReconciledExerciseType
  } | null
  reps?: number
  routineExerciseBlockId?: string
  rpe?: number
  setIndex: number
  weightKg?: number
}

export function reconcilePlanWithSubmission(
  planBlocks: readonly PlanBlockInput[] | null | undefined,
  submittedSets: readonly SubmittedSetInput[],
): ReconciledExerciseBlock[] {
  const blocks: ReconciledExerciseBlock[] = []
  const submittedByKey = new Map<string, SubmittedSetInput[]>()

  for (const set of submittedSets) {
    const key = set.routineExerciseBlockId
      ? `block:${set.routineExerciseBlockId}`
      : `exercise:${set.exerciseId}`
    const list = submittedByKey.get(key)
    if (list) {
      list.push(set)
    } else {
      submittedByKey.set(key, [set])
    }
  }

  if (planBlocks) {
    const sortedPlan = [...planBlocks].sort((a, b) => a.order - b.order)

    for (const block of sortedPlan) {
      const key = `block:${block._id}`
      const submittedForBlock = submittedByKey.get(key) ?? []
      submittedByKey.delete(key)

      const targetByIndex = new Map(
        block.setTargets.map((target) => [target.setIndex, target]),
      )
      const plannedSetIndexes = block.setTargets
        .map((target) => target.setIndex)
        .sort((a, b) => a - b)
      const extraSetIndexes = submittedForBlock
        .map((set) => set.setIndex)
        .filter((setIndex) => !targetByIndex.has(setIndex))
        .sort((a, b) => a - b)
      const allSetIndexes = [
        ...plannedSetIndexes,
        ...extraSetIndexes.filter(
          (setIndex) => !plannedSetIndexes.includes(setIndex),
        ),
      ]

      const submittedByIndex = new Map<number, SubmittedSetInput>()
      for (const submitted of submittedForBlock) {
        submittedByIndex.set(submitted.setIndex, submitted)
      }

      blocks.push({
        id: block._id,
        routineExerciseBlockId: block._id,
        exerciseId: block.exercise._id,
        exerciseName: block.exercise.name,
        exerciseType: block.exercise.type,
        customEquipment: block.exercise.customEquipment ?? null,
        equipment: block.exercise.equipment,
        restSeconds: block.restSeconds,
        supersetGroup: block.supersetGroup,
        videoUrl: block.exercise.videoUrl ?? null,
        plannedSetCount: block.setTargets.length,
        sets: allSetIndexes.map((setIndex) => {
          const target = targetByIndex.get(setIndex) ?? null
          const submitted = submittedByIndex.get(setIndex) ?? null
          return toReconciledSet(
            setIndex,
            block._id,
            target,
            submitted,
          )
        }),
      })
    }
  }

  for (const [key, submittedForKey] of submittedByKey) {
    if (key.startsWith('block:')) {
      const blockId = key.slice('block:'.length)
      const sortedSubmitted = [...submittedForKey].sort(
        (a, b) => a.setIndex - b.setIndex,
      )
      const exerciseInfo = sortedSubmitted.find((set) => set.exercise)?.exercise
      blocks.push({
        id: `legacy-block:${blockId}`,
        routineExerciseBlockId: blockId,
        exerciseId: exerciseInfo?._id ?? sortedSubmitted[0]?.exerciseId ?? null,
        exerciseName: exerciseInfo?.name ?? 'Ćwiczenie usunięte z biblioteki',
        exerciseType: exerciseInfo?.type,
        plannedSetCount: 0,
        sets: sortedSubmitted.map((set) =>
          toReconciledSet(set.setIndex, blockId, null, set),
        ),
      })
      continue
    }

    const exerciseId = key.slice('exercise:'.length)
    const sortedSubmitted = [...submittedForKey].sort(
      (a, b) => a.setIndex - b.setIndex,
    )
    const exerciseInfo = sortedSubmitted.find((set) => set.exercise)?.exercise

    blocks.push({
      id: `unplanned:${exerciseId}`,
      routineExerciseBlockId: null,
      exerciseId,
      exerciseName: exerciseInfo?.name ?? 'Ćwiczenie poza planem',
      exerciseType: exerciseInfo?.type,
      plannedSetCount: 0,
      sets: sortedSubmitted.map((set) =>
        toReconciledSet(set.setIndex, null, null, set),
      ),
    })
  }

  return blocks
}

function toReconciledSet(
  setIndex: number,
  routineExerciseBlockId: string | null,
  target: PlanBlockInput['setTargets'][number] | null,
  submitted: SubmittedSetInput | null,
): ReconciledSet {
  return {
    setIndex,
    routineExerciseBlockId,
    submission: submitted
      ? {
          distanceMeters: submitted.distanceMeters,
          durationSeconds: submitted.durationSeconds,
          exerciseId: submitted.exerciseId,
          reps: submitted.reps,
          rpe: submitted.rpe,
          setIndex: submitted.setIndex,
          weightKg: submitted.weightKg,
        }
      : null,
    target: target
      ? {
          distanceMeters: target.distanceMeters,
          durationSeconds: target.durationSeconds,
          reps: target.reps,
          repsMax: target.repsMax,
          repsMin: target.repsMin,
          setIndex: target.setIndex,
          targetRpe: target.targetRpe,
          weightKg: target.weightKg,
        }
      : null,
  }
}

export function getPlannedSetCount(
  blocks: readonly ReconciledExerciseBlock[],
): number {
  return blocks.reduce((total, block) => total + block.plannedSetCount, 0)
}

export function getCompletedSetCount(
  blocks: readonly ReconciledExerciseBlock[],
): number {
  return blocks.reduce(
    (total, block) =>
      total + block.sets.filter((set) => set.submission !== null).length,
    0,
  )
}

export function isPartialSubmission(
  blocks: readonly ReconciledExerciseBlock[],
): boolean {
  const planned = getPlannedSetCount(blocks)
  if (planned === 0) {
    return false
  }
  return getCompletedSetCount(blocks) < planned
}
