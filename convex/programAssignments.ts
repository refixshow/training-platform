import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { mutation, query } from './_generated/server'
import { requireCoachAdmin, requireTrainee } from './auth'

const MAX_ASSIGNMENTS = 100
const MAX_PROGRAMS = 100
const MAX_PROGRAM_ROUTINES = 80
const MAX_ROUTINE_BLOCKS = 40
const MAX_SET_TARGETS_PER_BLOCK = 20
const MAX_TRAINEES = 100
const MAX_TRAINEE_ROUTINES = 40

type AssignmentCtx = Pick<QueryCtx | MutationCtx, 'db'>

type ProgramSummary = Pick<
  Doc<'programs'>,
  '_id' | 'description' | 'durationWeeks' | 'title'
> & {
  routineCount: number
}

type TraineeSummary = Pick<Doc<'users'>, '_id' | 'email' | 'name'>

export const listByCoach = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const limit = clampLimit(args.limit, MAX_ASSIGNMENTS)
    const assignments = await ctx.db
      .query('programAssignments')
      .withIndex('by_coach', (q) => q.eq('coachId', coach._id))
      .order('desc')
      .take(limit)

    const rows = await Promise.all(
      assignments.map(async (assignment) => {
        const program = await getProgramSummary(ctx, assignment.programId)
        const trainee = await getTraineeSummary(ctx, assignment.traineeId)

        if (!program || !trainee) {
          return null
        }

        const trainingResults = await ctx.db
          .query('trainingResults')
          .withIndex('by_trainee_and_program', (q) =>
            q.eq('traineeId', assignment.traineeId).eq('programId', assignment.programId),
          )
          .take(1)

        return {
          ...assignment,
          hasTrainingResults: trainingResults.length > 0,
          program,
          trainee,
        }
      }),
    )

    return rows.filter((row) => row !== null)
  },
})

export const listCreateOptions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const limit = clampLimit(args.limit, MAX_PROGRAMS)
    const programs = await ctx.db
      .query('programs')
      .withIndex('by_owner_coach', (q) => q.eq('ownerCoachId', coach._id))
      .order('desc')
      .take(limit)
    const trainees = await ctx.db
      .query('users')
      .withIndex('by_coach', (q) => q.eq('coachId', coach._id))
      .order('asc')
      .take(clampLimit(args.limit, MAX_TRAINEES))

    const programOptions = await Promise.all(
      programs.map(async (program) => await getProgramSummary(ctx, program._id)),
    )

    return {
      programs: programOptions.filter((program) => program !== null),
      trainees: await Promise.all(
        trainees
          .filter((trainee) => trainee.role === 'trainee')
          .map(async (trainee) => ({
            ...getTraineeSummaryFromDoc(trainee),
            activeAssignmentCount: (
              await ctx.db
                .query('programAssignments')
                .withIndex('by_trainee', (q) => q.eq('traineeId', trainee._id))
                .take(25)
            ).length,
          })),
      ),
    }
  },
})

export const assign = mutation({
  args: {
    programId: v.id('programs'),
    traineeId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const program = await ctx.db.get(args.programId)

    if (!program || program.ownerCoachId !== coach._id) {
      throw new Error('Nie znaleziono programu w Twojej bibliotece.')
    }

    const placements = await ctx.db
      .query('programRoutines')
      .withIndex('by_program', (q) => q.eq('programId', args.programId))
      .take(1)

    if (placements.length === 0) {
      throw new Error('Program musi miec przynajmniej jedna rutyne przed przypisaniem.')
    }

    const trainee = await ctx.db.get(args.traineeId)

    if (!trainee || trainee.role !== 'trainee' || trainee.coachId !== coach._id) {
      throw new Error('Nie znaleziono klienta przypisanego do Twojego konta.')
    }

    const existing = await ctx.db
      .query('programAssignments')
      .withIndex('by_trainee_and_program', (q) =>
        q.eq('traineeId', args.traineeId).eq('programId', args.programId),
      )
      .unique()

    if (existing) {
      throw new Error('Ten klient ma juz aktywne przypisanie tego programu.')
    }

    return await ctx.db.insert('programAssignments', {
      assignedAt: Date.now(),
      coachId: coach._id,
      programId: args.programId,
      traineeId: args.traineeId,
    })
  },
})

export const unassign = mutation({
  args: {
    assignmentId: v.id('programAssignments'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const assignment = await ctx.db.get(args.assignmentId)

    if (!assignment || assignment.coachId !== coach._id) {
      throw new Error('Nie znaleziono przypisania w Twoim panelu.')
    }

    const trainingResults = await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_program', (q) =>
        q.eq('traineeId', assignment.traineeId).eq('programId', assignment.programId),
      )
      .take(1)

    if (trainingResults.length > 0) {
      throw new Error(
        'Nie mozna usunac przypisania, bo klient ma juz zapisane wyniki treningu.',
      )
    }

    await ctx.db.delete(args.assignmentId)

    return args.assignmentId
  },
})

export const listForTrainee = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const assignments = await ctx.db
      .query('programAssignments')
      .withIndex('by_trainee', (q) => q.eq('traineeId', trainee._id))
      .order('desc')
      .take(clampLimit(args.limit, MAX_ASSIGNMENTS))

    const rows = await Promise.all(
      assignments.map(async (assignment) => {
        const program = await getProgramSummary(ctx, assignment.programId)

        if (!program) {
          return null
        }

        const placements = await ctx.db
          .query('programRoutines')
          .withIndex('by_program', (q) => q.eq('programId', program._id))
          .take(MAX_TRAINEE_ROUTINES)
        const routines = await Promise.all(
          placements
            .sort((a, b) => a.order - b.order)
            .map(async (placement) => {
              const routine = await ctx.db.get(placement.routineId)

              if (!routine) {
                return null
              }

              return {
                _id: routine._id,
                name: routine.name,
                order: placement.order,
              }
            }),
        )

        return {
          _id: assignment._id,
          assignedAt: assignment.assignedAt,
          program,
          routines: routines.filter((routine) => routine !== null),
        }
      }),
    )

    return rows.filter((row) => row !== null)
  },
})

export const getAssignedProgram = query({
  args: {
    assignmentId: v.id('programAssignments'),
  },
  handler: async (ctx, args) => {
    const trainee = await requireTrainee(ctx)
    const assignment = await ctx.db.get(args.assignmentId)

    if (!assignment || assignment.traineeId !== trainee._id) {
      throw new Error('Nie masz dostepu do tego programu.')
    }

    const program = await ctx.db.get(assignment.programId)

    if (!program) {
      throw new Error('Ten program nie jest juz dostepny.')
    }

    const coach = await ctx.db.get(assignment.coachId)
    const placements = await ctx.db
      .query('programRoutines')
      .withIndex('by_program', (q) => q.eq('programId', program._id))
      .take(MAX_TRAINEE_ROUTINES)

    const routines = await Promise.all(
      placements
        .sort((a, b) => a.order - b.order)
        .map(async (placement) => {
          const routine = await ctx.db.get(placement.routineId)

          if (!routine) {
            return null
          }

          const blocks = await ctx.db
            .query('routineExerciseBlocks')
            .withIndex('by_routine', (q) => q.eq('routineId', routine._id))
            .take(MAX_ROUTINE_BLOCKS)

          const exercises = await Promise.all(
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
                  _id: block._id,
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
                  order: block.order,
                  restSeconds: block.restSeconds,
                  setTargets: setTargets.sort((a, b) => a.setIndex - b.setIndex),
                  supersetGroup: block.supersetGroup,
                }
              }),
          )

          return {
            _id: routine._id,
            exerciseCount: exercises.filter((exercise) => exercise !== null).length,
            exercises: exercises.filter((exercise) => exercise !== null),
            name: routine.name,
            order: placement.order,
          }
        }),
    )

    return {
      _id: assignment._id,
      assignedAt: assignment.assignedAt,
      coach: coach
        ? {
            _id: coach._id,
            email: coach.email,
            name: coach.name,
          }
        : null,
      program: {
        _id: program._id,
        description: program.description,
        durationWeeks: program.durationWeeks,
        title: program.title,
      },
      routines: routines.filter((routine) => routine !== null),
    }
  },
})

async function getProgramSummary(
  ctx: AssignmentCtx,
  programId: Id<'programs'>,
): Promise<ProgramSummary | null> {
  const program = await ctx.db.get(programId)

  if (!program) {
    return null
  }

  const placements = await ctx.db
    .query('programRoutines')
    .withIndex('by_program', (q) => q.eq('programId', programId))
    .take(MAX_PROGRAM_ROUTINES)

  return {
    _id: program._id,
    description: program.description,
    durationWeeks: program.durationWeeks,
    routineCount: placements.length,
    title: program.title,
  }
}

async function getTraineeSummary(
  ctx: AssignmentCtx,
  traineeId: Id<'users'>,
): Promise<TraineeSummary | null> {
  const trainee = await ctx.db.get(traineeId)

  if (!trainee) {
    return null
  }

  return getTraineeSummaryFromDoc(trainee)
}

function getTraineeSummaryFromDoc(trainee: Doc<'users'>): TraineeSummary {
  return {
    _id: trainee._id,
    email: trainee.email,
    name: trainee.name,
  }
}

function clampLimit(value: number | undefined, max: number) {
  return Math.min(Math.max(value ?? max, 1), max)
}
