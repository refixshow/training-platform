import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCoachAdmin } from './auth'

const MAX_PROGRAMS = 100
const MAX_ROUTINES = 100
const MAX_PROGRAM_TITLE_LENGTH = 120
const MAX_PROGRAM_DESCRIPTION_LENGTH = 2000
const MAX_PROGRAM_DURATION_WEEKS = 52
const MAX_PROGRAM_ROUTINES = 80
const MAX_BLOCKS = 40
const MAX_SET_TARGETS_PER_BLOCK = 20

const programPlacementValidator = v.object({
  order: v.number(),
  routineId: v.id('routines'),
})

const programPayloadValidator = {
  description: v.string(),
  durationWeeks: v.number(),
  placements: v.array(programPlacementValidator),
  title: v.string(),
}

type ProgramCtx = Pick<QueryCtx | MutationCtx, 'db'>

type ProgramPlacementInput = {
  order: number
  routineId: Id<'routines'>
}

type ParsedProgramPayload = {
  description: string
  durationWeeks: number
  placements: ProgramPlacementInput[]
  title: string
}

export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const limit = Math.min(Math.max(args.limit ?? MAX_PROGRAMS, 1), MAX_PROGRAMS)
    const programs = await ctx.db
      .query('programs')
      .withIndex('by_owner_coach', (q) => q.eq('ownerCoachId', coach._id))
      .order('desc')
      .take(limit)

    return await Promise.all(
      programs.map(async (program) => {
        const placements = await ctx.db
          .query('programRoutines')
          .withIndex('by_program', (q) => q.eq('programId', program._id))
          .take(MAX_PROGRAM_ROUTINES)

        return {
          ...program,
          routineCount: placements.length,
        }
      }),
    )
  },
})

export const listCreateOptions = query({
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

        return {
          ...routine,
          exerciseCount: blocks.length,
          setCount,
        }
      }),
    )
  },
})

export const create = mutation({
  args: programPayloadValidator,
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const parsed = await parseProgramPayload(ctx, coach._id, args)
    const now = Date.now()
    const programId = await ctx.db.insert('programs', {
      createdAt: now,
      description: parsed.description,
      durationWeeks: parsed.durationWeeks,
      ownerCoachId: coach._id,
      title: parsed.title,
      updatedAt: now,
    })

    for (const placement of parsed.placements) {
      await ctx.db.insert('programRoutines', {
        order: placement.order,
        programId,
        routineId: placement.routineId,
      })
    }

    return programId
  },
})

async function parseProgramPayload(
  ctx: ProgramCtx,
  coachId: Id<'users'>,
  args: {
    description: string
    durationWeeks: number
    placements: ProgramPlacementInput[]
    title: string
  },
): Promise<ParsedProgramPayload> {
  const title = args.title.trim().replace(/\s+/g, ' ')
  const description = args.description.trim()

  if (!title || title.length > MAX_PROGRAM_TITLE_LENGTH) {
    throw new Error('Nazwa programu musi miec od 1 do 120 znakow.')
  }

  if (description.length > MAX_PROGRAM_DESCRIPTION_LENGTH) {
    throw new Error('Opis programu moze miec maksymalnie 2000 znakow.')
  }

  if (
    !Number.isInteger(args.durationWeeks) ||
    args.durationWeeks < 1 ||
    args.durationWeeks > MAX_PROGRAM_DURATION_WEEKS
  ) {
    throw new Error('Czas trwania programu musi miec od 1 do 52 tygodni.')
  }

  if (args.placements.length === 0) {
    throw new Error('Dodaj przynajmniej jedna rutyne do programu.')
  }

  if (args.placements.length > MAX_PROGRAM_ROUTINES) {
    throw new Error(`Program moze miec maksymalnie ${MAX_PROGRAM_ROUTINES} rutyn.`)
  }

  const seenRoutineIds = new Set<string>()
  const seenOrders = new Set<number>()
  const placements = []

  for (const placement of args.placements) {
    if (!Number.isInteger(placement.order) || placement.order < 1) {
      throw new Error('Kolejnosc rutyn musi byc dodatnia liczba calkowita.')
    }

    if (seenOrders.has(placement.order)) {
      throw new Error('Rutyny w programie musza miec unikalna kolejnosc.')
    }
    seenOrders.add(placement.order)

    if (seenRoutineIds.has(placement.routineId)) {
      throw new Error('Ta sama rutyna nie moze wystapic w programie dwa razy.')
    }
    seenRoutineIds.add(placement.routineId)

    const routine = await ctx.db.get(placement.routineId)
    if (!routine || routine.ownerCoachId !== coachId) {
      throw new Error('Jedna z wybranych rutyn nie istnieje w Twojej bibliotece.')
    }

    placements.push({
      order: placement.order,
      routineId: placement.routineId,
    })
  }

  return {
    description,
    durationWeeks: args.durationWeeks,
    placements: placements.sort((a, b) => a.order - b.order),
    title,
  }
}
