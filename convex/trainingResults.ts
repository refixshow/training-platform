import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCoachAdmin, requireTrainee } from './auth'

const MAX_RESULTS = 80
const MAX_REVIEW_RESULTS = 120
const MAX_PROGRAM_ROUTINES = 80
const MAX_ROUTINE_BLOCKS = 40
const MAX_SET_TARGETS_PER_BLOCK = 20
const MAX_SUBMITTED_SETS = 240
const MAX_NOTES_LENGTH = 1200
const MAX_DURATION_MINUTES = 1440

const submittedSetValidator = v.object({
  distanceMeters: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  exerciseId: v.id('exercises'),
  reps: v.optional(v.number()),
  routineExerciseBlockId: v.id('routineExerciseBlocks'),
  rpe: v.optional(v.number()),
  setIndex: v.number(),
  weightKg: v.optional(v.number()),
})

const draftSetValidator = v.object({
  completed: v.boolean(),
  distanceMeters: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  exerciseId: v.id('exercises'),
  reps: v.optional(v.number()),
  routineExerciseBlockId: v.id('routineExerciseBlocks'),
  rpe: v.optional(v.number()),
  setIndex: v.number(),
  weightKg: v.optional(v.number()),
})

type TrainingCtx = Pick<QueryCtx | MutationCtx, 'db' | 'storage'>

type SubmittedSetInput = {
  distanceMeters?: number
  durationSeconds?: number
  exerciseId: Id<'exercises'>
  reps?: number
  routineExerciseBlockId: Id<'routineExerciseBlocks'>
  rpe?: number
  setIndex: number
  weightKg?: number
}

type DraftSetInput = SubmittedSetInput & {
  completed: boolean
}

type RoutineBlockView = Doc<'routineExerciseBlocks'> & {
  exercise: Pick<
    Doc<'exercises'>,
    | '_id'
    | 'customEquipment'
    | 'equipment'
    | 'instructions'
    | 'name'
    | 'type'
    | 'videoUrl'
  > & {
    photoUrl: string | null
  }
  setTargets: Doc<'routineSetTargets'>[]
}

type RoutineAccess = {
  assignment: Doc<'programAssignments'>
  program: Doc<'programs'>
  routine: Doc<'routines'>
}

export const getLoggingRoutine = query({
  args: {
    assignmentId: v.id('programAssignments'),
    routineId: v.id('routines'),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const access = await getRoutineAccess(ctx, {
      assignmentId: args.assignmentId,
      routineId: args.routineId,
      traineeId: trainee._id,
    })
    const blocks = await getRoutineBlocks(ctx, access.routine._id)

    return {
      assignment: {
        _id: access.assignment._id,
        assignedAt: access.assignment.assignedAt,
      },
      program: {
        _id: access.program._id,
        description: access.program.description,
        durationWeeks: access.program.durationWeeks,
        title: access.program.title,
      },
      routine: {
        _id: access.routine._id,
        blocks,
        name: access.routine.name,
      },
    }
  },
})

export const getOrCreateDraft = mutation({
  args: {
    assignmentId: v.id('programAssignments'),
    routineId: v.id('routines'),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const access = await getRoutineAccess(ctx, {
      assignmentId: args.assignmentId,
      routineId: args.routineId,
      traineeId: trainee._id,
    })
    const existingDraft = await getActiveDraft(ctx, {
      assignmentId: args.assignmentId,
      routineId: args.routineId,
      traineeId: trainee._id,
    })

    if (existingDraft) {
      return await getDraftDetail(ctx, existingDraft)
    }

    const now = Date.now()
    const draftId = await ctx.db.insert('trainingDrafts', {
      assignmentId: access.assignment._id,
      createdAt: now,
      lastSavedAt: now,
      programId: access.program._id,
      routineId: access.routine._id,
      status: 'active',
      traineeId: trainee._id,
    })
    const draft = await ctx.db.get(draftId)

    if (!draft) {
      throw new Error('Nie udalo sie utworzyc szkicu treningu.')
    }

    return await getDraftDetail(ctx, draft)
  },
})

export const updateDraft = mutation({
  args: {
    assignmentId: v.id('programAssignments'),
    draftId: v.id('trainingDrafts'),
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    routineId: v.id('routines'),
    setResults: v.array(draftSetValidator),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const access = await getRoutineAccess(ctx, {
      assignmentId: args.assignmentId,
      routineId: args.routineId,
      traineeId: trainee._id,
    })
    const draft = await requireActiveDraft(ctx, {
      draftId: args.draftId,
      traineeId: trainee._id,
      assignmentId: access.assignment._id,
      routineId: access.routine._id,
    })
    const durationMinutes = sanitizeDuration(args.durationMinutes)
    const notes = sanitizeNotes(args.notes)
    const parsedSetResults = await parseDraftSets(ctx, access.routine._id, args.setResults)
    const now = Date.now()

    await ctx.db.patch(draft._id, {
      durationMinutes,
      lastSavedAt: now,
      notes,
    })

    for (const setResult of parsedSetResults) {
      await upsertDraftSetResult(ctx, draft._id, setResult, now)
    }

    const updatedDraft = await ctx.db.get(draft._id)

    if (!updatedDraft) {
      throw new Error('Nie udalo sie zapisac szkicu treningu.')
    }

    return await getDraftDetail(ctx, updatedDraft)
  },
})

export const discardDraft = mutation({
  args: {
    assignmentId: v.id('programAssignments'),
    draftId: v.id('trainingDrafts'),
    routineId: v.id('routines'),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const access = await getRoutineAccess(ctx, {
      assignmentId: args.assignmentId,
      routineId: args.routineId,
      traineeId: trainee._id,
    })
    const draft = await requireActiveDraft(ctx, {
      draftId: args.draftId,
      traineeId: trainee._id,
      assignmentId: access.assignment._id,
      routineId: access.routine._id,
    })

    await ctx.db.patch(draft._id, {
      lastSavedAt: Date.now(),
      status: 'discarded',
    })

    return { discarded: true }
  },
})

export const submit = mutation({
  args: {
    assignmentId: v.id('programAssignments'),
    draftId: v.optional(v.id('trainingDrafts')),
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    routineId: v.id('routines'),
    setResults: v.optional(v.array(submittedSetValidator)),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const access = await getRoutineAccess(ctx, {
      assignmentId: args.assignmentId,
      routineId: args.routineId,
      traineeId: trainee._id,
    })

    if (args.draftId) {
      const draft = await requireActiveDraft(ctx, {
        draftId: args.draftId,
        traineeId: trainee._id,
        assignmentId: access.assignment._id,
        routineId: access.routine._id,
      })
      const draftSetResults = await getDraftSetResults(ctx, draft._id)
      const submittedSetResults = draftSetResults
        .filter((row) => row.completed)
        .map((row) => ({
          distanceMeters: row.distanceMeters,
          durationSeconds: row.durationSeconds,
          exerciseId: row.exerciseId,
          reps: row.reps,
          routineExerciseBlockId: row.routineExerciseBlockId,
          rpe: row.rpe,
          setIndex: row.setIndex,
          weightKg: row.weightKg,
        }))

      const result = await createSubmittedTrainingResult(ctx, {
        durationMinutes: draft.durationMinutes,
        notes: draft.notes,
        programId: access.program._id,
        routineId: access.routine._id,
        setResults: submittedSetResults,
        traineeId: trainee._id,
      })

      await ctx.db.patch(draft._id, {
        lastSavedAt: Date.now(),
        status: 'submitted',
      })

      return result
    }

    if (!args.setResults) {
      throw new Error('Nie znaleziono szkicu ani serii do zapisu.')
    }

    return await createSubmittedTrainingResult(ctx, {
      durationMinutes: args.durationMinutes,
      notes: args.notes,
      programId: access.program._id,
      routineId: access.routine._id,
      setResults: args.setResults,
      traineeId: trainee._id,
    })
  },
})

export const listForTrainee = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const results = await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_completed_at', (q) => q.eq('traineeId', trainee._id))
      .order('desc')
      .take(clampLimit(args.limit, MAX_RESULTS))

    return await Promise.all(results.map(async (result) => enrichResultSummary(ctx, result)))
  },
})

export const getForTrainee = query({
  args: {
    trainingResultId: v.id('trainingResults'),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const result = await ctx.db.get(args.trainingResultId)

    if (!result || result.traineeId !== trainee._id) {
      throw new Error('Nie masz dostepu do tego wyniku treningu.')
    }

    return await getResultDetail(ctx, result)
  },
})

export const listForCoachReview = query({
  args: {
    limit: v.optional(v.number()),
    programId: v.optional(v.id('programs')),
    rangeEnd: v.optional(v.number()),
    rangeStart: v.optional(v.number()),
    traineeId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const limit = clampLimit(args.limit, MAX_REVIEW_RESULTS)

    if (args.traineeId) {
      const traineeId = args.traineeId
      await requireManagedTrainee(ctx, coach._id, traineeId)

      const results = await queryTraineeResults(ctx, traineeId, {
        limit,
        programId: args.programId,
        rangeEnd: args.rangeEnd,
        rangeStart: args.rangeStart,
      })

      return await Promise.all(results.map(async (result) => enrichResultSummary(ctx, result)))
    }

    const assignments = await ctx.db
      .query('programAssignments')
      .withIndex('by_coach', (q) => q.eq('coachId', coach._id))
      .take(MAX_REVIEW_RESULTS)
    const traineeIds = [...new Set(assignments.map((assignment) => assignment.traineeId))]
    const rows = []

    for (const traineeId of traineeIds) {
      const traineeResults = await ctx.db
        .query('trainingResults')
        .withIndex('by_trainee_and_completed_at', (q) => q.eq('traineeId', traineeId))
        .order('desc')
        .take(8)

      for (const result of traineeResults) {
        rows.push(await enrichResultSummary(ctx, result))
      }
    }

    return rows
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, limit)
  },
})

export const listProgramsForCoachReview = query({
  args: {
    traineeId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    await requireManagedTrainee(ctx, coach._id, args.traineeId)

    const results = await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_completed_at', (q) =>
        q.eq('traineeId', args.traineeId),
      )
      .order('desc')
      .take(MAX_REVIEW_RESULTS)

    const programIds = new Set<Id<'programs'>>()
    for (const result of results) {
      if (result.programId) {
        programIds.add(result.programId)
      }
    }

    const programs = await Promise.all(
      [...programIds].map(async (programId) => ctx.db.get(programId)),
    )

    return programs
      .filter((program): program is Doc<'programs'> => program !== null)
      .map((program) => ({
        _id: program._id,
        durationWeeks: program.durationWeeks,
        title: program.title,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, 'pl-PL'))
  },
})

export const getForCoachReview = query({
  args: {
    trainingResultId: v.id('trainingResults'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const result = await ctx.db.get(args.trainingResultId)

    if (!result) {
      throw new Error('Nie znaleziono wyniku treningu.')
    }

    await requireManagedTrainee(ctx, coach._id, result.traineeId)

    return await getResultDetail(ctx, result)
  },
})

export const getCoachReviewResultWithPlan = query({
  args: {
    traineeId: v.id('users'),
    trainingResultId: v.id('trainingResults'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    await requireManagedTrainee(ctx, coach._id, args.traineeId)

    const result = await ctx.db.get(args.trainingResultId)

    if (!result || result.traineeId !== args.traineeId) {
      throw new Error('Ten trening nie istnieje lub nalezy do innego klienta.')
    }

    const [detail, plan] = await Promise.all([
      getResultDetail(ctx, result),
      getRoutinePlan(ctx, result.routineId),
    ])

    return {
      ...detail,
      plan,
    }
  },
})

async function getRoutineAccess(
  ctx: TrainingCtx,
  args: {
    assignmentId: Id<'programAssignments'>
    routineId: Id<'routines'>
    traineeId: Id<'users'>
  },
): Promise<RoutineAccess> {
  const assignment = await ctx.db.get(args.assignmentId)

  if (!assignment || assignment.traineeId !== args.traineeId) {
    throw new Error('Nie masz dostepu do tego programu.')
  }

  const program = await ctx.db.get(assignment.programId)

  if (!program) {
    throw new Error('Ten program nie jest juz dostepny.')
  }

  const placement = await findProgramRoutine(ctx, program._id, args.routineId)

  if (!placement) {
    throw new Error('Ta rutyna nie nalezy do przypisanego programu.')
  }

  const routine = await ctx.db.get(args.routineId)

  if (!routine) {
    throw new Error('Ta rutyna nie jest juz dostepna.')
  }

  return { assignment, program, routine }
}

async function findProgramRoutine(
  ctx: TrainingCtx,
  programId: Id<'programs'>,
  routineId: Id<'routines'>,
) {
  const placements = await ctx.db
    .query('programRoutines')
    .withIndex('by_program', (q) => q.eq('programId', programId))
    .take(MAX_PROGRAM_ROUTINES)

  return placements.find((placement) => placement.routineId === routineId) ?? null
}

async function getRoutineBlocks(
  ctx: TrainingCtx,
  routineId: Id<'routines'>,
): Promise<RoutineBlockView[]> {
  const blocks = await ctx.db
    .query('routineExerciseBlocks')
    .withIndex('by_routine', (q) => q.eq('routineId', routineId))
    .take(MAX_ROUTINE_BLOCKS)

  const rows = await Promise.all(
    blocks
      .sort((a, b) => a.order - b.order)
      .map(async (block) => {
        const exercise = await ctx.db.get(block.exerciseId)

        if (!exercise) {
          return null
        }

        const setTargets = await ctx.db
          .query('routineSetTargets')
          .withIndex('by_routine_exercise_block', (q) =>
            q.eq('routineExerciseBlockId', block._id),
          )
          .take(MAX_SET_TARGETS_PER_BLOCK)
        const photoUrl = exercise.photoStorageId
          ? await ctx.storage.getUrl(exercise.photoStorageId)
          : null

        return {
          ...block,
          exercise: {
            _id: exercise._id,
            customEquipment: exercise.customEquipment,
            equipment: exercise.equipment,
            instructions: exercise.instructions,
            name: exercise.name,
            photoUrl,
            type: exercise.type,
            videoUrl: exercise.videoUrl,
          },
          setTargets: setTargets.sort((a, b) => a.setIndex - b.setIndex),
        }
      }),
  )

  return rows.filter((row) => row !== null)
}

async function getActiveDraft(
  ctx: TrainingCtx,
  args: {
    assignmentId: Id<'programAssignments'>
    routineId: Id<'routines'>
    traineeId: Id<'users'>
  },
) {
  const drafts = await ctx.db
    .query('trainingDrafts')
    .withIndex('by_assignment_and_routine_and_status', (q) =>
      q
        .eq('assignmentId', args.assignmentId)
        .eq('routineId', args.routineId)
        .eq('status', 'active'),
    )
    .take(4)

  return drafts.find((draft) => draft.traineeId === args.traineeId) ?? null
}

async function requireActiveDraft(
  ctx: TrainingCtx,
  args: {
    assignmentId: Id<'programAssignments'>
    draftId: Id<'trainingDrafts'>
    routineId: Id<'routines'>
    traineeId: Id<'users'>
  },
) {
  const draft = await ctx.db.get(args.draftId)

  if (
    !draft ||
    draft.status !== 'active' ||
    draft.traineeId !== args.traineeId ||
    draft.assignmentId !== args.assignmentId ||
    draft.routineId !== args.routineId
  ) {
    throw new Error('Nie znaleziono aktywnego szkicu tego treningu.')
  }

  return draft
}

async function getDraftSetResults(
  ctx: TrainingCtx,
  draftId: Id<'trainingDrafts'>,
) {
  return await ctx.db
    .query('trainingDraftSetResults')
    .withIndex('by_draft', (q) => q.eq('draftId', draftId))
    .take(MAX_SUBMITTED_SETS)
}

async function getDraftDetail(ctx: TrainingCtx, draft: Doc<'trainingDrafts'>) {
  const setResults = await getDraftSetResults(ctx, draft._id)

  return {
    ...draft,
    setResults: setResults.sort((a, b) => {
      const blockCompare = a.routineExerciseBlockId.localeCompare(
        b.routineExerciseBlockId,
      )

      return blockCompare === 0 ? a.setIndex - b.setIndex : blockCompare
    }),
  }
}

async function upsertDraftSetResult(
  ctx: MutationCtx,
  draftId: Id<'trainingDrafts'>,
  setResult: ReturnType<typeof sanitizeDraftSetResult>,
  updatedAt: number,
) {
  const existingRows = await ctx.db
    .query('trainingDraftSetResults')
    .withIndex('by_draft_and_routine_exercise_block_and_set_index', (q) =>
      q
        .eq('draftId', draftId)
        .eq('routineExerciseBlockId', setResult.routineExerciseBlockId)
        .eq('setIndex', setResult.setIndex),
    )
    .take(2)
  const existingRow = existingRows[0]
  const row = {
    completed: setResult.completed,
    distanceMeters: setResult.distanceMeters,
    draftId,
    durationSeconds: setResult.durationSeconds,
    exerciseId: setResult.exerciseId,
    reps: setResult.reps,
    routineExerciseBlockId: setResult.routineExerciseBlockId,
    rpe: setResult.rpe,
    setIndex: setResult.setIndex,
    updatedAt,
    weightKg: setResult.weightKg,
  }

  if (existingRow) {
    await ctx.db.patch(existingRow._id, row)
    return
  }

  await ctx.db.insert('trainingDraftSetResults', row)
}

async function parseSubmittedSets(
  ctx: MutationCtx,
  routineId: Id<'routines'>,
  setResults: SubmittedSetInput[],
) {
  if (setResults.length > MAX_SUBMITTED_SETS) {
    throw new Error(`Trening moze miec maksymalnie ${MAX_SUBMITTED_SETS} zapisanych serii.`)
  }

  const blocks = await getRoutineBlocks(ctx, routineId)
  const blockMap = new Map(blocks.map((block) => [String(block._id), block]))
  const seen = new Set<string>()
  const parsed = []

  for (const setResult of setResults) {
    const key = `${setResult.routineExerciseBlockId}:${setResult.setIndex}`

    if (seen.has(key)) {
      throw new Error('Ta sama seria nie moze byc zapisana dwa razy.')
    }
    seen.add(key)

    const block = blockMap.get(String(setResult.routineExerciseBlockId))
    if (!block || block.routineId !== routineId) {
      throw new Error('Jedna z zapisanych serii nie nalezy do tej rutyny.')
    }

    if (block.exercise._id !== setResult.exerciseId) {
      throw new Error('Cwiczenie w zapisanej serii nie pasuje do rutyny.')
    }

    const target = block.setTargets.find(
      (candidate) => candidate.setIndex === setResult.setIndex,
    )

    if (!target) {
      throw new Error('Numer serii nie pasuje do planu rutyny.')
    }

    validateSubmittedSetForExercise(block.exercise, setResult)
    parsed.push(sanitizeSetResult(setResult))
  }

  return parsed
}

async function parseDraftSets(
  ctx: MutationCtx,
  routineId: Id<'routines'>,
  setResults: DraftSetInput[],
) {
  if (setResults.length > MAX_SUBMITTED_SETS) {
    throw new Error(`Trening moze miec maksymalnie ${MAX_SUBMITTED_SETS} serii w szkicu.`)
  }

  const blocks = await getRoutineBlocks(ctx, routineId)
  const blockMap = new Map(blocks.map((block) => [String(block._id), block]))
  const seen = new Set<string>()
  const parsed = []

  for (const setResult of setResults) {
    const key = `${setResult.routineExerciseBlockId}:${setResult.setIndex}`

    if (seen.has(key)) {
      throw new Error('Ta sama seria nie moze byc zapisana dwa razy w szkicu.')
    }
    seen.add(key)

    const block = blockMap.get(String(setResult.routineExerciseBlockId))
    if (!block || block.routineId !== routineId) {
      throw new Error('Jedna z serii szkicu nie nalezy do tej rutyny.')
    }

    if (block.exercise._id !== setResult.exerciseId) {
      throw new Error('Cwiczenie w szkicu nie pasuje do rutyny.')
    }

    const target = block.setTargets.find(
      (candidate) => candidate.setIndex === setResult.setIndex,
    )

    if (!target) {
      throw new Error('Numer serii w szkicu nie pasuje do planu rutyny.')
    }

    validateDraftSetForExercise(block.exercise, setResult)
    parsed.push(sanitizeDraftSetResult(setResult))
  }

  return parsed
}

function validateSubmittedSetForExercise(
  exercise: Pick<Doc<'exercises'>, 'type'>,
  setResult: SubmittedSetInput,
) {
  if (!isPositiveInteger(setResult.setIndex)) {
    throw new Error('Numer serii musi byc dodatnia liczba calkowita.')
  }

  if (setResult.rpe !== undefined && (setResult.rpe < 1 || setResult.rpe > 10)) {
    throw new Error('RPE musi byc liczba od 1 do 10.')
  }

  for (const [label, value] of Object.entries({
    dystans: setResult.distanceMeters,
    czas: setResult.durationSeconds,
    powtorzenia: setResult.reps,
    ciezar: setResult.weightKg,
  })) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`${label} musi byc nieujemna liczba.`)
    }
  }

  const hasDistance = setResult.distanceMeters !== undefined
  const hasDuration = setResult.durationSeconds !== undefined
  const hasReps = setResult.reps !== undefined
  const hasWeight = setResult.weightKg !== undefined

  switch (exercise.type) {
    case 'weight_reps':
      requireFields(hasWeight && hasReps, 'Podaj ciezar i powtorzenia.')
      rejectFields(hasDuration || hasDistance, 'Ten typ cwiczenia przyjmuje ciezar i powtorzenia.')
      break
    case 'reps_only':
    case 'bodyweight':
      requireFields(hasReps, 'Podaj powtorzenia.')
      rejectFields(hasWeight || hasDuration || hasDistance, 'Ten typ cwiczenia przyjmuje tylko powtorzenia.')
      break
    case 'assisted_bodyweight':
      requireFields(hasWeight && hasReps, 'Podaj asyste w kg oraz powtorzenia.')
      rejectFields(hasDuration || hasDistance, 'Ten typ cwiczenia przyjmuje asyste i powtorzenia.')
      break
    case 'duration':
      requireFields(hasDuration, 'Podaj czas trwania serii.')
      rejectFields(hasWeight || hasReps || hasDistance, 'Ten typ cwiczenia przyjmuje tylko czas.')
      break
    case 'weight_duration':
      requireFields(hasWeight && hasDuration, 'Podaj ciezar i czas trwania.')
      rejectFields(hasReps || hasDistance, 'Ten typ cwiczenia przyjmuje ciezar i czas.')
      break
    case 'distance_duration':
      requireFields(hasDistance && hasDuration, 'Podaj dystans i czas.')
      rejectFields(hasWeight || hasReps, 'Ten typ cwiczenia przyjmuje dystans i czas.')
      break
    case 'weight_distance':
      requireFields(hasWeight && hasDistance, 'Podaj ciezar i dystans.')
      rejectFields(hasReps || hasDuration, 'Ten typ cwiczenia przyjmuje ciezar i dystans.')
      break
  }
}

function validateDraftSetForExercise(
  exercise: Pick<Doc<'exercises'>, 'type'>,
  setResult: SubmittedSetInput,
) {
  if (!isPositiveInteger(setResult.setIndex)) {
    throw new Error('Numer serii musi byc dodatnia liczba calkowita.')
  }

  if (setResult.rpe !== undefined && (setResult.rpe < 1 || setResult.rpe > 10)) {
    throw new Error('RPE musi byc liczba od 1 do 10.')
  }

  for (const [label, value] of Object.entries({
    dystans: setResult.distanceMeters,
    czas: setResult.durationSeconds,
    powtorzenia: setResult.reps,
    ciezar: setResult.weightKg,
  })) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new Error(`${label} musi byc nieujemna liczba.`)
    }
  }

  const hasDistance = setResult.distanceMeters !== undefined
  const hasDuration = setResult.durationSeconds !== undefined
  const hasReps = setResult.reps !== undefined
  const hasWeight = setResult.weightKg !== undefined

  switch (exercise.type) {
    case 'weight_reps':
      rejectFields(hasDuration || hasDistance, 'Ten typ cwiczenia przyjmuje ciezar i powtorzenia.')
      break
    case 'reps_only':
    case 'bodyweight':
      rejectFields(hasWeight || hasDuration || hasDistance, 'Ten typ cwiczenia przyjmuje tylko powtorzenia.')
      break
    case 'assisted_bodyweight':
      rejectFields(hasDuration || hasDistance, 'Ten typ cwiczenia przyjmuje asyste i powtorzenia.')
      break
    case 'duration':
      rejectFields(hasWeight || hasReps || hasDistance, 'Ten typ cwiczenia przyjmuje tylko czas.')
      break
    case 'weight_duration':
      rejectFields(hasReps || hasDistance, 'Ten typ cwiczenia przyjmuje ciezar i czas.')
      break
    case 'distance_duration':
      rejectFields(hasWeight || hasReps, 'Ten typ cwiczenia przyjmuje dystans i czas.')
      break
    case 'weight_distance':
      rejectFields(hasReps || hasDuration, 'Ten typ cwiczenia przyjmuje ciezar i dystans.')
      break
  }
}

function sanitizeSetResult(setResult: SubmittedSetInput) {
  return {
    distanceMeters: setResult.distanceMeters,
    durationSeconds: setResult.durationSeconds,
    exerciseId: setResult.exerciseId,
    reps: setResult.reps,
    routineExerciseBlockId: setResult.routineExerciseBlockId,
    rpe: setResult.rpe,
    setIndex: setResult.setIndex,
    weightKg: setResult.weightKg,
  }
}

function sanitizeDraftSetResult(setResult: DraftSetInput) {
  return {
    ...sanitizeSetResult(setResult),
    completed: setResult.completed,
  }
}

async function createSubmittedTrainingResult(
  ctx: MutationCtx,
  args: {
    durationMinutes?: number
    notes?: string
    programId: Id<'programs'>
    routineId: Id<'routines'>
    setResults: SubmittedSetInput[]
    traineeId: Id<'users'>
  },
) {
  const durationMinutes = sanitizeDuration(args.durationMinutes)
  const notes = sanitizeNotes(args.notes)
  const parsedSetResults = await parseSubmittedSets(ctx, args.routineId, args.setResults)
  const completedSets = parsedSetResults.length

  if (completedSets === 0) {
    throw new Error('Uzupelnij przynajmniej jedna serie przed zapisem treningu.')
  }

  const volumeKg = calculateVolumeKg(parsedSetResults)
  const completedAt = Date.now()
  const trainingResultId = await ctx.db.insert('trainingResults', {
    completedAt,
    completedSets,
    durationMinutes,
    notes,
    programId: args.programId,
    routineId: args.routineId,
    traineeId: args.traineeId,
    volumeKg,
  })

  for (const setResult of parsedSetResults) {
    await ctx.db.insert('trainingResultSetResults', {
      distanceMeters: setResult.distanceMeters,
      durationSeconds: setResult.durationSeconds,
      exerciseId: setResult.exerciseId,
      reps: setResult.reps,
      routineExerciseBlockId: setResult.routineExerciseBlockId,
      rpe: setResult.rpe,
      setIndex: setResult.setIndex,
      trainingResultId,
      weightKg: setResult.weightKg,
    })
  }

  await ctx.db.insert('activities', {
    createdAt: completedAt,
    durationMinutes,
    traineeId: args.traineeId,
    trainingResultId,
    type: 'training_completed',
  })

  return {
    completedAt,
    completedSets,
    trainingResultId,
    volumeKg,
  }
}

function sanitizeDuration(value?: number) {
  if (value === undefined) {
    return undefined
  }

  if (!Number.isFinite(value) || value < 0 || value > MAX_DURATION_MINUTES) {
    throw new Error('Czas treningu musi byc liczba minut od 0 do 1440.')
  }

  return value
}

function sanitizeNotes(value?: string) {
  const notes = value?.trim()

  if (!notes) {
    return undefined
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    throw new Error(`Notatka moze miec maksymalnie ${MAX_NOTES_LENGTH} znakow.`)
  }

  return notes
}

function calculateVolumeKg(setResults: ReturnType<typeof sanitizeSetResult>[]) {
  const volume = setResults.reduce((total, setResult) => {
    if (setResult.weightKg !== undefined && setResult.reps !== undefined) {
      return total + setResult.weightKg * setResult.reps
    }

    return total
  }, 0)

  return volume > 0 ? volume : undefined
}

async function enrichResultSummary(ctx: TrainingCtx, result: Doc<'trainingResults'>) {
  const [program, routine, trainee] = await Promise.all([
    result.programId ? ctx.db.get(result.programId) : Promise.resolve(null),
    ctx.db.get(result.routineId),
    ctx.db.get(result.traineeId),
  ])

  return {
    ...result,
    program: program
      ? {
          _id: program._id,
          title: program.title,
        }
      : null,
    routine: routine
      ? {
          _id: routine._id,
          name: routine.name,
        }
      : null,
    trainee: trainee
      ? {
          _id: trainee._id,
          email: trainee.email,
          name: trainee.name,
        }
      : null,
  }
}

async function getResultDetail(ctx: TrainingCtx, result: Doc<'trainingResults'>) {
  const setResults = await ctx.db
    .query('trainingResultSetResults')
    .withIndex('by_training_result', (q) => q.eq('trainingResultId', result._id))
    .take(MAX_SUBMITTED_SETS)

  const enrichedSets = await Promise.all(
    setResults
      .sort((a, b) => a.setIndex - b.setIndex)
      .map(async (setResult) => {
        const exercise = await ctx.db.get(setResult.exerciseId)

        return {
          ...setResult,
          exercise: exercise
            ? {
                _id: exercise._id,
                name: exercise.name,
                type: exercise.type,
              }
            : null,
        }
      }),
  )

  return {
    ...(await enrichResultSummary(ctx, result)),
    setResults: enrichedSets,
  }
}

async function queryTraineeResults(
  ctx: TrainingCtx,
  traineeId: Id<'users'>,
  args: {
    limit: number
    programId?: Id<'programs'>
    rangeEnd?: number
    rangeStart?: number
  },
) {
  if (args.programId) {
    const programId = args.programId
    const allForProgram = await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_program', (q) =>
        q.eq('traineeId', traineeId).eq('programId', programId),
      )
      .order('desc')
      .take(MAX_REVIEW_RESULTS)

    return filterByCompletedAt(allForProgram, args.rangeStart, args.rangeEnd).slice(
      0,
      args.limit,
    )
  }

  const { rangeStart, rangeEnd } = args

  if (rangeStart !== undefined && rangeEnd !== undefined) {
    return await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_completed_at', (q) =>
        q
          .eq('traineeId', traineeId)
          .gte('completedAt', rangeStart)
          .lte('completedAt', rangeEnd),
      )
      .order('desc')
      .take(args.limit)
  }

  if (rangeStart !== undefined) {
    return await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_completed_at', (q) =>
        q.eq('traineeId', traineeId).gte('completedAt', rangeStart),
      )
      .order('desc')
      .take(args.limit)
  }

  if (rangeEnd !== undefined) {
    return await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_completed_at', (q) =>
        q.eq('traineeId', traineeId).lte('completedAt', rangeEnd),
      )
      .order('desc')
      .take(args.limit)
  }

  return await ctx.db
    .query('trainingResults')
    .withIndex('by_trainee_and_completed_at', (q) => q.eq('traineeId', traineeId))
    .order('desc')
    .take(args.limit)
}

function filterByCompletedAt(
  results: Doc<'trainingResults'>[],
  rangeStart?: number,
  rangeEnd?: number,
) {
  return results.filter((result) => {
    if (rangeStart !== undefined && result.completedAt < rangeStart) {
      return false
    }
    if (rangeEnd !== undefined && result.completedAt > rangeEnd) {
      return false
    }
    return true
  })
}

async function getRoutinePlan(ctx: TrainingCtx, routineId: Id<'routines'>) {
  const routine = await ctx.db.get(routineId)

  if (!routine) {
    return null
  }

  const blocks = await getRoutineBlocks(ctx, routineId)

  return {
    routine: {
      _id: routine._id,
      name: routine.name,
    },
    blocks,
  }
}

async function requireManagedTrainee(
  ctx: TrainingCtx,
  coachId: Id<'users'>,
  traineeId: Id<'users'>,
) {
  const trainee = await ctx.db.get(traineeId)

  if (!trainee || trainee.role !== 'trainee' || trainee.coachId !== coachId) {
    throw new Error('Nie masz dostepu do wynikow tego klienta.')
  }

  return trainee
}

function requireFields(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function rejectFields(condition: boolean, message: string) {
  if (condition) {
    throw new Error(message)
  }
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0
}

function clampLimit(value: number | undefined, max: number) {
  return Math.min(Math.max(value ?? max, 1), max)
}
