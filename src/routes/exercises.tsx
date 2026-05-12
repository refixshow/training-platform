import { createFileRoute } from '@tanstack/react-router'

import { ExerciseLibrary } from '#/widgets/exercise-library'

export const Route = createFileRoute('/exercises')({
  component: ExercisesPage,
})

function ExercisesPage() {
  return <ExerciseLibrary />
}
