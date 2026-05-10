import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  activities: defineTable({
    createdAt: v.number(),
    durationMinutes: v.optional(v.number()),
    traineeId: v.id('users'),
    trainingResultId: v.optional(v.id('trainingResults')),
    type: v.string(),
  }).index('by_trainee', ['traineeId']),
  bodyweightEntries: defineTable({
    createdAt: v.number(),
    traineeId: v.id('users'),
    valueKg: v.number(),
  }).index('by_trainee', ['traineeId']),
  exercises: defineTable({
    equipment: v.string(),
    instructions: v.array(v.string()),
    name: v.string(),
    photoStorageId: v.optional(v.id('_storage')),
    primaryMuscleGroupId: v.id('muscleGroups'),
    secondaryMuscleGroupIds: v.array(v.id('muscleGroups')),
    type: v.string(),
    videoUrl: v.optional(v.string()),
  }).index('by_primary_muscle_group', ['primaryMuscleGroupId']),
  muscleGroups: defineTable({
    name: v.string(),
    sortOrder: v.optional(v.number()),
  }).index('by_name', ['name']),
  programAssignments: defineTable({
    assignedAt: v.number(),
    coachId: v.id('users'),
    programId: v.id('programs'),
    traineeId: v.id('users'),
  })
    .index('by_coach', ['coachId'])
    .index('by_trainee', ['traineeId']),
  programRoutines: defineTable({
    dayIndex: v.optional(v.number()),
    order: v.number(),
    programId: v.id('programs'),
    routineId: v.id('routines'),
    weekIndex: v.optional(v.number()),
  })
    .index('by_program', ['programId'])
    .index('by_routine', ['routineId']),
  programs: defineTable({
    description: v.string(),
    durationWeeks: v.number(),
    ownerCoachId: v.id('users'),
    title: v.string(),
  }).index('by_owner_coach', ['ownerCoachId']),
  progressPhotos: defineTable({
    bodyweightKg: v.optional(v.number()),
    capturedAt: v.number(),
    note: v.optional(v.string()),
    storageId: v.id('_storage'),
    traineeId: v.id('users'),
  }).index('by_trainee', ['traineeId']),
  routineExerciseBlocks: defineTable({
    exerciseId: v.id('exercises'),
    order: v.number(),
    restSeconds: v.optional(v.number()),
    routineId: v.id('routines'),
    supersetGroup: v.optional(v.string()),
  })
    .index('by_exercise', ['exerciseId'])
    .index('by_routine', ['routineId']),
  routineSetTargets: defineTable({
    distanceMeters: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    reps: v.optional(v.number()),
    repsMax: v.optional(v.number()),
    repsMin: v.optional(v.number()),
    routineExerciseBlockId: v.id('routineExerciseBlocks'),
    setIndex: v.number(),
    targetRpe: v.optional(v.number()),
    weightKg: v.optional(v.number()),
  }).index('by_routine_exercise_block', ['routineExerciseBlockId']),
  routines: defineTable({
    name: v.string(),
    ownerCoachId: v.id('users'),
  }).index('by_owner_coach', ['ownerCoachId']),
  trainingResultSetResults: defineTable({
    distanceMeters: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    exerciseId: v.id('exercises'),
    reps: v.optional(v.number()),
    rpe: v.optional(v.number()),
    setIndex: v.number(),
    trainingResultId: v.id('trainingResults'),
    weightKg: v.optional(v.number()),
  })
    .index('by_exercise', ['exerciseId'])
    .index('by_training_result', ['trainingResultId']),
  trainingResults: defineTable({
    completedAt: v.number(),
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    programId: v.optional(v.id('programs')),
    routineId: v.id('routines'),
    traineeId: v.id('users'),
  })
    .index('by_routine', ['routineId'])
    .index('by_trainee', ['traineeId']),
  users: defineTable({
    coachId: v.optional(v.id('users')),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal('admin'), v.literal('coach'), v.literal('trainee')),
  })
    .index('by_coach', ['coachId'])
    .index('by_role', ['role']),
})
