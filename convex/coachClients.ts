import { v } from 'convex/values'

import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { requireCoachAdmin } from './auth'

const MAX_CLIENTS = 100
const MAX_ASSIGNMENTS_PER_CLIENT = 20
const MAX_RECENT_ACTIVITIES = 112
const INACTIVE_AFTER_DAYS = 14

type CoachClientCtx = Pick<QueryCtx, 'db'>

export const listManagedClients = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const limit = clampLimit(args.limit, MAX_CLIENTS)
    const trainees = await ctx.db
      .query('users')
      .withIndex('by_coach', (q) => q.eq('coachId', coach._id))
      .order('asc')
      .take(limit)

    const rows = await Promise.all(
      trainees
        .filter((trainee) => trainee.role === 'trainee')
        .map(async (trainee) => await getClientListRow(ctx, trainee)),
    )

    return {
      clients: rows.sort((a, b) => getClientName(a).localeCompare(getClientName(b))),
      rangeLabel: getRecentRangeLabel(),
    }
  },
})

export const getClientOverview = query({
  args: {
    traineeId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const coach = await requireCoachAdmin(ctx)
    const trainee = await ctx.db.get(args.traineeId)

    if (!trainee || trainee.role !== 'trainee' || trainee.coachId !== coach._id) {
      throw new Error('Nie masz dostepu do tego klienta.')
    }

    const row = await getClientListRow(ctx, trainee)
    const week = getWeekRange(Date.now())
    const weeklyResults = await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_completed_at', (q) =>
        q.eq('traineeId', trainee._id).gte('completedAt', week.start).lte('completedAt', week.end),
      )
      .order('desc')
      .take(80)

    return {
      ...row,
      week: {
        completedSets: weeklyResults.reduce(
          (total, result) => total + (result.completedSets ?? 0),
          0,
        ),
        durationMinutes: weeklyResults.reduce(
          (total, result) => total + (result.durationMinutes ?? 0),
          0,
        ),
        rangeLabel: formatRangeLabel(week.start, week.end),
        resultCount: weeklyResults.length,
        volumeKg: weeklyResults.reduce(
          (total, result) => total + (result.volumeKg ?? 0),
          0,
        ),
      },
    }
  },
})

async function getClientListRow(ctx: CoachClientCtx, trainee: Doc<'users'>) {
  const [currentAssignment, latestTrainingResult, recentActivity] = await Promise.all([
    getCurrentAssignment(ctx, trainee._id),
    getLatestTrainingResult(ctx, trainee._id),
    getRecentActivity(ctx, trainee._id),
  ])

  return {
    currentAssignment,
    latestTrainingResult,
    recentActivity,
    status: getClientStatus({
      currentAssignment,
      latestTrainingResult,
      recentActivity,
    }),
    trainee: {
      _id: trainee._id,
      email: trainee.email,
      name: trainee.name,
    },
  }
}

async function getCurrentAssignment(
  ctx: CoachClientCtx,
  traineeId: Id<'users'>,
) {
  const assignments = await ctx.db
    .query('programAssignments')
    .withIndex('by_trainee', (q) => q.eq('traineeId', traineeId))
    .order('desc')
    .take(MAX_ASSIGNMENTS_PER_CLIENT)
  const assignment = assignments.sort((a, b) => b.assignedAt - a.assignedAt)[0]

  if (!assignment) {
    return null
  }

  const program = await ctx.db.get(assignment.programId)

  if (!program) {
    return null
  }

  return {
    _id: assignment._id,
    assignedAt: assignment.assignedAt,
    program: {
      _id: program._id,
      durationWeeks: program.durationWeeks,
      title: program.title,
    },
  }
}

async function getLatestTrainingResult(
  ctx: CoachClientCtx,
  traineeId: Id<'users'>,
) {
  const result = (
    await ctx.db
      .query('trainingResults')
      .withIndex('by_trainee_and_completed_at', (q) => q.eq('traineeId', traineeId))
      .order('desc')
      .take(1)
  )[0]

  if (!result) {
    return null
  }

  const routine = await ctx.db.get(result.routineId)

  return {
    _id: result._id,
    completedAt: result.completedAt,
    completedSets: result.completedSets,
    durationMinutes: result.durationMinutes,
    routineName: routine?.name,
    volumeKg: result.volumeKg,
  }
}

async function getRecentActivity(ctx: CoachClientCtx, traineeId: Id<'users'>) {
  const now = Date.now()
  const start = now - 28 * dayMs()
  const activities = await ctx.db
    .query('activities')
    .withIndex('by_trainee_and_created_at', (q) =>
      q.eq('traineeId', traineeId).gte('createdAt', start).lte('createdAt', now),
    )
    .order('desc')
    .take(MAX_RECENT_ACTIVITIES)

  return {
    completedTrainingCount: activities.length,
    lastActivityAt: activities[0]?.createdAt,
    rangeLabel: formatRangeLabel(start, now),
  }
}

function getClientStatus({
  currentAssignment,
  latestTrainingResult,
  recentActivity,
}: {
  currentAssignment: Awaited<ReturnType<typeof getCurrentAssignment>>
  latestTrainingResult: Awaited<ReturnType<typeof getLatestTrainingResult>>
  recentActivity: Awaited<ReturnType<typeof getRecentActivity>>
}) {
  if (!currentAssignment) {
    return 'no_program' as const
  }

  if (!latestTrainingResult) {
    return 'no_results' as const
  }

  if (
    !recentActivity.lastActivityAt ||
    Date.now() - recentActivity.lastActivityAt > INACTIVE_AFTER_DAYS * dayMs()
  ) {
    return 'inactive_recently' as const
  }

  return 'ready_for_review' as const
}

function getClientName(row: Awaited<ReturnType<typeof getClientListRow>>) {
  return row.trainee.name || row.trainee.email || ''
}

function getRecentRangeLabel() {
  const now = Date.now()
  return formatRangeLabel(now - 28 * dayMs(), now)
}

function getWeekRange(now: number) {
  const current = new Date(now)
  const day = current.getDay()
  const daysSinceMonday = (day + 6) % 7
  const start = startOfDay(now - daysSinceMonday * dayMs())
  const end = start + 7 * dayMs() - 1

  return { end, start }
}

function startOfDay(timestamp: number) {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)

  return date.getTime()
}

function dayMs() {
  return 24 * 60 * 60 * 1000
}

function formatRangeLabel(start: number, end: number) {
  const formatter = new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
  })

  return `${formatter.format(start)} - ${formatter.format(end)}`
}

function clampLimit(value: number | undefined, max: number) {
  return Math.min(Math.max(value ?? max, 1), max)
}
