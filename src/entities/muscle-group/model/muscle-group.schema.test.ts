import { describe, expect, it } from 'vitest'

import {
  muscleGroupFormSchema,
  muscleGroupNameMaxLength,
  normalizeMuscleGroupName,
} from './muscle-group.schema'

describe('muscleGroupFormSchema', () => {
  it('accepts a trimmed muscle group name', () => {
    const result = muscleGroupFormSchema.safeParse({ name: '  Plecy  ' })

    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('Plecy')
  })

  it('rejects an empty name', () => {
    const result = muscleGroupFormSchema.safeParse({ name: '   ' })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'Wpisz nazwe grupy miesniowej.',
    )
  })

  it('rejects names over the maximum length', () => {
    const result = muscleGroupFormSchema.safeParse({
      name: 'a'.repeat(muscleGroupNameMaxLength + 1),
    })

    expect(result.success).toBe(false)
  })
})

describe('normalizeMuscleGroupName', () => {
  it('normalizes casing and repeated whitespace for duplicate checks', () => {
    expect(normalizeMuscleGroupName('  KLATKA   Piersiowa  ')).toBe(
      'klatka piersiowa',
    )
  })
})
