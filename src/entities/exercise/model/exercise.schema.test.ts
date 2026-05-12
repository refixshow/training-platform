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
      primaryMuscleGroupId: 'legs',
    })

    expect(result.success).toBe(true)
  })

  it('requires custom equipment when equipment is other', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      equipment: 'other',
      name: 'Sled push',
      primaryMuscleGroupId: 'legs',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['customEquipment'])
  })

  it('rejects secondary muscle groups that duplicate the primary group', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      name: 'Bench press',
      primaryMuscleGroupId: 'chest',
      secondaryMuscleGroupIds: ['chest'],
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['secondaryMuscleGroupIds'])
  })

  it('rejects invalid video URLs', () => {
    const result = exerciseFormSchema.safeParse({
      ...emptyExerciseFormValues,
      name: 'Pull-up',
      primaryMuscleGroupId: 'back',
      videoUrl: 'not-a-link',
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['videoUrl'])
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
