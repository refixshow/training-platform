import type { Doc, Id } from './_generated/dataModel'
import type { QueryCtx } from './_generated/server'
import { query } from './_generated/server'
import { requireTrainee } from './auth'

const MAX_ASSIGNMENTS = 20
const MAX_PROGRAM_ROUTINES = 40
const MAX_RECENT_RESULTS = 6
const MAX_WEEK_RESULTS = 80
const MAX_ACTIVITY_DAYS = 28
const MAX_BODYWEIGHT_POINTS = 12
const MAX_PROGRESS_PHOTOS = 3

type DashboardCtx = Pick<QueryCtx, 'db' | 'storage'>

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const trainee = await requireTrainee(ctx)
    const now = Date.now()
    const week = getWeekRange(now)
    const activityRangeStart = startOfDay(now - (MAX_ACTIVITY_DAYS - 1) * dayMs())
    const bodyweightRangeStart = startOfDay(now - 90 * dayMs())

    const [currentProgram, weeklyResults, recentResults, activities, bodyweight, photos] =
      await Promise.all([
        getCurrentProgram(ctx, trainee._id),
        getWeeklyResults(ctx, trainee._id, week.start, week.end),
        getRecentTrainingResults(ctx, trainee._id),
        getActivityEntries(ctx, trainee._id, activityRangeStart, now),
        getBodyweightEntries(ctx, trainee._id, bodyweightRangeStart, now),
        getProgressPhotoPreview(ctx, trainee._id),
      ])

    return {
      activity: {
        days: buildActivityDays(activityRangeStart, now, activities),
        rangeLabel: formatRangeLabel(activityRangeStart, now),
        totalCompletions: activities.length,
      },
      bodyweight: {
        entries: bodyweight,
        latest: bodyweight[bodyweight.length - 1] ?? null,
        rangeLabel: formatRangeLabel(bodyweightRangeStart, now),
      },
      currentProgram,
      progressPhotos: photos,
      recentTrainingResults: recentResults,
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

async function getCurrentProgram(ctx: DashboardCtx, traineeId: Id<'users'>) {
  const assignments = await ctx.db
    .query('programAssignments')
    .withIndex('by_trainee', (q) => q.eq('traineeId', traineeId))
    .order('desc')
    .take(MAX_ASSIGNMENTS)
  const assignment = assignments[0]

  if (!assignment) {
    return null
  }

  const program = await ctx.db.get(assignment.programId)

  if (!program) {
    return null
  }

  const placements = await ctx.db
    .query('programRoutines')
    .withIndex('by_program', (q) => q.eq('programId', program._id))
    .take(MAX_PROGRAM_ROUTINES)
  const sortedPlacements = placements.sort((a, b) => a.order - b.order)
  const nextRoutine = sortedPlacements[0]
    ? await ctx.db.get(sortedPlacements[0].routineId)
    : null

  return {
    _id: assignment._id,
    assignedAt: assignment.assignedAt,
    nextRoutine: nextRoutine
      ? {
          _id: nextRoutine._id,
          name: nextRoutine.name,
        }
      : null,
    program: {
      _id: program._id,
      description: program.description,
      durationWeeks: program.durationWeeks,
      routineCount: placements.length,
      title: program.title,
    },
  }
}

async function getWeeklyResults(
  ctx: DashboardCtx,
  traineeId: Id<'users'>,
  start: number,
  end: number,
) {
  return await ctx.db
    .query('trainingResults')
    .withIndex('by_trainee_and_completed_at', (q) =>
      q.eq('traineeId', traineeId).gte('completedAt', start).lte('completedAt', end),
    )
    .order('desc')
    .take(MAX_WEEK_RESULTS)
}

async function getRecentTrainingResults(
  ctx: DashboardCtx,
  traineeId: Id<'users'>,
) {
  const results = await ctx.db
    .query('trainingResults')
    .withIndex('by_trainee_and_completed_at', (q) => q.eq('traineeId', traineeId))
    .order('desc')
    .take(MAX_RECENT_RESULTS)

  return await Promise.all(
    results.map(async (result) => {
      const [program, routine] = await Promise.all([
        result.programId ? ctx.db.get(result.programId) : Promise.resolve(null),
        ctx.db.get(result.routineId),
      ])

      return {
        _id: result._id,
        completedAt: result.completedAt,
        completedSets: result.completedSets ?? 0,
        durationMinutes: result.durationMinutes,
        program: program ? { _id: program._id, title: program.title } : null,
        routine: routine ? { _id: routine._id, name: routine.name } : null,
        volumeKg: result.volumeKg,
      }
    }),
  )
}

async function getActivityEntries(
  ctx: DashboardCtx,
  traineeId: Id<'users'>,
  start: number,
  end: number,
) {
  return await ctx.db
    .query('activities')
    .withIndex('by_trainee_and_created_at', (q) =>
      q.eq('traineeId', traineeId).gte('createdAt', start).lte('createdAt', end),
    )
    .order('asc')
    .take(MAX_ACTIVITY_DAYS * 4)
}

async function getBodyweightEntries(
  ctx: DashboardCtx,
  traineeId: Id<'users'>,
  start: number,
  end: number,
) {
  const entries = await ctx.db
    .query('bodyweightEntries')
    .withIndex('by_trainee_and_created_at', (q) =>
      q.eq('traineeId', traineeId).gte('createdAt', start).lte('createdAt', end),
    )
    .order('desc')
    .take(MAX_BODYWEIGHT_POINTS)

  return entries
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((entry) => ({
      _id: entry._id,
      createdAt: entry.createdAt,
      valueKg: entry.valueKg,
    }))
}

async function getProgressPhotoPreview(
  ctx: DashboardCtx,
  traineeId: Id<'users'>,
) {
  const photos = await ctx.db
    .query('progressPhotos')
    .withIndex('by_trainee_and_captured_at', (q) => q.eq('traineeId', traineeId))
    .order('desc')
    .take(MAX_PROGRESS_PHOTOS)

  const rows = await Promise.all(
    photos.map(async (photo) => {
      const url = await ctx.storage.getUrl(photo.storageId)

      return toPhotoPreview(photo, url)
    }),
  )

  return rows.filter((photo) => photo.url !== null)
}

function toPhotoPreview(photo: Doc<'progressPhotos'>, url: string | null) {
  return {
    _id: photo._id,
    bodyweightKg: photo.bodyweightKg,
    capturedAt: photo.capturedAt,
    note: photo.note,
    url,
  }
}

function buildActivityDays(
  start: number,
  end: number,
  activities: Doc<'activities'>[],
) {
  const activityByDay = new Map<string, Doc<'activities'>[]>()

  for (const activity of activities) {
    const key = dayKey(activity.createdAt)
    activityByDay.set(key, [...(activityByDay.get(key) ?? []), activity])
  }

  const days = []

  for (let day = startOfDay(start); day <= startOfDay(end); day += dayMs()) {
    const rows = activityByDay.get(dayKey(day)) ?? []

    days.push({
      date: day,
      durationMinutes: rows.reduce(
        (total, activity) => total + (activity.durationMinutes ?? 0),
        0,
      ),
      trainingCount: rows.length,
    })
  }

  return days
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

function dayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
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
