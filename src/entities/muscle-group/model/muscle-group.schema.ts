import { z } from 'zod'

export const muscleGroupNameMaxLength = 80

export const muscleGroupFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Wpisz nazwe grupy miesniowej.')
    .max(
      muscleGroupNameMaxLength,
      `Nazwa grupy moze miec maksymalnie ${muscleGroupNameMaxLength} znakow.`,
    ),
})

export type MuscleGroupFormValues = z.input<typeof muscleGroupFormSchema>

export const emptyMuscleGroupFormValues: MuscleGroupFormValues = {
  name: '',
}

export function normalizeMuscleGroupName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl-PL')
}
