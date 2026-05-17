import { z } from 'zod'

import { muscleGroupValues } from '../../muscle-group'
import {
  exerciseEquipmentValues,
  exerciseTypeValues,
} from './exercise.constants'

export const exerciseFormSchema = z
  .object({
    customEquipment: z.string().trim().optional(),
    equipment: z.enum(exerciseEquipmentValues),
    instructionText: z.string().optional(),
    name: z
      .string()
      .trim()
      .min(1, 'Wpisz nazwe cwiczenia.')
      .max(120, 'Nazwa cwiczenia moze miec maksymalnie 120 znakow.'),
    primaryMuscleGroup: z
      .enum(muscleGroupValues)
      .or(z.literal(''))
      .refine((value) => value !== '', {
        message: 'Wybierz glowna grupe miesniowa.',
      }),
    secondaryMuscleGroups: z.array(z.enum(muscleGroupValues)),
    type: z.enum(exerciseTypeValues),
    videoUrl: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) => !value || z.url().safeParse(value).success,
        'Link wideo musi byc pelnym adresem URL, np. https://example.com.',
      ),
  })
  .superRefine((values, ctx) => {
    if (values.equipment === 'other' && !values.customEquipment?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Wpisz nazwe sprzetu albo wybierz gotowa opcje.',
        path: ['customEquipment'],
      })
    }

    if (
      values.primaryMuscleGroup &&
      values.secondaryMuscleGroups.includes(
        values.primaryMuscleGroup as (typeof muscleGroupValues)[number],
      )
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Dodatkowe grupy nie moga powtarzac grupy glownej.',
        path: ['secondaryMuscleGroups'],
      })
    }
  })

export type ExerciseFormValues = z.input<typeof exerciseFormSchema>

export const emptyExerciseFormValues: ExerciseFormValues = {
  customEquipment: '',
  equipment: 'none',
  instructionText: '',
  name: '',
  primaryMuscleGroup: '',
  secondaryMuscleGroups: [],
  type: 'weight_reps',
  videoUrl: '',
}

export function splitInstructionText(instructionText?: string) {
  return (
    instructionText
      ?.split(/\r?\n/)
      .map((instruction) => instruction.trim())
      .filter(Boolean) ?? []
  )
}
