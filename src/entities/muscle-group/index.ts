import type { Doc, Id } from '../../../convex/_generated/dataModel'

export interface MuscleGroupOption {
  id: Id<'muscleGroups'>
  name: string
}

export type MuscleGroupDoc = Doc<'muscleGroups'>

export {
  emptyMuscleGroupFormValues,
  muscleGroupFormSchema,
  muscleGroupNameMaxLength,
  normalizeMuscleGroupName,
} from './model/muscle-group.schema'
export type { MuscleGroupFormValues } from './model/muscle-group.schema'
