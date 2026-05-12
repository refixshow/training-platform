import { z } from 'zod'

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
    primaryMuscleGroupId: z.string().min(1, 'Wybierz glowna grupe miesniowa.'),
    secondaryMuscleGroupIds: z.array(z.string()),
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
      values.primaryMuscleGroupId &&
      values.secondaryMuscleGroupIds.includes(values.primaryMuscleGroupId)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Dodatkowe grupy nie moga powtarzac grupy glownej.',
        path: ['secondaryMuscleGroupIds'],
      })
    }
  })

export type ExerciseFormValues = z.input<typeof exerciseFormSchema>

export const emptyExerciseFormValues: ExerciseFormValues = {
  customEquipment: '',
  equipment: 'none',
  instructionText: '',
  name: '',
  primaryMuscleGroupId: '',
  secondaryMuscleGroupIds: [],
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
