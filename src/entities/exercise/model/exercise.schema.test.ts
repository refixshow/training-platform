import { describe, expect, it } from 'vitest'

import {
  emptyExerciseFormValues,
  exerciseFormSchema,
  splitInstructionText,
} from './exercise.schema'

describe('exerciseFormSchema', () => {
  it('accepts the minimum valid exercise payload', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      name: 'Goblet squat',
      primaryMuscleGroup: 'quadriceps',
    })

    expect(result.success).toBe(true)
  })

  it('requires custom equipment when equipment is other', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      equipment: 'other',
      name: 'Sled push',
      primaryMuscleGroup: 'quadriceps',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['customEquipment'])
  })

  it('rejects secondary muscle groups that duplicate the primary group', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      name: 'Bench press',
      primaryMuscleGroup: 'chest',
      secondaryMuscleGroups: ['chest'],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['secondaryMuscleGroups'])
  })

  it('rejects invalid video URLs', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      name: 'Pull-up',
      primaryMuscleGroup: 'lats',
      videoUrl: 'not-a-link',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['videoUrl'])
  })

  it('rejects an empty primary muscle group', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      name: 'Goblet squat',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['primaryMuscleGroup'])
  })
})

describe('splitInstructionText', () => {
  it('keeps one trimmed instruction per non-empty line', () => {
    expect(splitInstructionText('  Brace ribs\n\nDrive through feet  ')).toEqual([
      'Brace ribs',
      'Drive through feet',
    ])
  })
})
