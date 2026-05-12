import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'

import { mutation, query } from './_generated/server'
import { requireCoachAdmin } from './auth'
import {
  exerciseEquipmentValidator,
  exerciseTypeValidator,
} from './validators'

const MAX_EXERCISE_NAME_LENGTH = 120
const MAX_INSTRUCTIONS = 20
const MAX_INSTRUCTION_LENGTH = 400

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200)
    const exercises = await ctx.db
      .query('exercises')
      .withIndex('by_name')
      .order('asc')
      .take(limit)

    return await Promise.all(
      exercises.map(async (exercise) => {
        const primaryMuscleGroup = await ctx.db.get(
          exercise.primaryMuscleGroupId,
        )
        const secondaryMuscleGroups = await Promise.all(
          exercise.secondaryMuscleGroupIds.map((id: Id<'muscleGroups'>) =>
            ctx.db.get(id),
          ),
        )

        return {
          ...exercise,
          primaryMuscleGroup,
          secondaryMuscleGroups: secondaryMuscleGroups.filter(
            (group) => group !== null,
          ),
        }
      }),
    )
  },
})

export const create = mutation({
  args: {
    customEquipment: v.optional(v.string()),
    equipment: exerciseEquipmentValidator,
    instructions: v.array(v.string()),
    name: v.string(),
    photoStorageId: v.optional(v.id('_storage')),
    primaryMuscleGroupId: v.id('muscleGroups'),
    secondaryMuscleGroupIds: v.array(v.id('muscleGroups')),
    type: exerciseTypeValidator,
    videoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireCoachAdmin(ctx)

    const name = args.name.trim()
    if (!name || name.length > MAX_EXERCISE_NAME_LENGTH) {
      throw new Error('Exercise name must be between 1 and 120 characters.')
    }

    const customEquipment = args.customEquipment?.trim()
    if (args.equipment === 'other' && !customEquipment) {
      throw new Error('Custom equipment is required when equipment is other.')
    }

    const primaryMuscleGroup = await ctx.db.get(args.primaryMuscleGroupId)
    if (!primaryMuscleGroup) {
      throw new Error('Primary muscle group does not exist.')
    }

    const secondaryMuscleGroupIds = Array.from(
      new Set(args.secondaryMuscleGroupIds),
    )

    if (secondaryMuscleGroupIds.includes(args.primaryMuscleGroupId)) {
      throw new Error('Secondary muscle groups cannot include the primary one.')
    }

    for (const muscleGroupId of secondaryMuscleGroupIds) {
      const muscleGroup = await ctx.db.get(muscleGroupId)
      if (!muscleGroup) {
        throw new Error('One of the selected secondary muscle groups is missing.')
      }
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

    const now = Date.now()

    return await ctx.db.insert('exercises', {
      createdAt: now,
      customEquipment:
        args.equipment === 'other' && customEquipment
          ? customEquipment
          : undefined,
      equipment: args.equipment,
      instructions,
      name,
      photoStorageId: args.photoStorageId,
      primaryMuscleGroupId: args.primaryMuscleGroupId,
      secondaryMuscleGroupIds,
      type: args.type,
      videoUrl: videoUrl || undefined,
    })
  },
})
