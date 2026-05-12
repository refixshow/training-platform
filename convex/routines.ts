import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCoachAdmin } from './auth'

const MAX_ROUTINES = 100
const MAX_BLOCKS = 40
const MAX_SET_TARGETS_PER_BLOCK = 20
const MAX_ROUTINE_NAME_LENGTH = 120

const setTargetValidator = v.object({
  distanceMeters: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  reps: v.optional(v.number()),
  repsMax: v.optional(v.number()),
  repsMin: v.optional(v.number()),
  setIndex: v.number(),
  targetRpe: v.optional(v.number()),
  weightKg: v.optional(v.number()),
})

const routineBlockValidator = v.object({
  exerciseId: v.id('exercises'),
  restSeconds: v.optional(v.number()),
  setTargets: v.array(setTargetValidator),
  supersetGroup: v.optional(v.string()),
})

const routinePayloadValidator = {
  blocks: v.array(routineBlockValidator),
  name: v.string(),
}

type SetTargetInput = {
  distanceMeters?: number
  durationSeconds?: number
  reps?: number
  repsMax?: number
  repsMin?: number
  setIndex: number
  targetRpe?: number
  weightKg?: number
}

type RoutineBlockInput = {
  exerciseId: Id<'exercises'>
  restSeconds?: number
  setTargets: SetTargetInput[]
  supersetGroup?: string
}

type ParsedRoutinePayload = {
  blocks: Array<
    RoutineBlockInput & {
      exercise: Doc<'exercises'>
      order: number
    }
  >
  name: string
}

type RoutineCtx = Pick<QueryCtx | MutationCtx, 'db'>

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const limit = Math.min(Math.max(args.limit ?? MAX_ROUTINES, 1), MAX_ROUTINES)
    const routines = await ctx.db
      .query('routines')
      .withIndex('by_owner_coach', (q) => q.eq('ownerCoachId', coach._id))
      .order('desc')
      .take(limit)

    return await Promise.all(
      routines.map(async (routine) => {
        const blocks = await ctx.db
          .query('routineExerciseBlocks')
          .withIndex('by_routine', (q) => q.eq('routineId', routine._id))
          .take(MAX_BLOCKS)

        let setCount = 0
        for (const block of blocks) {
          const targets = await ctx.db
            .query('routineSetTargets')
            .withIndex('by_routine_exercise_block', (q) =>
              q.eq('routineExerciseBlockId', block._id),
            )
            .take(MAX_SET_TARGETS_PER_BLOCK)
          setCount += targets.length
        }

        const programUsage = await ctx.db
          .query('programRoutines')
          .withIndex('by_routine', (q) => q.eq('routineId', routine._id))
          .take(25)

        return {
          ...routine,
          exerciseCount: blocks.length,
          programUsageCount: programUsage.length,
          setCount,
        }
      }),
    )
  },
})

export const get = query({
  args: {
    routineId: v.id('routines'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const routine = await ctx.db.get(args.routineId)

    if (!routine || routine.ownerCoachId !== coach._id) {
      throw new Error('Nie znaleziono rutyny w Twojej bibliotece.')
    }

    const blocks = await ctx.db
      .query('routineExerciseBlocks')
      .withIndex('by_routine', (q) => q.eq('routineId', routine._id))
      .take(MAX_BLOCKS)

    const orderedBlocks = blocks.sort((a, b) => a.order - b.order)

    return {
      ...routine,
      blocks: await Promise.all(
        orderedBlocks.map(async (block) => {
          const exercise = await ctx.db.get(block.exerciseId)
          const setTargets = await ctx.db
            .query('routineSetTargets')
            .withIndex('by_routine_exercise_block', (q) =>
              q.eq('routineExerciseBlockId', block._id),
            )
            .take(MAX_SET_TARGETS_PER_BLOCK)

          return {
            ...block,
            exercise,
            setTargets: setTargets.sort((a, b) => a.setIndex - b.setIndex),
          }
        }),
      ),
    }
  },
})

export const create = mutation({
  args: routinePayloadValidator,
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const parsed = await parseRoutinePayload(ctx, args)
    const now = Date.now()
    const routineId = await ctx.db.insert('routines', {
      createdAt: now,
      name: parsed.name,
      ownerCoachId: coach._id,
      updatedAt: now,
    })

    await insertRoutineChildren(ctx, routineId, parsed.blocks)

    return routineId
  },
})

export const update = mutation({
  args: {
    routineId: v.id('routines'),
    ...routinePayloadValidator,
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const routine = await ctx.db.get(args.routineId)

    if (!routine || routine.ownerCoachId !== coach._id) {
      throw new Error('Nie znaleziono rutyny w Twojej bibliotece.')
    }

    const parsed = await parseRoutinePayload(ctx, args)
    await deleteRoutineChildren(ctx, args.routineId)
    await insertRoutineChildren(ctx, args.routineId, parsed.blocks)
    await ctx.db.patch(args.routineId, {
      name: parsed.name,
      updatedAt: Date.now(),
    })

    return args.routineId
  },
})

export const remove = mutation({
  args: {
    routineId: v.id('routines'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const routine = await ctx.db.get(args.routineId)

    if (!routine || routine.ownerCoachId !== coach._id) {
      throw new Error('Nie znaleziono rutyny w Twojej bibliotece.')
    }

    const programReferences = await ctx.db
      .query('programRoutines')
      .withIndex('by_routine', (q) => q.eq('routineId', args.routineId))
      .take(1)
    const trainingReferences = await ctx.db
      .query('trainingResults')
      .withIndex('by_routine', (q) => q.eq('routineId', args.routineId))
      .take(1)

    if (programReferences.length > 0 || trainingReferences.length > 0) {
      throw new Error(
        'Nie mozna usunac rutyny, ktora jest uzywana w programie albo wynikach treningu.',
      )
    }

    await deleteRoutineChildren(ctx, args.routineId)
    await ctx.db.delete(args.routineId)

    return args.routineId
  },
})

async function parseRoutinePayload(
  ctx: RoutineCtx,
  args: { blocks: RoutineBlockInput[]; name: string },
): Promise<ParsedRoutinePayload> {
  const name = args.name.trim().replace(/\s+/g, ' ')

  if (!name || name.length > MAX_ROUTINE_NAME_LENGTH) {
    throw new Error('Nazwa rutyny musi miec od 1 do 120 znakow.')
  }

  if (args.blocks.length === 0) {
    throw new Error('Dodaj przynajmniej jedno cwiczenie do rutyny.')
  }

  if (args.blocks.length > MAX_BLOCKS) {
    throw new Error(`Rutyna moze miec maksymalnie ${MAX_BLOCKS} cwiczen.`)
  }

  const blocks = []

  for (const [index, block] of args.blocks.entries()) {
    const exercise = await ctx.db.get(block.exerciseId)

    if (!exercise) {
      throw new Error('Jedno z wybranych cwiczen nie istnieje.')
    }

    if (block.restSeconds !== undefined && !isNonNegativeInteger(block.restSeconds)) {
      throw new Error('Przerwa musi byc nieujemna liczba sekund.')
    }

    if (block.setTargets.length === 0) {
      throw new Error('Kazde cwiczenie w rutynie musi miec przynajmniej jedna serie.')
    }

    if (block.setTargets.length > MAX_SET_TARGETS_PER_BLOCK) {
      throw new Error(
        `Cwiczenie moze miec maksymalnie ${MAX_SET_TARGETS_PER_BLOCK} serii.`,
      )
    }

    const seenSetIndexes = new Set<number>()
    for (const target of block.setTargets) {
      if (!isPositiveInteger(target.setIndex)) {
        throw new Error('Numer serii musi byc dodatnia liczba calkowita.')
      }

      if (seenSetIndexes.has(target.setIndex)) {
        throw new Error('Serie w jednym cwiczeniu nie moga miec tego samego numeru.')
      }
      seenSetIndexes.add(target.setIndex)
      validateTargetForExercise(exercise, target)
    }

    const supersetGroup = block.supersetGroup?.trim() || undefined

    blocks.push({
      ...block,
      exercise,
      order: index + 1,
      restSeconds: block.restSeconds,
      setTargets: block.setTargets
        .map((target) => sanitizeSetTarget(target))
        .sort((a, b) => a.setIndex - b.setIndex),
      supersetGroup,
    })
  }

  return { blocks, name }
}

function validateTargetForExercise(
  exercise: Doc<'exercises'>,
  target: SetTargetInput,
) {
  if (target.targetRpe !== undefined && (target.targetRpe < 1 || target.targetRpe > 10)) {
    throw new Error('RPE musi byc liczba od 1 do 10.')
  }

  for (const [label, value] of Object.entries({
    dystans: target.distanceMeters,
    czas: target.durationSeconds,
    powtorzenia: target.reps,
    'gorny zakres powtorzen': target.repsMax,
    'dolny zakres powtorzen': target.repsMin,
    ciezar: target.weightKg,
  })) {
    if (value !== undefined && value < 0) {
      throw new Error(`${label} nie moze byc ujemny.`)
    }
  }

  if ((target.repsMin !== undefined || target.repsMax !== undefined) && target.reps !== undefined) {
    throw new Error('Wybierz pojedyncza liczbe powtorzen albo zakres, nie oba naraz.')
  }

  if (
    (target.repsMin === undefined && target.repsMax !== undefined) ||
    (target.repsMin !== undefined && target.repsMax === undefined)
  ) {
    throw new Error('Zakres powtorzen musi miec dolna i gorna wartosc.')
  }

  if (
    target.repsMin !== undefined &&
    target.repsMax !== undefined &&
    target.repsMin > target.repsMax
  ) {
    throw new Error('Dolny zakres powtorzen nie moze byc wiekszy od gornego.')
  }

  const hasReps = target.reps !== undefined || target.repsMin !== undefined
  const hasWeight = target.weightKg !== undefined
  const hasDuration = target.durationSeconds !== undefined
  const hasDistance = target.distanceMeters !== undefined

  switch (exercise.type) {
    case 'weight_reps':
      requireFields(hasReps, 'Podaj powtorzenia albo zakres powtorzen.')
      rejectFields(hasDuration || hasDistance, 'Ten typ cwiczenia przyjmuje ciezar i powtorzenia.')
      break
    case 'reps_only':
    case 'bodyweight':
      requireFields(hasReps, 'Podaj powtorzenia albo zakres powtorzen.')
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

function sanitizeSetTarget(target: SetTargetInput) {
  return {
    distanceMeters: target.distanceMeters,
    durationSeconds: target.durationSeconds,
    reps: target.reps,
    repsMax: target.repsMax,
    repsMin: target.repsMin,
    setIndex: target.setIndex,
    targetRpe: target.targetRpe,
    weightKg: target.weightKg,
  }
}

async function insertRoutineChildren(
  ctx: MutationCtx,
  routineId: Id<'routines'>,
  blocks: ParsedRoutinePayload['blocks'],
) {
  for (const block of blocks) {
    const blockId = await ctx.db.insert('routineExerciseBlocks', {
      exerciseId: block.exerciseId,
      order: block.order,
      restSeconds: block.restSeconds,
      routineId,
      supersetGroup: block.supersetGroup,
    })

    for (const target of block.setTargets) {
      await ctx.db.insert('routineSetTargets', {
        ...target,
        routineExerciseBlockId: blockId,
      })
    }
  }
}

async function deleteRoutineChildren(
  ctx: MutationCtx,
  routineId: Id<'routines'>,
) {
  const blocks = await ctx.db
    .query('routineExerciseBlocks')
    .withIndex('by_routine', (q) => q.eq('routineId', routineId))
    .take(MAX_BLOCKS)

  for (const block of blocks) {
    const targets = await ctx.db
      .query('routineSetTargets')
      .withIndex('by_routine_exercise_block', (q) =>
        q.eq('routineExerciseBlockId', block._id),
      )
      .take(MAX_SET_TARGETS_PER_BLOCK)

    for (const target of targets) {
      await ctx.db.delete(target._id)
    }

    await ctx.db.delete(block._id)
  }
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

function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0
}
