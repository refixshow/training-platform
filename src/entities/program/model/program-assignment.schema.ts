import { z } from 'zod'

export const programAssignmentFormSchema = z.object({
  programId: z.string().min(1, 'Wybierz program do przypisania.'),
  traineeId: z.string().min(1, 'Wybierz klienta.'),
})

export type ProgramAssignmentFormValues = z.input<
  typeof programAssignmentFormSchema
>

export const emptyProgramAssignmentFormValues: ProgramAssignmentFormValues = {
  programId: '',
  traineeId: '',
}

export function formatAssignmentDate(timestamp?: number) {
  if (!timestamp) {
    return 'Brak daty'
  }

  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp))
}
