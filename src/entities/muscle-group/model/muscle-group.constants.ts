export const muscleGroupValues = [
  'abdominals',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'chest',
  'upper_back',
  'lats',
  'traps',
  'lower_back',
  'glutes',
  'quadriceps',
  'hamstrings',
  'adductors',
  'calves',
  'neck',
  'cardio',
  'full_body',
] as const

export type MuscleGroup = (typeof muscleGroupValues)[number]

export interface MuscleGroupOption {
  id: MuscleGroup
  name: string
}

const muscleGroupLabels: Record<MuscleGroup, string> = {
  abdominals: 'Brzuch',
  shoulders: 'Barki',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Przedramiona',
  chest: 'Klatka piersiowa',
  upper_back: 'Górne plecy',
  lats: 'Najszerszy grzbietu',
  traps: 'Czworoboczny',
  lower_back: 'Dolne plecy',
  glutes: 'Pośladki',
  quadriceps: 'Czworogłowe ud',
  hamstrings: 'Dwugłowe ud',
  adductors: 'Przywodziciele',
  calves: 'Łydki',
  neck: 'Szyja',
  cardio: 'Cardio',
  full_body: 'Całe ciało',
}

export function getMuscleGroupLabel(value: MuscleGroup): string {
  return muscleGroupLabels[value]
}

export function isMuscleGroup(value: unknown): value is MuscleGroup {
  return (
    typeof value === 'string' &&
    (muscleGroupValues as readonly string[]).includes(value)
  )
}

export const muscleGroupOptions: MuscleGroupOption[] = muscleGroupValues.map(
  (id) => ({ id, name: muscleGroupLabels[id] }),
)
