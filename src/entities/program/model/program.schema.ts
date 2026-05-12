import { z } from 'zod'

export const programFormSchema = z.object({
  description: z
    .string()
    .trim()
    .max(2000, 'Opis programu moze miec maksymalnie 2000 znakow.'),
  durationWeeks: z
    .string()
    .trim()
    .min(1, 'Podaj czas trwania programu.')
    .refine((value) => Number.isInteger(Number(value)), {
      message: 'Czas trwania musi byc liczba calkowita.',
    })
    .refine((value) => Number(value) >= 1 && Number(value) <= 52, {
      message: 'Czas trwania musi miec od 1 do 52 tygodni.',
    }),
  routineIds: z
    .array(z.string().min(1))
    .min(1, 'Dodaj przynajmniej jedna rutyne do programu.')
    .max(80, 'Program moze miec maksymalnie 80 rutyn.'),
  title: z
    .string()
    .trim()
    .min(1, 'Wpisz nazwe programu.')
    .max(120, 'Nazwa programu moze miec maksymalnie 120 znakow.'),
})

export type ProgramFormValues = z.input<typeof programFormSchema>

export const emptyProgramFormValues: ProgramFormValues = {
  description: '',
  durationWeeks: '4',
  routineIds: [],
  title: '',
}

export function parseProgramDuration(value: string) {
  return Number(value)
}

export function formatProgramDate(timestamp?: number) {
  if (!timestamp) {
    return 'Brak daty'
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}
