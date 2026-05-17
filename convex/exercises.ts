import { v } from 'convex/values'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'

import { mutation, query } from './_generated/server'
import { requireCoachAdmin } from './auth'
import {
  exerciseEquipmentValidator,
  exerciseTypeValidator,
  muscleGroupValidator,
  type MuscleGroup,
} from './validators'

const MAX_EXERCISE_NAME_LENGTH = 120
const MAX_INSTRUCTIONS = 20
const MAX_INSTRUCTION_LENGTH = 400
const MAX_EXERCISES = 200
const MAX_EXERCISE_SCAN = 1000

type ExerciseCtx = Pick<QueryCtx | MutationCtx, 'db'>

const exercisePayloadValidator = {
  customEquipment: v.optional(v.string()),
  equipment: exerciseEquipmentValidator,
  instructions: v.array(v.string()),
  name: v.string(),
  photoStorageId: v.optional(v.id('_storage')),
  primaryMuscleGroup: muscleGroupValidator,
  secondaryMuscleGroups: v.array(muscleGroupValidator),
  type: exerciseTypeValidator,
  videoUrl: v.optional(v.string()),
}

export const list = query({
  args: {
    equipment: v.optional(exerciseEquipmentValidator),
    limit: v.optional(v.number()),
    muscleGroup: v.optional(muscleGroupValidator),
    search: v.optional(v.string()),
    type: v.optional(exerciseTypeValidator),
  },
  handler: async (ctx, args) => {
    await requireCoachAdmin(ctx)

    const limit = clampLimit(args.limit)
    const search = normalizeSearch(args.search)
    const exercises = await getExerciseCandidates(ctx, args)

    return exercises
      .filter((exercise) => matchesExerciseFilters(exercise, args, search))
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
      .slice(0, limit)
  },
})

export const create = mutation({
  args: exercisePayloadValidator,
  handler: async (ctx, args) => {
    await requireCoachAdmin(ctx)
    const parsed = parseExercisePayload(args)
    const now = Date.now()

    return await ctx.db.insert('exercises', {
      ...parsed,
      createdAt: now,
    })
  },
})

export const update = mutation({
  args: {
    exerciseId: v.id('exercises'),
    ...exercisePayloadValidator,
  },
  handler: async (ctx, args) => {
    await requireCoachAdmin(ctx)
    const exercise = await ctx.db.get(args.exerciseId)

    if (!exercise) {
      throw new Error('Exercise does not exist.')
    }

    const parsed = parseExercisePayload(args)

    await ctx.db.patch(args.exerciseId, {
      ...parsed,
      updatedAt: Date.now(),
    })

    return args.exerciseId
  },
})

export const remove = mutation({
  args: {
    exerciseId: v.id('exercises'),
  },
  handler: async (ctx, args) => {
    await requireCoachAdmin(ctx)
    const exercise = await ctx.db.get(args.exerciseId)

    if (!exercise) {
      throw new Error('Exercise does not exist.')
    }

    const routineReferences = await ctx.db
      .query('routineExerciseBlocks')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', args.exerciseId))
      .take(1)
    const resultReferences = await ctx.db
      .query('trainingResultSetResults')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', args.exerciseId))
      .take(1)
    const draftReferences = await ctx.db
      .query('trainingDraftSetResults')
      .withIndex('by_exercise', (q) => q.eq('exerciseId', args.exerciseId))
      .take(1)

    if (
      routineReferences.length > 0 ||
      resultReferences.length > 0 ||
      draftReferences.length > 0
    ) {
      throw new Error(
        'Exercise is used in routines or training history and cannot be deleted.',
      )
    }

    await ctx.db.delete(args.exerciseId)

    return args.exerciseId
  },
})

async function getExerciseCandidates(
  ctx: ExerciseCtx,
  args: {
    equipment?: Doc<'exercises'>['equipment']
    muscleGroup?: MuscleGroup
    type?: Doc<'exercises'>['type']
  },
) {
  if (args.type) {
    const type = args.type
    return await ctx.db
      .query('exercises')
      .withIndex('by_type', (q) => q.eq('type', type))
      .take(MAX_EXERCISE_SCAN)
  }

  if (args.equipment) {
    const equipment = args.equipment
    return await ctx.db
      .query('exercises')
      .withIndex('by_equipment', (q) => q.eq('equipment', equipment))
      .take(MAX_EXERCISE_SCAN)
  }

  if (args.muscleGroup) {
    const primary = args.muscleGroup
    const primaryMatches = await ctx.db
      .query('exercises')
      .withIndex('by_primary_muscle_group', (q) =>
        q.eq('primaryMuscleGroup', primary),
      )
      .take(MAX_EXERCISE_SCAN)
    const remaining = MAX_EXERCISE_SCAN - primaryMatches.length

    if (remaining <= 0) {
      return primaryMatches
    }

    const matchedIds = new Set(
      primaryMatches.map((exercise) => exercise._id as Id<'exercises'>),
    )
    const secondaryMatches: Doc<'exercises'>[] = []
    for await (const exercise of ctx.db.query('exercises').withIndex('by_name')) {
      if (matchedIds.has(exercise._id)) {
        continue
      }
      if (exercise.secondaryMuscleGroups.includes(primary)) {
        secondaryMatches.push(exercise)
      }
      if (secondaryMatches.length >= remaining) {
        break
      }
    }

    return [...primaryMatches, ...secondaryMatches]
  }

  return await ctx.db
    .query('exercises')
    .withIndex('by_name')
    .order('asc')
    .take(MAX_EXERCISE_SCAN)
}

function matchesExerciseFilters(
  exercise: Doc<'exercises'>,
  args: {
    equipment?: Doc<'exercises'>['equipment']
    muscleGroup?: MuscleGroup
    type?: Doc<'exercises'>['type']
  },
  search: string,
) {
  if (args.type && exercise.type !== args.type) {
    return false
  }

  if (args.equipment && exercise.equipment !== args.equipment) {
    return false
  }

  if (
    args.muscleGroup &&
    exercise.primaryMuscleGroup !== args.muscleGroup &&
    !exercise.secondaryMuscleGroups.includes(args.muscleGroup)
  ) {
    return false
  }

  return !search || exercise.name.toLocaleLowerCase('pl-PL').includes(search)
}

function parseExercisePayload(args: {
  customEquipment?: string
  equipment: Doc<'exercises'>['equipment']
  instructions: string[]
  name: string
  photoStorageId?: Id<'_storage'>
  primaryMuscleGroup: MuscleGroup
  secondaryMuscleGroups: MuscleGroup[]
  type: Doc<'exercises'>['type']
  videoUrl?: string
}) {
  const name = args.name.trim()
  if (!name || name.length > MAX_EXERCISE_NAME_LENGTH) {
    throw new Error('Exercise name must be between 1 and 120 characters.')
  }

  const customEquipment = args.customEquipment?.trim()
  if (args.equipment === 'other' && !customEquipment) {
    throw new Error('Custom equipment is required when equipment is other.')
  }

  const secondaryMuscleGroups = Array.from(new Set(args.secondaryMuscleGroups))

  if (secondaryMuscleGroups.includes(args.primaryMuscleGroup)) {
    throw new Error('Secondary muscle groups cannot include the primary one.')
  }

  const instructions = args.instructions
    .map((instruction) => instruction.trim())
    .filter(Boolean)
    .slice(0, MAX_INSTRUCTIONS)

  if (
    instructions.some(
      (instruction) => instruction.length > MAX_INSTRUCTION_LENGTH,
    )
  ) {
    throw new Error('Each instruction step must be 400 characters or less.')
  }

  const videoUrl = args.videoUrl?.trim()
  if (videoUrl) {
    const url = new URL(videoUrl)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Video URL must start with http or https.')
    }
  }

  return {
    customEquipment:
      args.equipment === 'other' && customEquipment ? customEquipment : undefined,
    equipment: args.equipment,
    instructions,
    name,
    photoStorageId: args.photoStorageId,
    primaryMuscleGroup: args.primaryMuscleGroup,
    secondaryMuscleGroups,
    type: args.type,
    videoUrl: videoUrl || undefined,
  }
}

function clampLimit(limit?: number) {
  return Math.min(Math.max(limit ?? 100, 1), MAX_EXERCISES)
}

function normalizeSearch(search?: string) {
  return search?.trim().toLocaleLowerCase('pl-PL') ?? ''
}
