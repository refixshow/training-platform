import { v } from 'convex/values'

import { mutation, query } from './_generated/server'
import { requireCoachAdmin } from './auth'

const muscleGroupNameMaxLength = 80

function normalizeMuscleGroupName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')
}

function parseMuscleGroupName(name: string) {
  const trimmedName = name.trim().replace(/\s+/g, ' ')

  if (!trimmedName) {
    throw new Error('Wpisz nazwe grupy miesniowej.')
  }

  if (trimmedName.length > muscleGroupNameMaxLength) {
    throw new Error(
      `Nazwa grupy moze miec maksymalnie ${muscleGroupNameMaxLength} znakow.`,
    )
  }

  return {
    name: trimmedName,
    normalizedName: normalizeMuscleGroupName(trimmedName),
  }
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200)

    return await ctx.db
      .query('muscleGroups')
      .withIndex('by_name')
      .order('asc')
      .take(limit)
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCoachAdmin(ctx)

    const parsed = parseMuscleGroupName(args.name)
    const existing = await ctx.db
      .query('muscleGroups')
      .withIndex('by_normalized_name', (q) =>
        q.eq('normalizedName', parsed.normalizedName),
      )
      .unique()

    if (existing) {
      throw new Error('Taka grupa miesniowa juz istnieje.')
    }

    return await ctx.db.insert('muscleGroups', {
      createdAt: Date.now(),
      name: parsed.name,
      normalizedName: parsed.normalizedName,
      sortOrder: args.sortOrder,
    })
  },
})

export const update = mutation({
  args: {
    muscleGroupId: v.id('muscleGroups'),
    name: v.string(),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireCoachAdmin(ctx)

    const existing = await ctx.db.get(args.muscleGroupId)

    if (!existing) {
      throw new Error('Nie znaleziono grupy miesniowej.')
    }

    const parsed = parseMuscleGroupName(args.name)
    const duplicate = await ctx.db
      .query('muscleGroups')
      .withIndex('by_normalized_name', (q) =>
        q.eq('normalizedName', parsed.normalizedName),
      )
      .unique()

    if (duplicate && duplicate._id !== args.muscleGroupId) {
      throw new Error('Taka grupa miesniowa juz istnieje.')
    }

    await ctx.db.patch(args.muscleGroupId, {
      name: parsed.name,
      normalizedName: parsed.normalizedName,
      sortOrder: args.sortOrder,
      updatedAt: Date.now(),
    })

    return args.muscleGroupId
  },
})
