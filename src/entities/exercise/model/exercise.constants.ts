import type { LucideIcon } from 'lucide-react'
import {
  Clock,
  Footprints,
  Gauge,
  Hand,
  HelpCircle,
  Repeat2,
  Ruler,
  Scale,
} from 'lucide-react'

export const exerciseTypeValues = [
  'weight_reps',
  'reps_only',
  'bodyweight',
  'assisted_bodyweight',
  'duration',
  'weight_duration',
  'distance_duration',
  'weight_distance',
] as const

export const exerciseEquipmentValues = [
  'none',
  'other',
  'barbell',
  'dumbbell',
  'kettlebell',
  'machine',
  'plate',
  'resistance_band',
  'suspension',
] as const

export type ExerciseType = (typeof exerciseTypeValues)[number]
export type ExerciseEquipment = (typeof exerciseEquipmentValues)[number]

interface ExerciseTypeOption {
  fields: string
  icon: LucideIcon
  label: string
  value: ExerciseType
}

interface ExerciseEquipmentOption {
  label: string
  value: ExerciseEquipment
}

export const exerciseTypeOptions: ExerciseTypeOption[] = [
  {
    fields: 'kg + reps',
    icon: Scale,
    label: 'Ciezar i powtorzenia',
    value: 'weight_reps',
  },
  {
    fields: 'reps',
    icon: Repeat2,
    label: 'Tylko powtorzenia',
    value: 'reps_only',
  },
  {
    fields: 'masa ciala',
    icon: Hand,
    label: 'Masa ciala',
    value: 'bodyweight',
  },
  {
    fields: 'asysta + reps',
    icon: Gauge,
    label: 'Masa ciala z asysta',
    value: 'assisted_bodyweight',
  },
  {
    fields: 'czas',
    icon: Clock,
    label: 'Czas',
    value: 'duration',
  },
  {
    fields: 'kg + czas',
    icon: Scale,
    label: 'Ciezar i czas',
    value: 'weight_duration',
  },
  {
    fields: 'dystans + czas',
    icon: Footprints,
    label: 'Dystans i czas',
    value: 'distance_duration',
  },
  {
    fields: 'kg + dystans',
    icon: Ruler,
    label: 'Ciezar i dystans',
    value: 'weight_distance',
  },
]

export const exerciseEquipmentOptions: ExerciseEquipmentOption[] = [
  { label: 'Brak', value: 'none' },
  { label: 'Inny sprzet', value: 'other' },
  { label: 'Sztanga', value: 'barbell' },
  { label: 'Hantle', value: 'dumbbell' },
  { label: 'Kettlebell', value: 'kettlebell' },
  { label: 'Maszyna', value: 'machine' },
  { label: 'Talerz', value: 'plate' },
  { label: 'Guma oporowa', value: 'resistance_band' },
  { label: 'System podwieszany', value: 'suspension' },
]

export function getExerciseTypeLabel(type: ExerciseType) {
  return exerciseTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getExerciseEquipmentLabel(equipment: ExerciseEquipment) {
  return (
    exerciseEquipmentOptions.find((option) => option.value === equipment)
      ?.label ?? equipment
  )
}

export function getExerciseTypeIcon(type: ExerciseType) {
  return (
    exerciseTypeOptions.find((option) => option.value === type)?.icon ??
    HelpCircle
  )
}
