import { defineSchema, defineTable } from 'convex/server'
import { authTables } from '@convex-dev/auth/server'
import { v } from 'convex/values'

import {
  exerciseEquipmentValidator,
  exerciseTypeValidator,
} from './validators'

export default defineSchema({
  ...authTables,
  activities: defineTable({
    createdAt: v.number(),
    durationMinutes: v.optional(v.number()),
    traineeId: v.id('users'),
    trainingResultId: v.optional(v.id('trainingResults')),
    type: v.string(),
  })
    .index('by_trainee', ['traineeId'])
    .index('by_trainee_and_created_at', ['traineeId', 'createdAt']),
  bodyweightEntries: defineTable({
    createdAt: v.number(),
    traineeId: v.id('users'),
    valueKg: v.number(),
  })
    .index('by_trainee', ['traineeId'])
    .index('by_trainee_and_created_at', ['traineeId', 'createdAt']),
  clientInvites: defineTable({
    acceptedAt: v.optional(v.number()),
    acceptedUserId: v.optional(v.id('users')),
    coachId: v.id('users'),
    createdAt: v.number(),
    expiresAt: v.number(),
    intendedEmail: v.optional(v.string()),
    note: v.optional(v.string()),
    revokedAt: v.optional(v.number()),
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('revoked'),
      v.literal('expired'),
    ),
    tokenHash: v.string(),
  })
    .index('by_coach', ['coachId'])
    .index('by_coach_and_status', ['coachId', 'status'])
    .index('by_token_hash', ['tokenHash']),
  exercises: defineTable({
    createdAt: v.number(),
    customEquipment: v.optional(v.string()),
    equipment: exerciseEquipmentValidator,
    instructions: v.array(v.string()),
    name: v.string(),
    photoStorageId: v.optional(v.id('_storage')),
    primaryMuscleGroupId: v.id('muscleGroups'),
    secondaryMuscleGroupIds: v.array(v.id('muscleGroups')),
    type: exerciseTypeValidator,
    updatedAt: v.optional(v.number()),
    videoUrl: v.optional(v.string()),
  })
    .index('by_name', ['name'])
    .index('by_primary_muscle_group', ['primaryMuscleGroupId'])
    .index('by_type', ['type']),
  muscleGroups: defineTable({
    createdAt: v.optional(v.number()),
    name: v.string(),
    normalizedName: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_name', ['name'])
    .index('by_normalized_name', ['normalizedName']),
  programAssignments: defineTable({
    assignedAt: v.number(),
    coachId: v.id('users'),
    programId: v.id('programs'),
    traineeId: v.id('users'),
  })
    .index('by_coach', ['coachId'])
    .index('by_program', ['programId'])
    .index('by_trainee', ['traineeId'])
    .index('by_trainee_and_program', ['traineeId', 'programId']),
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
    createdAt: v.optional(v.number()),
    description: v.string(),
    durationWeeks: v.number(),
    ownerCoachId: v.id('users'),
    title: v.string(),
    updatedAt: v.optional(v.number()),
  }).index('by_owner_coach', ['ownerCoachId']),
  progressPhotos: defineTable({
    bodyweightKg: v.optional(v.number()),
    capturedAt: v.number(),
    note: v.optional(v.string()),
    storageId: v.id('_storage'),
    traineeId: v.id('users'),
  })
    .index('by_trainee', ['traineeId'])
    .index('by_trainee_and_captured_at', ['traineeId', 'capturedAt']),
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
    createdAt: v.optional(v.number()),
    name: v.string(),
    ownerCoachId: v.id('users'),
    updatedAt: v.optional(v.number()),
  })
    .index('by_owner_coach', ['ownerCoachId'])
    .index('by_owner_coach_and_updated_at', ['ownerCoachId', 'updatedAt']),
  trainingResultSetResults: defineTable({
    distanceMeters: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    exerciseId: v.id('exercises'),
    reps: v.optional(v.number()),
    routineExerciseBlockId: v.optional(v.id('routineExerciseBlocks')),
    rpe: v.optional(v.number()),
    setIndex: v.number(),
    trainingResultId: v.id('trainingResults'),
    weightKg: v.optional(v.number()),
  })
    .index('by_exercise', ['exerciseId'])
    .index('by_training_result', ['trainingResultId']),
  trainingDraftSetResults: defineTable({
    completed: v.boolean(),
    distanceMeters: v.optional(v.number()),
    draftId: v.id('trainingDrafts'),
    durationSeconds: v.optional(v.number()),
    exerciseId: v.id('exercises'),
    reps: v.optional(v.number()),
    routineExerciseBlockId: v.id('routineExerciseBlocks'),
    rpe: v.optional(v.number()),
    setIndex: v.number(),
    updatedAt: v.number(),
    weightKg: v.optional(v.number()),
  })
    .index('by_draft', ['draftId'])
    .index('by_draft_and_routine_exercise_block_and_set_index', [
      'draftId',
      'routineExerciseBlockId',
      'setIndex',
    ]),
  trainingDrafts: defineTable({
    assignmentId: v.id('programAssignments'),
    createdAt: v.number(),
    durationMinutes: v.optional(v.number()),
    lastSavedAt: v.number(),
    notes: v.optional(v.string()),
    programId: v.id('programs'),
    routineId: v.id('routines'),
    status: v.union(
      v.literal('active'),
      v.literal('submitted'),
      v.literal('discarded'),
    ),
    traineeId: v.id('users'),
  })
    .index('by_assignment_and_routine_and_status', [
      'assignmentId',
      'routineId',
      'status',
    ])
    .index('by_trainee_and_status', ['traineeId', 'status']),
  trainingResults: defineTable({
    completedSets: v.optional(v.number()),
    completedAt: v.number(),
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    programId: v.optional(v.id('programs')),
    routineId: v.id('routines'),
    traineeId: v.id('users'),
    volumeKg: v.optional(v.number()),
  })
    .index('by_program', ['programId'])
    .index('by_routine', ['routineId'])
    .index('by_trainee', ['traineeId'])
    .index('by_trainee_and_completed_at', ['traineeId', 'completedAt'])
    .index('by_trainee_and_program', ['traineeId', 'programId']),
  users: defineTable({
    coachId: v.optional(v.id('users')),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    role: v.optional(
      v.union(v.literal('admin'), v.literal('coach'), v.literal('trainee')),
    ),
    tokenIdentifier: v.optional(v.string()),
  })
    .index('email', ['email'])
    .index('phone', ['phone'])
    .index('by_coach', ['coachId'])
    .index('by_role', ['role'])
    .index('by_token_identifier', ['tokenIdentifier']),
})
